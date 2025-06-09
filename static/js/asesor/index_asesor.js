document.addEventListener('DOMContentLoaded', function() {
            // Tab switching functionality
            const tabs = document.querySelectorAll('[data-tab]');
            tabs.forEach(tab => {
                tab.addEventListener('click', function() {
                    // Remove active class from all tabs
                    tabs.forEach(t => {
                        t.classList.remove('border-primary-600', 'text-primary-600');
                        t.classList.add('border-transparent', 'hover:text-primary-600', 'hover:border-primary-300');
                        t.setAttribute('aria-selected', 'false');
                    });
                    
                    // Add active class to clicked tab
                    this.classList.add('border-primary-600', 'text-primary-600');
                    this.classList.remove('border-transparent', 'hover:text-primary-600', 'hover:border-primary-300');
                    this.setAttribute('aria-selected', 'true');
                    
                    // Hide all tab contents
                    document.querySelectorAll('.tab-content').forEach(content => {
                        content.classList.add('hidden');
                    });
                    
                    // Show selected tab content
                    document.getElementById(this.getAttribute('data-tab') + '-content').classList.remove('hidden');
                });
            });
            
            // Notification dropdown toggle
            const notificationBtn = document.getElementById('notificationBtn');
            const notificationDropdown = document.getElementById('notificationDropdown');
            
            if (notificationBtn && notificationDropdown) {
                notificationBtn.addEventListener('click', function() {
                    notificationDropdown.classList.toggle('hidden');
                });
                
                // Close dropdown when clicking outside
                document.addEventListener('click', function(event) {
                    if (!notificationBtn.contains(event.target) && !notificationDropdown.contains(event.target)) {
                        notificationDropdown.classList.add('hidden');
                    }
                });
            }
        });