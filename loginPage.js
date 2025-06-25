document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username'); 
    const passwordInput = document.getElementById('password');
    const loginButton = document.querySelector('.login-button');
    const loginBox = document.querySelector('.login-box'); // Used for fading out and shrinking

    // Create an element for displaying messages (success/error)
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message'; // Applies the base styling from your CSS
    loginForm.insertBefore(messageDiv, loginButton); 

    // Define dummy credentials for testing (you can change these!)
    const DUMMY_USERNAME = 'admin';
    const DUMMY_PASSWORD = 'password123';

    // Add event listener for form submission
    loginForm.addEventListener('submit', (event) => {
        // CRUCIAL: Prevent the default form submission (stops page reload and URL change)
        event.preventDefault();

        const username = usernameInput.value; 
        const password = passwordInput.value;

        // --- Reset message state before showing a new one ---
        messageDiv.style.opacity = '0'; 
        messageDiv.textContent = ''; 
        messageDiv.className = 'message'; // Resets classes (removes any 'success' or 'error' class)

        // --- Simulate login process ---
        if (username === DUMMY_USERNAME && password === DUMMY_PASSWORD) {
            // --- Login Success Path ---
            messageDiv.textContent = 'Login Successful! Redirecting...';
            messageDiv.classList.add('success'); // Apply success-specific styling
            messageDiv.style.opacity = '1'; // Show the success message

            // First setTimeout: Keep the "Login Successful!" message visible for 1 second
            setTimeout(() => {
                // Start the fade-out and shrink animation of the main login box
                loginBox.style.opacity = '0';
                loginBox.style.transform = 'scale(0.8)'; // Shrink slightly as it fades

                // Second setTimeout: Wait for the loginBox fade-out animation to complete (0.8s as per CSS transition)
                setTimeout(() => {
                    // Replace the entire body content with a simple loading screen HTML
                    document.body.innerHTML = `
                        <div class="loading-screen">
                            Loading SchoolFlow Dashboard...
                            <div class="spinner"></div>
                        </div>
                    `;

                    // Add a class to the body to trigger a page-wide fade-out before redirecting
                    document.body.classList.add('fade-out-page');

                    // Third setTimeout: Wait for the page fade-out to complete, then perform the actual page redirection
                    setTimeout(() => {
                        window.location.href = 'dashboard.html'; 
                    }, 500); // This delay (500ms) should match the 'fade-out-page' transition duration
                    
                }, 800); // This delay (800ms) should match the transition duration of `loginBox`'s opacity/transform
                
            }, 1000); // This delay (1000ms) is how long the "Login Successful!" message is displayed

        } else {
            // --- Login Error Path ---
            messageDiv.textContent = 'Invalid username or password. Please try again.';
            messageDiv.classList.add('error'); // Apply error-specific styling
            messageDiv.style.opacity = '1'; // Show the error message
        }
    });
});