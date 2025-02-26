document.addEventListener('DOMContentLoaded', (event) => {
    // Añadir una clase activa a un item del nav actual
    const navItems = document.querySelectorAll('nav ul li a');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            navItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Funcionalidad de búsqueda
    const searchInput = document.querySelector('.search-bar input');
    const searchButton = document.querySelector('.search-bar button');

    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    function performSearch() {
        const searchTerm = searchInput.value;
        alert(`Searching for: ${searchTerm}`);
        // Aquí normalmente se enviaría el término de búsqueda a un backend 
        // y manejarías los resultados
    }

    // Simular la carga de elementos de noticias
    const newsItems = document.querySelectorAll('.news-item');
    newsItems.forEach((item, index) => {
        item.textContent = `Noticia ${index + 1}`;
        item.addEventListener('click', () => {
            alert(`You clicked on News Item ${index + 1}`);
        });
    });
});

document.addEventListener('DOMContentLoaded', (event) => {
    const searchContainer = document.querySelector('.search-container');
    const searchBar = document.querySelector('.search-bar');
    const searchInput = searchBar.querySelector('input');
    const searchIcon = document.querySelector('.search-icon');

    searchIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        searchBar.style.display = 'flex';
        searchInput.focus();
    });

    document.addEventListener('click', (e) => {
        if (!searchContainer.contains(e.target)) {
            searchBar.style.display = 'none';
        }
    });

    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            // Perform search action here
            console.log('Searching for:', searchInput.value);
            searchBar.style.display = 'none';
        }
    });
});