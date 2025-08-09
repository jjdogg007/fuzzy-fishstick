import { signInUser } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessage.textContent = ''; // Clear previous errors

        const email = loginForm.email.value;
        const password = loginForm.password.value;

        console.log(`Attempting to sign in as ${email}`);
        const { data, error } = await signInUser(email, password);

        console.log("Sign in response from Supabase:");
        console.log("Data:", JSON.stringify(data, null, 2));
        console.log("Error:", JSON.stringify(error, null, 2));

        if (error) {
            console.error("Sign in failed with an error:", error);
            errorMessage.textContent = error.message;
        } else if (data && data.user) {
            console.log("Sign in successful, redirecting to index.html");
            window.location.href = 'index.html';
        } else {
            console.warn("Sign in did not return a user or an error.");
            errorMessage.textContent = "Login failed. Please check your credentials. If this persists, email confirmation might still be enabled in Supabase settings.";
        }
    });
});
