import { initUI } from './ui.js';
import { getCurrentUser } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
    const { data: user, error } = await getCurrentUser();

    if (error || !user) {
        console.log('No active session or user profile, redirecting to login.');
        window.location.href = '/login.html';
        return;
    }

    console.log('User is authenticated, initializing UI.');
    console.log('Initializing Schedule NSG application for role:', user.role);
    initUI(user);
    console.log('Schedule NSG application initialized successfully.');
});
