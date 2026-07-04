import unittest
import os
import json
import sqlite3
from werkzeug.security import generate_password_hash

# Set a test database path before importing app or database modules
import database
database.DB_PATH = os.path.join(os.path.dirname(__file__), 'test_database.db')

import app
app.DB_PATH = database.DB_PATH

class CookMateTestCase(unittest.TestCase):
    def setUp(self):
        # Initialize isolated test database
        database.init_db()
        
        # Insert a secondary test user directly to test authentication
        conn = database.get_db_connection()
        hashed = generate_password_hash('test_pass')
        conn.execute('INSERT OR REPLACE INTO users (id, username, password) VALUES (?, ?, ?)', (2, 'test_user', hashed))
        conn.commit()
        conn.close()
        
        # Configure app for testing
        app.app.config['TESTING'] = True
        app.app.config['WTF_CSRF_ENABLED'] = False
        self.client = app.app.test_client()

    def tearDown(self):
        # Remove test database file
        if os.path.exists(database.DB_PATH):
            os.remove(database.DB_PATH)

    def test_database_initialization(self):
        # Verify schema is populated correctly
        conn = database.get_db_connection()
        cursor = conn.cursor()
        
        # Check users table
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        self.assertIsNotNone(cursor.fetchone())
        
        # Check seed data
        cursor.execute("SELECT * FROM users WHERE username='admin'")
        admin = cursor.fetchone()
        self.assertIsNotNone(admin)
        
        conn.close()

    def test_login_api(self):
        # Test successful authentication
        resp = self.client.post('/login', json={
            'username': 'test_user',
            'password': 'test_pass'
        })
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertTrue(data['success'])
        self.assertEqual(data['user']['username'], 'test_user')

        # Test invalid password failure
        resp_fail = self.client.post('/login', json={
            'username': 'test_user',
            'password': 'wrong_password'
        })
        self.assertEqual(resp_fail.status_code, 401)
        data_fail = json.loads(resp_fail.data)
        self.assertFalse(data_fail['success'])

    def test_preferences_api(self):
        # Test posting preferences
        test_prefs = {
            "breakfast": ["Dosa", "Idli", "Oats", "Pancakes", "Toast"],
            "lunch": ["Rajma Rice", "Biryani", "Pasta", "Salad", "Sandwich"],
            "dinner": ["Paneer Curry", "Dal Tadka", "Soup", "Noodles", "Tacos"]
        }
        resp = self.client.post('/preferences', json={
            'user_id': 2,
            'preferences': test_prefs
        })
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(json.loads(resp.data)['success'])

        # Test getting preferences
        get_resp = self.client.get('/preferences?user_id=2')
        self.assertEqual(get_resp.status_code, 200)
        get_data = json.loads(get_resp.data)
        self.assertTrue(get_data['success'])
        self.assertEqual(len(get_data['preferences']['breakfast']), 5)
        self.assertIn("Dosa", get_data['preferences']['breakfast'])

    def test_meal_planning(self):
        # Create meal plan
        resp = self.client.post('/meal-plan', json={
            'user_id': 2,
            'date': '2026-07-04',
            'breakfast': 'Dosa',
            'lunch': 'Rajma Rice',
            'dinner': 'Paneer Curry'
        })
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertTrue(data['success'])
        self.assertIn('meal_plan_id', data)

    def test_grocery_generation_logic(self):
        # Run local generator function directly
        ingredients, budget, substitutions = app.generate_mock_grocery('Dosa', 'Rajma Rice', 'Paneer Curry')
        
        # Dosa has: Rice Flour, Oil, Potato, Mustard Seeds, Salt
        # Rajma Rice has: Rajma, Rice, Onion, Tomato, Garlic, Ginger, Oil, Spices, Coriander
        # Paneer Curry has: Paneer, Tomato, Cream, Onion, Oil, Garlic, Ginger, Spices, Coriander
        
        # Verify ingredients properties (combined, sorted, de-duplicated)
        self.assertIn('Rice Flour', ingredients)
        self.assertIn('Rajma', ingredients)
        self.assertIn('Paneer', ingredients)
        
        # Verify de-duplication: 'Oil' should appear only once
        self.assertEqual(ingredients.count('Oil'), 1)
        
        # Verify alphabetical sorting
        self.assertEqual(ingredients, sorted(ingredients))

        # Verify budget is calculated dynamically based on ingredient list
        self.assertGreater(budget, 100)

        # Verify substitutions
        self.assertIn('Paneer', substitutions)
        self.assertEqual(substitutions['Paneer'], 'Tofu (Plant-based)')

    def test_grocery_endpoints(self):
        # 1. Save plan first
        self.client.post('/meal-plan', json={
            'user_id': 2,
            'date': '2026-07-04',
            'breakfast': 'Dosa',
            'lunch': 'Rajma Rice',
            'dinner': 'Paneer Curry'
        })

        # 2. Call generate grocery endpoint
        resp = self.client.post('/generate-grocery', json={
            'user_id': 2,
            'date': '2026-07-04'
        })
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertTrue(data['success'])
        self.assertIn('grocery_items', data)
        self.assertIn('budget', data)
        self.assertIn('substitutions', data)
        
        # Ensure items are saved to database and returned with checked=False
        first_item = data['grocery_items'][0]
        self.assertFalse(first_item['checked'])
        item_id = first_item['id']

        # 3. Test check/uncheck grocery item
        update_resp = self.client.post('/update-grocery-item', json={
            'item_id': item_id,
            'checked': True
        })
        self.assertEqual(update_resp.status_code, 200)
        self.assertTrue(json.loads(update_resp.data)['success'])

        # 4. Fetch meal plan date and verify item is checked
        get_plan = self.client.get('/meal-plan/2026-07-04?user_id=2')
        self.assertEqual(get_plan.status_code, 200)
        plan_data = json.loads(get_plan.data)
        updated_item = next(item for item in plan_data['grocery_items'] if item['id'] == item_id)
        self.assertTrue(updated_item['checked'])

if __name__ == '__main__':
    unittest.main()
