// Función para abrir el modal de nueva asesoría
function openNewAdvisoryModal() {
    document.getElementById('newAdvisoryModal').classList.remove('hidden');
    document.getElementById('newAdvisoryModal').classList.add('flex');
}

// Función para cerrar el modal de nueva asesoría
function closeNewAdvisoryModal() {
    document.getElementById('newAdvisoryModal').classList.remove('flex');
    document.getElementById('newAdvisoryModal').classList.add('hidden');
}

// Función para abrir el modal de editar asesoría
function editAsesoria(id) {
    // Verificar si la asesoría está vencida
    const row = document.querySelector(`tr[data-asesoria-id="${id}"]`);
    if (row && row.getAttribute('data-estado') === 'vencida') {
        showNotification('No se puede editar una asesoría vencida', 'error');
        return;
    }

    // Aquí normalmente harías una petición AJAX para obtener los datos de la asesoría
    document.getElementById('edit_codigo_asesoria').value = id;

    // Buscar la fila correspondiente para obtener algunos datos
    if (row) {
        const cells = row.querySelectorAll('td');
        const fechaText = cells[1].querySelector('div:first-child').textContent.trim();
        const horaText = cells[1].querySelector('div:last-child').textContent.trim();
        const fechaHora = `${fechaText}T${horaText}`;
        document.getElementById('edit_fecha_asesoria').value = formatDateForInput(fechaHora);

        // Valores por defecto para los campos adicionales
        document.getElementById('edit_tipo_documento').value = 'C.C';
        document.getElementById('edit_numero_documento').value = '1234567890';
        document.getElementById('edit_tipo_asesoria').value = 'Visa de Trabajo';
        document.getElementById('edit_descripcion').value = 'Consulta sobre requisitos para visa de trabajo';
        document.getElementById('edit_lugar').value = 'Virtual (Zoom)';
    }

    // Configurar la acción del formulario
    document.getElementById('editForm').action = `/editar_asesoria/${id}`;

    // Mostrar el modal
    document.getElementById('editAdvisoryModal').classList.remove('hidden');
    document.getElementById('editAdvisoryModal').classList.add('flex');
}

// Función para cerrar el modal de editar asesoría
function closeEditAdvisoryModal() {
    document.getElementById('editAdvisoryModal').classList.remove('flex');
    document.getElementById('editAdvisoryModal').classList.add('hidden');
}

// Función para formatear la fecha para el input datetime-local
function formatDateForInput(dateString) {
    // Esta función depende del formato de fecha que venga del servidor
    try {
        const date = new Date(dateString);
        return date.toISOString().slice(0, 16);
    } catch (e) {
        return '';
    }
}

// Función para mostrar/ocultar los detalles de una asesoría
function toggleDetails(id) {
    const detailsRow = document.getElementById(`details-${id}`);
    if (detailsRow.classList.contains('hidden')) {
        detailsRow.classList.remove('hidden');
    } else {
        detailsRow.classList.add('hidden');
    }
}

// Función para resetear los filtros
function resetFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-date').value = '';
    filterAsesorias();
}

// Función para filtrar asesorías
function filterAsesorias() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const statusFilter = document.getElementById('filter-status').value.toLowerCase();
    const dateFilter = document.getElementById('filter-date').value;

    const rows = document.querySelectorAll('#asesorias-table-body tr:not([id^="details-"])');
    let visibleCount = 0;

    rows.forEach(row => {
        if (row.id === 'no-results') return;

        const codigo = row.cells[0].textContent.toLowerCase();
        const fecha = row.cells[1].textContent.toLowerCase();
        const asesor = row.cells[2].textContent.toLowerCase();
        const solicitante = row.cells[3].textContent.toLowerCase();
        const estado = row.cells[4].textContent.toLowerCase();

        // Filtro de búsqueda
        const matchesSearch = codigo.includes(searchTerm) ||
            fecha.includes(searchTerm) ||
            asesor.includes(searchTerm) ||
            solicitante.includes(searchTerm);

        // Filtro de estado
        const matchesStatus = !statusFilter || estado.includes(statusFilter);

        // Filtro de fecha
        let matchesDate = true;
        if (dateFilter) {
            const rowDate = new Date(fecha);
            const today = new Date();

            if (dateFilter === 'today') {
                matchesDate = rowDate.toDateString() === today.toDateString();
            } else if (dateFilter === 'week') {
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                matchesDate = rowDate >= weekStart && rowDate <= weekEnd;
            } else if (dateFilter === 'month') {
                matchesDate = rowDate.getMonth() === today.getMonth() &&
                    rowDate.getFullYear() === today.getFullYear();
            }
        }

        // Aplicar filtros
        if (matchesSearch && matchesStatus && matchesDate) {
            row.style.display = '';
            visibleCount++;

            // Ocultar la fila de detalles si está visible
            const detailsId = row.getAttribute('data-asesoria-id');
            const detailsRow = document.getElementById(`details-${detailsId}`);
            if (detailsRow) {
                detailsRow.style.display = '';
            }
        } else {
            row.style.display = 'none';

            // Ocultar la fila de detalles
            const detailsId = row.getAttribute('data-asesoria-id');
            const detailsRow = document.getElementById(`details-${detailsId}`);
            if (detailsRow) {
                detailsRow.style.display = 'none';
            }
        }
    });

    // Mostrar mensaje de "No hay resultados" si no hay filas visibles
    const noResultsRow = document.getElementById('no-results');
    if (noResultsRow) {
        if (visibleCount === 0) {
            noResultsRow.style.display = '';
        } else {
            noResultsRow.style.display = 'none';
        }
    }
}

