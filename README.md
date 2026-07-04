# CookMate AI

A high-fidelity hackathon prototype for a personalized daily cooking assistant. CookMate AI helps users generate a personalized daily meal schedule and compiles a de-duplicated, sorted grocery list for selected dates with interactive check-off capabilities, estimated budgets, and healthy ingredient substitutions.

## Project Overview

CookMate AI bridges the gap between daily productivity and personal nutrition. The application provides an onboarding flow inspired by Spotify's taste selection, allowing users to choose their favorite breakfast, lunch, and dinner dishes, which are then used to build their daily meal plans. 

By integrating with Google's **Gemini Flash (gemini-flash-latest)** model via direct API requests, the app dynamically constructs grocery checklists, performs budget projections, and identifies dietary substitutions.

## Problem Statement

Modern individuals face decision fatigue when deciding what to cook daily, leading to disorganized shopping, food waste, budget overruns, and dietary inconsistencies. CookMate AI simplifies this by offering:
- Personalized, preference-based meal planning.
- Structured daily breakfast, lunch, and dinner planning.
- Automatic, de-duplicated grocery list compilation.
- Dynamic market budget estimation.
- Healthy or plant-based ingredient substitutions.
- Horizontal calendar navigation for past, current, and future day planning.

## Tech Stack

- **Frontend**: Semantic HTML5, CSS3 Custom Properties (Vanilla CSS), Modular Vanilla JavaScript.
- **Backend**: Python Flask web server.
- **Database**: SQLite3.
- **AI Integration**: Google Gemini API via HTTPS (`gemini-flash-latest`).
- **Dependencies**: `Flask`, `requests`, `python-dotenv`, `werkzeug`.

## Folder Structure

```
cookmate/
├── .env                  # Environment secrets (GEMINI_API_KEY)
├── README.md             # Project documentation
├── app.py                # Main Flask server application
├── database.db           # SQLite database
├── database.py           # Database helper module
├── requirements.txt      # Python dependencies
├── css/
│   └── style.css         # Styling, design tokens, micro-animations
├── js/
│   ├── login.js          # Authentication controller
│   ├── onboarding.js     # Taste profile stepper controller
│   ├── planner.js        # Daily meal selection controller
│   └── grocery.js        # Grocery list & calendar dashboard controller
├── index.html            # Screen 1: Login UI
├── onboarding.html       # Screen 2: Taste Onboarding UI
├── planner.html          # Screen 3: Today's Meal Planner UI
├── grocery.html          # Screen 4: Grocery List & Calendar UI
├── tests/
│   └── test_app.py       # Automated python tests
└── venv/                 # Virtual environment
```

## Installation & Setup

1. **Clone/Navigate** to the project folder.
2. **Set up the environment**:
   Create a `.env` file in the root directory (one has been seeded automatically):
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   FLASK_SECRET_KEY=cookmate_secret_key_123
   ```
3. **Initialize the Virtual Environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
4. **Initialize the SQLite Database**:
   ```bash
   python3 database.py
   ```

## Running Locally

To launch the local Flask web server:
```bash
python3 app.py
```
Then, open your web browser and navigate to:
[http://127.0.0.1:5000](http://127.0.0.1:5000)

### Demo Credentials
- **Username**: `admin`
- **Password**: `admin`

## Quality Attributes

### Accessibility
- **Semantic HTML**: Fully built with native `<header>`, `<main>`, `<footer>`, `<form>`, `<button>`, and `<ul>` elements.
- **Labels & Forms**: Form inputs are explicitly coupled with `<label>` tags. Focus styles have clear active green outlines.
- **Alt & Title Attributes**: Semantic SVGs are annotated with alternative titles and ARIA descriptions where relevant.

### Security
- **SQL Injection Prevention**: Uses parameterized SQLite queries (using `?` placeholders) for all database reads, writes, and deletions.
- **Credential Storage**: Passwords are saved as secure SHA256 hashes using `werkzeug.security.generate_password_hash` and verified via `check_password_hash`.
- **Environment Isolation**: API Keys are loaded dynamically from `.env` or session memory, preventing sensitive credentials from leaks.

### Performance
- **Modular Scripts**: Separate, cohesive JS controller files for each screen.
- **Efficient DOM Management**: Clean DOM insertion queries, minimizing layout thrashing.
- **Zero-Dependency Frontend**: Pure HTML/CSS/JS without heavy UI frameworks (React/Vue) or utility engines (Tailwind) to optimize LCP.

### Testing
To run the automated Python backend tests:
```bash
python3 -m unittest discover -s tests -p "test_*.py"
```

## Netlify Deployment (Serverless Mode)

CookMate AI is equipped with a hybrid execution engine that allows it to run serverless on platforms like Netlify.

### How it Works:
1. **Frontend Detects Runtime**: If the frontend detects that it is running in a static web hosting environment (such as `*.netlify.app` or any port other than the Flask server `5000`), it automatically activates **Serverless Mode** via [api.js](file:///Users/B0338394/Desktop/dpdpa/groceryit/js/api.js).
2. **Client-Side Storage**: In serverless mode, all SQLite operations (authentications, taste preferences, meal plans, checklist states) are transparently mocked using the browser's persistent `localStorage`.
3. **Secure API Key Proxying**: To call Gemini without exposing the API key, the frontend routes the grocery generation calls through a secure Netlify serverless function (`netlify/functions/generate-grocery.js`).

### Deployment Instructions:
1. **GitHub Upload**: Push this repository to your GitHub account.
2. **Connect to Netlify**: Import the repository into Netlify as a new site.
   - Add a variable named `GEMINI_API_KEY` and set its value to your Gemini key:
     `<your_gemini_api_key_here>`
3. **Deploy**: Trigger a deploy. Netlify will build the site, locate the `netlify.toml` file, publish the static frontend, and host the secure Python/JS proxy function on the cloud!

## Future Improvements

1. **Ingredient Quantities**: Expand grocery calculations to specify exact metric weights or volumes for lists.
2. **Multi-user Isolation**: Full registration and account settings controls.
3. **Pantry Inventory Tracking**: Introduce a "Pantry Stock" feature that automatically subtracts grocery items the user already possesses.
4. **Swiggy Cart Integration**: Integrate with Swiggy API to automatically add generated items to the checkout cart.
