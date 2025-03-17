 // Funciones para abrir y cerrar el modal
 function openNewAdvisoryModal() {
    const modal = document.getElementById('newAdvisoryModal');
    modal.style.display = 'flex';
// Pequeño retraso para permitir que el navegador aplique el display:flex antes de remover hidden
setTimeout(() => {
    modal.classList.remove('hidden');
}, 10);
}

function closeNewAdvisoryModal() {
const modal = document.getElementById('newAdvisoryModal');
modal.classList.add('hidden');
// Esperar a que termine la animación antes de cambiar el display
setTimeout(() => {
    if (modal.classList.contains('hidden')) {
        modal.style.display = 'none';
    }
}, 300);
}

// Cerrar modal al hacer clic fuera de él
window.onclick = function(event) {
const modal = document.getElementById('newAdvisoryModal');
if (event.target === modal) {
    closeNewAdvisoryModal();
}
};

// Script para búsqueda en tiempo real
document.addEventListener('DOMContentLoaded', function() {
const searchInput = document.getElementById('search');
if (searchInput) {
    searchInput.addEventListener('keyup', function() {
        const searchValue = this.value.toLowerCase();
        const tableRows = document.querySelectorAll('#table-body tr:not(#no-results)');
        let hasResults = false;
        
        tableRows.forEach(row => {
            const text = row.textContent.toLowerCase();
            if(text.includes(searchValue)) {
                row.style.display = '';
                hasResults = true;
            } else {
                row.style.display = 'none';
            }
        });
        
        // Mostrar mensaje de "no se encontraron resultados" si no hay coincidencias
        const noResults = document.getElementById('no-results');
        if (noResults) {
            noResults.style.display = hasResults ? 'none' : '';
        }
    });
}

// Inicializar el modal correctamente - asegurarse que está oculto al inicio
const modal = document.getElementById('newAdvisoryModal');
if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
}
});
