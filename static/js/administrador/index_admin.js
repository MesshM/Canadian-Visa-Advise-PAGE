import { Chart } from "@/components/ui/chart"
// Administrador - Panel Principal
document.addEventListener("DOMContentLoaded", () => {
  // Inicializar componentes del dashboard
  initNotifications()
  initTabs()
  initCharts()
  loadDashboardData()
})

// Gestión de notificaciones
function initNotifications() {
  const notificationBtn = document.getElementById("notificationBtn")
  const notificationDropdown = document.getElementById("notificationDropdown")

  if (notificationBtn && notificationDropdown) {
    notificationBtn.addEventListener("click", (e) => {
      e.stopPropagation()
      notificationDropdown.classList.toggle("hidden")
    })

    // Cerrar dropdown al hacer click fuera
    document.addEventListener("click", () => {
      notificationDropdown.classList.add("hidden")
    })

    // Cargar notificaciones
    loadNotifications()
  }
}

// Sistema de tabs
function initTabs() {
  const tabButtons = document.querySelectorAll("[data-tab]")
  const tabContents = document.querySelectorAll(".tab-content")

  tabButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const targetTab = this.getAttribute("data-tab")

      // Remover clases activas
      tabButtons.forEach((btn) => {
        btn.classList.remove("border-primary-600", "text-primary-600", "active")
        btn.classList.add("border-transparent")
      })

      tabContents.forEach((content) => {
        content.classList.add("hidden")
        content.classList.remove("active")
      })

      // Activar tab seleccionado
      this.classList.add("border-primary-600", "text-primary-600", "active")
      this.classList.remove("border-transparent")

      const targetContent = document.getElementById(targetTab + "-content")
      if (targetContent) {
        targetContent.classList.remove("hidden")
        targetContent.classList.add("active")
      }
    })
  })
}

// Cargar datos del dashboard
async function loadDashboardData() {
  try {
    const response = await fetch("/admin/api/estadisticas")
    const data = await response.json()

    if (data.success) {
      updateDashboardStats(data.estadisticas)
    }
  } catch (error) {
    console.error("Error cargando estadísticas:", error)
  }
}

// Actualizar estadísticas del dashboard
function updateDashboardStats(stats) {
  // Actualizar contadores
  const elementos = {
    total_usuarios: stats.total_usuarios || 0,
    total_asesores: stats.total_asesores || 0,
    total_asesorias_mes: stats.asesorias_mes || 0,
    ingresos_mes: stats.ingresos_mes || "0.00",
  }

  Object.keys(elementos).forEach((key) => {
    const elemento = document.querySelector(`[data-stat="${key}"]`)
    if (elemento) {
      elemento.textContent = elementos[key]
    }
  })
}

// Cargar notificaciones
async function loadNotifications() {
  try {
    const response = await fetch("/admin/api/notificaciones")
    const data = await response.json()

    if (data.success) {
      updateNotificationBadge(data.count)
      renderNotifications(data.notificaciones)
    }
  } catch (error) {
    console.error("Error cargando notificaciones:", error)
  }
}

// Actualizar badge de notificaciones
function updateNotificationBadge(count) {
  const badge = document.getElementById("notificationBadge")
  if (badge) {
    badge.textContent = count
    badge.style.display = count > 0 ? "flex" : "none"
  }
}

// Renderizar notificaciones
function renderNotifications(notificaciones) {
  const container = document.querySelector("#notificationDropdown .max-h-64")
  if (!container) return

  if (notificaciones.length === 0) {
    container.innerHTML = '<div class="p-4 text-center text-gray-500">No hay notificaciones</div>'
    return
  }

  container.innerHTML = notificaciones
    .map(
      (notif) => `
        <a href="#" class="block p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors duration-200">
            <p class="text-sm font-medium text-gray-900">${notif.titulo}</p>
            <p class="text-xs text-gray-500 mt-1">${notif.mensaje}</p>
            <p class="text-xs text-gray-400 mt-1">${notif.tiempo}</p>
        </a>
    `,
    )
    .join("")
}

// Inicializar gráficos (si Chart.js está disponible)
function initCharts() {
  if (typeof Chart !== "undefined") {
    // Gráfico de usuarios por mes
    const ctxUsuarios = document.getElementById("chartUsuarios")
    if (ctxUsuarios) {
      new Chart(ctxUsuarios, {
        type: "line",
        data: {
          labels: ["Ene", "Feb", "Mar", "Abr", "May", "Jun"],
          datasets: [
            {
              label: "Nuevos Usuarios",
              data: [12, 19, 3, 5, 2, 3],
              borderColor: "rgb(59, 130, 246)",
              backgroundColor: "rgba(59, 130, 246, 0.1)",
              tension: 0.4,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              display: false,
            },
          },
        },
      })
    }
  }
}

// Funciones de utilidad
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

// Actualizar datos cada 30 segundos
setInterval(loadDashboardData, 30000)
