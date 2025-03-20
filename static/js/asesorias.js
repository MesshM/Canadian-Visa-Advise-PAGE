// Variables globales para Stripe
let stripe;
let elements;
let paymentElement;
let clientSecret;

// Variables para el formulario de asesoría
let selectedAsesorId = null;
let selectedAsesorName = null;

// Función para formatear fechas en un formato legible
function formatDate(dateString) {
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return new Date(dateString).toLocaleDateString("es-ES", options);
}

// Función para verificar si una asesoría está vigente o vencida
function isAsesoriaVigente(fechaAsesoria) {
  const now = new Date();
  const fechaAsesoriaDate = new Date(fechaAsesoria);
  return fechaAsesoriaDate > now;
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
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Función para generar un avatar con iniciales
function generateAvatar(name) {
  if (!name) return "U";
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return parts[0][0] + parts[1][0];
  }
  return name[0];
}

// Función para enumerar y ordenar asesorías
function ordenarYNumerarAsesorias() {
  const tbody = document.getElementById("asesorias-table-body");
  if (!tbody) return; // Evitar errores si no existe el elemento

  const rows = Array.from(tbody.querySelectorAll("tr[data-asesoria-id]"));

  // Ordenar de mayor a menor por "data-asesoria-id"
  rows.sort((a, b) => {
    const idA = Number.parseInt(a.getAttribute("data-asesoria-id"));
    const idB = Number.parseInt(b.getAttribute("data-asesoria-id"));
    return idB - idA; // Orden descendente
  });

  // Reorganizar filas en el DOM sin borrar contenido
  rows.forEach((row, index) => {
    const numCell = row.querySelector(".numero-asesoria");
    if (numCell) {
      numCell.textContent = `#${rows.length - index}`; // Asigna número inverso
    }
    tbody.appendChild(row); // Mueve la fila principal

    // Buscar y mover también la fila de detalles
    const detailsRow = document.getElementById(`details-${row.getAttribute("data-asesoria-id")}`);
    if (detailsRow) {
      tbody.appendChild(detailsRow);
    }
  });
}

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
              ${
                type === "success"
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
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
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

// Exportar funciones para uso en otros archivos
window.formatDate = formatDate;
window.isAsesoriaVigente = isAsesoriaVigente;
window.getRandomColor = getRandomColor;
window.generateAvatar = generateAvatar;
window.showNotification = showNotification;

// Agregar estilos CSS personalizados para las animaciones mejoradas
const styleElement = document.createElement("style");
styleElement.textContent = `
  @keyframes pulse-scale {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
  
  @keyframes fade-in-scale {
    0% { opacity: 0; transform: scale(0.95) translateY(10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  
  @keyframes slide-in {
    0% { transform: translateX(20px); opacity: 0; }
    100% { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes bounce-in {
    0% { transform: scale(0.8); opacity: 0; }
    70% { transform: scale(1.05); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
  
  .animate-pulse-scale {
    animation: pulse-scale 0.5s ease-in-out;
  }
  
  .animate-fade-in {
    animation: fade-in-scale 0.4s ease-out forwards;
  }
  
  .animate-slide-in {
    animation: slide-in 0.5s ease-out forwards;
  }
  
  .animate-bounce-in {
    animation: bounce-in 0.5s ease-out forwards;
  }
  
  .scale-110 {
    transform: scale(1.1);
  }
`;
document.head.appendChild(styleElement);

// Inicializar numeración de asesorías
ordenarYNumerarAsesorias();

// Agregar event listeners para los filtros
const searchInput = document.getElementById("search-input");
const statusFilter = document.getElementById("filter-status");
const dateFilter = document.getElementById("filter-date");

if (searchInput) searchInput.addEventListener("input", filterAsesorias);
if (statusFilter) statusFilter.addEventListener("change", filterAsesorias);
if (dateFilter) dateFilter.addEventListener("change", filterAsesorias);

// Event listener para el input de chat
const chatInput = document.getElementById("chat-input");
if (chatInput) {
  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      enviarMensaje();
    }
  });
}

