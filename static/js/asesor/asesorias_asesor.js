document.addEventListener('DOMContentLoaded', function() {
            // Filtros
            const filterButtons = document.querySelectorAll('.filter-btn');
            const appointmentRows = document.querySelectorAll('.appointment-row');
            
            filterButtons.forEach(button => {
                button.addEventListener('click', function() {
                    // Remover clase activa de todos los botones
                    filterButtons.forEach(btn => {
                        btn.classList.remove('active', 'bg-red-50', 'text-red-600', 'border-red-200');
                        btn.classList.add('bg-gray-50', 'text-gray-600', 'border-gray-200');
                    });
                    
                    // Agregar clase activa al botón clickeado
                    this.classList.add('active', 'bg-red-50', 'text-red-600', 'border-red-200');
                    this.classList.remove('bg-gray-50', 'text-gray-600', 'border-gray-200');
                    
                    const filter = this.getAttribute('data-filter');
                    
                    // Filtrar filas
                    appointmentRows.forEach(row => {
                        if (filter === 'all' || row.getAttribute('data-status') === filter) {
                            row.style.display = '';
                        } else {
                            row.style.display = 'none';
                        }
                    });
                });
            });
            
            // Búsqueda
            const searchInput = document.getElementById('search-input');
            
            searchInput.addEventListener('keyup', function() {
                const searchTerm = this.value.toLowerCase();
                
                appointmentRows.forEach(row => {
                    const text = row.textContent.toLowerCase();
                    if (text.includes(searchTerm)) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                });
            });
            
            // Modal de nueva asesoría
            const newAppointmentBtn = document.getElementById('new-appointment-btn');
            const newAppointmentModal = document.getElementById('new-appointment-modal');
            const closeModalBtn = document.getElementById('close-modal');
            const cancelBtn = document.getElementById('cancel-btn');
            
            newAppointmentBtn.addEventListener('click', function() {
                newAppointmentModal.classList.remove('hidden');
            });
            
            closeModalBtn.addEventListener('click', function() {
                newAppointmentModal.classList.add('hidden');
            });
            
            cancelBtn.addEventListener('click', function() {
                newAppointmentModal.classList.add('hidden');
            });
            
            // Modal de ver detalles
            const viewButtons = document.querySelectorAll('.view-btn');
            const viewModal = document.getElementById('view-appointment-modal');
            const closeViewModalBtn = document.getElementById('close-view-modal');
            const closeViewBtn = document.getElementById('close-view-btn');
            
            viewButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const id = this.getAttribute('data-id');
                    // Aquí se cargarían los datos reales de la asesoría
                    fetch(`/asesor/obtener_asesoria/${id}`)
                        .then(response => response.json())
                        .then(data => {
                            document.getElementById('view-code').textContent = data.codigo_asesoria;
                            document.getElementById('view-client').textContent = data.solicitante;
                            document.getElementById('view-email').textContent = data.correo || 'No disponible';
                            document.getElementById('view-type').textContent = data.tipo_asesoria;
                            document.getElementById('view-datetime').textContent = data.fecha_hora;
                            
                            const statusElement = document.getElementById('view-status');
                            statusElement.textContent = data.estado;
                            
                            if (data.estado === 'Completada') {
                                statusElement.className = 'px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs';
                            } else if (data.estado === 'Pendiente') {
                                statusElement.className = 'px-2 py-1 bg-yellow-50 text-yellow-700 rounded-full text-xs';
                            } else if (data.estado === 'Cancelada') {
                                statusElement.className = 'px-2 py-1 bg-red-50 text-red-700 rounded-full text-xs';
                            } else {
                                statusElement.className = 'px-2 py-1 bg-gray-50 text-gray-700 rounded-full text-xs';
                            }
                            
                            document.getElementById('view-description').textContent = data.descripcion || 'No hay descripción disponible';
                        })
                        .catch(error => {
                            console.error('Error:', error);
                            alert('Error al cargar los datos de la asesoría');
                        });
                    
                    viewModal.classList.remove('hidden');
                });
            });
            
            closeViewModalBtn.addEventListener('click', function() {
                viewModal.classList.add('hidden');
            });
            
            closeViewBtn.addEventListener('click', function() {
                viewModal.classList.add('hidden');
            });
            
            // Modal de cambiar estado
            const statusButtons = document.querySelectorAll('.status-btn');
            const statusModal = document.getElementById('status-modal');
            const closeStatusModalBtn = document.getElementById('close-status-modal');
            const cancelStatusBtn = document.getElementById('cancel-status-btn');
            
            statusButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const id = this.getAttribute('data-id');
                    document.getElementById('appointment-id').value = id;
                    
                    statusModal.classList.remove('hidden');
                });
            });
            
            closeStatusModalBtn.addEventListener('click', function() {
                statusModal.classList.add('hidden');
            });
            
            cancelStatusBtn.addEventListener('click', function() {
                statusModal.classList.add('hidden');
            });
            
            // Cerrar modales al hacer clic fuera de ellos
            window.addEventListener('click', function(e) {
                if (e.target === newAppointmentModal) {
                    newAppointmentModal.classList.add('hidden');
                }
                if (e.target === viewModal) {
                    viewModal.classList.add('hidden');
                }
                if (e.target === statusModal) {
                    statusModal.classList.add('hidden');
                }
            });
        });