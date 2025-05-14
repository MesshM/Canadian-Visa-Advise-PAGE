document.addEventListener("DOMContentLoaded", () => {
  // Filtros para el historial de asesorías (si existen)
  const filtroFechaBtn = document.getElementById("filtro-fecha-btn")
  const filtroEstadoSelect = document.getElementById("filtro-estado")

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

  // Función para mostrar alertas
  function showAlert(message, type = "success") {
    const alertContainer = document.getElementById("alert-container")
    const alertElement = document.getElementById("alert")

    if (alertContainer && alertElement) {
      // Configurar el estilo según el tipo de alerta
      if (type === "success") {
        alertElement.className =
          "p-4 rounded-xl border animate-fade-in shadow-md bg-green-50 border-green-200 text-green-700"
      } else {
        alertElement.className = "p-4 rounded-xl border animate-fade-in shadow-md bg-red-50 border-red-200 text-red-700"
      }

      // Establecer el mensaje
      alertElement.textContent = message

      // Mostrar la alerta
      alertContainer.classList.remove("hidden")

      // Ocultar después de 3 segundos
      setTimeout(() => {
        alertContainer.classList.add("hidden")
      }, 3000)
    } else {
      // Fallback si no existe el contenedor de alertas
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
  }

  // Función para cargar el historial de asesorías
  function cargarHistorialAsesorias(fechaInicio = null, fechaFin = null, estado = "todos") {
    // Mostrar indicador de carga
    const historialContainer = document.getElementById("historial-asesorias-container")
    if (historialContainer) {
      historialContainer.innerHTML = `
        <div class="flex justify-center items-center p-8">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-t-2 border-primary-600"></div>
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
      if (asesoria.estado === "completada" || asesoria.estado === "Pagada") statusColor = "green"
      else if (asesoria.estado === "cancelada") statusColor = "red"
      else if (asesoria.estado === "pendiente" || asesoria.estado === "Pendiente") statusColor = "yellow"
      else if (asesoria.estado === "en proceso" || asesoria.estado === "En Proceso Activo") statusColor = "blue"

      // Formatear la fecha
      const fechaCreacion = new Date(asesoria.fecha_creacion)
      const fechaFormateada = fechaCreacion.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })

      // Formatear la fecha de asesoría si existe
      let fechaAsesoria = ""
      if (asesoria.fecha_asesoria) {
        const fecha = new Date(asesoria.fecha_asesoria)
        fechaAsesoria = fecha.toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      }

      html += `
        <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="font-medium">Asesoría #${asesoria.codigo_asesoria}</h3>
              <p class="text-sm text-gray-600">${fechaFormateada} - ${asesoria.tipo_asesoria}</p>
              <p class="text-sm mt-2">${asesoria.descripcion || "Sin descripción"}</p>
            </div>
            <div class="text-${statusColor}-600 bg-${statusColor}-100 px-3 py-1 rounded-full text-sm">
              ${asesoria.estado}
            </div>
          </div>
          <div class="mt-3 pt-3 border-t">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <span class="text-sm text-gray-500">Asesor:</span>
                <span class="text-sm">${asesoria.asesor_asignado || "No asignado"}</span>
              </div>
              ${
                fechaAsesoria
                  ? `
              <div>
                <span class="text-sm text-gray-500">Fecha de asesoría:</span>
                <span class="text-sm">${fechaAsesoria}</span>
              </div>
              `
                  : ""
              }
              <div>
                <span class="text-sm text-gray-500">Lugar:</span>
                <span class="text-sm">${asesoria.lugar || "Virtual (Zoom)"}</span>
              </div>
            </div>
          </div>
        </div>
      `
    })

    html += `</div>`
    historialContainer.innerHTML = html
  }
})