// Mejorar la animación de los botones de pago
document.querySelectorAll(".pago-btn, .pagado-btn").forEach((btn) => {
  // Mejorar la animación al pasar el mouse
  btn.addEventListener("mouseenter", function () {
    const span = this.querySelector("span");
    if (span) {
      span.style.transition = "transform 1.2s ease-in-out";
      span.style.transform = "translateX(-100%) rotate(12deg)";
    }

    // Añadir un efecto de pulso suave
    this.classList.add("animate-pulse-slow");
  });

  btn.addEventListener("mouseleave", function () {
    const span = this.querySelector("span");
    if (span) {
      span.style.transition = "transform 0.8s ease-in-out";
      span.style.transform = "translateX(0) rotate(12deg)";
    }

    // Quitar el efecto de pulso
    this.classList.remove("animate-pulse-slow");
  });
});

// Agregar event listener para el formulario de edición
const editForm = document.getElementById("editForm");
if (editForm) {
  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Recopilar los datos del formulario
    const formData = new FormData(editForm);
    const formDataObj = {};
    formData.forEach((value, key) => {
      formDataObj[key] = value;
    });

    try {
      // Enviar los datos al servidor
      const response = await fetch("/editar_asesoria", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formDataObj),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al actualizar la asesoría");
      }

      // Mostrar notificación de éxito
      showNotification("Asesoría actualizada exitosamente", "success");

      // Cerrar el modal
      closeEditAdvisoryModal();

      // Recargar la página para mostrar los cambios
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Error al actualizar la asesoría:", error);
      showNotification("Error al actualizar la asesoría: " + error.message, "error");
    }
  });
}

// Función para abrir el modal de nueva asesoría
function openNewAdvisoryModal() {
  const modal = document.getElementById("newAdvisoryModal");
  if (!modal) return;

  // Mostrar el modal con animación
  modal.classList.remove("hidden");
  modal.classList.add("flex");

  // Cargar los asesores disponibles
  loadAsesores();
}

// Función para cerrar el modal de nueva asesoría
function closeNewAdvisoryModal() {
  const modal = document.getElementById("newAdvisoryModal");
  if (!modal) return;

  modal.classList.remove("flex");
  modal.classList.add("hidden");

  // Resetear selecciones
  selectedAsesorId = null;
  selectedAsesorName = null;

  const selectedDateInput = document.getElementById("selected_date");
  const selectedAsesorIdInput = document.getElementById("selected_asesor_id");
  const selectedAsesorNameInput = document.getElementById("selected_asesor_name");
  const asesorSelector = document.getElementById("asesor_selector");
  const submitBtn = document.getElementById("submitAdvisoryBtn");

  if (selectedDateInput) selectedDateInput.value = "";
  if (selectedAsesorIdInput) selectedAsesorIdInput.value = "";
  if (selectedAsesorNameInput) selectedAsesorNameInput.value = "";
  if (asesorSelector) asesorSelector.value = "";
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add("opacity-50");
  }
}

// Función para cargar los asesores disponibles
async function loadAsesores() {
  const asesorSelector = document.getElementById("asesor_selector");
  if (!asesorSelector) return;

  try {
    // Limpiar opciones existentes excepto la primera
    while (asesorSelector.options.length > 1) {
      asesorSelector.remove(1);
    }

    // Mostrar indicador de carga
    asesorSelector.innerHTML = '<option value="">Cargando asesores...</option>';

    // Obtener asesores del servidor
    const response = await fetch("/obtener_asesores");
    if (!response.ok) {
      throw new Error("Error al cargar asesores");
    }

    const data = await response.json();

    // Limpiar opciones existentes
    asesorSelector.innerHTML = '<option value="">Seleccione un asesor</option>';

    // Agregar opciones para cada asesor
    if (data.asesores && data.asesores.length > 0) {
      data.asesores.forEach((asesor) => {
        const option = document.createElement("option");
        option.value = asesor.id_asesor;
        option.setAttribute("data-name", `${asesor.nombre} ${asesor.apellidos}`);
        option.textContent = `${asesor.nombre} ${asesor.apellidos} - ${asesor.especialidad}`;
        asesorSelector.appendChild(option);
      });
    }

    // Agregar event listener para el selector de asesor
    asesorSelector.addEventListener("change", function () {
      selectedAsesorId = this.value;
      selectedAsesorName = this.options[this.selectedIndex].getAttribute("data-name");

      if (selectedAsesorId) {
        // Guardar el asesor seleccionado
        const selectedAsesorIdInput = document.getElementById("selected_asesor_id");
        const selectedAsesorNameInput = document.getElementById("selected_asesor_name");

        if (selectedAsesorIdInput) selectedAsesorIdInput.value = selectedAsesorId;
        if (selectedAsesorNameInput) selectedAsesorNameInput.value = selectedAsesorName;

        // Habilitar el botón si se ha seleccionado fecha y hora
        checkFormCompletion();
      }
    });
  } catch (error) {
    console.error("Error al cargar asesores:", error);
    asesorSelector.innerHTML = '<option value="">Error al cargar asesores</option>';
  }
}