// Función para ver el historial de chat
function verHistorialChat(id) {
    document.getElementById('chat-asesoria-id').textContent = id;

    // Aquí normalmente harías una petición AJAX para obtener los mensajes
    // Por ahora, simularemos con mensajes de ejemplo
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = '';

    // Mensajes de ejemplo
    const mensajes = [
        { emisor: 'asesor', nombre: 'Asesor', mensaje: 'Hola, bienvenido a tu asesoría. ¿En qué puedo ayudarte hoy?', fecha: '2023-05-15 10:00 AM' },
        { emisor: 'cliente', nombre: 'Cliente', mensaje: 'Hola, tengo algunas dudas sobre el proceso de visa de trabajo.', fecha: '2023-05-15 10:02 AM' },
        { emisor: 'asesor', nombre: 'Asesor', mensaje: 'Claro, estaré encantado de ayudarte. ¿Qué tipo de visa de trabajo estás considerando?', fecha: '2023-05-15 10:05 AM' },
        { emisor: 'cliente', nombre: 'Cliente', mensaje: 'Estoy interesado en la visa de trabajo temporal para Canadá.', fecha: '2023-05-15 10:07 AM' },
        { emisor: 'asesor', nombre: 'Asesor', mensaje: 'Excelente. Para la visa de trabajo temporal necesitarás una oferta de empleo de un empleador canadiense. ¿Ya tienes una oferta?', fecha: '2023-05-15 10:10 AM' },
        { emisor: 'cliente', nombre: 'Cliente', mensaje: 'No, aún no tengo una oferta. ¿Cómo puedo conseguir una?', fecha: '2023-05-15 10:12 AM' },
        { emisor: 'asesor', nombre: 'Asesor', mensaje: 'Hay varias formas de conseguir una oferta. Puedes aplicar directamente a empresas canadienses, usar plataformas de empleo como LinkedIn o Indeed, o participar en ferias de empleo virtuales. También podemos ayudarte con tu CV y carta de presentación.', fecha: '2023-05-15 10:15 AM' }
    ];

    mensajes.forEach(mensaje => {
        const messageDiv = document.createElement('div');

        if (mensaje.emisor === 'asesor') {
            messageDiv.className = 'flex items-start';
            messageDiv.innerHTML = `
                <div class="flex-shrink-0 mr-3">
                    <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-medium">A</div>
                </div>
                <div class="bg-gray-100 rounded-lg p-3 max-w-[80%]">
                    <p class="text-xs text-gray-500 mb-1">${mensaje.nombre} - ${mensaje.fecha}</p>
                    <p class="text-sm">${mensaje.mensaje}</p>
                </div>
            `;
        } else {
            messageDiv.className = 'flex items-start justify-end';
            messageDiv.innerHTML = `
                <div class="bg-primary-100 rounded-lg p-3 max-w-[80%]">
                    <p class="text-xs text-gray-500 mb-1">${mensaje.nombre} - ${mensaje.fecha}</p>
                    <p class="text-sm">${mensaje.mensaje}</p>
                </div>
                <div class="flex-shrink-0 ml-3">
                    <div class="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium">C</div>
                </div>
            `;
        }

        chatMessages.appendChild(messageDiv);
    });

    // Mostrar el modal
    document.getElementById('chatHistorialModal').classList.remove('hidden');
    document.getElementById('chatHistorialModal').classList.add('flex');
}

// Función para cerrar el modal de historial de chat
function closeChatHistorialModal() {
    document.getElementById('chatHistorialModal').classList.remove('flex');
    document.getElementById('chatHistorialModal').classList.add('hidden');
}

