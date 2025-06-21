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
    let isPanelOpen = false;
    
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
    
    // Función para mostrar el panel con animación
    function showPanel() {
        notificationPanel.classList.remove('hidden');
        // Forzar reflow para que la animación funcione
        notificationPanel.offsetHeight;
        notificationPanel.classList.remove('opacity-0', 'scale-95');
        notificationPanel.classList.add('opacity-100', 'scale-100');
        isPanelOpen = true;
    }
    
    // Función para ocultar el panel con animación
    function hidePanel() {
        notificationPanel.classList.remove('opacity-100', 'scale-100');
        notificationPanel.classList.add('opacity-0', 'scale-95');
        setTimeout(() => {
            notificationPanel.classList.add('hidden');
        }, 300);
        isPanelOpen = false;
    }
    
    // Función para renderizar las notificaciones (mejorada con animaciones)
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

        // Renderizar cada notificación con animación de entrada
        notifications.forEach((notification, index) => {
            const notifElement = document.createElement('div');
            notifElement.className = `p-4 border-b border-gray-200 ${notification.leida ? 'bg-white' : 'bg-blue-50'} notification-item cursor-pointer hover:bg-gray-50 transition-all duration-200 transform translate-x-full opacity-0`;

            // Formatear la fecha
            const date = new Date(notification.fecha_creacion);
            const formattedDate = date.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            notifElement.innerHTML = `
                <div class="flex items-start">
                    <div class="flex-shrink-0 mr-3">
                        <div class="w-2 h-2 mt-2 rounded-full ${notification.leida ? 'bg-gray-300' : 'bg-primary-600 animate-pulse'}"></div>
                    </div>
                    <div class="flex-1">
                        <div class="flex justify-between items-start">
                            <h4 class="text-sm font-medium text-gray-900 ${!notification.leida ? 'font-semibold' : ''}">${notification.titulo}</h4>
                            <span class="text-xs text-gray-500 ml-2 flex-shrink-0">${formattedDate}</span>
                        </div>
                        <p class="mt-1 text-sm text-gray-600 line-clamp-2">${notification.mensaje}</p>
                    </div>
                </div>
            `;

            notifElement.addEventListener('click', () => {
                if (!notification.leida) {
                    markAsRead(notification.id);
                }
                if (notification.enlace) {
                    window.location.href = notification.enlace;
                }
                hidePanel();
            });

            notificationsList.insertBefore(notifElement, emptyNotifications);
            
            // Animar entrada con delay escalonado
            setTimeout(() => {
                notifElement.classList.remove('translate-x-full', 'opacity-0');
                notifElement.classList.add('translate-x-0', 'opacity-100');
            }, index * 100);
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
    
    // Función para eliminar todas las notificaciones con animación mejorada
    async function deleteAllNotifications() {
        try {
            // Selecciona todos los elementos de notificación actuales
            const notifElements = notificationsList.querySelectorAll('.notification-item');
            if (notifElements.length > 0) {
                notifElements.forEach((el, idx) => {
                    setTimeout(() => {
                        el.style.transition = 'transform 0.5s cubic-bezier(0.4,0,0.2,1), opacity 0.5s cubic-bezier(0.4,0,0.2,1)';
                        el.style.transform = 'translateX(100%)';
                        el.style.opacity = '0';
                    }, idx * 50);
                });
                // Espera la animación antes de limpiar el frontend
                await new Promise(res => setTimeout(res, 600));
            }

            const response = await fetch('/perfil/api/notificaciones/eliminar-todas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                notifications = [];
                updateNotificationBadge();
                renderNotifications();
            } else {
                console.error('Error al eliminar las notificaciones');
            }
        } catch (error) {
            console.error('Error al eliminar todas las notificaciones:', error);
        }
    }

    // Evento para mostrar/ocultar el panel de notificaciones
    if (notificationButton) {
        notificationButton.addEventListener('click', function(event) {
            event.stopPropagation();
            
            if (isPanelOpen) {
                hidePanel();
            } else {
                loadNotifications(); // Cargar notificaciones al abrir el panel
                showPanel();
            }
        });
    }
    
    // Evento para marcar todas como leídas
    if (markAllReadButton) {
        markAllReadButton.addEventListener('click', function(event) {
            event.stopPropagation();
            markAllAsRead();
        });
    }
    
    // Evento para eliminar todas las notificaciones
    const deleteAllBtn = document.getElementById('delete-all-notifications');
    if (deleteAllBtn) {
        deleteAllBtn.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            deleteAllNotifications();
        });
    }
    
    // Cerrar el panel al hacer clic fuera de él
    document.addEventListener('click', function(event) {
        if (isPanelOpen && !document.getElementById('notification-container').contains(event.target)) {
            hidePanel();
        }
    });
    
    // Cerrar panel con tecla Escape
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && isPanelOpen) {
            hidePanel();
        }
    });
    
    // Cargar notificaciones al cargar la página
    loadNotifications();
    
    // Configurar intervalo para verificar nuevas notificaciones (cada 2 minutos)
    setInterval(loadNotifications, 2 * 60 * 1000);
});