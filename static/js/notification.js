document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const notificationButton = document.getElementById('notification-button');
    const notificationPanel = document.getElementById('notification-panel');
    const notificationBadge = document.getElementById('notification-badge');
    const notificationsList = document.getElementById('notifications-list');
    const emptyNotifications = document.getElementById('empty-notifications');
    const markAllReadButton = document.getElementById('mark-all-read');
    
    // Variables de estado
    let notifications = [];
    let isLoading = false;
    
    // Función para cargar notificaciones
    async function loadNotifications() {
        if (isLoading) return;
        
        isLoading = true;
        
        try {
            const response = await fetch('/perfil/api/notificaciones');
            
            if (!response.ok) {
                throw new Error('Error al cargar notificaciones');
            }
            
            const data = await response.json();
            
            if (data.success) {
                notifications = data.notifications || [];
                updateNotificationBadge();
                renderNotifications();
            }
        } catch (error) {
            console.error('Error al cargar notificaciones:', error);
        } finally {
            isLoading = false;
        }
    }
    
    // Función para actualizar el badge de notificaciones
    function updateNotificationBadge() {
        const unreadCount = notifications.filter(notif => !notif.leida).length;
        
        if (unreadCount > 0) {
            notificationBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
            notificationBadge.classList.remove('hidden');
        } else {
            notificationBadge.classList.add('hidden');
        }
    }
    
    // Función para renderizar las notificaciones
    function renderNotifications() {
        // Limpiar la lista actual (excepto el mensaje de vacío)
        const children = Array.from(notificationsList.children);
        for (const child of children) {
            if (child !== emptyNotifications) {
                notificationsList.removeChild(child);
            }
        }
        
        if (notifications.length === 0) {
            emptyNotifications.classList.remove('hidden');
            return;
        }
        
        emptyNotifications.classList.add('hidden');
        
        // Renderizar cada notificación
        notifications.forEach(notification => {
            const notifElement = document.createElement('div');
            notifElement.className = `p-4 border-b border-gray-200 ${notification.leida ? 'bg-white' : 'bg-blue-50'}`;
            
            // Formatear la fecha
            const date = new Date(notification.fecha_creacion);
            const formattedDate = date.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            // Crear el contenido HTML de la notificación
            notifElement.innerHTML = `
                <div class="flex items-start">
                    <div class="flex-shrink-0 mr-3">
                        <div class="w-2 h-2 mt-2 rounded-full ${notification.leida ? 'bg-gray-300' : 'bg-primary-600'}"></div>
                    </div>
                    <div class="flex-1">
                        <div class="flex justify-between items-start">
                            <h4 class="text-sm font-medium text-gray-900">${notification.titulo}</h4>
                            <span class="text-xs text-gray-500">${formattedDate}</span>
                        </div>
                        <p class="mt-1 text-sm text-gray-600">${notification.mensaje}</p>
                        ${notification.enlace ? `<a href="${notification.enlace}" class="mt-2 inline-block text-xs text-primary-600 hover:text-primary-800">Ver detalles</a>` : ''}
                    </div>
                </div>
            `;
            
            // Agregar evento para marcar como leída al hacer clic
            notifElement.addEventListener('click', () => {
                if (!notification.leida) {
                    markAsRead(notification.id);
                }
                
                // Si hay un enlace, navegar a él
                if (notification.enlace) {
                    window.location.href = notification.enlace;
                }
            });
            
            // Insertar antes del mensaje de "no hay notificaciones"
            notificationsList.insertBefore(notifElement, emptyNotifications);
        });
    }
    
    // Función para marcar una notificación como leída
    async function markAsRead(notificationId) {
        try {
            const response = await fetch(`/perfil/api/notificaciones/${notificationId}/leer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                // Actualizar el estado local
                const index = notifications.findIndex(n => n.id === notificationId);
                if (index !== -1) {
                    notifications[index].leida = true;
                    updateNotificationBadge();
                    renderNotifications();
                }
            }
        } catch (error) {
            console.error('Error al marcar como leída:', error);
        }
    }
    
    // Función para marcar todas como leídas
    async function markAllAsRead() {
        try {
            const response = await fetch('/perfil/api/notificaciones/leer-todas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                // Actualizar el estado local
                notifications.forEach(notif => {
                    notif.leida = true;
                });
                updateNotificationBadge();
                renderNotifications();
            }
        } catch (error) {
            console.error('Error al marcar todas como leídas:', error);
        }
    }
    
    // Evento para mostrar/ocultar el panel de notificaciones
    notificationButton.addEventListener('click', function(event) {
        event.stopPropagation();
        
        const isVisible = !notificationPanel.classList.contains('hidden');
        
        if (isVisible) {
            notificationPanel.classList.add('hidden');
        } else {
            loadNotifications(); // Cargar notificaciones al abrir el panel
            notificationPanel.classList.remove('hidden');
        }
    });
    
    // Evento para marcar todas como leídas
    markAllReadButton.addEventListener('click', function(event) {
        event.stopPropagation();
        markAllAsRead();
    });
    
    // Cerrar el panel al hacer clic fuera de él
    document.addEventListener('click', function(event) {
        if (!notificationPanel.contains(event.target) && event.target !== notificationButton) {
            notificationPanel.classList.add('hidden');
        }
    });
    
    // Cargar notificaciones al cargar la página
    loadNotifications();
    
    // Configurar intervalo para verificar nuevas notificaciones (cada 2 minutos)
    setInterval(loadNotifications, 2 * 60 * 1000);
});