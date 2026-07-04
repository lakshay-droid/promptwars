import os
import json
import sqlite3
import datetime
import requests
from flask import Flask, request, jsonify, send_from_directory, session
from dotenv import load_dotenv
from database import get_db_connection, init_db

# Load environment variables
load_dotenv()

app = Flask(__name__, static_folder='.', static_url_path='')
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'cookmate_secret_key_123')

# Check for Gemini API key
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')

# Predefined datasets for mock engine
PRESET_BREAKFAST = ['Idli', 'Dosa', 'Poha', 'Upma', 'Oats', 'Pancakes', 'Paratha', 'Eggs', 'Toast', 'Smoothie', 'Fruit Bowl']
PRESET_LUNCH = ['Rajma Rice', 'Roti Sabzi', 'Biryani', 'Pasta', 'Salad', 'Sandwich', 'Khichdi', 'Fried Rice', 'Paneer Wrap', 'Dal Chawal']
PRESET_DINNER = ['Paneer Curry', 'Dal Tadka', 'Aloo Gobi', 'Chicken Curry', 'Soup', 'Noodles', 'Stir Fry', 'Tacos', 'Fish Curry', 'Sautéed Veggies']

INGREDIENTS_MAP = {
    # Breakfast
    'Idli': ['Rice Flour', 'Urad Dal', 'Salt', 'Water'],
    'Dosa': ['Rice Flour', 'Urad Dal', 'Oil', 'Potato', 'Mustard Seeds', 'Salt'],
    'Poha': ['Poha (Flattened Rice)', 'Peanuts', 'Onion', 'Turmeric', 'Mustard Seeds', 'Oil', 'Green Chilies'],
    'Upma': ['Semolina (Rava)', 'Onion', 'Green Chilies', 'Oil', 'Mustard Seeds', 'Curry Leaves', 'Water'],
    'Oats': ['Oats', 'Milk', 'Honey', 'Banana', 'Cinnamon'],
    'Pancakes': ['Flour', 'Milk', 'Eggs', 'Maple Syrup', 'Butter', 'Baking Powder'],
    'Paratha': ['Whole Wheat Flour', 'Potato', 'Oil', 'Spices', 'Butter', 'Salt'],
    'Eggs': ['Eggs', 'Bread', 'Butter', 'Pepper', 'Salt'],
    'Toast': ['Bread', 'Butter', 'Jam'],
    'Smoothie': ['Banana', 'Milk', 'Berry Mix', 'Honey', 'Yogurt'],
    'Fruit Bowl': ['Apple', 'Banana', 'Orange', 'Grapes', 'Honey', 'Mint'],
    
    # Lunch
    'Rajma Rice': ['Rajma', 'Rice', 'Onion', 'Tomato', 'Garlic', 'Ginger', 'Oil', 'Spices', 'Coriander'],
    'Roti Sabzi': ['Whole Wheat Flour', 'Mixed Vegetables', 'Oil', 'Spices', 'Salt', 'Water'],
    'Biryani': ['Basmati Rice', 'Chicken/Paneer', 'Onion', 'Tomato', 'Yogurt', 'Spices', 'Ghee', 'Mint'],
    'Pasta': ['Pasta', 'Tomato Sauce', 'Cheese', 'Garlic', 'Olive Oil', 'Basil'],
    'Salad': ['Lettuce', 'Tomato', 'Cucumber', 'Olive Oil', 'Lemon', 'Salt', 'Pepper'],
    'Sandwich': ['Bread', 'Cheese', 'Tomato', 'Lettuce', 'Butter', 'Mayonnaise'],
    'Khichdi': ['Rice', 'Moong Dal', 'Ghee', 'Turmeric', 'Cumin Seeds', 'Ginger', 'Salt'],
    'Fried Rice': ['Rice', 'Mixed Vegetables', 'Soy Sauce', 'Garlic', 'Oil', 'Spring Onion'],
    'Paneer Wrap': ['Tortilla', 'Paneer', 'Bell Pepper', 'Onion', 'Spices', 'Yogurt Sauce'],
    'Dal Chawal': ['Rice', 'Toor Dal', 'Onion', 'Tomato', 'Ghee', 'Cumin', 'Garlic', 'Spices'],
    
    # Dinner
    'Paneer Curry': ['Paneer', 'Tomato', 'Cream', 'Onion', 'Oil', 'Garlic', 'Ginger', 'Spices', 'Coriander'],
    'Dal Tadka': ['Toor Dal', 'Onion', 'Tomato', 'Ghee', 'Garlic', 'Cumin', 'Chili', 'Coriander'],
    'Aloo Gobi': ['Potato', 'Cauliflower', 'Onion', 'Tomato', 'Oil', 'Spices', 'Salt'],
    'Chicken Curry': ['Chicken', 'Onion', 'Tomato', 'Garlic', 'Ginger', 'Oil', 'Spices', 'Coriander'],
    'Soup': ['Vegetable Broth', 'Carrot', 'Celery', 'Potato', 'Garlic', 'Salt', 'Pepper'],
    'Noodles': ['Noodles', 'Mixed Vegetables', 'Soy Sauce', 'Vinegar', 'Oil', 'Garlic'],
    'Stir Fry': ['Mixed Vegetables', 'Tofu', 'Soy Sauce', 'Ginger', 'Garlic', 'Oil', 'Sesame Seeds'],
    'Tacos': ['Taco Shells', 'Beans', 'Cheese', 'Lettuce', 'Tomato Salsa', 'Sour Cream'],
    'Fish Curry': ['Fish', 'Coconut Milk', 'Onion', 'Tomato', 'Tamarind', 'Oil', 'Spices'],
    'Sautéed Veggies': ['Broccoli', 'Bell Pepper', 'Carrot', 'Olive Oil', 'Garlic', 'Salt', 'Pepper']
}

