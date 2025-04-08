document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', () => {
        document.querySelectorAll('nav a').forEach(l => {
            l.classList.remove('bg-primary-light', 'text-primary', 'border-l-4', 'border-primary', 'font-semibold');
            l.classList.add('text-gray-700', 'hover:bg-primary-light', 'hover:text-primary', 'hover:translate-x-1');
        });
        link.classList.remove('text-gray-700', 'hover:bg-primary-light', 'hover:text-primary', 'hover:translate-x-1');
        link.classList.add('bg-primary-light', 'text-primary', 'border-l-4', 'border-primary', 'font-semibold');
    });
});