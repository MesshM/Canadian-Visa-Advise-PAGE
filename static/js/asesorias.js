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

// Añadir funcionalidad de búsqueda
document.getElementById('search').addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('tbody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if(text.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
});