INGREDIENT_PRICES = {
    'Rice Flour': 45, 'Urad Dal': 60, 'Salt': 5, 'Water': 0, 'Oil': 35, 'Potato': 15,
    'Mustard Seeds': 10, 'Poha (Flattened Rice)': 30, 'Peanuts': 25, 'Onion': 15,
    'Turmeric': 5, 'Green Chilies': 8, 'Semolina (Rava)': 25, 'Curry Leaves': 5,
    'Oats': 40, 'Milk': 28, 'Honey': 45, 'Banana': 20, 'Cinnamon': 10, 'Flour': 20,
    'Eggs': 30, 'Maple Syrup': 90, 'Butter': 40, 'Baking Powder': 10, 'Whole Wheat Flour': 25,
    'Spices': 20, 'Bread': 25, 'Pepper': 5, 'Jam': 35, 'Berry Mix': 80, 'Yogurt': 25,
    'Apple': 40, 'Orange': 30, 'Grapes': 40, 'Mint': 5, 'Rajma': 50, 'Rice': 35,
    'Tomato': 20, 'Garlic': 10, 'Ginger': 10, 'Coriander': 5, 'Mixed Vegetables': 60,
    'Basmati Rice': 70, 'Chicken/Paneer': 140, 'Yogurt': 20, 'Ghee': 50, 'Pasta': 35,
    'Tomato Sauce': 30, 'Cheese': 60, 'Olive Oil': 75, 'Basil': 15, 'Lettuce': 25,
    'Cucumber': 15, 'Lemon': 8, 'Mayonnaise': 25, 'Moong Dal': 45, 'Cumin Seeds': 8,
    'Soy Sauce': 15, 'Spring Onion': 12, 'Tortilla': 30, 'Paneer': 120, 'Bell Pepper': 25,
    'Yogurt Sauce': 20, 'Toor Dal': 50, 'Cream': 40, 'Cauliflower': 30, 'Chicken': 150,
    'Vegetable Broth': 25, 'Carrot': 15, 'Celery': 20, 'Noodles': 25, 'Vinegar': 10,
    'Tofu': 60, 'Sesame Seeds': 12, 'Taco Shells': 45, 'Beans': 20, 'Tomato Salsa': 30,
    'Sour Cream': 35, 'Fish': 180, 'Coconut Milk': 50, 'Tamarind': 15, 'Broccoli': 40
}

