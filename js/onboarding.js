document.addEventListener('DOMContentLoaded', () => {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
        window.location.href = 'index.html';
        return;
    }

    const titleEl = document.getElementById('step-title');
    const descEl = document.getElementById('step-description');
    const containerEl = document.getElementById('dishes-container');
    const counterEl = document.getElementById('selected-count');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const progressBar = document.getElementById('stepper-progress');

    // Stepper nodes
    const stepNodes = [
        document.getElementById('step-node-1'),
        document.getElementById('step-node-2'),
        document.getElementById('step-node-3')
    ];

    let currentStep = 0; // 0 = Breakfast, 1 = Lunch, 2 = Dinner
    
    // User selections
    const selections = {
        breakfast: [],
        lunch: [],
        dinner: []
    };

    // Preset data fallbacks
    let presets = {
        breakfast: ['Idli', 'Dosa', 'Poha', 'Upma', 'Oats', 'Pancakes', 'Paratha', 'Eggs', 'Toast', 'Smoothie', 'Fruit Bowl'],
        lunch: ['Rajma Rice', 'Roti Sabzi', 'Biryani', 'Pasta', 'Salad', 'Sandwich', 'Khichdi', 'Fried Rice', 'Paneer Wrap', 'Dal Chawal'],
        dinner: ['Paneer Curry', 'Dal Tadka', 'Aloo Gobi', 'Chicken Curry', 'Soup', 'Noodles', 'Stir Fry', 'Tacos', 'Fish Curry', 'Sautéed Veggies']
    };

    const stepInfo = [
        {
            key: 'breakfast',
            title: 'Favorite Breakfasts',
            description: 'Select at least 5 breakfast dishes you enjoy. We will use these to generate your plans.'
        },
        {
            key: 'lunch',
            title: 'Favorite Lunches',
            description: 'Select at least 5 lunch options to build your customized afternoon menu.'
        },
        {
            key: 'dinner',
            title: 'Favorite Dinners',
            description: 'Select at least 5 dinner dishes for your evening meal variety.'
        }
    ];

    // Initial fetch of presets & any existing preferences
    async function loadPreferences() {
        try {
            const response = await fetch(`/preferences?user_id=${userId}`);
            const result = await response.json();
            
            if (response.ok && result.success) {
                if (result.presets) {
                    presets = result.presets;
                }
                
                // Pre-populate selections if user already completed it before
                if (result.preferences) {
                    selections.breakfast = result.preferences.breakfast || [];
                    selections.lunch = result.preferences.lunch || [];
                    selections.dinner = result.preferences.dinner || [];
                }
            }
        } catch (error) {
            console.error('Error fetching preferences:', error);
            // Fall back to hardcoded presets
        }
        
        renderStep();
    }

    function renderStep() {
        const step = stepInfo[currentStep];
        const mealKey = step.key;
        const availableDishes = presets[mealKey];
        const selectedDishes = selections[mealKey];

        // Update titles
        titleEl.textContent = step.title;
        descEl.textContent = step.description;

        // Render chips
        containerEl.innerHTML = '';
        availableDishes.forEach(dish => {
            const chip = document.createElement('div');
            chip.className = 'chip';
            if (selectedDishes.includes(dish)) {
                chip.classList.add('selected');
            }
            chip.textContent = dish;
            
            chip.addEventListener('click', () => toggleDishSelection(mealKey, dish, chip));
            containerEl.appendChild(chip);
        });

        // Update counter & navigation buttons
        updateCounterAndButton(mealKey);
        updateStepperUI();
    }

    function toggleDishSelection(mealKey, dish, chipEl) {
        const selectedList = selections[mealKey];
        const index = selectedList.indexOf(dish);

        if (index > -1) {
            // Remove
            selectedList.splice(index, 1);
            chipEl.classList.remove('selected');
        } else {
            // Add
            selectedList.push(dish);
            chipEl.classList.add('selected');
        }

        updateCounterAndButton(mealKey);
    }

    function updateCounterAndButton(mealKey) {
        const count = selections[mealKey].length;
        counterEl.textContent = count;

        if (count >= 5) {
            nextBtn.disabled = false;
        } else {
            nextBtn.disabled = true;
        }

        // Stepper button values
        if (currentStep === 2) {
            nextBtn.textContent = 'Finish Onboarding';
        } else {
            nextBtn.textContent = 'Next Step';
        }

        if (currentStep === 0) {
            prevBtn.style.display = 'none';
        } else {
            prevBtn.style.display = 'block';
        }
    }

    function updateStepperUI() {
        // Calculate progress bar width
        // Step 0: 0%, Step 1: 50%, Step 2: 100%
        const progressWidth = currentStep * 50;
        progressBar.style.width = `${progressWidth}%`;

        // Update active classes on step nodes
        stepNodes.forEach((node, idx) => {
            node.className = 'step-node';
            if (idx < currentStep) {
                node.classList.add('completed');
                node.innerHTML = '✓';
            } else if (idx === currentStep) {
                node.classList.add('active');
                node.innerHTML = idx + 1;
            } else {
                node.innerHTML = idx + 1;
            }
        });
    }

    // Event Handlers
    nextBtn.addEventListener('click', async () => {
        if (currentStep < 2) {
            currentStep++;
            renderStep();
        } else {
            // Final step: Save preferences to backend
            nextBtn.disabled = true;
            nextBtn.textContent = 'Saving Profile...';

            try {
                const response = await fetch('/preferences', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        user_id: userId,
                        preferences: selections
                    })
                });

                const result = await response.json();
                if (response.ok && result.success) {
                    window.location.href = 'planner.html';
                } else {
                    alert('Error saving preferences: ' + (result.message || 'Unknown error'));
                    nextBtn.disabled = false;
                    nextBtn.textContent = 'Finish Onboarding';
                }
            } catch (error) {
                console.error('Error saving preferences:', error);
                alert('Network error while saving taste profile.');
                nextBtn.disabled = false;
                nextBtn.textContent = 'Finish Onboarding';
            }
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentStep > 0) {
            currentStep--;
            renderStep();
        }
    });

    // Start
    loadPreferences();
});
