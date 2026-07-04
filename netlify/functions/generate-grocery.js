// Netlify Serverless Function: secure backend proxy for Google Gemini API.
// Reads GEMINI_API_KEY from environment variables configured in your Netlify dashboard.

exports.handler = async function(event, context) {
    // Enable CORS preflight
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "POST, OPTIONS"
            },
            body: ""
        };
    }

    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            body: JSON.stringify({ success: false, message: "Method Not Allowed" })
        };
    }

    try {
        const { breakfast, lunch, dinner } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return {
                statusCode: 400,
                headers: { 
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
                body: JSON.stringify({
                    success: false,
                    message: "GEMINI_API_KEY is not set on Netlify. Please set GEMINI_API_KEY in your Netlify Site Configuration variables."
                })
            };
        }

        const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";
        const prompt = `You are a culinary expert assisting a user with their daily meal plan.
The user selected the following meals:
- Breakfast: ${breakfast}
- Lunch: ${lunch}
- Dinner: ${dinner}

Generate a combined, de-duplicated, and sorted grocery list of raw ingredients needed.
Also estimate the total grocery budget in INR (₹) for these ingredients in a local Indian market.
Provide healthy or dietary substitutions for at least 3 main ingredients (e.g. Paneer to Tofu, Rice to Quinoa, Milk to Oat Milk, etc.).

Response must be in JSON format matching this schema:
{
  "ingredients": ["Ingredient 1", "Ingredient 2", ...],
  "substitutions": {
    "Original Ingredient": "Substituted Ingredient",
    ...
  },
  "estimated_budget_inr": 420
}
Ensure estimated_budget_inr is an integer.`;

        const payload = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                responseMimeType: "application/json"
            }
        };

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-goog-api-key": apiKey
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini API error: ${response.status} - ${errText}`);
        }

        const resData = await response.json();
        const textResp = resData.candidates[0].content.parts[0].text;
        const parsed = JSON.parse(textResp);

        return {
            statusCode: 200,
            headers: { 
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*" 
            },
            body: JSON.stringify({
                success: true,
                grocery_items: (parsed.ingredients || []).map((item, idx) => ({ id: idx + 1, item, checked: false })),
                budget: parsed.estimated_budget_inr || 400,
                substitutions: parsed.substitutions || {},
                ai_mode: true
            })
        };

    } catch (error) {
        console.error("Netlify function proxy error:", error);
        return {
            statusCode: 500,
            headers: { 
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({ success: false, message: error.message })
        };
    }
};