DEFAULT_SUBSTITUTIONS = {
    'Paneer': 'Tofu (Plant-based)',
    'Milk': 'Oat Milk (Dairy-free)',
    'Rice': 'Quinoa (Low-carb)',
    'Eggs': 'Tofu Scramble',
    'Butter': 'Olive Oil',
    'Cheese': 'Vegan Cheese',
    'Chicken': 'Jackfruit or Tofu'
}

def get_session_api_key():
    return session.get('gemini_api_key', GEMINI_API_KEY)

def generate_mock_grocery(breakfast, lunch, dinner):
    # Retrieve ingredients for chosen meals
    ingredients = set()
    for meal in [breakfast, lunch, dinner]:
        if meal in INGREDIENTS_MAP:
            ingredients.update(INGREDIENTS_MAP[meal])
            
    sorted_ingredients = sorted(list(ingredients))
    
    # Calculate budget
    budget = 0
    for ing in sorted_ingredients:
        budget += INGREDIENT_PRICES.get(ing, 30) # Default to 30 if missing
        
    # Extract applicable substitutions
    substitutions = {}
    for ing in sorted_ingredients:
        if ing in DEFAULT_SUBSTITUTIONS:
            substitutions[ing] = DEFAULT_SUBSTITUTIONS[ing]
            
    # Add a fallback placeholder if none found
    if not substitutions:
        substitutions = {
            'Paneer': 'Tofu',
            'Milk': 'Oat Milk',
            'Rice': 'Quinoa'
        }
        
    return sorted_ingredients, budget, substitutions

def generate_gemini_grocery(breakfast, lunch, dinner, api_key):
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent"
    headers = {
        "Content-Type": "application/json",
        "X-goog-api-key": api_key
    }
    
    prompt = (
        f"You are a culinary expert assisting a user with their daily meal plan.\n"
        f"The user selected the following meals:\n"
        f"- Breakfast: {breakfast}\n"
        f"- Lunch: {lunch}\n"
        f"- Dinner: {dinner}\n\n"
        f"Generate a combined, de-duplicated, and sorted grocery list of raw ingredients needed.\n"
        f"Also estimate the total grocery budget in INR (₹) for these ingredients in a local Indian market.\n"
        f"Provide healthy or dietary substitutions for at least 3 main ingredients (e.g. Paneer to Tofu, Rice to Quinoa, Milk to Oat Milk, etc.).\n\n"
        f"Response must be in JSON format matching this schema:\n"
        f"{{\n"
        f"  \"ingredients\": [\"Ingredient 1\", \"Ingredient 2\", ...],\n"
        f"  \"substitutions\": {{\n"
        f"    \"Original Ingredient\": \"Substituted Ingredient\",\n"
        f"    ...\n"
        f"  }},\n"
        f"  \"estimated_budget_inr\": 420\n"
        f"}}\n"
        f"Ensure estimated_budget_inr is an integer."
    )
    
    payload = {
        "contents": [{
            "parts": [{
                "text": prompt
            }]
        }],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=8)
        if response.status_code == 200:
            res_data = response.json()
            text_resp = res_data['candidates'][0]['content']['parts'][0]['text']
            parsed = json.loads(text_resp)
            
            ingredients = parsed.get("ingredients", [])
            substitutions = parsed.get("substitutions", {})
            budget = parsed.get("estimated_budget_inr", 400)
            
            # Format nicely
            ingredients = sorted([i.strip() for i in ingredients if i])
            return ingredients, budget, substitutions
    except Exception as e:
        print(f"Error calling Gemini API: {e}. Falling back to mock engine.")
        
    return generate_mock_grocery(breakfast, lunch, dinner)

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/save-api-key', methods=['POST'])
def save_api_key():
    data = request.get_json() or {}
    key = data.get('api_key', '').strip()
    session['gemini_api_key'] = key
    return jsonify({"success": True, "has_key": bool(key)})

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    
    if not username or not password:
        return jsonify({"success": False, "message": "Username and password are required"}), 400
        
    from werkzeug.security import check_password_hash
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
    conn.close()
    
    if user and check_password_hash(user['password'], password):
        # Successful login
        session['user_id'] = user['id']
        session['username'] = user['username']
        return jsonify({
            "success": True,
            "user": {
                "id": user['id'],
                "username": user['username']
            }
        })
    else:
        return jsonify({"success": False, "message": "Invalid username or password"}), 401