// Función para enviar un mensaje en el chat
function enviarMensaje() {
    const chatInput = document.getElementById('chat-input');
    const mensaje = chatInput.value.trim();

    if (mensaje) {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');

        messageDiv.className = 'flex items-start justify-end';
        messageDiv.innerHTML = `
            <div class="bg-primary-100 rounded-lg p-3 max-w-[80%]">
                <p class="text-xs text-gray-500 mb-1">Cliente - ${new Date().toLocaleString()}</p>
                <p class="text-sm">${mensaje}</p>
            </div>
            <div class="flex-shrink-0 ml-3">
                <div class="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium">C</div>
            </div>
        `;

        chatMessages.appendChild(messageDiv);
        chatInput.value = '';

        // Simular respuesta del asesor después de 1 segundo
        setTimeout(() => {
            const responseDiv = document.createElement('div');
            responseDiv.className = 'flex items-start';
            responseDiv.innerHTML = `
                <div class="flex-shrink-0 mr-3">
                    <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-medium">A</div>
                </div>
                <div class="bg-gray-100 rounded-lg p-3 max-w-[80%]">
                    <p class="text-xs text-gray-500 mb-1">Asesor - ${new Date().toLocaleString()}</p>
                    <p class="text-sm">Gracias por tu mensaje. Un asesor te responderá pronto.</p>
                </div>
            `;

            chatMessages.appendChild(responseDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 1000);

        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Función para abrir el modal de pago
function pagarAsesoria(id) {
    document.getElementById('pago-asesoria-id').textContent = id;
    document.getElementById('pago_codigo_asesoria').value = id;

    // Mostrar el formulario de tarjeta de crédito por defecto
    showPaymentForm('Tarjeta de Crédito');

    // Mostrar el modal
    document.getElementById('pagoModal').classList.remove('hidden');
    document.getElementById('pagoModal').classList.add('flex');
}

// Función para cerrar el modal de pago
function closePagoModal() {
    document.getElementById('pagoModal').classList.remove('flex');
    document.getElementById('pagoModal').classList.add('hidden');
}

// Función para mostrar el formulario de pago según el método seleccionado
function showPaymentForm(paymentMethod) {
    // Ocultar todos los formularios de pago
    document.querySelectorAll('.payment-form').forEach(form => {
        form.classList.add('hidden');
    });

    // Mostrar el formulario correspondiente al método seleccionado
    if (paymentMethod === 'Tarjeta de Crédito') {
        document.getElementById('tarjeta-credito-form').classList.remove('hidden');
    } else if (paymentMethod === 'PayPal') {
        document.getElementById('paypal-form').classList.remove('hidden');
    } else if (paymentMethod === 'Transferencia Bancaria') {
        document.getElementById('transferencia-form').classList.remove('hidden');
    }
}

// Función para procesar el pago y actualizar la UI
function procesarPago(id) {
    // Aquí normalmente harías una petición AJAX para procesar el pago
    // Por ahora, simularemos el proceso

    // Buscar el botón de pago correspondiente
    const row = document.querySelector(`tr[data-asesoria-id="${id}"]`);
    if (row) {
        const pagoBtn = row.querySelector('.pago-btn');
        if (pagoBtn) {
            // Cambiar el estilo y texto del botón
            pagoBtn.classList.remove('bg-gradient-to-r', 'from-green-600', 'to-green-500', 'hover:from-green-500', 'hover:to-green-600', 'hover:shadow-green-500/30');
            pagoBtn.classList.add('bg-gradient-to-r', 'from-blue-600', 'to-blue-500', 'hover:from-blue-500', 'hover:to-blue-600', 'hover:shadow-blue-500/30');

            // Actualizar el contenido del botón
            pagoBtn.innerHTML = `
                <span class="absolute right-0 -mt-12 h-32 w-8 opacity-20 transform rotate-12 transition-all duration-1000 translate-x-12 bg-white group-hover:-translate-x-40"></span>
                <div class="relative flex items-center justify-center">
                    <svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>Pagado</span>
                </div>
            `;

            // Deshabilitar el botón
            pagoBtn.onclick = null;
            pagoBtn.style.cursor = 'default';
            pagoBtn.classList.remove('pago-btn');

            // Actualizar el estado de la asesoría
            row.setAttribute('data-pago-estado', 'Pagada');

            // Actualizar el ícono de verificación en los detalles
            const detailsRow = document.getElementById(`details-${id}`);
            if (detailsRow) {
                const precioElement = detailsRow.querySelector('p:contains("Precio")');
                if (precioElement) {
                    const spanElement = precioElement.querySelector('span:last-child');
                    if (spanElement && !spanElement.querySelector('svg')) {
                        spanElement.innerHTML = `
                            $150.00 USD
                            <svg class="w-4 h-4 ml-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                        `;
                    }
                }
            }
        }
    }

    // Mostrar notificación de éxito
    showNotification('Pago procesado exitosamente', 'success');

    // Cerrar el modal de pago
    closePagoModal();
}

// Agregar event listeners para los filtros
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('search-input').addEventListener('input', filterAsesorias);
    document.getElementById('filter-status').addEventListener('change', filterAsesorias);
    document.getElementById('filter-date').addEventListener('change', filterAsesorias);

    // Event listener para el método de pago en el modal de pago
    document.getElementById('metodo_pago_pago').addEventListener('change', function () {
        showPaymentForm(this.value);
    });

    // Event listener para el input de chat
    document.getElementById('chat-input').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            enviarMensaje();
        }
    });

    // Event listener para el formulario de pago
    document.getElementById('pagoForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const asesoriaId = document.getElementById('pago_codigo_asesoria').value;
        procesarPago(asesoriaId);
    });

    // Mejorar la animación de los botones de pago
    document.querySelectorAll('.pago-btn').forEach(btn => {
        btn.addEventListener('mouseenter', function () {
            const span = this.querySelector('span');
            span.style.transition = 'transform 0.8s ease-in-out';
            span.style.transform = 'translateX(-100%) rotate(12deg)';
        });

        btn.addEventListener('mouseleave', function () {
            const span = this.querySelector('span');
            span.style.transition = 'transform 0.5s ease-in-out';
            span.style.transform = 'translateX(0) rotate(12deg)';
        });
    });

    // Selector jQuery personalizado para buscar elementos que contienen texto específico
    jQuery.expr[':'].contains = function (a, i, m) {
        return jQuery(a).text().toUpperCase().indexOf(m[3].toUpperCase()) >= 0;
    };
});

