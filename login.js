// Simple login handler
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    if (!loginForm) {
        console.error('Login form not found!');
        return;
    }

    // Initialize Parse
    Parse.initialize(
        '1ViZN5pbU94AJep2LHr2owBflGOGedwvYliU50g0',
        '7CE7gnknAyyfSZRTWpqvuDvNhLOMsF0DNYk8qvgn'
    );
    Parse.serverURL = 'https://parseapi.back4app.com/';

    loginForm.onsubmit = async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const button = document.querySelector('button[type="submit"]');
        
        if (!username || !password) {
            alert('Please enter both username and password');
            return false;
        }

        // Disable button and show loading
        button.disabled = true;
        button.textContent = 'Logging in...';
        
        try {
            const user = await Parse.User.logIn(username, password);
            if (user) {
                window.location.href = './dashboard.html';
            } else {
                throw new Error('Login failed');
            }
        } catch (error) {
            alert(error.message || 'Login failed');
            button.textContent = 'Login';
            button.disabled = false;
        }
        
        return false;
    };
});
