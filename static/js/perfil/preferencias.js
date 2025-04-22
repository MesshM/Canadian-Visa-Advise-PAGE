// Funcionalidad para preferencias
document.addEventListener("DOMContentLoaded", () => {
  // Aquí se puede agregar la funcionalidad específica para las preferencias del usuario
  // Por ejemplo, configuración de notificaciones, temas, idioma, etc.

  // Esta sección está vacía en el código original, pero se puede implementar
  // la funcionalidad necesaria para gestionar las preferencias del usuario

  // Ejemplo de cómo podría ser la implementación:
  const toggleNotificaciones = document.getElementById("toggle-notificaciones")
  const toggleCorreos = document.getElementById("toggle-correos")
  const toggleTemaOscuro = document.getElementById("toggle-tema-oscuro")
  const idiomaSelect = document.getElementById("idioma-select")
  const guardarPreferenciasBtn = document.getElementById("guardar-preferencias-btn")

  // Función para mostrar alertas
  function showAlert(message, type) {
    // Implementa la lógica para mostrar alertas aquí
    // Por ejemplo, puedes usar una librería como SweetAlert2 o crear tu propio sistema de alertas
    console.log(`${type}: ${message}`) // Esto es solo un ejemplo
    // Puedes reemplazar esto con tu propia implementación de alertas
  }

  // Función para cargar las preferencias actuales
  function cargarPreferencias() {
    fetch("/perfil/obtener_preferencias")
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          // Actualizar los toggles y selects con los valores guardados
          if (toggleNotificaciones) toggleNotificaciones.checked = data.preferencias.notificaciones
          if (toggleCorreos) toggleCorreos.checked = data.preferencias.correos
          if (toggleTemaOscuro) toggleTemaOscuro.checked = data.preferencias.tema_oscuro
          if (idiomaSelect) idiomaSelect.value = data.preferencias.idioma

          // Si el tema oscuro está activado, aplicarlo
          if (data.preferencias.tema_oscuro) {
            document.documentElement.classList.add("dark-theme")
          } else {
            document.documentElement.classList.remove("dark-theme")
          }
        } else {
          showAlert("No se pudieron cargar las preferencias", "error")
        }
      })
      .catch((error) => {
        console.error("Error:", error)
        showAlert("Error al cargar las preferencias", "error")
      })
  }

  // Manejar cambio de tema oscuro en tiempo real
  if (toggleTemaOscuro) {
    toggleTemaOscuro.addEventListener("change", () => {
      if (toggleTemaOscuro.checked) {
        document.documentElement.classList.add("dark-theme")
      } else {
        document.documentElement.classList.remove("dark-theme")
      }
    })
  }

  // Guardar las preferencias
  if (guardarPreferenciasBtn) {
    guardarPreferenciasBtn.addEventListener("click", () => {
      // Añadir animación de carga
      guardarPreferenciasBtn.innerHTML = `
        <div class="flex items-center justify-center">
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          <span>Guardando...</span>
        </div>
      `
      guardarPreferenciasBtn.disabled = true

      // Recopilar las preferencias actuales
      const preferencias = {
        notificaciones: toggleNotificaciones ? toggleNotificaciones.checked : false,
        correos: toggleCorreos ? toggleCorreos.checked : false,
        tema_oscuro: toggleTemaOscuro ? toggleTemaOscuro.checked : false,
        idioma: idiomaSelect ? idiomaSelect.value : "es",
      }

      // Enviar solicitud para guardar preferencias
      fetch("/perfil/guardar_preferencias", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preferencias),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            showAlert("Preferencias guardadas correctamente", "success")
          } else {
            showAlert(data.error || "Error al guardar las preferencias", "error")
          }
        })
        .catch((error) => {
          console.error("Error:", error)
          showAlert("Error al guardar las preferencias", "error")
        })
        .finally(() => {
          // Restaurar el botón
          guardarPreferenciasBtn.innerHTML = `
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span>Guardar preferencias</span>
        `
          guardarPreferenciasBtn.disabled = false
        })
    })
  }

  // Cargar las preferencias al iniciar
  cargarPreferencias()
})
