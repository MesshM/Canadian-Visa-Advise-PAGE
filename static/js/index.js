document.addEventListener('DOMContentLoaded', function() {
    // Tab functionality
    const tabs = document.querySelectorAll('[data-tab]');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            tabs.forEach(t => {
                t.classList.remove('border-primary-600', 'text-primary-600');
                t.classList.add('border-transparent', 'hover:text-primary-600', 'hover:border-primary-300');
                t.setAttribute('aria-selected', 'false');
            });
            
            // Add active class to clicked tab
            tab.classList.add('border-primary-600', 'text-primary-600');
            tab.classList.remove('border-transparent', 'hover:text-primary-600', 'hover:border-primary-300');
            tab.setAttribute('aria-selected', 'true');
            
            // Hide all tab contents
            tabContents.forEach(content => {
                content.classList.add('hidden');
                content.classList.remove('active');
            });
            
            // Show the selected tab content with animation
            const tabId = tab.getAttribute('data-tab');
            const activeContent = document.getElementById(`${tabId}-content`);
            activeContent.classList.remove('hidden');
            activeContent.classList.add('active');
            
            // Add animation to news cards
            const newsCards = activeContent.querySelectorAll('.news-card, .bg-white.rounded-xl');
            newsCards.forEach((card, index) => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    card.style.transition = 'all 0.5s ease-out';
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, 100 * index);
            });
        });
    });
    
    
});