document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginButton = document.querySelector('.login-button');
    const loginBox = document.querySelector('.login-box');

    // Create an element for displaying messages (success/error)
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    loginForm.insertBefore(messageDiv, loginButton);

    // --- Back4App Parse SDK Initialization (IMPORTANT: Replace with your actual keys) ---
    // YOU HAD A TYPO HERE: parseapi.back4app.coml was parseapi.back4app.com/
    // Ensure this URL is exactly what Back4App provides!
    const B4A_APP_ID = '1ViZN5pbU94AJep2LHr2owBflGOGedwvYliU50g0'; // Replace with your Application ID
    const B4A_JS_KEY = '7CE7gnknAyyfSZRTWpqvuDvNhLOMsF0DNYk8qvgn';   // Replace with your JavaScript Key
    const B4A_SERVER_URL = 'https://parseapi.back4app.com';   // CORRECTED: Ensure this is your exact Server URL from Back4App.

    // Utility for displaying messages (defined here to ensure it's available even on early errors)
    // This is a local copy for loginPage.js
    function showMessage(message, type = "info", duration = 3000) {
        let messageBox = document.getElementById('appMessage');
        if (!messageBox) {
            messageBox = document.createElement('div');
            messageBox.id = 'appMessage';
            messageBox.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 8px;
                font-weight: bold;
                color: white;
                z-index: 9999;
                opacity: 0;
                transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out;
                transform: translateY(-20px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            `;
            document.body.appendChild(messageBox);
        }

        messageBox.textContent = message;
        messageBox.className = 'message'; // Reset classes
        if (type === "success") {
            messageBox.style.backgroundColor = '#4CAF50'; // Green
        } else if (type === "error") {
            messageBox.style.backgroundColor = '#f44336'; // Red
        } else {
            messageBox.style.backgroundColor = '#2196F3'; // Blue
        }

        // Show message
        messageBox.style.opacity = '1';
        messageBox.style.transform = 'translateY(0)';

        // Hide message after duration
        setTimeout(() => {
            messageBox.style.opacity = '0';
            messageBox.style.transform = 'translateY(-20px)';
            messageBox.addEventListener('transitionend', () => {
                if (messageBox.style.opacity === '0') {
                    messageBox.remove(); // Remove from DOM after fade out
                }
            }, { once: true });
        }, duration);
    }


    // Check if Parse is loaded before initializing
    if (typeof Parse !== 'undefined') {
        Parse.initialize(B4A_APP_ID, B4A_JS_KEY);
        Parse.serverURL = B4A_SERVER_URL;
        console.log("Back4App Parse SDK Initialized.");
    } else {
        console.error("Parse SDK not loaded. Please ensure https://unpkg.com/parse/dist/parse.min.js is included correctly.");
        showMessage("Application error: Backend SDK not loaded. Cannot login.", "error", 5000);
        return; // Prevent further execution if Parse is not available
    }

    // Add event listener for form submission
    loginForm.addEventListener('submit', async (event) => { // Added 'async' keyword
        event.preventDefault();

        const username = usernameInput.value;
        const password = passwordInput.value;

        // --- Reset message state before showing a new one ---
        messageDiv.style.opacity = '0';
        messageDiv.textContent = '';
        messageDiv.className = 'message';

        if (!username || !password) {
            showMessage('Please enter both username and password.', 'error');
            return;
        }

        // --- Use Parse.User.logIn() for authentication ---
        try {
            loginButton.disabled = true; // Disable button during login attempt
            loginButton.textContent = 'Logging in...'; // Provide feedback

            const user = await Parse.User.logIn(username, password);
            console.log('Login successful:', user);
            showMessage('Login Successful! Redirecting...', 'success');

            // First setTimeout: Keep the "Login Successful!" message visible for 1 second
            setTimeout(() => {
                loginBox.style.opacity = '0';
                loginBox.style.transform = 'scale(0.8)';

                setTimeout(() => {
                    document.body.innerHTML = `
                        <div class="loading-screen">
                            Loading SchoolFlow Dashboard...
                            <div class="spinner"></div>
                        </div>
                    `;
                    document.body.classList.add('fade-out-page');
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 500);
                }, 800);

            }, 1000);

        } catch (error) {
            // Handle Parse login errors
            console.error('Error during login:', error);
            // Ensure showMessage is always available for error handling
            showMessage(`Login failed: ${error.message}`, 'error');
            loginButton.disabled = false; // Re-enable button
            loginButton.textContent = 'Login';
        }
    });
});
