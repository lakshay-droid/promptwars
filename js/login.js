document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');
    const loginBtn = document.getElementById('login-btn');

    // If user is already logged in, redirect to onboarding
    if (localStorage.getItem('user_id')) {
        window.location.href = 'onboarding.html';
        return;
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        
        if (!username || !password) {
            showError('Please fill in all fields.');
            return;
        }

        // Disable button & show loading state
        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';
        errorMessage.style.display = 'none';

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Store user details in localStorage
                localStorage.setItem('user_id', result.user.id);
                localStorage.setItem('username', result.user.username);
                
                // Redirect to taste onboarding
                window.location.href = 'onboarding.html';
            } else {
                showError(result.message || 'Login failed. Please check your credentials.');
                loginBtn.disabled = false;
                loginBtn.textContent = 'Login';
            }
        } catch (error) {
            console.error('Error logging in:', error);
            showError('Network error. Is the Flask backend running?');
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
        }
    });

    function showError(msg) {
        errorMessage.textContent = msg;
        errorMessage.style.display = 'block';
        // Shake animation effect for card on error
        const card = document.querySelector('.card');
        card.style.animation = 'shake 0.4s ease';
        setTimeout(() => {
            card.style.animation = '';
        }, 400);
    }
});

// CSS keyframe injection for shake effect
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-6px); }
        75% { transform: translateX(6px); }
    }
`;
document.head.appendChild(style);
