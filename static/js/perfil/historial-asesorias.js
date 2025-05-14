// Funcionalidad para historial de asesorías
document.addEventListener("DOMContentLoaded", () => {
  // Aquí se puede agregar la funcionalidad específica para el historial de asesorías
  // Por ejemplo, cargar datos de asesorías pasadas, filtrar por fecha, etc.

  // Esta sección está vacía en el código original, pero se puede implementar
  // la funcionalidad necesaria para mostrar y gestionar el historial de asesorías

  // Ejemplo de cómo podría ser la implementación:
  const filtroFechaBtn = document.getElementById("filtro-fecha-btn")
  const filtroEstadoSelect = document.getElementById("filtro-estado")

  // Función para mostrar alertas
  function showAlert(message, type = "success") {
    const alertDiv = document.createElement("div")
    alertDiv.className = `fixed top-4 right-4 z-50 bg-${type === "success" ? "green" : "red"}-100 border border-${type === "success" ? "green" : "red"}-500 text-${type === "success" ? "green" : "red"}-700 px-4 py-3 rounded`
    alertDiv.setAttribute("role", "alert")
    alertDiv.innerHTML = `
      <strong class="font-bold">${type === "success" ? "Éxito:" : "Error:"}</strong>
      <span class="block sm:inline">${message}</span>
    `
    document.body.appendChild(alertDiv)

    // Desaparecer después de 3 segundos
    setTimeout(() => {
      alertDiv.remove()
    }, 3000)
  }

  if (filtroFechaBtn) {
    filtroFechaBtn.addEventListener("click", () => {
      const fechaInicio = document.getElementById("fecha-inicio").value
      const fechaFin = document.getElementById("fecha-fin").value

      if (!fechaInicio || !fechaFin) {
        showAlert("Por favor, selecciona un rango de fechas completo", "error")
        return
      }

      // Aquí se implementaría la lógica para filtrar por fecha
      cargarHistorialAsesorias(fechaInicio, fechaFin, filtroEstadoSelect.value)
    })
  }

  if (filtroEstadoSelect) {
    filtroEstadoSelect.addEventListener("change", () => {
      const fechaInicio = document.getElementById("fecha-inicio").value
      const fechaFin = document.getElementById("fecha-fin").value

      // Filtrar por estado seleccionado
      cargarHistorialAsesorias(fechaInicio, fechaFin, filtroEstadoSelect.value)
    })
  }

  // Función para cargar el historial de asesorías
  function cargarHistorialAsesorias(fechaInicio = null, fechaFin = null, estado = "todos") {
    // Mostrar indicador de carga
    const historialContainer = document.getElementById("historial-asesorias-container")
    if (historialContainer) {
      historialContainer.innerHTML = `
        <div class="flex justify-center items-center p-8">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      `

      // Aquí se implementaría la llamada a la API para obtener el historial
      fetch("/perfil/historial_asesorias", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          estado: estado,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            // Renderizar los resultados
            renderizarHistorialAsesorias(data.asesorias)
          } else {
            historialContainer.innerHTML = `
            <div class="text-center p-8 text-gray-500">
              <p>No se pudieron cargar las asesorías. ${data.error || "Intenta nuevamente más tarde."}</p>
            </div>
          `
          }
        })
        .catch((error) => {
          console.error("Error:", error)
          historialContainer.innerHTML = `
          <div class="text-center p-8 text-gray-500">
            <p>Ocurrió un error al cargar las asesorías. Intenta nuevamente más tarde.</p>
          </div>
        `
        })
    }
  }

  // Función para renderizar el historial de asesorías
  function renderizarHistorialAsesorias(asesorias) {
    const historialContainer = document.getElementById("historial-asesorias-container")

    if (!asesorias || asesorias.length === 0) {
      historialContainer.innerHTML = `
        <div class="text-center p-8 text-gray-500">
          <p>No hay asesorías que coincidan con los criterios seleccionados.</p>
        </div>
      `
      return
    }

    // Crear el HTML para mostrar las asesorías
    let html = `
      <div class="grid gap-4">
    `

    asesorias.forEach((asesoria) => {
      // Determinar el color según el estado
      let statusColor = "gray"
      if (asesoria.estado === "completada") statusColor = "green"
      else if (asesoria.estado === "cancelada") statusColor = "red"
      else if (asesoria.estado === "pendiente") statusColor = "yellow"

      html += `
        <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="font-medium">${asesoria.titulo}</h3>
              <p class="text-sm text-gray-600">${asesoria.fecha} - ${asesoria.hora}</p>
              <p class="text-sm mt-2">${asesoria.descripcion}</p>
            </div>
            <div class="text-${statusColor}-600 bg-${statusColor}-100 px-3 py-1 rounded-full text-sm">
              ${asesoria.estado}
            </div>
          </div>
          <div class="mt-3 pt-3 border-t flex justify-between items-center">
            <div class="flex items-center">
              <img src="${asesoria.asesor.imagen || "/placeholder.svg"}" alt="${asesoria.asesor.nombre}" 
                class="w-8 h-8 rounded-full mr-2">
              <span class="text-sm">${asesoria.asesor.nombre}</span>
            </div>
            <button class="text-primary-600 hover:text-primary-800 text-sm" 
              data-id="${asesoria.id}">Ver detalles</button>
          </div>
        </div>
      `
    })

    html += `</div>`
    historialContainer.innerHTML = html

    // Agregar event listeners a los botones de detalles
    document.querySelectorAll("[data-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const asesoriaId = button.getAttribute("data-id")
        // Aquí se implementaría la lógica para mostrar los detalles de la asesoría
        mostrarDetallesAsesoria(asesoriaId)
      })
    })
  }

  // Función para mostrar los detalles de una asesoría
  function mostrarDetallesAsesoria(id) {
    // Aquí se implementaría la lógica para mostrar un modal con los detalles
    // de la asesoría seleccionada
    console.log(`Mostrar detalles de la asesoría ${id}`)

    // Ejemplo de implementación:
    fetch(`/perfil/asesoria/${id}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          // Crear y mostrar un modal con los detalles
          const modal = document.createElement("div")
          modal.className = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto animate-scale-in">
              <div class="flex justify-between items-start mb-4">
                <h2 class="text-xl font-bold">${data.asesoria.titulo}</h2>
                <button class="text-gray-500 hover:text-gray-700" id="cerrar-detalles">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
              
              <div class="mb-4">
                <p class="text-sm text-gray-600 mb-2">
                  <span class="font-medium">Fecha y hora:</span> 
                  ${data.asesoria.fecha} a las ${data.asesoria.hora}
                </p>
                <p class="text-sm text-gray-600 mb-2">
                  <span class="font-medium">Estado:</span> 
                  <span class="px-2 py-1 rounded-full text-xs bg-${
                    data.asesoria.estado === "completada"
                      ? "green"
                      : data.asesoria.estado === "cancelada"
                        ? "red"
                        : data.asesoria.estado === "pendiente"
                          ? "yellow"
                          : "gray"
                  }-100 text-${
                    data.asesoria.estado === "completada"
                      ? "green"
                      : data.asesoria.estado === "cancelada"
                        ? "red"
                        : data.asesoria.estado === "pendiente"
                          ? "yellow"
                          : "gray"
                  }-600">${data.asesoria.estado}</span>
                </p>
                <p class="text-sm text-gray-600 mb-4">
                  <span class="font-medium">Duración:</span> ${data.asesoria.duracion} minutos
                </p>
              </div>
              
              <div class="mb-4">
                <h3 class="font-medium mb-2">Descripción</h3>
                <p class="text-sm text-gray-700">${data.asesoria.descripcion}</p>
              </div>
              
              <div class="mb-4">
                <h3 class="font-medium mb-2">Asesor</h3>
                <div class="flex items-center">
                  <img src="${data.asesoria.asesor.imagen || "/placeholder.svg"}" 
                    alt="${data.asesoria.asesor.nombre}" 
                    class="w-10 h-10 rounded-full mr-3">
                  <div>
                    <p class="font-medium">${data.asesoria.asesor.nombre}</p>
                    <p class="text-sm text-gray-600">${data.asesoria.asesor.especialidad}</p>
                  </div>
                </div>
              </div>
              
              ${
                data.asesoria.notas
                  ? `
                <div class="mb-4">
                  <h3 class="font-medium mb-2">Notas</h3>
                  <p class="text-sm text-gray-700">${data.asesoria.notas}</p>
                </div>
              `
                  : ""
              }
              
              <div class="flex justify-end mt-6">
                <button class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 mr-2">
                  Cerrar
                </button>
                ${
                  data.asesoria.estado === "pendiente"
                    ? `
                  <button class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
                    Reprogramar
                  </button>
                `
                    : ""
                }
              </div>
            </div>
          `

          document.body.appendChild(modal)

          // Cerrar el modal
          const cerrarBtn = document.getElementById("cerrar-detalles")
          if (cerrarBtn) {
            cerrarBtn.addEventListener("click", () => {
              modal.classList.add("opacity-0")
              setTimeout(() => {
                document.body.removeChild(modal)
              }, 300)
            })
          }

          // También cerrar al hacer clic fuera del contenido
          modal.addEventListener("click", (e) => {
            if (e.target === modal) {
              modal.classList.add("opacity-0")
              setTimeout(() => {
                document.body.removeChild(modal)
              }, 300)
            }
          })
        } else {
          showAlert("No se pudieron cargar los detalles de la asesoría", "error")
        }
      })
      .catch((error) => {
        console.error("Error:", error)
        showAlert("Error al cargar los detalles de la asesoría", "error")
      })
  }

  // Cargar el historial de asesorías al iniciar
  cargarHistorialAsesorias()
})