// Función para mostrar una notificación
function showNotification(message, type = "success") {
    // Crear el elemento de notificación
    const notification = document.createElement("div");
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transform transition-all duration-500 translate-x-full`;

    // Aplicar estilos según el tipo
    if (type === "success") {
        notification.classList.add("bg-green-100", "text-green-800", "border-l-4", "border-green-500");
    } else if (type === "error") {
        notification.classList.add("bg-red-100", "text-red-800", "border-l-4", "border-red-500");
    } else if (type === "warning") {
        notification.classList.add("bg-yellow-100", "text-yellow-800", "border-l-4", "border-yellow-500");
    } else {
        notification.classList.add("bg-blue-100", "text-blue-800", "border-l-4", "border-blue-500");
    }

    // Agregar el mensaje
    notification.innerHTML = `
        <div class="flex items-center">
            <div class="flex-shrink-0">
                ${type === "success"
            ? '<svg class="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
            : type === "error"
                ? '<svg class="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>'
                : type === "warning"
                    ? '<svg class="h-5 w-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>'
                    : '<svg class="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
        }
            </div>
            <div class="ml-3">
                <p class="text-sm">${message}</p>
            </div>
            <div class="ml-auto pl-3">
                <button class="inline-flex text-gray-400 hover:text-gray-500 focus:outline-none cursor-pointer">
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        </div>
    `;

    // Agregar al DOM
    document.body.appendChild(notification);

    // Animar la entrada
    setTimeout(() => {
        notification.classList.remove("translate-x-full");
        notification.classList.add("translate-x-0");
    }, 100);

    // Configurar la eliminación automática
    setTimeout(() => {
        notification.classList.remove("translate-x-0");
        notification.classList.add("translate-x-full");

        // Eliminar del DOM después de la animación
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 5000);

    // Agregar evento para cerrar manualmente
    notification.querySelector("button").addEventListener("click", () => {
        notification.classList.remove("translate-x-0");
        notification.classList.add("translate-x-full");

        // Eliminar del DOM después de la animación
        setTimeout(() => {
            notification.remove();
        }, 500);
    });
}
// Este archivo contiene funciones JavaScript adicionales para la página de asesorías

// Función para formatear fechas en un formato legible
function formatDate(dateString) {
    const options = {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }
    return new Date(dateString).toLocaleDateString("es-ES", options)
}

// Función para verificar si una asesoría está vigente o vencida
function isAsesoriaVigente(fechaAsesoria) {
    const now = new Date()
    const fechaAsesoriaDate = new Date(fechaAsesoria)
    return fechaAsesoriaDate > now
}

// Función para generar un color aleatorio para los avatares
function getRandomColor() {
    const colors = [
        "bg-red-100 text-red-600",
        "bg-blue-100 text-blue-600",
        "bg-green-100 text-green-600",
        "bg-yellow-100 text-yellow-600",
        "bg-purple-100 text-purple-600",
        "bg-pink-100 text-pink-600",
        "bg-indigo-100 text-indigo-600",
    ]
    return colors[Math.floor(Math.random() * colors.length)]
}

// Función para generar un avatar con iniciales
function generateAvatar(name) {
    if (!name) return "U"
    const parts = name.split(" ")
    if (parts.length >= 2) {
        return parts[0][0] + parts[1][0]
    }
    return name[0]
}

// Función para mostrar una notificación
function showNotification(message, type = "success") {
    // Crear el elemento de notificación
    const notification = document.createElement("div")
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transform transition-all duration-500 translate-x-full`

    // Aplicar estilos según el tipo
    if (type === "success") {
        notification.classList.add("bg-green-100", "text-green-800", "border-l-4", "border-green-500")
    } else if (type === "error") {
        notification.classList.add("bg-red-100", "text-red-800", "border-l-4", "border-red-500")
    } else if (type === "warning") {
        notification.classList.add("bg-yellow-100", "text-yellow-800", "border-l-4", "border-yellow-500")
    } else {
        notification.classList.add("bg-blue-100", "text-blue-800", "border-l-4", "border-blue-500")
    }

    // Agregar el mensaje
    notification.innerHTML = `
          <div class="flex items-center">
              <div class="flex-shrink-0">
                  ${type === "success"
            ? '<svg class="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
            : type === "error"
                ? '<svg class="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>'
                : type === "warning"
                    ? '<svg class="h-5 w-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>'
                    : '<svg class="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
        }
              </div>
              <div class="ml-3">
                  <p class="text-sm">${message}</p>
              </div>
              <div class="ml-auto pl-3">
                  <button class="inline-flex text-gray-400 hover:text-gray-500 focus:outline-none cursor-pointer">
                      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                  </button>
              </div>
          </div>
      `

    // Agregar al DOM
    document.body.appendChild(notification)

    // Animar la entrada
    setTimeout(() => {
        notification.classList.remove("translate-x-full")
        notification.classList.add("translate-x-0")
    }, 100)

    // Configurar la eliminación automática
    setTimeout(() => {
        notification.classList.remove("translate-x-0")
        notification.classList.add("translate-x-full")

        // Eliminar del DOM después de la animación
        setTimeout(() => {
            notification.remove()
        }, 500)
    }, 5000)

    // Agregar evento para cerrar manualmente
    notification.querySelector("button").addEventListener("click", () => {
        notification.classList.remove("translate-x-0")
        notification.classList.add("translate-x-full")

        // Eliminar del DOM después de la animación
        setTimeout(() => {
            notification.remove()
        }, 500)
    })
}