@app.route('/preferences', methods=['GET'])
def get_preferences():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"success": False, "message": "user_id is required"}), 400
        
    conn = get_db_connection()
    rows = conn.execute(
        'SELECT meal_type, dish_name FROM preferences WHERE user_id = ?',
        (user_id,)
    ).fetchall()
    conn.close()
    
    prefs = {"breakfast": [], "lunch": [], "dinner": []}
    for row in rows:
        meal_type = row['meal_type'].lower()
        if meal_type in prefs:
            prefs[meal_type].append(row['dish_name'])
            
    # If no preferences yet, return preset lists to choose from
    return jsonify({
        "success": True,
        "preferences": prefs,
        "presets": {
            "breakfast": PRESET_BREAKFAST,
            "lunch": PRESET_LUNCH,
            "dinner": PRESET_DINNER
        }
    })

@app.route('/preferences', methods=['POST'])
def save_preferences():
    data = request.get_json() or {}
    user_id = data.get('user_id')
    prefs = data.get('preferences', {})
    
    if not user_id:
        return jsonify({"success": False, "message": "user_id is required"}), 400
        
    conn = get_db_connection()
    try:
        with conn:
            # Delete old preferences
            conn.execute('DELETE FROM preferences WHERE user_id = ?', (user_id,))
            
            # Insert new ones
            for meal_type, dishes in prefs.items():
                for dish in dishes:
                    conn.execute(
                        'INSERT INTO preferences (user_id, meal_type, dish_name) VALUES (?, ?, ?)',
                        (user_id, meal_type, dish)
                    )
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()

@app.route('/meal-plan', methods=['POST'])
def save_meal_plan():
    data = request.get_json() or {}
    user_id = data.get('user_id')
    date = data.get('date') # Format: YYYY-MM-DD
    breakfast = data.get('breakfast', '').strip()
    lunch = data.get('lunch', '').strip()
    dinner = data.get('dinner', '').strip()
    
    if not user_id or not date:
        return jsonify({"success": False, "message": "user_id and date are required"}), 400
        
    conn = get_db_connection()
    try:
        with conn:
            # Insert or replace meal plan
            cursor = conn.cursor()
            cursor.execute(
                '''
                INSERT INTO meal_plans (user_id, date, breakfast, lunch, dinner, budget)
                VALUES (?, ?, ?, ?, ?, 0.0)
                ON CONFLICT(user_id, date) DO UPDATE SET
                    breakfast=excluded.breakfast,
                    lunch=excluded.lunch,
                    dinner=excluded.dinner
                ''',
                (user_id, date, breakfast, lunch, dinner)
            )
            
            # Get the meal plan ID
            row = conn.execute(
                'SELECT id FROM meal_plans WHERE user_id = ? AND date = ?',
                (user_id, date)
            ).fetchone()
            meal_plan_id = row['id']
            
        return jsonify({"success": True, "meal_plan_id": meal_plan_id})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()

@app.route('/meal-plan/<date>', methods=['GET'])
def get_meal_plan(date):
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"success": False, "message": "user_id is required"}), 400
        
    conn = get_db_connection()
    plan_row = conn.execute(
        'SELECT * FROM meal_plans WHERE user_id = ? AND date = ?',
        (user_id, date)
    ).fetchone()
    
    if not plan_row:
        conn.close()
        return jsonify({"success": False, "message": "No meal plan found for this date"}), 404
        
    meal_plan_id = plan_row['id']
    grocery_rows = conn.execute(
        'SELECT id, item, checked FROM grocery_items WHERE meal_plan_id = ?',
        (meal_plan_id,)
    ).fetchall()
    conn.close()
    
    # Structure response
    plan_data = {
        "id": plan_row['id'],
        "breakfast": plan_row['breakfast'],
        "lunch": plan_row['lunch'],
        "dinner": plan_row['dinner'],
        "budget": plan_row['budget']
    }
    
    grocery_items = []
    for row in grocery_rows:
        grocery_items.append({
            "id": row['id'],
            "item": row['item'],
            "checked": bool(row['checked'])
        })
        
    # Run the generation helper to extract static substitutions for the frontend display
    _, _, substitutions = generate_mock_grocery(plan_row['breakfast'], plan_row['lunch'], plan_row['dinner'])
    
    return jsonify({
        "success": True,
        "meal_plan": plan_data,
        "grocery_items": grocery_items,
        "substitutions": substitutions
    })

