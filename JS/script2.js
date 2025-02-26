function submitDocuments() {
    const submitBtn = document.querySelector('.submit-btn');
    const loadingCircle = document.createElement('div');
    loadingCircle.className = 'loading-circle';
    
    submitBtn.innerHTML = '';
    submitBtn.appendChild(loadingCircle);
    submitBtn.disabled = true;

    // Simula la espera de 3 segundos
    setTimeout(() => {
        submitBtn.innerHTML = 'Documentos enviados';
        submitBtn.style.backgroundColor = '#015a08';
        submitBtn.disabled = false;

        // Redirige a otro index.html tras el envío
        window.location.href = 'Documentos.html'; // Cambia 'otro_index.html' por la URL deseada
    }, 3000);
}
const navItems = document.querySelectorAll('nav ul li a');
navItems.forEach(item => {
    item.addEventListener('click', function() {
        navItems.forEach(i => i.classList.remove('active'));
        this.classList.add('active');
    });
});

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
        console.log('Searching for:', searchInput.value);
        searchBar.style.display = 'none';
    }
});