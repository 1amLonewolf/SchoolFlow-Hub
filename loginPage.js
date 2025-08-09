// loginPage.js

// Utility for displaying messages (defined globally in this script to ensure availability)
function showMessage(message, type = "info", duration = 3000) {
    let messageBox = document.getElementById('appMessage');
    if (!messageBox) {
        messageBox = document.createElement('div');
        messageBox.id = 'appMessage';
        messageBox.setAttribute('role', 'status');
        messageBox.setAttribute('aria-live', 'polite');
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


// --- DOM Content Loaded Event ---
document.addEventListener('DOMContentLoaded', () => {
    // Get references to DOM elements
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('loginButton');
    const loginBox = document.querySelector('.login-box');
    const darkModeToggle = document.getElementById('darkModeToggle');

    // Debug element existence
    console.log('Elements found:', {
        form: !!loginForm,
        username: !!usernameInput,
        password: !!passwordInput,
        button: !!loginButton,
        box: !!loginBox
    });

    // Verify elements are found
    if (!loginForm || !usernameInput || !passwordInput || !loginButton) {
        console.error('Required login elements not found!', {
            form: !!loginForm,
            username: !!usernameInput,
            password: !!passwordInput,
            button: !!loginButton
        });
        showMessage('Error initializing login form', 'error');
        return;
    }

    // Create message div dynamically
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    loginForm.appendChild(messageDiv);

    // Set helpful autocomplete attributes
    usernameInput.setAttribute('autocomplete', 'username');
    passwordInput.setAttribute('autocomplete', 'current-password');

    
    // --- Dark Mode Toggle Event Listeners ---
    if (darkModeToggle) {
        // Load saved dark mode preference
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
        }

        darkModeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isDark);
        });
    }


    // --- Back4App Parse SDK Initialization (IMPORTANT: These are now filled with your keys) ---
    const B4A_APP_ID = '1ViZN5pbU94AJep2LHr2owBflGOGedwvYliU50g0';
    const B4A_JS_KEY = '7CE7gnknAyyfSZRTWpqvuDvNhLOMsF0DNYk8qvgn';
    const B4A_SERVER_URL = 'https://parseapi.back4app.com/'; // Confirmed correct URL


    // Check if Parse is loaded before initializing
    if (typeof Parse !== 'undefined') {
        try {
            Parse.initialize(B4A_APP_ID, B4A_JS_KEY);
            Parse.serverURL = B4A_SERVER_URL;
            console.log("Back4App Parse SDK Initialized successfully");
            
            // Light connectivity check using Parse.Config (available by default)
            Parse.Config.get().then(() => {
                console.log('Back4App reachable (Config fetched)');
                showMessage('Connected to server successfully', 'success', 2000);
            }).catch(error => {
                console.warn('Could not verify server connectivity at init:', error);
                // Do not alarm user unnecessarily; login flow will surface connectivity issues
            });
        } catch (error) {
            console.error('Parse initialization error:', error);
            showMessage('Failed to initialize the application', 'error', 5000);
        }
    } else {
        console.error("Parse SDK not loaded. Please ensure https://unpkg.com/parse/dist/parse.min.js is included correctly.");
        showMessage("Application error: Backend SDK not loaded. Cannot login.", "error", 5000);
        return; // Prevent further execution if Parse is not available
    }

    // Add event listener for form submission
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        event.stopPropagation();

        // Disable the button immediately to prevent double-clicks
        loginButton.disabled = true;
        loginButton.textContent = 'Logging in...';

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        // --- Reset message state before showing a new one ---
        messageDiv.style.opacity = '0';
        messageDiv.textContent = '';
        messageDiv.className = 'message';

        // Early validation
        if (!username || !password) {
            showMessage('Please enter both username and password', 'error');
            loginButton.disabled = false;
            loginButton.textContent = 'Login';
            return;
        }


        
        // --- Use Parse.User.logIn() for authentication ---
        try {
            loginButton.disabled = true; // Disable button during login attempt
            loginButton.textContent = 'Logging in...'; // Provide feedback
            
            console.log('Attempting login with username:', username);
            
            // Verify Parse connection before attempting login
            if (!Parse.applicationId) {
                throw new Error('Parse is not properly initialized');
            }

            const user = await Parse.User.logIn(username, password);
            if (!user) {
                throw new Error('No user returned from login');
            }
            
            console.log('Login successful. User data:', {
                id: user.id,
                username: user.get('username'),
                email: user.get('email'),
                sessionToken: user.getSessionToken()
            });
            
            // Verify session token
            if (!user.getSessionToken()) {
                throw new Error('No session token received');
            }

            // Store session token
            localStorage.setItem('sessionToken', user.getSessionToken());
            
            showMessage('Login Successful!', 'success');
            
            // Store user info in localStorage
            localStorage.setItem('currentUser', JSON.stringify({
                username: user.get('username'),
                sessionToken: user.getSessionToken(),
                userId: user.id
            }));

            // Immediate redirect to dashboard
            window.location.href = './dashboard.html';

        } catch (error) {
            // Handle Parse login errors
            console.error('Error during login:', error);
            
            let errorMessage = 'Login failed: ';
            
            // Provide more specific error messages
            if (error.code === Parse.Error.CONNECTION_FAILED) {
                errorMessage += 'Connection to server failed. Please check your internet connection.';
            } else if (error.code === Parse.Error.OBJECT_NOT_FOUND) {
                errorMessage += 'Invalid username or password.';
            } else if (error.code === Parse.Error.INVALID_SESSION_TOKEN) {
                errorMessage += 'Your session has expired. Please try again.';
            } else if (!Parse.applicationId) {
                errorMessage += 'Application not properly initialized. Please refresh the page.';
            } else {
                errorMessage += error.message || 'An unexpected error occurred.';
            }
            
            showMessage(errorMessage, 'error', 5000);
            
            // Clear password field for security
            passwordInput.value = '';
            
            loginButton.disabled = false; // Re-enable button
            loginButton.textContent = 'Login';
        }
    });
});