@app.route('/generate-grocery', methods=['POST'])
def generate_grocery():
    data = request.get_json() or {}
    user_id = data.get('user_id')
    date = data.get('date')
    
    if not user_id or not date:
        return jsonify({"success": False, "message": "user_id and date are required"}), 400
        
    conn = get_db_connection()
    plan_row = conn.execute(
        'SELECT * FROM meal_plans WHERE user_id = ? AND date = ?',
        (user_id, date)
    ).fetchone()
    
    if not plan_row:
        conn.close()
        return jsonify({"success": False, "message": "Please create a meal plan first"}), 400
        
    meal_plan_id = plan_row['id']
    breakfast = plan_row['breakfast']
    lunch = plan_row['lunch']
    dinner = plan_row['dinner']
    
    # Select generator (Gemini vs Mock)
    api_key = get_session_api_key()
    if api_key:
        print("Generating grocery list using Gemini API...")
        ingredients, budget, substitutions = generate_gemini_grocery(breakfast, lunch, dinner, api_key)
    else:
        print("Generating grocery list using Mock Engine...")
        ingredients, budget, substitutions = generate_mock_grocery(breakfast, lunch, dinner)
        
    try:
        with conn:
            # Delete previous grocery items
            conn.execute('DELETE FROM grocery_items WHERE meal_plan_id = ?', (meal_plan_id,))
            
            # Insert new ones
            for ing in ingredients:
                conn.execute(
                    'INSERT INTO grocery_items (meal_plan_id, item, checked) VALUES (?, ?, 0)',
                    (meal_plan_id, ing)
                )
                
            # Update budget on meal plan
            conn.execute(
                'UPDATE meal_plans SET budget = ? WHERE id = ?',
                (budget, meal_plan_id)
            )
            
        # Re-fetch saved grocery items
        grocery_rows = conn.execute(
            'SELECT id, item, checked FROM grocery_items WHERE meal_plan_id = ?',
            (meal_plan_id,)
        ).fetchall()
        
        grocery_items = [{
            "id": r['id'],
            "item": r['item'],
            "checked": bool(r['checked'])
        } for r in grocery_rows]
        
        return jsonify({
            "success": True,
            "grocery_items": grocery_items,
            "budget": budget,
            "substitutions": substitutions,
            "ai_mode": bool(api_key)
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()

@app.route('/update-grocery-item', methods=['POST'])
def update_grocery_item():
    data = request.get_json() or {}
    item_id = data.get('item_id')
    checked = data.get('checked') # boolean
    
    if item_id is None or checked is None:
        return jsonify({"success": False, "message": "item_id and checked are required"}), 400
        
    conn = get_db_connection()
    try:
        with conn:
            conn.execute(
                'UPDATE grocery_items SET checked = ? WHERE id = ?',
                (1 if checked else 0, item_id)
            )
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()

@app.route('/calendar', methods=['GET'])
def get_calendar():
    # Returns 7 days: 3 days before today, today, 3 days after today
    # Reference date is today, but support offset if requested
    today = datetime.date.today()
    
    calendar_dates = []
    for i in range(-3, 4):
        d = today + datetime.timedelta(days=i)
        calendar_dates.append({
            "date_str": d.strftime("%d %b"), # e.g. "14 Jul"
            "iso_date": d.strftime("%Y-%m-%d"), # e.g. "2026-07-14"
            "day_name": d.strftime("%A"), # e.g. "Tuesday"
            "is_today": i == 0
        })
        
    return jsonify({
        "success": True,
        "dates": calendar_dates
    })

if __name__ == '__main__':
    # Initialize DB
    init_db()
    # Start flask server
    app.run(host='127.0.0.1', port=5000, debug=True)