// Exportar funciones para uso en otros archivos
window.formatDate = formatDate
window.isAsesoriaVigente = isAsesoriaVigente
window.getRandomColor = getRandomColor
window.generateAvatar = generateAvatar
window.showNotification = showNotification

// Función para abrir el modal de nueva asesoría
function openNewAdvisoryModal() {
    document.getElementById("newAdvisoryModal").classList.remove("hidden")
    document.getElementById("newAdvisoryModal").classList.add("flex")
}

// Función para cerrar el modal de nueva asesoría
function closeNewAdvisoryModal() {
    document.getElementById("newAdvisoryModal").classList.remove("flex")
    document.getElementById("newAdvisoryModal").classList.add("hidden")
}

// Función para abrir el modal de editar asesoría
function editAsesoria(id) {
    // Verificar si la asesoría está vencida
    const row = document.querySelector(`tr[data-asesoria-id="${id}"]`)
    if (row && row.getAttribute("data-estado") === "vencida") {
        showNotification("No se puede editar una asesoría vencida", "error")
        return
    }

    // Aquí normalmente harías una petición AJAX para obtener los datos de la asesoría
    document.getElementById("edit_codigo_asesoria").value = id

    // Buscar la fila correspondiente para obtener algunos datos
    if (row) {
        const cells = row.querySelectorAll("td")
        const fechaText = cells[1].querySelector("div:first-child").textContent.trim()
        const horaText = cells[1].querySelector("div:last-child").textContent.trim()
        const fechaHora = `${fechaText}T${horaText}`
        document.getElementById("edit_fecha_asesoria").value = formatDateForInput(fechaHora)

        // Valores por defecto para los campos adicionales
        document.getElementById("edit_tipo_documento").value = "C.C"
        document.getElementById("edit_numero_documento").value = "1234567890"
        document.getElementById("edit_tipo_asesoria").value = "Visa de Trabajo"
        document.getElementById("edit_descripcion").value = "Consulta sobre requisitos para visa de trabajo"
        document.getElementById("edit_lugar").value = "Virtual (Zoom)"
    }

    // Configurar la acción del formulario
    document.getElementById("editForm").action = `/editar_asesoria/${id}`

    // Mostrar el modal
    document.getElementById("editAdvisoryModal").classList.remove("hidden")
    document.getElementById("editAdvisoryModal").classList.add("flex")
}

// Función para cerrar el modal de editar asesoría
function closeEditAdvisoryModal() {
    document.getElementById("editAdvisoryModal").classList.remove("flex")
    document.getElementById("editAdvisoryModal").classList.add("hidden")
}

// Función para formatear la fecha para el input datetime-local
function formatDateForInput(dateString) {
    // Esta función depende del formato de fecha que venga del servidor
    try {
        const date = new Date(dateString)
        return date.toISOString().slice(0, 16)
    } catch (e) {
        return ""
    }
}

