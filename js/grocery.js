document.addEventListener('DOMContentLoaded', () => {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
        window.location.href = 'index.html';
        return;
    }

    // DOM Elements
    const calendarDaysContainer = document.getElementById('calendar-days');
    const calPrevBtn = document.getElementById('cal-prev');
    const calNextBtn = document.getElementById('cal-next');
    
    const selectedDateTitle = document.getElementById('current-selected-date');
    const selectedDaySubtitle = document.getElementById('current-selected-day');
    
    const dashboardContent = document.getElementById('dashboard-content');
    const emptyState = document.getElementById('empty-state');
    
    const mealBreakfast = document.getElementById('meal-val-breakfast');
    const mealLunch = document.getElementById('meal-val-lunch');
    const mealDinner = document.getElementById('meal-val-dinner');
    
    const groceryContainer = document.getElementById('grocery-checklist-container');
    const budgetVal = document.getElementById('budget-val');
    const substitutionsContainer = document.getElementById('substitutions-container');
    
    const editPlanBtn = document.getElementById('edit-plan-btn');
    const createPlanBtn = document.getElementById('create-plan-btn');
    const regenGroceryBtn = document.getElementById('regen-grocery-btn');
    const logoutBtn = document.getElementById('logout-btn');
    


    let calendarDates = [];
    let selectedDateStr = ''; // YYYY-MM-DD

    // Helper: format YYYY-MM-DD to readable (e.g. 14 Jul 2026)
    function formatReadableDate(isoString) {
        const parts = isoString.split('-');
        const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
        const day = dateObj.getDate();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const month = monthNames[dateObj.getMonth()];
        const year = dateObj.getFullYear();
        return `${day} ${month} ${year}`;
    }



    // Load Calendar
    async function loadCalendar() {
        try {
            const response = await fetch('/calendar');
            const result = await response.json();
            
            if (response.ok && result.success) {
                calendarDates = result.dates;
                
                // Set default date to today
                const todayObj = calendarDates.find(d => d.is_today) || calendarDates[3];
                selectedDateStr = todayObj.iso_date;
                
                renderCalendar();
                loadDailyPlan(selectedDateStr);
            }
        } catch (error) {
            console.error('Error loading calendar:', error);
            // Standalone calendar creation if backend fails
            generateFallbackCalendar();
        }
    }

    function generateFallbackCalendar() {
        const today = new Date();
        calendarDates = [];
        for (let i = -3; i <= 3; i++) {
            const d = new Date();
            d.setDate(today.getDate() + i);
            const iso = d.toISOString().split('T')[0];
            const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
            const dateStr = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
            
            calendarDates.push({
                date_str: dateStr,
                iso_date: iso,
                day_name: dayName,
                is_today: i === 0
            });
        }
        selectedDateStr = calendarDates[3].iso_date;
        renderCalendar();
        loadDailyPlan(selectedDateStr);
    }

    function renderCalendar() {
        calendarDaysContainer.innerHTML = '';
        calendarDates.forEach(day => {
            const btn = document.createElement('button');
            btn.className = 'calendar-day-btn';
            if (day.iso_date === selectedDateStr) {
                btn.classList.add('selected');
            }
            
            // Mark today with a subtle indicator if needed
            btn.innerHTML = `
                <span class="calendar-day-name">${day.is_today ? 'TODAY' : day.day_name.substring(0, 3)}</span>
                <span class="calendar-day-date">${day.date_str.split(' ')[0]}</span>
            `;
            
            btn.addEventListener('click', () => {
                selectedDateStr = day.iso_date;
                // Update selection visually
                const allBtns = calendarDaysContainer.querySelectorAll('.calendar-day-btn');
                allBtns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                
                loadDailyPlan(selectedDateStr);
            });
            
            calendarDaysContainer.appendChild(btn);
        });
    }

    // Navigation arrows click events
    calPrevBtn.addEventListener('click', () => {
        const idx = calendarDates.findIndex(d => d.iso_date === selectedDateStr);
        if (idx > 0) {
            selectedDateStr = calendarDates[idx - 1].iso_date;
            renderCalendar();
            loadDailyPlan(selectedDateStr);
            scrollToActiveDay();
        }
    });

    calNextBtn.addEventListener('click', () => {
        const idx = calendarDates.findIndex(d => d.iso_date === selectedDateStr);
        if (idx < calendarDates.length - 1) {
            selectedDateStr = calendarDates[idx + 1].iso_date;
            renderCalendar();
            loadDailyPlan(selectedDateStr);
            scrollToActiveDay();
        }
    });

    function scrollToActiveDay() {
        const activeBtn = calendarDaysContainer.querySelector('.calendar-day-btn.selected');
        if (activeBtn) {
            calendarDaysContainer.scrollTo({
                left: activeBtn.offsetLeft - (calendarDaysContainer.clientWidth / 2) + (activeBtn.clientWidth / 2),
                behavior: 'smooth'
            });
        }
    }

    // Load Daily Plan & Grocery Items
    async function loadDailyPlan(date) {
        selectedDateTitle.textContent = formatReadableDate(date);
        
        // Find day name from array
        const dayObj = calendarDates.find(d => d.iso_date === date);
        selectedDaySubtitle.textContent = dayObj ? dayObj.day_name : '';
        
        // Reset view
        dashboardContent.style.display = 'none';
        emptyState.style.display = 'none';

        try {
            const response = await fetch(`/meal-plan/${date}?user_id=${userId}`);
            const result = await response.json();

            if (response.ok && result.success) {
                // Show dashboard content
                dashboardContent.style.display = 'block';
                
                // Set meals
                mealBreakfast.textContent = result.meal_plan.breakfast || '-';
                mealLunch.textContent = result.meal_plan.lunch || '-';
                mealDinner.textContent = result.meal_plan.dinner || '-';
                
                // Set budget
                budgetVal.textContent = `₹${result.meal_plan.budget || 0}`;
                
                // Set substitutions
                renderSubstitutions(result.substitutions || {});
                
                // Set grocery list
                renderGroceryChecklist(result.grocery_items || []);
                
                // Set edit button links
                editPlanBtn.href = `planner.html?date=${date}`;
            } else {
                // Meal plan doesn't exist for this day
                emptyState.style.display = 'block';
            }
        } catch (error) {
            console.error('Error loading daily plan:', error);
            emptyState.style.display = 'block';
        }
    }

    function renderSubstitutions(subs) {
        substitutionsContainer.innerHTML = '';
        const keys = Object.keys(subs);
        if (keys.length === 0) {
            substitutionsContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 12px; font-style: italic;">No substitutions needed</div>';
            return;
        }
        
        keys.forEach(orig => {
            const item = document.createElement('div');
            item.className = 'sub-item';
            item.innerHTML = `
                <span class="sub-from">${orig}</span>
                <span class="sub-arrow">➔</span>
                <span class="sub-to">${subs[orig]}</span>
            `;
            substitutionsContainer.appendChild(item);
        });
    }

    function renderGroceryChecklist(items) {
        groceryContainer.innerHTML = '';
        if (items.length === 0) {
            groceryContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 13px; font-style: italic; padding: 12px 0; text-align: center;">Grocery list is empty. Click Regenerate below.</div>';
            return;
        }

        items.forEach(item => {
            const li = document.createElement('li');
            li.className = 'checklist-item';
            if (item.checked) {
                li.classList.add('checked');
            }
            
            li.innerHTML = `
                <div class="checklist-checkbox">${item.checked ? '✓' : ''}</div>
                <span class="checklist-text">${item.item}</span>
            `;
            
            li.addEventListener('click', () => toggleChecklistItem(item, li));
            groceryContainer.appendChild(li);
        });
    }

    // Toggle Checklist items
    async function toggleChecklistItem(item, element) {
        const isChecked = !element.classList.contains('checked');
        
        // Optimistic UI update
        if (isChecked) {
            element.classList.add('checked');
            element.querySelector('.checklist-checkbox').textContent = '✓';
        } else {
            element.classList.remove('checked');
            element.querySelector('.checklist-checkbox').textContent = '';
        }

        try {
            const response = await fetch('/update-grocery-item', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    item_id: item.id,
                    checked: isChecked
                })
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                // Rollback if failure
                element.classList.toggle('checked');
                element.querySelector('.checklist-checkbox').textContent = isChecked ? '' : '✓';
                console.error('Failed to sync checklist checkbox state with server');
            }
        } catch (error) {
            element.classList.toggle('checked');
            element.querySelector('.checklist-checkbox').textContent = isChecked ? '' : '✓';
            console.error('Network error during checklist syncing:', error);
        }
    }

    // Regenerate Grocery list
    regenGroceryBtn.addEventListener('click', async () => {
        regenGroceryBtn.disabled = true;
        regenGroceryBtn.textContent = '🔄 Loading...';
        
        try {
            const response = await fetch('/generate-grocery', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: userId,
                    date: selectedDateStr
                })
            });
            
            const result = await response.json();
            if (response.ok && result.success) {
                // Update budget
                budgetVal.textContent = `₹${result.budget}`;
                // Re-render checklist
                renderGroceryChecklist(result.grocery_items || []);
                // Re-render substitutions
                renderSubstitutions(result.substitutions || {});
            } else {
                alert('Error regenerating grocery list: ' + (result.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error generating grocery list:', error);
            alert('Network error while generating grocery list.');
        } finally {
            regenGroceryBtn.disabled = false;
            regenGroceryBtn.textContent = '🔄 Regenerate';
        }
    });



    // Create plan button redirects to planner
    createPlanBtn.addEventListener('click', () => {
        window.location.href = `planner.html?date=${selectedDateStr}`;
    });

    // Logout
    logoutBtn.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'index.html';
    });

    // Start loading
    loadCalendar();
});