// Verificar si el formulario está completo
function checkFormCompletion() {
  const submitButton = document.getElementById("submitAdvisoryBtn");

  if (!submitButton) return;

  if (selectedAsesorId) {
    submitButton.disabled = false;
    submitButton.classList.remove("opacity-50");
  } else {
    submitButton.disabled = true;
    submitButton.classList.add("opacity-50");
  }
}

// Función para filtrar asesorías
function filterAsesorias() {
  const searchInput = document.getElementById("search-input");
  const statusFilter = document.getElementById("filter-status");
  const dateFilter = document.getElementById("filter-date");
  const rows = document.querySelectorAll("#asesorias-table-body tr[data-asesoria-id]");
  const noResults = document.getElementById("no-results");

  let visibleCount = 0;

  // Obtener valores de filtro
  const searchText = searchInput ? searchInput.value.toLowerCase() : "";
  const statusValue = statusFilter ? statusFilter.value : "";
  const dateValue = dateFilter ? dateFilter.value : "";

  // Filtrar filas
  rows.forEach((row) => {
    // Obtener datos de la fila
    const asesoriaId = row.getAttribute("data-asesoria-id");
    const estado = row.getAttribute("data-estado"); // vigente, vencida
    const pagoEstado = row.getAttribute("data-pago-estado"); // Pagada, Pendiente

    // Obtener texto de la fila para búsqueda
    const rowText = row.textContent.toLowerCase();

    // Obtener fecha de la asesoría
    const fechaCell = row.querySelector("td:nth-child(2)");
    const fechaText = fechaCell ? fechaCell.textContent.trim() : "";
    const fechaParts = fechaText.split("\n");
    const fecha = fechaParts[0];
    const hora = fechaParts[1] ? fechaParts[1].trim() : "00:00";

    // Aplicar filtros
    let showRow = true;

    // Filtro de búsqueda
    if (searchText && !rowText.includes(searchText)) {
      showRow = false;
    }

    // Filtro de estado
    if (statusValue) {
      if (statusValue === "vigente" && estado !== "vigente") {
        showRow = false;
      } else if (statusValue === "vencida" && estado !== "vencida") {
        showRow = false;
      } else if (statusValue === "pendiente" && pagoEstado !== "Pendiente") {
        showRow = false;
      } else if (statusValue === "activo" && pagoEstado !== "Pagada") {
        showRow = false;
      }
    }

    // Filtro de fecha
    if (dateValue) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay()); // Domingo

      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      // Ensure fechaAsesoria is defined and is a Date object
      let fechaAsesoria;
      try {
        fechaAsesoria = new Date(fecha);
        if (isNaN(fechaAsesoria.getTime())) {
          showRow = false; // Invalid date, hide the row
          return;
        }
      } catch (e) {
        showRow = false; // Error creating date, hide the row
        return;
      }

      if (dateValue === "today" && fechaAsesoria.toDateString() !== today.toDateString()) {
        showRow = false;
      } else if (
        dateValue === "week" &&
        (fechaAsesoria < weekStart ||
          fechaAsesoria > new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() + 6))
      ) {
        showRow = false;
      } else if (
        dateValue === "month" &&
        (fechaAsesoria < monthStart || fechaAsesoria > new Date(today.getFullYear(), today.getMonth() + 1, 0))
      ) {
        showRow = false;
      }
    }

    // Mostrar u ocultar fila
    if (showRow) {
      row.classList.remove("hidden");
      visibleCount++;

      // También mostrar la fila de detalles si está abierta
      const detailsRow = document.getElementById(`details-${asesoriaId}`);
      if (detailsRow && !detailsRow.classList.contains("hidden")) {
        detailsRow.classList.remove("hidden");
      }
    } else {
      row.classList.add("hidden");

      // Ocultar la fila de detalles
      const detailsRow = document.getElementById(`details-${asesoriaId}`);
      if (detailsRow) {
        detailsRow.classList.add("hidden");
      }
    }
  });

  // Mostrar mensaje si no hay resultados
  if (noResults) {
    if (visibleCount === 0) {
      noResults.classList.remove("hidden");
    } else {
      noResults.classList.add("hidden");
    }
  }
}