// Función para mostrar/ocultar los detalles de una asesoría
function toggleDetails(id) {
    const detailsRow = document.getElementById(`details-${id}`)
    if (detailsRow.classList.contains("hidden")) {
        detailsRow.classList.remove("hidden")
    } else {
        detailsRow.classList.add("hidden")
    }
}

// Función para resetear los filtros
function resetFilters() {
    document.getElementById("search-input").value = ""
    document.getElementById("filter-status").value = ""
    document.getElementById("filter-date").value = ""
    filterAsesorias()
}

// Función para filtrar asesorías
function filterAsesorias() {
    const searchTerm = document.getElementById("search-input").value.toLowerCase()
    const statusFilter = document.getElementById("filter-status").value.toLowerCase()
    const dateFilter = document.getElementById("filter-date").value

    const rows = document.querySelectorAll('#asesorias-table-body tr:not([id^="details-"])')
    let visibleCount = 0

    rows.forEach((row) => {
        if (row.id === "no-results") return

        const codigo = row.cells[0].textContent.toLowerCase()
        const fecha = row.cells[1].textContent.toLowerCase()
        const asesor = row.cells[2].textContent.toLowerCase()
        const solicitante = row.cells[3].textContent.toLowerCase()
        const estado = row.cells[4].textContent.toLowerCase()

        // Filtro de búsqueda
        const matchesSearch =
            codigo.includes(searchTerm) ||
            fecha.includes(searchTerm) ||
            asesor.includes(searchTerm) ||
            solicitante.includes(searchTerm)

        // Filtro de estado
        const matchesStatus = !statusFilter || estado.includes(statusFilter)

        // Filtro de fecha
        let matchesDate = true
        if (dateFilter) {
            const rowDate = new Date(fecha)
            const today = new Date()

            if (dateFilter === "today") {
                matchesDate = rowDate.toDateString() === today.toDateString()
            } else if (dateFilter === "week") {
                const weekStart = new Date(today)
                weekStart.setDate(today.getDate() - today.getDay())
                const weekEnd = new Date(weekStart)
                weekEnd.setDate(weekStart.getDate() + 6)
                matchesDate = rowDate >= weekStart && rowDate <= weekEnd
            } else if (dateFilter === "month") {
                matchesDate = rowDate.getMonth() === today.getMonth() && rowDate.getFullYear() === today.getFullYear()
            }
        }

        // Aplicar filtros
        if (matchesSearch && matchesStatus && matchesDate) {
            row.style.display = ""
            visibleCount++

            // Ocultar la fila de detalles si está visible
            const detailsId = row.getAttribute("data-asesoria-id")
            const detailsRow = document.getElementById(`details-${detailsId}`)
            if (detailsRow) {
                detailsRow.style.display = ""
            }
        } else {
            row.style.display = "none"

            // Ocultar la fila de detalles
            const detailsId = row.getAttribute("data-asesoria-id")
            const detailsRow = document.getElementById(`details-${detailsId}`)
            if (detailsRow) {
                detailsRow.style.display = "none"
            }
        }
    })

    // Mostrar mensaje de "No hay resultados" si no hay filas visibles
    const noResultsRow = document.getElementById("no-results")
    if (noResultsRow) {
        if (visibleCount === 0) {
            noResultsRow.style.display = ""
        } else {
            noResultsRow.style.display = "none"
        }
    }
}

