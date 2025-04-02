// Notification dropdown functionality
const notificationBtn = document.getElementById('notificationBtn');
const notificationDropdown = document.getElementById('notificationDropdown');
const notificationBadge = document.getElementById('notificationBadge');

notificationBtn.addEventListener('click', () => {
    notificationDropdown.classList.toggle('hidden');
    // Clear notification count when opened
    if (!notificationDropdown.classList.contains('hidden')) {
        notificationBadge.classList.add('hidden');
    }
});

// Close dropdown when clicking outside
document.addEventListener('click', (event) => {
    if (!notificationBtn.contains(event.target) && !notificationDropdown.contains(event.target)) {
        notificationDropdown.classList.add('hidden');
    }
});