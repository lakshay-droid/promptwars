// CookMate AI - API Interceptor for Serverless Netlify Deployment
// Automatically detects environment and mocks SQLite operations in LocalStorage,
// while routing Gemini API calls through a secure Netlify Function proxy.

(function() {
    const isLocalFlask = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    
    // Only intercept if we are not running on the local Flask server port (5000)
    // or if we explicitly detect Netlify.
    const useMockAPI = !isLocalFlask || (location.port !== '5000' && location.port !== '');

    if (!useMockAPI) {
        console.log("CookMate AI: Running in Flask + SQLite Mode.");
        return;
    }

    console.log("CookMate AI: Running in Netlify Serverless Mode (LocalStorage DB + Functions).");

    const originalFetch = window.fetch;

    // Fallback Preset dishes (matching app.py)
    const PRESET_BREAKFAST = ['Idli', 'Dosa', 'Poha', 'Upma', 'Oats', 'Pancakes', 'Paratha', 'Eggs', 'Toast', 'Smoothie', 'Fruit Bowl'];
    const PRESET_LUNCH = ['Rajma Rice', 'Roti Sabzi', 'Biryani', 'Pasta', 'Salad', 'Sandwich', 'Khichdi', 'Fried Rice', 'Paneer Wrap', 'Dal Chawal'];
    const PRESET_DINNER = ['Paneer Curry', 'Dal Tadka', 'Aloo Gobi', 'Chicken Curry', 'Soup', 'Noodles', 'Stir Fry', 'Tacos', 'Fish Curry', 'Sautéed Veggies'];

    const INGREDIENTS_MAP = {
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
    };

    const INGREDIENT_PRICES = {
        'Rice Flour': 45, 'Urad Dal': 60, 'Salt': 5, 'Water': 0, 'Oil': 35, 'Potato': 15,
        'Mustard Seeds': 10, 'Poha (Flattened Rice)': 30, 'Peanuts': 25, 'Onion': 15,
        'Turmeric': 5, 'Green Chilies': 8, 'Semolina (Rava)': 25, 'Curry Leaves': 5,
        'Oats': 40, 'Milk': 28, 'Honey': 45, 'Banana': 20, 'Cinnamon': 10, 'Flour': 20,
        'Eggs': 30, 'Maple Syrup': 90, 'Butter': 40, 'Baking Powder': 10, 'Whole Wheat Flour': 25,
        'Spices': 20, 'Bread': 25, 'Pepper': 5, 'Jam': 35, 'Berry Mix': 80, 'Yogurt': 25,
        'Apple': 40, 'Orange': 30, 'Grapes': 40, 'Mint': 5, 'Rajma': 50, 'Rice': 35,
        'Tomato': 20, 'Garlic': 10, 'Ginger': 10, 'Coriander': 5, 'Mixed Vegetables': 60,
        'Basmati Rice': 70, 'Chicken/Paneer': 140, 'Ghee': 50, 'Pasta': 35,
        'Tomato Sauce': 30, 'Cheese': 60, 'Olive Oil': 75, 'Basil': 15, 'Lettuce': 25,
        'Cucumber': 15, 'Lemon': 8, 'Mayonnaise': 25, 'Moong Dal': 45, 'Cumin Seeds': 8,
        'Soy Sauce': 15, 'Spring Onion': 12, 'Tortilla': 30, 'Paneer': 120, 'Bell Pepper': 25,
        'Yogurt Sauce': 20, 'Toor Dal': 50, 'Cream': 40, 'Cauliflower': 30, 'Chicken': 150,
        'Vegetable Broth': 25, 'Carrot': 15, 'Celery': 20, 'Noodles': 25, 'Vinegar': 10,
        'Tofu': 60, 'Sesame Seeds': 12, 'Taco Shells': 45, 'Beans': 20, 'Tomato Salsa': 30,
        'Sour Cream': 35, 'Fish': 180, 'Coconut Milk': 50, 'Tamarind': 15, 'Broccoli': 40
    };

    const DEFAULT_SUBSTITUTIONS = {
        'Paneer': 'Tofu (Plant-based)',
        'Milk': 'Oat Milk (Dairy-free)',
        'Rice': 'Quinoa (Low-carb)',
        'Eggs': 'Tofu Scramble',
        'Butter': 'Olive Oil',
        'Cheese': 'Vegan Cheese',
        'Chicken': 'Jackfruit or Tofu'
    };

    // Override fetch
    window.fetch = async function(url, options) {
        const urlObj = new URL(url, window.location.href);
        const path = urlObj.pathname;
        const method = (options && options.method || 'GET').toUpperCase();
        const getBody = () => options && options.body ? JSON.parse(options.body) : {};

        // Helper mock response
        const jsonResponse = (data, status = 200) => {
            return Promise.resolve(new Response(JSON.stringify(data), {
                status: status,
                headers: { 'Content-Type': 'application/json' }
            }));
        };

        // 1. POST /login
        if (path === '/login' && method === 'POST') {
            const { username, password } = getBody();
            if (username === 'admin' && password === 'admin') {
                return jsonResponse({
                    success: true,
                    user: { id: 1, username: 'admin' }
                });
            }
            return jsonResponse({ success: false, message: "Invalid credentials" }, 401);
        }

        // 2. GET /preferences
        if (path === '/preferences' && method === 'GET') {
            const savedPrefs = localStorage.getItem('cookmate_prefs');
            const preferences = savedPrefs ? JSON.parse(savedPrefs) : { breakfast: [], lunch: [], dinner: [] };
            return jsonResponse({
                success: true,
                preferences: preferences,
                presets: {
                    breakfast: PRESET_BREAKFAST,
                    lunch: PRESET_LUNCH,
                    dinner: PRESET_DINNER
                }
            });
        }

        // 3. POST /preferences
        if (path === '/preferences' && method === 'POST') {
            const { preferences } = getBody();
            localStorage.setItem('cookmate_prefs', JSON.stringify(preferences));
            return jsonResponse({ success: true });
        }

        // 4. POST /meal-plan
        if (path === '/meal-plan' && method === 'POST') {
            const { date, breakfast, lunch, dinner } = getBody();
            const planKey = `cookmate_plan_${date}`;
            
            // Retrieve old plan budget or set default
            const oldPlan = localStorage.getItem(planKey);
            const oldBudget = oldPlan ? JSON.parse(oldPlan).budget : 0.0;

            const plan = { date, breakfast, lunch, dinner, budget: oldBudget };
            localStorage.setItem(planKey, JSON.stringify(plan));
            return jsonResponse({ success: true, meal_plan_id: 1 });
        }

        // 5. GET /meal-plan/<date>
        if (path.startsWith('/meal-plan/') && method === 'GET') {
            const segments = path.split('/');
            const date = segments[segments.length - 1];
            const planKey = `cookmate_plan_${date}`;
            const groceryKey = `cookmate_grocery_${date}`;

            const planData = localStorage.getItem(planKey);
            if (!planData) {
                return jsonResponse({ success: false, message: "Plan not found" }, 404);
            }

            const plan = JSON.parse(planData);
            const groceryItems = JSON.parse(localStorage.getItem(groceryKey) || '[]');
            const savedSubs = localStorage.getItem(`cookmate_subs_${date}`);
            const substitutions = savedSubs ? JSON.parse(savedSubs) : {};

            return jsonResponse({
                success: true,
                meal_plan: {
                    id: 1,
                    breakfast: plan.breakfast,
                    lunch: plan.lunch,
                    dinner: plan.dinner,
                    budget: plan.budget || 0
                },
                grocery_items: groceryItems,
                substitutions: substitutions
            });
        }

        // 6. POST /generate-grocery
        if (path === '/generate-grocery' && method === 'POST') {
            const { date } = getBody();
            const planKey = `cookmate_plan_${date}`;
            const planData = localStorage.getItem(planKey);

            if (!planData) {
                return jsonResponse({ success: false, message: "Plan not found" }, 400);
            }

            const plan = JSON.parse(planData);

            // Attempt to call Netlify function proxy for real Gemini generation
            try {
                const proxyResp = await originalFetch('/.netlify/functions/generate-grocery', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        breakfast: plan.breakfast,
                        lunch: plan.lunch,
                        dinner: plan.dinner
                    })
                });

                if (proxyResp.ok) {
                    const result = await proxyResp.json();
                    if (result.success) {
                        // Store generated items in local storage
                        localStorage.setItem(`cookmate_grocery_${date}`, JSON.stringify(result.grocery_items));
                        localStorage.setItem(`cookmate_subs_${date}`, JSON.stringify(result.substitutions));
                        
                        // Update budget in plan
                        plan.budget = result.budget;
                        localStorage.setItem(planKey, JSON.stringify(plan));

                        return jsonResponse({
                            success: true,
                            grocery_items: result.grocery_items,
                            budget: result.budget,
                            substitutions: result.substitutions,
                            ai_mode: true
                        });
                    }
                }
            } catch (err) {
                console.log("Netlify function call failed or timed out. Falling back to client-side mock engine:", err);
            }

            // Client-side Mock grocery fallback
            const ingredients = new Set();
            [plan.breakfast, plan.lunch, plan.dinner].forEach(meal => {
                if (INGREDIENTS_MAP[meal]) {
                    INGREDIENTS_MAP[meal].forEach(i => ingredients.add(i));
                }
            });

            const sortedIngs = Array.from(ingredients).sort();
            const groceryItems = sortedIngs.map((ing, idx) => ({
                id: idx + 1,
                item: ing,
                checked: false
            }));

            let budget = 0;
            sortedIngs.forEach(ing => {
                budget += INGREDIENT_PRICES[ing] || 30;
            });

            const substitutions = {};
            sortedIngs.forEach(ing => {
                if (DEFAULT_SUBSTITUTIONS[ing]) {
                    substitutions[ing] = DEFAULT_SUBSTITUTIONS[ing];
                }
            });

            localStorage.setItem(`cookmate_grocery_${date}`, JSON.stringify(groceryItems));
            localStorage.setItem(`cookmate_subs_${date}`, JSON.stringify(substitutions));

            plan.budget = budget;
            localStorage.setItem(planKey, JSON.stringify(plan));

            return jsonResponse({
                success: true,
                grocery_items: groceryItems,
                budget: budget,
                substitutions: substitutions,
                ai_mode: false
            });
        }

        // 7. POST /update-grocery-item
        if (path === '/update-grocery-item' && method === 'POST') {
            const { item_id, checked } = getBody();
            
            // Scan through all keys to find the grocery list containing this item
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('cookmate_grocery_')) {
                    const list = JSON.parse(localStorage.getItem(key));
                    const item = list.find(item => item.id === item_id);
                    if (item) {
                        item.checked = checked;
                        localStorage.setItem(key, JSON.stringify(list));
                        return jsonResponse({ success: true });
                    }
                }
            }
            return jsonResponse({ success: false, message: "Item not found" }, 404);
        }

        // 8. GET /calendar
        if (path === '/calendar' && method === 'GET') {
            const today = new Date();
            const dates = [];
            for (let i = -3; i <= 3; i++) {
                const d = new Date();
                d.setDate(today.getDate() + i);
                const iso = d.toISOString().split('T')[0];
                const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
                const dateStr = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                
                dates.push({
                    date_str: dateStr,
                    iso_date: iso,
                    day_name: dayName,
                    is_today: i === 0
                });
            }
            return jsonResponse({ success: true, dates: dates });
        }

        // Pass-through anything else (such as fetching static HTML/CSS/JS files)
        return originalFetch(url, options);
    };
})();