// Función para ver el historial de chat
function verHistorialChat(id) {
    document.getElementById("chat-asesoria-id").textContent = id

    // Aquí normalmente harías una petición AJAX para obtener los mensajes
    // Por ahora, simularemos con mensajes de ejemplo
    const chatMessages = document.getElementById("chat-messages")
    chatMessages.innerHTML = ""

    // Mensajes de ejemplo
    const mensajes = [
        {
            emisor: "asesor",
            nombre: "Asesor",
            mensaje: "Hola, bienvenido a tu asesoría. ¿En qué puedo ayudarte hoy?",
            fecha: "2023-05-15 10:00 AM",
        },
        {
            emisor: "cliente",
            nombre: "Cliente",
            mensaje: "Hola, tengo algunas dudas sobre el proceso de visa de trabajo.",
            fecha: "2023-05-15 10:02 AM",
        },
        {
            emisor: "asesor",
            nombre: "Asesor",
            mensaje: "Claro, estaré encantado de ayudarte. ¿Qué tipo de visa de trabajo estás considerando?",
            fecha: "2023-05-15 10:05 AM",
        },
        {
            emisor: "cliente",
            nombre: "Cliente",
            mensaje: "Estoy interesado en la visa de trabajo temporal para Canadá.",
            fecha: "2023-05-15 10:07 AM",
        },
        {
            emisor: "asesor",
            nombre: "Asesor",
            mensaje:
                "Excelente. Para la visa de trabajo temporal necesitarás una oferta de empleo de un empleador canadiense. ¿Ya tienes una oferta?",
            fecha: "2023-05-15 10:10 AM",
        },
        {
            emisor: "cliente",
            nombre: "Cliente",
            mensaje: "No, aún no tengo una oferta. ¿Cómo puedo conseguir una?",
            fecha: "2023-05-15 10:12 AM",
        },
        {
            emisor: "asesor",
            nombre: "Asesor",
            mensaje:
                "Hay varias formas de conseguir una oferta. Puedes aplicar directamente a empresas canadienses, usar plataformas de empleo como LinkedIn o Indeed, o participar en ferias de empleo virtuales. También podemos ayudarte con tu CV y carta de presentación.",
            fecha: "2023-05-15 10:15 AM",
        },
    ]

    mensajes.forEach((mensaje) => {
        const messageDiv = document.createElement("div")

        if (mensaje.emisor === "asesor") {
            messageDiv.className = "flex items-start"
            messageDiv.innerHTML = `
                  <div class="flex-shrink-0 mr-3">
                      <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-medium">A</div>
                  </div>
                  <div class="bg-gray-100 rounded-lg p-3 max-w-[80%]">
                      <p class="text-xs text-gray-500 mb-1">${mensaje.nombre} - ${mensaje.fecha}</p>
                      <p class="text-sm">${mensaje.mensaje}</p>
                  </div>
              `
        } else {
            messageDiv.className = "flex items-start justify-end"
            messageDiv.innerHTML = `
                  <div class="bg-primary-100 rounded-lg p-3 max-w-[80%]">
                      <p class="text-xs text-gray-500 mb-1">${mensaje.nombre} - ${mensaje.fecha}</p>
                      <p class="text-sm">${mensaje.mensaje}</p>
                  </div>
                  <div class="flex-shrink-0 ml-3">
                      <div class="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium">C</div>
                  </div>
              `
        }

        chatMessages.appendChild(messageDiv)
    })

    // Mostrar el modal
    document.getElementById("chatHistorialModal").classList.remove("hidden")
    document.getElementById("chatHistorialModal").classList.add("flex")
}

// Función para cerrar el modal de historial de chat
function closeChatHistorialModal() {
    document.getElementById("chatHistorialModal").classList.remove("flex")
    document.getElementById("chatHistorialModal").classList.add("hidden")
}

// Función para enviar un mensaje en el chat
function enviarMensaje() {
    const chatInput = document.getElementById("chat-input")
    const mensaje = chatInput.value.trim()

    if (mensaje) {
        const chatMessages = document.getElementById("chat-messages")
        const messageDiv = document.createElement("div")

        messageDiv.className = "flex items-start justify-end"
        messageDiv.innerHTML = `
              <div class="bg-primary-100 rounded-lg p-3 max-w-[80%]">
                  <p class="text-xs text-gray-500 mb-1">Cliente - ${new Date().toLocaleString()}</p>
                  <p class="text-sm">${mensaje}</p>
              </div>
              <div class="flex-shrink-0 ml-3">
                  <div class="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium">C</div>
              </div>
          `

        chatMessages.appendChild(messageDiv)
        chatInput.value = ""

        // Simular respuesta del asesor después de 1 segundo
        setTimeout(() => {
            const responseDiv = document.createElement("div")
            responseDiv.className = "flex items-start"
            responseDiv.innerHTML = `
                  <div class="flex-shrink-0 mr-3">
                      <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-medium">A</div>
                  </div>
                  <div class="bg-gray-100 rounded-lg p-3 max-w-[80%]">
                      <p class="text-xs text-gray-500 mb-1">Asesor - ${new Date().toLocaleString()}</p>
                      <p class="text-sm">Gracias por tu mensaje. Un asesor te responderá pronto.</p>
                  </div>
              `

            chatMessages.appendChild(responseDiv)
            chatMessages.scrollTop = chatMessages.scrollHeight
        }, 1000)

        chatMessages.scrollTop = chatMessages.scrollHeight
    }
}

// Función para abrir el modal de pago
function pagarAsesoria(id) {
    document.getElementById("pago-asesoria-id").textContent = id
    document.getElementById("pago_codigo_asesoria").value = id

    // Mostrar el formulario de tarjeta de crédito por defecto
    showPaymentForm("Tarjeta de Crédito")

    // Mostrar el modal
    document.getElementById("pagoModal").classList.remove("hidden")
    document.getElementById("pagoModal").classList.add("flex")
}

// Función para cerrar el modal de pago
function closePagoModal() {
    document.getElementById("pagoModal").classList.remove("flex")
    document.getElementById("pagoModal").classList.add("hidden")
}