// Función para mostrar/ocultar detalles de una asesoría
function toggleDetails(asesoriaId) {
  const detailsRow = document.getElementById(`details-${asesoriaId}`);
  if (!detailsRow) return;

  if (detailsRow.classList.contains("hidden")) {
    // Mostrar detalles con animación
    detailsRow.classList.remove("hidden");

    // Animar la apertura
    const detailsContent = detailsRow.querySelector("div");
    if (detailsContent) {
      detailsContent.classList.add("animate-fade-in");
    }
  } else {
    // Ocultar detalles
    detailsRow.classList.add("hidden");
  }
}

// Función para editar una asesoría
function editAsesoria(asesoriaId) {
  const modal = document.getElementById("editAdvisoryModal");
  if (!modal) return;

  // Buscar datos de la asesoría
  const row = document.querySelector(`tr[data-asesoria-id="${asesoriaId}"]`);
  if (!row) return;

  // Obtener datos de la fila
  const fechaCell = row.querySelector("td:nth-child(2)");
  const fechaText = fechaCell ? fechaCell.textContent.trim() : "";
  const fechaParts = fechaText.split("\n");
  const fecha = fechaParts[0];
  const hora = fechaParts[1] ? fechaParts[1].trim() : "00:00";

  // Obtener datos adicionales de los detalles
  const detailsRow = document.getElementById(`details-${asesoriaId}`);
  let tipoAsesoria = "";
  let descripcion = "";
  let lugar = "Virtual (Zoom)";
  const tipoDocumento = "C.C";
  const numeroDocumento = "";

  if (detailsRow) {
    const paragraphs = detailsRow.querySelectorAll("p");
    paragraphs.forEach((p) => {
      const text = p.textContent.trim();
      if (text.includes("Tipo de Visa:")) {
        tipoAsesoria = text.split(":")[1].trim();
      } else if (text.includes("Descripción:")) {
        descripcion = text.split(":")[1].trim();
      } else if (text.includes("Lugar:")) {
        lugar = text.split(":")[1].trim();
      }
    });
  }

  // Llenar el formulario
  const editForm = document.getElementById("editForm");
  if (editForm) {
    const codigoInput = document.getElementById("edit_codigo_asesoria");
    const fechaInput = document.getElementById("edit_fecha_asesoria");
    const tipoAsesoriaSelect = document.getElementById("edit_tipo_asesoria");
    const descripcionInput = document.getElementById("edit_descripcion");
    const lugarSelect = document.getElementById("edit_lugar");
    const tipoDocumentoSelect = document.getElementById("edit_tipo_documento");
    const numeroDocumentoInput = document.getElementById("edit_numero_documento");

    if (codigoInput) codigoInput.value = asesoriaId;

    // Formatear fecha y hora para input datetime-local
    if (fechaInput) {
      const fechaObj = new Date(fecha);
      const year = fechaObj.getFullYear();
      const month = String(fechaObj.getMonth() + 1).padStart(2, "0");
      const day = String(fechaObj.getDate()).padStart(2, "0");
      const [hours, minutes] = hora.split(":");
      fechaInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    if (tipoAsesoriaSelect) {
      for (let i = 0; i < tipoAsesoriaSelect.options.length; i++) {
        if (tipoAsesoriaSelect.options[i].value === tipoAsesoria) {
          tipoAsesoriaSelect.selectedIndex = i;
          break;
        }
      }
    }

    if (descripcionInput) descripcionInput.value = descripcion;

    if (lugarSelect) {
      for (let i = 0; i < lugarSelect.options.length; i++) {
        if (lugarSelect.options[i].value === lugar) {
          lugarSelect.selectedIndex = i;
          break;
        }
      }
    }

    if (tipoDocumentoSelect) tipoDocumentoSelect.value = tipoDocumento;
    if (numeroDocumentoInput) numeroDocumentoInput.value = numeroDocumento;
  }

  // Mostrar el modal
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

// Función para cerrar el modal de editar asesoría
function closeEditAdvisoryModal() {
  const modal = document.getElementById("editAdvisoryModal");
  if (!modal) return;

  modal.classList.remove("flex");
  modal.classList.add("hidden");
}

// Función para ver historial de chat
function verHistorialChat(asesoriaId) {
  const modal = document.getElementById("chatHistorialModal");
  if (!modal) return;

  // Actualizar el ID de la asesoría en el modal
  const chatAsesoriaId = document.getElementById("chat-asesoria-id");
  if (chatAsesoriaId) chatAsesoriaId.textContent = asesoriaId;

  // Limpiar mensajes anteriores
  const chatMessages = document.getElementById("chat-messages");
  if (chatMessages) {
    chatMessages.innerHTML = `
    <div class="flex justify-center py-4">
      <p class="text-gray-500">No hay mensajes en esta conversación</p>
    </div>
  `;
  }

  // Mostrar el modal
  modal.classList.remove("hidden");
  modal.classList.add("flex");

  // En una implementación real, aquí cargaríamos los mensajes del chat desde el servidor
  // fetch(`/obtener_mensajes_chat?codigo_asesoria=${asesoriaId}`)
  //   .then(response => response.json())
  //   .then(data => {
  //     // Mostrar mensajes
  //   });
}

// Función para cerrar el modal de historial de chat
function closeChatHistorialModal() {
  const modal = document.getElementById("chatHistorialModal");
  if (!modal) return;

  modal.classList.remove("flex");
  modal.classList.add("hidden");
}

// Función para enviar mensaje en el chat
function enviarMensaje() {
  const chatInput = document.getElementById("chat-input");
  const chatMessages = document.getElementById("chat-messages");
  const chatAsesoriaId = document.getElementById("chat-asesoria-id");

  if (!chatInput || !chatMessages || !chatAsesoriaId) return;

  const mensaje = chatInput.value.trim();
  if (!mensaje) return;

  // Obtener el ID de la asesoría
  const asesoriaId = chatAsesoriaId.textContent;

  // Crear elemento de mensaje
  const messageElement = document.createElement("div");
  messageElement.className = "flex flex-col items-end";
  messageElement.innerHTML = `
  <div class="bg-primary-100 text-primary-800 p-3 rounded-lg max-w-xs">
    <p class="text-sm">${mensaje}</p>
  </div>
  <span class="text-xs text-gray-500 mt-1">Ahora</span>
`;

  // Agregar mensaje al chat
  chatMessages.appendChild(messageElement);

  // Limpiar input
  chatInput.value = "";

  // Hacer scroll al final del chat
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // En una implementación real, aquí enviaríamos el mensaje al servidor
  // fetch('/enviar_mensaje_chat', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     codigo_asesoria: asesoriaId,
  //     mensaje: mensaje
  //   })
  // });

  // Simular respuesta del asesor después de 1 segundo
  setTimeout(() => {
    const responseElement = document.createElement("div");
    responseElement.className = "flex flex-col items-start animate-fade-in";
    responseElement.innerHTML = `
    <div class="bg-gray-100 text-gray-800 p-3 rounded-lg max-w-xs">
      <p class="text-sm">Gracias por tu mensaje. Un asesor te responderá pronto.</p>
    </div>
    <span class="text-xs text-gray-500 mt-1">Ahora</span>
  `;

    chatMessages.appendChild(responseElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, 1000);
}

// Función para procesar el pago de una asesoría
function pagarAsesoria(asesoriaId, tipoAsesoria) {
  const modal = document.getElementById("pagoModal");
  if (!modal) return;

  // Actualizar el ID de la asesoría en el modal
  const pagoAsesoriaId = document.getElementById("pago-asesoria-id");
  if (pagoAsesoriaId) pagoAsesoriaId.textContent = asesoriaId;

  // Actualizar campos ocultos
  const pagoCodigoAsesoria = document.getElementById("pago_codigo_asesoria");
  const pagoTipoAsesoria = document.getElementById("pago_tipo_asesoria");

  if (pagoCodigoAsesoria) pagoCodigoAsesoria.value = asesoriaId;
  if (pagoTipoAsesoria) pagoTipoAsesoria.value = tipoAsesoria;

  // Actualizar monto según el tipo de asesoría
  const montoInput = document.getElementById("monto");
  if (montoInput) {
    switch (tipoAsesoria) {
      case "Visa de Trabajo":
        montoInput.value = "150.00";
        break;
      case "Visa de Estudio":
        montoInput.value = "100.00";
        break;
      case "Residencia Permanente":
        montoInput.value = "200.00";
        break;
      case "Ciudadanía":
        montoInput.value = "250.00";
        break;
      default:
        montoInput.value = "150.00";
    }
  }

  // Mostrar el modal
  modal.classList.remove("hidden");
  modal.classList.add("flex");

  // Inicializar Stripe
  reiniciarPasarelaPago();
}

// Función para cerrar el modal de pago
function closePagoModal() {
  const modal = document.getElementById("pagoModal");
  if (!modal) return;

  modal.classList.remove("flex");
  modal.classList.add("hidden");
}

// Función para cancelar una asesoría
function cancelarAsesoria(asesoriaId) {
  const modal = document.getElementById("cancelarAsesoriaModal");
  if (!modal) return;

  // Mostrar el modal
  modal.classList.remove("hidden");
  modal.classList.add("flex");

  // Configurar la acción del botón de confirmación
  const confirmBtn = document.getElementById("confirmarCancelarBtn");
  if (confirmBtn) {
    confirmBtn.onclick = async () => {
      try {
        // Enviar solicitud para eliminar la asesoría
        const response = await fetch("/cancelar_asesoria", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            codigo_asesoria: asesoriaId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Error al cancelar la asesoría");
        }

        // Mostrar notificación de éxito
        showNotification("Asesoría cancelada exitosamente", "success");

        // Cerrar el modal
        closeCancelarAsesoriaModal();

        // Eliminar la asesoría del DOM
        const row = document.querySelector(`tr[data-asesoria-id="${asesoriaId}"]`);
        if (row) {
          row.remove();
        }

        // También eliminar la fila de detalles si existe
        const detailsRow = document.getElementById(`details-${asesoriaId}`);
        if (detailsRow) {
          detailsRow.remove();
        }

        // Verificar si no hay más asesorías y mostrar el mensaje de no resultados
        const visibleRows = document.querySelectorAll("#asesorias-table-body tr[data-asesoria-id]:not(.hidden)");
        if (visibleRows.length === 0) {
          const noResults = document.getElementById("no-results");
          if (noResults) {
            noResults.classList.remove("hidden");
          }
        }

        // Renumerar las asesorías restantes
        ordenarYNumerarAsesorias();
      } catch (error) {
        console.error("Error al cancelar la asesoría:", error);
        showNotification("Error al cancelar la asesoría: " + error.message, "error");
      }
    };
  }
}

// Función para cerrar el modal de cancelar asesoría
function closeCancelarAsesoriaModal() {
  const modal = document.getElementById("cancelarAsesoriaModal");
  if (!modal) return;

  modal.classList.remove("flex");
  modal.classList.add("hidden");
}

// Función para reiniciar la pasarela de pago con Stripe
function reiniciarPasarelaPago() {
  // Obtener la clave pública de Stripe del meta tag
  const stripePublicKey = document.querySelector('meta[name="stripe-public-key"]').content;

  // Inicializar Stripe con la clave pública
  stripe = Stripe(stripePublicKey);

  const asesoriaId = document.getElementById("pago_codigo_asesoria").value;
  const monto = document.getElementById("monto").value;

  // Crear un PaymentIntent en el servidor
  fetch("/crear_payment_intent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      codigo_asesoria: asesoriaId,
      monto: monto,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((data) => {
          throw new Error(data.error || "Error al crear el PaymentIntent");
        });
      }
      return response.json();
    })
    .then((data) => {
      clientSecret = data.clientSecret;

      // Configurar Stripe Elements
      const options = {
        clientSecret: clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#4f46e5",
            colorBackground: "#ffffff",
            colorText: "#1f2937",
            colorDanger: "#ef4444",
            fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            spacingUnit: "4px",
            borderRadius: "8px",
          },
        },
      };

      // Crear elementos de Stripe
      elements = stripe.elements(options);

      // Crear y montar el elemento de pago
      paymentElement = elements.create("payment");
      paymentElement.mount("#payment-element");

      // Configurar el formulario de pago
      const form = document.getElementById("payment-form");
      const submitButton = document.getElementById("submit-button");
      const buttonText = document.getElementById("button-text");
      const spinner = document.getElementById("spinner");
      const paymentMessage = document.getElementById("payment-message");

      if (form) {
        form.addEventListener("submit", async (e) => {
          e.preventDefault();

          if (!stripe || !elements) {
            return;
          }

          // Deshabilitar el botón y mostrar spinner
          if (submitButton) submitButton.disabled = true;
          if (buttonText) buttonText.classList.add("hidden");
          if (spinner) spinner.classList.remove("hidden");

          // Confirmar el pago
          const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
              return_url: `${window.location.origin}/confirmar_pago`,
            },
          });

          if (error) {
            // Mostrar mensaje de error
            if (paymentMessage) {
              paymentMessage.classList.remove("hidden");
              paymentMessage.classList.add("bg-red-100", "text-red-700");
              paymentMessage.textContent = error.message;
            }

            // Restaurar botón
            if (submitButton) submitButton.disabled = false;
            if (buttonText) buttonText.classList.remove("hidden");
            if (spinner) spinner.classList.add("hidden");
          }
          // Si no hay error, el usuario será redirigido a la URL de retorno
        });
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      const paymentElement = document.getElementById("payment-element");
      if (paymentElement) {
        paymentElement.innerHTML = `
      <div class="p-4 bg-red-100 text-red-700 rounded-lg">
        <p>Error al inicializar el pago: ${error.message}</p>
      </div>
    `;
      }
    });
}

