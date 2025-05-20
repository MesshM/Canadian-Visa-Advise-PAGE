// Notification dropdown functionality
document.addEventListener("DOMContentLoaded", () => {
  const notificationBtn = document.getElementById('notificationBtn');
  const notificationDropdown = document.getElementById('notificationDropdown');
  const notificationBadge = document.getElementById('notificationBadge');
  const notificationContent = document.getElementById('notificationContent');
  const markAllReadBtn = document.getElementById('markAllReadBtn');
  
  let notificaciones = [];
  let notificacionesNoLeidas = 0;

  // Función para cargar notificaciones desde el servidor
  function cargarNotificaciones() {
    fetch('/perfil/obtener_notificaciones')
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          notificaciones = data.notificaciones;
          
          // Actualizar el número de notificaciones no leídas
          notificacionesNoLeidas = notificaciones.filter(n => !n.leida).length;
          
          if (notificacionesNoLeidas > 0) {
            notificationBadge.textContent = notificacionesNoLeidas > 9 ? '9+' : notificacionesNoLeidas;
            notificationBadge.classList.remove('hidden');
          } else {
            notificationBadge.classList.add('hidden');
          }
          
          // Actualizar el contenido del dropdown
          actualizarContenidoDropdown(notificaciones);
        }
      })
      .catch(error => {
        console.error('Error al cargar notificaciones:', error);
        notificationContent.innerHTML = `
          <div class="p-4 text-center text-red-500">
            <p>Error al cargar notificaciones</p>
          </div>
        `;
      });
  }

  // Función para actualizar el contenido del dropdown
  function actualizarContenidoDropdown(notificaciones) {
    // Limpiar el contenido actual
    notificationContent.innerHTML = '';
    
    if (notificaciones.length === 0) {
      notificationContent.innerHTML = `
        <div class="p-4 text-center text-gray-500">
          <p>No tienes notificaciones</p>
        </div>
      `;
      return;
    }
    
    // Agregar las notificaciones al dropdown
    notificaciones.forEach(notificacion => {
      const tiempoTranscurrido = calcularTiempoTranscurrido(notificacion.fecha_creacion);
      
      // Determinar las clases de borde según el tipo de notificación
      let borderClass = '';
      let iconColor = '';
      
      switch (notificacion.tipo) {
        case 'visa':
          borderClass = 'border-l-4 border-l-blue-500';
          iconColor = 'text-blue-500';
          break;
        case 'documento':
          borderClass = 'border-l-4 border-l-yellow-500';
          iconColor = 'text-yellow-500';
          break;
        case 'asesoria':
          borderClass = 'border-l-4 border-l-green-500';
          iconColor = 'text-green-500';
          break;
        case 'noticia':
          borderClass = 'border-l-4 border-l-purple-500';
          iconColor = 'text-purple-500';
          break;
        default:
          borderClass = 'border-l-4 border-l-gray-500';
          iconColor = 'text-gray-500';
      }
      
      // Determinar el icono según el tipo de notificación
      let icono = '';
      switch (notificacion.tipo) {
        case 'visa':
          icono = `<svg class="w-5 h-5 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                  </svg>`;
          break;
        case 'documento':
          icono = `<svg class="w-5 h-5 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>`;
          break;
        case 'asesoria':
          icono = `<svg class="w-5 h-5 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>`;
          break;
        case 'noticia':
          icono = `<svg class="w-5 h-5 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path>
                  </svg>`;
          break;
        default:
          icono = `<svg class="w-5 h-5 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>`;
      }
      
      const elemento = document.createElement('div');
      elemento.className = `p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors duration-200 ${!notificacion.leida ? 'bg-primary-50' : ''} ${borderClass}`;
      elemento.dataset.id = notificacion.id;
      
      elemento.innerHTML = `
        <div class="flex items-start">
          <div class="flex-shrink-0 mr-3">
            ${icono}
          </div>
          <div class="flex-1">
            <a href="${notificacion.enlace || '#'}" class="block">
              <p class="text-sm font-medium text-gray-900">${notificacion.titulo}</p>
              <p class="text-xs text-gray-500 mt-1">${notificacion.mensaje}</p>
              <p class="text-xs text-gray-400 mt-1">${tiempoTranscurrido}</p>
            </a>
          </div>
          ${!notificacion.leida ? `
            <button class="mark-read-btn flex-shrink-0 ml-2 text-gray-400 hover:text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200" data-id="${notificacion.id}">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </button>
          ` : ''}
        </div>
      `;
      
      // Agregar evento para marcar como leída al hacer clic en el botón
      elemento.querySelectorAll('.mark-read-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const id = btn.dataset.id;
          marcarComoLeida(id);
        });
      });
      
      // Marcar como leída al hacer clic en la notificación
      elemento.addEventListener('click', (e) => {
        if (!notificacion.leida) {
          marcarComoLeida(notificacion.id);
        }
      });
      
      notificationContent.appendChild(elemento);
    });
  }

  // Función para calcular el tiempo transcurrido
  function calcularTiempoTranscurrido(fecha) {
    const ahora = new Date();
    const fechaNotificacion = new Date(fecha);
    const diferencia = Math.floor((ahora - fechaNotificacion) / 1000); // diferencia en segundos
    
    if (diferencia < 60) {
      return 'Hace un momento';
    } else if (diferencia < 3600) {
      const minutos = Math.floor(diferencia / 60);
      return `Hace ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;
    } else if (diferencia < 86400) {
      const horas = Math.floor(diferencia / 3600);
      return `Hace ${horas} ${horas === 1 ? 'hora' : 'horas'}`;
    } else {
      const dias = Math.floor(diferencia / 86400);
      return `Hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
    }
  }

  // Función para marcar una notificación como leída
  function marcarComoLeida(id) {
    fetch('/perfil/marcar_notificacion_leida', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // Recargar notificaciones
          cargarNotificaciones();
        }
      })
      .catch(error => {
        console.error('Error al marcar notificación como leída:', error);
      });
  }
  
  // Función para marcar todas las notificaciones como leídas
  function marcarTodasComoLeidas() {
    fetch('/perfil/marcar_todas_notificaciones_leidas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // Recargar notificaciones
          cargarNotificaciones();
        }
      })
      .catch(error => {
        console.error('Error al marcar todas las notificaciones como leídas:', error);
      });
  }

  // Mostrar/ocultar dropdown al hacer clic en el botón
  notificationBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    notificationDropdown.classList.toggle('hidden');
    
    // Si se muestra el dropdown, cargar las notificaciones más recientes
    if (!notificationDropdown.classList.contains('hidden')) {
      cargarNotificaciones();
    }
  });
  
  // Evento para marcar todas como leídas
  if (markAllReadBtn) {
    markAllReadBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      marcarTodasComoLeidas();
    });
  }

  // Cerrar dropdown al hacer clic fuera
  document.addEventListener('click', (event) => {
    if (!notificationBtn.contains(event.target) && !notificationDropdown.contains(event.target)) {
      notificationDropdown.classList.add('hidden');
    }
  });

  // Evitar que los clics dentro del dropdown cierren el dropdown
  notificationDropdown.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // Cargar notificaciones al iniciar
  cargarNotificaciones();
  
  // Actualizar notificaciones cada minuto
  setInterval(cargarNotificaciones, 60000);
});