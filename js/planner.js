document.addEventListener('DOMContentLoaded', () => {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
        window.location.href = 'index.html';
        return;
    }

    const titleEl = document.getElementById('planner-title');
    const containerEl = document.getElementById('meal-cards-container');
    const prevBtn = document.getElementById('plan-prev-btn');
    const nextBtn = document.getElementById('plan-next-btn');
    const progressBar = document.getElementById('planner-progress');

    const stepNodes = [
        document.getElementById('planner-node-1'),
        document.getElementById('planner-node-2'),
        document.getElementById('planner-node-3')
    ];

    let currentStep = 0; // 0 = Breakfast, 1 = Lunch, 2 = Dinner
    
    // User preferences loaded from backend
    let userPreferences = {
        breakfast: [],
        lunch: [],
        dinner: []
    };

    // User's selections for today
    const selections = {
        breakfast: '',
        lunch: '',
        dinner: ''
    };

    const stepsInfo = [
        {
            key: 'breakfast',
            title: "What's for breakfast today?",
            label: "Breakfast"
        },
        {
            key: 'lunch',
            title: "What's for lunch today?",
            label: "Lunch"
        },
        {
            key: 'dinner',
            title: "What's for dinner today?",
            label: "Dinner"
        }
    ];

    async function loadUserPreferences() {
        try {
            const response = await fetch(`/preferences?user_id=${userId}`);
            const result = await response.json();
            
            if (response.ok && result.success) {
                userPreferences = result.preferences;
                
                // If user hasn't completed onboarding, redirect them
                const totalPrefs = 
                    userPreferences.breakfast.length + 
                    userPreferences.lunch.length + 
                    userPreferences.dinner.length;
                    
                if (totalPrefs === 0) {
                    window.location.href = 'onboarding.html';
                    return;
                }
                
                renderStep();
            } else {
                window.location.href = 'onboarding.html';
            }
        } catch (error) {
            console.error('Error loading preferences:', error);
            alert('Failed to load preferences. Falling back to onboarding.');
            window.location.href = 'onboarding.html';
        }
    }

    function renderStep() {
        const step = stepsInfo[currentStep];
        const mealKey = step.key;
        const choices = userPreferences[mealKey] || [];
        const currentSelection = selections[mealKey];

        // Update titles
        titleEl.textContent = step.title;

        // Render card options
        containerEl.innerHTML = '';

        // Render "Surprise Me" Card first
        const surpriseCard = document.createElement('div');
        surpriseCard.className = 'meal-option-card surprise-card';
        surpriseCard.innerHTML = `
            <div>
                <div class="meal-option-title">🎲 Surprise Me</div>
                <div style="font-size: 12px; color: var(--primary-dark); opacity: 0.8; margin-top: 4px;">Let AI choose from your favorites</div>
            </div>
            <div style="color: var(--primary); font-weight: bold; font-size: 18px;">➔</div>
        `;
        surpriseCard.addEventListener('click', () => triggerSurpriseMe(mealKey, choices));
        containerEl.appendChild(surpriseCard);

        // Render standard dish cards
        choices.forEach(dish => {
            const card = document.createElement('div');
            card.className = 'meal-option-card';
            if (dish === currentSelection) {
                card.classList.add('selected');
            }

            card.innerHTML = `
                <div class="meal-option-title">${dish}</div>
                <div class="icon-check">${dish === currentSelection ? '✓' : ''}</div>
            `;

            card.addEventListener('click', () => selectDish(mealKey, dish, card));
            containerEl.appendChild(card);
        });

        updateNavButtons();
        updateStepperUI();
    }

    function selectDish(mealKey, dish, cardEl) {
        // Deselect previous
        const selectedCards = containerEl.querySelectorAll('.meal-option-card.selected');
        selectedCards.forEach(c => {
            c.classList.remove('selected');
            const check = c.querySelector('.icon-check');
            if (check) check.textContent = '';
        });

        // Select current
        selections[mealKey] = dish;
        cardEl.classList.add('selected');
        const check = cardEl.querySelector('.icon-check');
        if (check) check.textContent = '✓';

        updateNavButtons();
    }

    // Flashing effect for Surprise Me selection
    function triggerSurpriseMe(mealKey, choices) {
        if (choices.length === 0) return;
        
        const cards = containerEl.querySelectorAll('.meal-option-card:not(.surprise-card)');
        if (cards.length === 0) return;

        // Disable UI interactions during animation
        nextBtn.disabled = true;
        prevBtn.disabled = true;
        
        let counter = 0;
        const intervals = 8;
        const speed = 70; // ms

        const intervalId = setInterval(() => {
            // Unhighlight all
            cards.forEach(c => c.classList.remove('selected'));
            
            // Highlight a random one
            const randomIdx = Math.floor(Math.random() * cards.length);
            cards[randomIdx].classList.add('selected');
            
            counter++;
            if (counter >= intervals) {
                clearInterval(intervalId);
                
                // Final selection
                const finalIdx = Math.floor(Math.random() * choices.length);
                const finalDish = choices[finalIdx];
                selections[mealKey] = finalDish;
                
                // Re-render to finalize visual checkmarks and enable navigation
                renderStep();
            }
        }, speed);
    }

    function updateNavButtons() {
        const step = stepsInfo[currentStep];
        const hasSelection = !!selections[step.key];

        if (hasSelection) {
            nextBtn.disabled = false;
        } else {
            nextBtn.disabled = true;
        }

        if (currentStep === 2) {
            nextBtn.textContent = 'Finish Planning';
        } else {
            nextBtn.textContent = 'Next Meal';
        }

        if (currentStep === 0) {
            prevBtn.style.display = 'none';
        } else {
            prevBtn.style.display = 'block';
        }
        
        prevBtn.disabled = false;
    }

    function updateStepperUI() {
        const progressWidth = currentStep * 50;
        progressBar.style.width = `${progressWidth}%`;

        stepNodes.forEach((node, idx) => {
            node.className = 'step-node';
            if (idx < currentStep) {
                node.classList.add('completed');
                node.innerHTML = '✓';
            } else if (idx === currentStep) {
                node.classList.add('active');
            }
        });
    }

    nextBtn.addEventListener('click', async () => {
        if (currentStep < 2) {
            currentStep++;
            renderStep();
        } else {
            // Save today's meal plan to database
            nextBtn.disabled = true;
            nextBtn.textContent = 'Saving Plan...';

            // Get local date in YYYY-MM-DD, or retrieve from URL query parameters
            const urlParams = new URLSearchParams(window.location.search);
            const dateParam = urlParams.get('date');
            let dateStr = dateParam;
            if (!dateStr) {
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const day = String(today.getDate()).padStart(2, '0');
                dateStr = `${year}-${month}-${day}`;
            }

            try {
                // 1. Save meal plan
                const planResponse = await fetch('/meal-plan', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        user_id: userId,
                        date: dateStr,
                        breakfast: selections.breakfast,
                        lunch: selections.lunch,
                        dinner: selections.dinner
                    })
                });

                const planResult = await planResponse.json();

                if (planResponse.ok && planResult.success) {
                    // 2. Generate initial grocery list
                    const groceryResponse = await fetch('/generate-grocery', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            user_id: userId,
                            date: dateStr
                        })
                    });

                    const groceryResult = await groceryResponse.json();
                    if (groceryResponse.ok && groceryResult.success) {
                        window.location.href = 'grocery.html';
                    } else {
                        alert('Meal plan saved, but error generating groceries: ' + (groceryResult.message || 'Unknown error'));
                        window.location.href = 'grocery.html';
                    }
                } else {
                    alert('Error saving meal plan: ' + (planResult.message || 'Unknown error'));
                    nextBtn.disabled = false;
                    nextBtn.textContent = 'Finish Planning';
                }
            } catch (error) {
                console.error('Error saving plan/groceries:', error);
                alert('Network error while planning meals.');
                nextBtn.disabled = false;
                nextBtn.textContent = 'Finish Planning';
            }
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentStep > 0) {
            currentStep--;
            renderStep();
        }
    });

    // Start loading
    loadUserPreferences();
});