// Función para cancelar una reserva temporal
async function cancelarReservaTemporal(reservaId) {
  if (!reservaId) return;

  try {
    const response = await fetch("/cancelar_reserva_temporal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reserva_id: reservaId,
      }),
    });

    if (!response.ok) {
      console.error("Error al cancelar reserva temporal");
    } else {
      console.log("Reserva temporal cancelada correctamente");
    }
  } catch (error) {
    console.error("Error al cancelar reserva temporal:", error);
  }
}

// Función para procesar el pago y actualizar la UI
async function procesarPago(id) {
  try {
    const montoInput = document.getElementById("monto");
    const monto = montoInput ? Number.parseFloat(montoInput.value) : 0;

    // Obtener la fecha y hora seleccionada
    const selectedDateInput = document.getElementById("selected_date");
    const selectedDate = selectedDateInput ? selectedDateInput.value : null;
    const selectedAsesorId = document.getElementById("selected_asesor_id")?.value;

    // Enviar solicitud al servidor para registrar el pago
    const response = await fetch("/procesar_pago", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        codigo_asesoria: id,
        monto: monto,
        metodo_pago: "Tarjeta de Crédito (Stripe)",
        datos_adicionales: {
          payment_intent: clientSecret ? clientSecret.split("_secret_")[0] : null,
        },
        fecha_asesoria: selectedDate,
        id_asesor: selectedAsesorId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Error al registrar el pago en el servidor");
    }

    // Buscar el botón de pago correspondiente
    const row = document.querySelector(`tr[data-asesoria-id="${id}"]`);
    if (row) {
      const pagoBtn = row.querySelector(".pago-btn");
      if (pagoBtn) {
        // Cambiar el estilo y texto del botón
        pagoBtn.classList.remove(
          "bg-gradient-to-r",
          "from-green-600",
          "to-green-500",
          "hover:from-green-500",
          "hover:to-green-600",
          "to-green-500",
          "hover:from-green-500",
          "hover:to-green-600",
          "hover:shadow-green-500/30",
        );
        pagoBtn.classList.add(
          "bg-gradient-to-r",
          "from-blue-600",
          "to-blue-500",
          "hover:from-blue-500",
          "hover:to-blue-600",
          "hover:shadow-blue-500/30",
        );

        // Actualizar el contenido del botón
        pagoBtn.innerHTML = `
                  <span class="absolute right-0 -mt-12 h-32 w-8 opacity-20 transform rotate-12 transition-all duration-1000 translate-x-12 bg-white group-hover:-translate-x-40"></span>
                  <div class="relative flex items-center justify-center">
                      <svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                      <span>Pagado</span>
                  </div>
              `;

        // Deshabilitar el botón
        pagoBtn.onclick = null;
        pagoBtn.style.cursor = "default";
        pagoBtn.classList.remove("pago-btn");

        // Actualizar el estado de la asesoría
        row.setAttribute("data-pago-estado", "Pagada");

        // Actualizar el estado en la tabla
        const estadoCell = row.querySelector("td:nth-child(5)");
        if (estadoCell) {
          estadoCell.innerHTML = `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-600">En Proceso Activo</span>`;
        }

        // Actualizar el ícono de verificación en los detalles
        const detailsRow = document.getElementById(`details-${id}`);
        if (detailsRow) {
          // Buscar todos los párrafos en los detalles
          const paragraphs = detailsRow.querySelectorAll("p");

          // Buscar el párrafo que contiene "Precio:"
          for (const p of paragraphs) {
            if (p.textContent.includes("Precio:")) {
              const spanElement = p.querySelector("span:last-child");
              if (spanElement && !spanElement.querySelector("svg")) {
                spanElement.innerHTML = `
                $${monto.toFixed(2)} USD
                <svg class="w-4 h-4 ml-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              `;
              }
              break;
            }
          }

          // Actualizar el estado en los detalles
          for (const p of paragraphs) {
            if (p.textContent.includes("Estado:")) {
              const spanElement = p.querySelector("span:last-child");
              if (spanElement) {
                spanElement.className = "text-blue-600";
                spanElement.textContent = "En Proceso Activo";
              }
              break;
            }
          }
        }

        // Ocultar el botón de cancelar
        const cancelarBtn = row.querySelector('button[title="Cancelar"]');
        if (cancelarBtn) {
          cancelarBtn.style.display = "none";
        }
      }
    }

    // Mostrar notificación de éxito
    showNotification("Pago procesado exitosamente", "success");

    // Cerrar el modal de pago
    closePagoModal();
  } catch (error) {
    console.error("Error al procesar el pago:", error);
    showNotification("Error al procesar el pago: " + error.message, "error");
  }
}

// Función para resetear filtros
function resetFilters() {
  const searchInput = document.getElementById("search-input");
  const statusFilter = document.getElementById("filter-status");
  const dateFilter = document.getElementById("filter-date");

  if (searchInput) searchInput.value = "";
  if (statusFilter) statusFilter.value = "";
  if (dateFilter) dateFilter.value = "";

  // Aplicar filtros (mostrará todas las asesorías)
  filterAsesorias();
}

// Exportar funciones para uso global
window.openNewAdvisoryModal = openNewAdvisoryModal;
window.closeNewAdvisoryModal = closeNewAdvisoryModal;
window.editAsesoria = editAsesoria;
window.closeEditAdvisoryModal = closeEditAdvisoryModal;
window.toggleDetails = toggleDetails;
window.resetFilters = resetFilters;
window.verHistorialChat = verHistorialChat;
window.closeChatHistorialModal = closeChatHistorialModal;
window.enviarMensaje = enviarMensaje;
window.pagarAsesoria = pagarAsesoria;
window.closePagoModal = closePagoModal;
window.cancelarAsesoria = cancelarAsesoria;
window.closeCancelarAsesoriaModal = closeCancelarAsesoriaModal;
window.reiniciarPasarelaPago = reiniciarPasarelaPago;