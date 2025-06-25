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

    // --- Back4App Parse SDK Initialization
    const B4A_APP_ID = '1ViZN5pbU94AJep2LHr2owBflGOGedwvYliU50g0'; // Replace with your Application ID
    const B4A_JS_KEY = '7CE7gnknAyyfSZRTWpqvuDvNhLOMsF0DNYk8qvgn';   // Replace with your JavaScript Key
    const B4A_SERVER_URL = 'https://parseapi.back4app.comL';   // Replace with your Server URL (e.g., https://parseapi.back4app.com/)

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

    // --- Function to handle user signup (Optional, but good for testing) ---
    // You would typically have a separate registration page, but this can be used
    // to create initial users directly through the console or a temporary button.
    // For now, users should be created via Back4App dashboard or a separate signup flow.
    async function signUpUser(username, password) {
        const user = new Parse.User();
        user.set("username", username);
        user.set("password", password);
        // Add other properties if needed, like email, name, etc.
        // user.set("email", "test@example.com");

        try {
            await user.signUp();
            console.log('User signed up successfully:', user);
            showMessage("Signup successful! You can now log in.", "success");
            return true;
        } catch (error) {
            console.error('Error during sign up:', error);
            showMessage(`Signup failed: ${error.message}`, "error", 5000);
            return false;
        }
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

            // Store current user ID in session storage for dashboard.js to pick up
            // Note: Parse SDK typically handles session management internally,
            // but we can explicitly store the userId if dashboard.js needs it outside of Parse.
            sessionStorage.setItem('currentParseUserId', user.id);
            sessionStorage.setItem('currentParseSessionToken', user.getSessionToken());


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
            showMessage(`Login failed: ${error.message}`, 'error');
            loginButton.disabled = false; // Re-enable button
            loginButton.textContent = 'Login';
        }
    });
});