// Función para mostrar el formulario de pago según el método seleccionado
function showPaymentForm(paymentMethod) {
    // Ocultar todos los formularios de pago
    document.querySelectorAll(".payment-form").forEach((form) => {
        form.classList.add("hidden")
    })

    // Mostrar el formulario correspondiente al método seleccionado
    if (paymentMethod === "Tarjeta de Crédito") {
        document.getElementById("tarjeta-credito-form").classList.remove("hidden")
    } else if (paymentMethod === "PayPal") {
        document.getElementById("paypal-form").classList.remove("hidden")
    } else if (paymentMethod === "Transferencia Bancaria") {
        document.getElementById("transferencia-form").classList.remove("hidden")
    }
}

// Función para procesar el pago y actualizar la UI
function procesarPago(id) {
    // Aquí normalmente harías una petición AJAX para procesar el pago
    // Por ahora, simularemos el proceso

    // Buscar el botón de pago correspondiente
    const row = document.querySelector(`tr[data-asesoria-id="${id}"]`)
    if (row) {
        const pagoBtn = row.querySelector(".pago-btn")
        if (pagoBtn) {
            // Cambiar el estilo y texto del botón
            pagoBtn.classList.remove(
                "bg-gradient-to-r",
                "from-green-600",
                "to-green-500",
                "hover:from-green-500",
                "hover:to-green-600",
                "hover:shadow-green-500/30",
            )
            pagoBtn.classList.add(
                "bg-gradient-to-r",
                "from-blue-600",
                "to-blue-500",
                "hover:from-blue-500",
                "hover:to-blue-600",
                "hover:shadow-blue-500/30",
            )

            // Actualizar el contenido del botón
            pagoBtn.innerHTML = `
                  <span class="absolute right-0 -mt-12 h-32 w-8 opacity-20 transform rotate-12 transition-all duration-1000 translate-x-12 bg-white group-hover:-translate-x-40"></span>
                  <div class="relative flex items-center justify-center">
                      <svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span>Pagado</span>
                  </div>
              `

            // Deshabilitar el botón
            pagoBtn.onclick = null
            pagoBtn.style.cursor = "default"
            pagoBtn.classList.remove("pago-btn")

            // Actualizar el estado de la asesoría
            row.setAttribute("data-pago-estado", "Pagada")

            // Actualizar el ícono de verificación en los detalles
            const detailsRow = document.getElementById(`details-${id}`)
            if (detailsRow) {
                const precioElement = detailsRow.querySelector('p:contains("Precio")')
                if (precioElement) {
                    const spanElement = precioElement.querySelector("span:last-child")
                    if (spanElement && !spanElement.querySelector("svg")) {
                        spanElement.innerHTML = `
                              $150.00 USD
                              <svg class="w-4 h-4 ml-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                              </svg>
                          `
                    }
                }
            }
        }
    }

    // Mostrar notificación de éxito
    showNotification("Pago procesado exitosamente", "success")

    // Cerrar el modal de pago
    closePagoModal()
}

// Agregar event listeners para los filtros
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("search-input").addEventListener("input", filterAsesorias)
    document.getElementById("filter-status").addEventListener("change", filterAsesorias)
    document.getElementById("filter-date").addEventListener("change", filterAsesorias)

    // Event listener para el método de pago en el modal de pago
    document.getElementById("metodo_pago_pago").addEventListener("change", function () {
        showPaymentForm(this.value)
    })

    // Event listener para el input de chat
    document.getElementById("chat-input").addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            e.preventDefault()
            enviarMensaje()
        }
    })

    // Event listener para el formulario de pago
    document.getElementById("pagoForm").addEventListener("submit", (e) => {
        e.preventDefault()
        const asesoriaId = document.getElementById("pago_codigo_asesoria").value
        procesarPago(asesoriaId)
    })

    // Mejorar la animación de los botones de pago
    document
        .querySelectorAll(".pago-btn")
        .forEach((btn) => {
            // Hacer el botón ligeramente más grande
            btn.classList.add("scale-105", "hover:scale-110")

            // Mejorar la animación al pasar el mouse
            btn.addEventListener("mouseenter", function () {
                const span = this.querySelector("span")
                span.style.transition = "transform 1.2s ease-in-out"
                span.style.transform = "translateX(-100%) rotate(12deg)"

                // Añadir un efecto de pulso suave
                this.classList.add("animate-pulse-slow")
            })

            btn.addEventListener("mouseleave", function () {
                const span = this.querySelector("span")
                span.style.transition = "transform 0.8s ease-in-out"
                span.style.transform = "translateX(0) rotate(12deg)"

                // Quitar el efecto de pulso
                this.classList.remove("animate-pulse-slow")
            })
        })

        // Selector jQuery personalizado para buscar elementos que contienen texto específico
        ; (($) => {
            $.expr[":"].contains = (a, i, m) => $(a).text().toUpperCase().indexOf(m[3].toUpperCase()) >= 0
        })(jQuery)
})

