// Administrador - Gestión de Asesores
document.addEventListener("DOMContentLoaded", () => {
    initFilters()
    initSearch()
    initAsesorActions()
    loadAsesorStats()
  })
  
  // Inicializar filtros
  function initFilters() {
    const filterStatus = document.getElementById("filterStatus")
    const filterEspecialidad = document.getElementById("filterEspecialidad")
    const searchAsesor = document.getElementById("searchAsesor")
    ;[filterStatus, filterEspecialidad, searchAsesor].forEach((element) => {
      if (element) {
        element.addEventListener("change", applyFilters)
      }
    })
  
    // Botón de filtrar
    const filterBtn = document.querySelector('button[type="button"]')
    if (filterBtn) {
      filterBtn.addEventListener("click", applyFilters)
    }
  }
  
  // Inicializar búsqueda
  function initSearch() {
    const searchInput = document.getElementById("searchAsesor")
    if (searchInput) {
      let searchTimeout
      searchInput.addEventListener("input", () => {
        clearTimeout(searchTimeout)
        searchTimeout = setTimeout(() => {
          applyFilters()
        }, 500)
      })
    }
  }
  
  // Aplicar filtros
  async function applyFilters() {
    const filters = {
      nombre: document.getElementById("searchAsesor")?.value || "",
      estado: document.getElementById("filterStatus")?.value || "",
      especialidad: document.getElementById("filterEspecialidad")?.value || "",
    }
  
    try {
      const params = new URLSearchParams(filters)
      const response = await fetch(`/admin/asesores/buscar?${params}`)
      const data = await response.json()
  
      if (data.success) {
        updateAsesoresTable(data.asesores)
        updatePagination(data.pagination)
      }
    } catch (error) {
      console.error("Error aplicando filtros:", error)
      showToast("Error al filtrar asesores", "error")
    }
  }
  
  // Actualizar tabla de asesores
  function updateAsesoresTable(asesores) {
    const tbody = document.querySelector("tbody")
    if (!tbody) return
  
    if (asesores.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">No hay asesores que coincidan con los filtros</td></tr>'
      return
    }
  
    tbody.innerHTML = asesores
      .map(
        (asesor) => `
          <tr class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                      <div class="h-10 w-10 flex-shrink-0 bg-gray-200 rounded-full text-gray-500 flex items-center justify-center">
                          ${asesor.nombre?.[0] || "A"}${asesor.apellidos?.[0] || ""}
                      </div>
                      <div class="ml-4">
                          <div class="text-sm font-medium text-gray-900">${asesor.nombre} ${asesor.apellidos}</div>
                          <div class="text-sm text-gray-500">${asesor.correo}</div>
                      </div>
                  </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${asesor.especialidad || "Inmigración Canadiense"}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${asesor.clientes_asignados || 0}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${asesor.total_asesorias || 0}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                      ${generateStarRating(asesor.calificacion || 4.5)}
                      <span class="ml-2 text-sm text-gray-600">${asesor.calificacion || "4.5"}</span>
                  </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                  <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(asesor.estado)}">
                      ${asesor.estado || "Activo"}
                  </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex justify-end space-x-2">
                      <a href="/admin/asesores/${asesor.id_asesor}/editar" class="text-primary-600 hover:text-primary-900">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                          </svg>
                      </a>
                      <button onclick="viewAsesorDetails(${asesor.id_asesor})" class="text-blue-600 hover:text-blue-900">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                          </svg>
                      </button>
                      <button onclick="toggleAsesorStatus(${asesor.id_asesor})" class="text-yellow-600 hover:text-yellow-900">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"></path>
                          </svg>
                      </button>
                  </div>
              </td>
          </tr>
      `,
      )
      .join("")
  }
  
  // Cargar estadísticas de asesores
  async function loadAsesorStats() {
    try {
      const response = await fetch("/admin/asesores/estadisticas")
      const data = await response.json()
  
      if (data.success) {
        updateStatsCards(data.estadisticas)
      }
    } catch (error) {
      console.error("Error cargando estadísticas:", error)
    }
  }
  
  // Actualizar tarjetas de estadísticas
  function updateStatsCards(stats) {
    const elementos = {
      total_asesores: stats.total_asesores || 0,
      asesores_activos: stats.asesores_activos || 0,
      asesorias_mes: stats.asesorias_mes || 0,
      promedio_calificacion: stats.promedio_calificacion || "4.8",
    }
  
    Object.keys(elementos).forEach((key) => {
      const elemento = document.querySelector(`[data-stat="${key}"]`)
      if (elemento) {
        elemento.textContent = elementos[key]
      }
    })
  }
  
  // Inicializar acciones de asesor
  function initAsesorActions() {
    // Las funciones se definen globalmente para ser llamadas desde los botones
  }
  
  // Ver detalles del asesor
  async function viewAsesorDetails(asesorId) {
    try {
      const response = await fetch(`/admin/asesores/${asesorId}/detalles`)
      const data = await response.json()
  
      if (data.success) {
        showAsesorModal(data.asesor)
      } else {
        showToast("Error al cargar detalles del asesor", "error")
      }
    } catch (error) {
      console.error("Error:", error)
      showToast("Error al cargar detalles del asesor", "error")
    }
  }
  
  // Mostrar modal con detalles del asesor
  function showAsesorModal(asesor) {
    const modal = document.createElement("div")
    modal.className = "fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
    modal.innerHTML = `
          <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div class="mt-3">
                  <div class="flex justify-between items-center mb-4">
                      <h3 class="text-lg font-medium text-gray-900">Detalles del Asesor</h3>
                      <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600">
                          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                          </svg>
                      </button>
                  </div>
                  
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <h4 class="font-medium text-gray-900 mb-2">Información Personal</h4>
                          <p><strong>Nombre:</strong> ${asesor.nombre} ${asesor.apellidos}</p>
                          <p><strong>Correo:</strong> ${asesor.correo}</p>
                          <p><strong>Teléfono:</strong> ${asesor.telefono || "N/A"}</p>
                          <p><strong>Especialidad:</strong> ${asesor.especialidad}</p>
                      </div>
                      
                      <div>
                          <h4 class="font-medium text-gray-900 mb-2">Estadísticas</h4>
                          <p><strong>Clientes Asignados:</strong> ${asesor.clientes_asignados || 0}</p>
                          <p><strong>Asesorías Realizadas:</strong> ${asesor.total_asesorias || 0}</p>
                          <p><strong>Calificación:</strong> ${asesor.calificacion || "4.5"}/5</p>
                          <p><strong>Estado:</strong> ${asesor.estado || "Activo"}</p>
                      </div>
                  </div>
                  
                  ${
                    asesor.biografia
                      ? `
                      <div class="mt-4">
                          <h4 class="font-medium text-gray-900 mb-2">Biografía</h4>
                          <p class="text-gray-600">${asesor.biografia}</p>
                      </div>
                  `
                      : ""
                  }
                  
                  <div class="flex justify-end mt-6 space-x-3">
                      <button onclick="closeModal()" class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">
                          Cerrar
                      </button>
                      <a href="/admin/asesores/${asesor.id_asesor}/editar" class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
                          Editar
                      </a>
                  </div>
              </div>
          </div>
      `
  
    document.body.appendChild(modal)
  
    // Cerrar modal al hacer click fuera
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal()
      }
    })
  }
  
  // Cerrar modal
  function closeModal() {
    const modal = document.querySelector(".fixed.inset-0")
    if (modal) {
      modal.remove()
    }
  }
  
  // Cambiar estado del asesor
  async function toggleAsesorStatus(asesorId) {
    if (!confirm("¿Estás seguro de que quieres cambiar el estado de este asesor?")) {
      return
    }
  
    try {
      const response = await fetch(`/admin/asesores/${asesorId}/toggle-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })
  
      const data = await response.json()
  
      if (data.success) {
        showToast("Estado del asesor actualizado correctamente")
        applyFilters() // Recargar tabla
      } else {
        showToast(data.message || "Error al cambiar estado", "error")
      }
    } catch (error) {
      console.error("Error:", error)
      showToast("Error al cambiar estado del asesor", "error")
    }
  }
  
  // Funciones de utilidad
  function generateStarRating(rating) {
    const stars = []
    const fullStars = Math.floor(rating)
  
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          '<svg class="w-4 h-4 fill-current text-yellow-400" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>',
        )
      } else {
        stars.push(
          '<svg class="w-4 h-4 text-gray-300 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>',
        )
      }
    }
  
    return `<div class="flex text-yellow-400">${stars.join("")}</div>`
  }
  
  function getStatusBadgeClass(estado) {
    switch (estado) {
      case "Activo":
        return "bg-green-100 text-green-800"
      case "Inactivo":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-red-100 text-red-800"
    }
  }
  
  function updatePagination(pagination) {
    // Implementar actualización de paginación
  }
  
  function showToast(message, type = "success") {
    const toast = document.createElement("div")
    toast.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
      type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
    }`
    toast.textContent = message
  
    document.body.appendChild(toast)
  
    setTimeout(() => {
      toast.remove()
    }, 3000)
  }
  