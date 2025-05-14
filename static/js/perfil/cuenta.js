// Funcionalidad para cuenta
document.addEventListener("DOMContentLoaded", () => {
  // Funcionalidad para eliminar cuenta
  const deleteAccountBtn = document.getElementById("delete-account-btn")
  const deleteAccountModal = document.getElementById("delete-account-modal")
  const cancelDeleteBtn = document.getElementById("cancel-delete-btn")
  const confirmDeleteBtn = document.getElementById("confirm-delete-btn")
  const deleteConfirmationInput = document.getElementById("delete-confirmation")

  // Function to show alerts (example implementation, replace with your actual implementation)
  function showAlert(message, type) {
    const alertDiv = document.createElement("div")
    alertDiv.className = `alert alert-${type}`
    alertDiv.textContent = message
    document.body.appendChild(alertDiv) // Append to body or a specific container

    // Remove the alert after a few seconds
    setTimeout(() => {
      alertDiv.remove()
    }, 3000)
  }

  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener("click", () => {
      deleteAccountModal.classList.remove("hidden")
      deleteAccountModal.classList.add("flex")
    })
  }

  // 2. Para el modal de eliminar cuenta
  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener("click", () => {
      // Añadir animación de cierre
      const modalContent = deleteAccountModal.querySelector(".bg-white")
      modalContent.classList.add("opacity-0", "scale-95", "transition-all", "duration-300")
      setTimeout(() => {
        deleteAccountModal.classList.add("hidden")
        deleteAccountModal.classList.remove("flex")
        modalContent.classList.remove("opacity-0", "scale-95")
        deleteConfirmationInput.value = ""
        confirmDeleteBtn.disabled = true
      }, 300)
    })
  }

  if (deleteConfirmationInput) {
    deleteConfirmationInput.addEventListener("input", () => {
      confirmDeleteBtn.disabled = deleteConfirmationInput.value !== "ELIMINAR"
    })
  }

  // Mejorar la función para eliminar cuenta con animaciones y confirmación visual
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", () => {
      if (deleteConfirmationInput.value === "ELIMINAR") {
        // Añadir animación de carga con diseño mejorado
        confirmDeleteBtn.innerHTML =
          '<div class="relative flex items-center justify-center"><div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div><span>Eliminando...</span></div>'
        confirmDeleteBtn.disabled = true

        // Añadir efecto visual al modal
        deleteAccountModal.querySelector(".bg-white").classList.add("border-red-500", "border-2", "shadow-red-100")

        fetch("/eliminar_cuenta", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.success) {
              // Mostrar mensaje de éxito dentro del modal
              const successMessage = document.createElement("div")
              successMessage.className = "bg-red-100 text-red-700 p-3 rounded-lg mt-4 flex items-center animate-fade-in"
              successMessage.innerHTML = `
          <svg class="w-5 h-5 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span>Cuenta eliminada correctamente. Redirigiendo...</span>
        `
              deleteAccountModal.querySelector(".bg-white").appendChild(successMessage)

              // Redirigir después de mostrar el mensaje
              setTimeout(() => {
                window.location.href = "/logout"
              }, 2000)
            } else {
              deleteAccountModal.classList.add("hidden")
              deleteAccountModal.classList.remove("flex")
              showAlert(data.error || "Error al eliminar la cuenta", "error")

              // Restaurar el botón
              confirmDeleteBtn.innerHTML =
                '<div class="relative flex items-center justify-center"><svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg><span>Eliminar cuenta</span></div>'
              confirmDeleteBtn.disabled = false
            }
          })
          .catch((error) => {
            console.error("Error:", error)
            deleteAccountModal.classList.add("hidden")
            deleteAccountModal.classList.remove("flex")
            showAlert("Error al eliminar la cuenta", "error")

            // Restaurar el botón
            confirmDeleteBtn.innerHTML =
              '<div class="relative flex items-center justify-center"><svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg><span>Eliminar cuenta</span></div>'
            confirmDeleteBtn.disabled = false
          })
      }
    })
  }

  // Funcionalidad para descargar datos personales
  const downloadDataBtn = document.getElementById("download-data-btn")

  if (downloadDataBtn) {
    downloadDataBtn.addEventListener("click", () => {
      // Añadir animación de carga con diseño mejorado
      downloadDataBtn.innerHTML =
        '<div class="relative flex items-center justify-center"><div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div><span>Descargando...</span></div>'
      downloadDataBtn.disabled = true
      downloadDataBtn.classList.add("opacity-80")

      fetch("/descargar_datos_personales")
        .then((response) => {
          if (response.ok) {
            return response.blob()
          }
          throw new Error("Error al descargar los datos")
        })
        .then((blob) => {
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.style.display = "none"
          a.href = url
          a.download = "datos_personales.json"
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)

          // Mostrar animación de éxito
          downloadDataBtn.innerHTML =
            '<div class="relative flex items-center justify-center"><svg class="w-5 h-5 mr-2 text-white animate-check-mark" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg><span>Descargado</span></div>'

          // Después de un momento, restaurar el botón
          setTimeout(() => {
            downloadDataBtn.innerHTML =
              '<div class="relative flex items-center justify-center"><svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg><span>Descargar datos</span></div>'
            downloadDataBtn.disabled = false
            downloadDataBtn.classList.remove("opacity-80")
          }, 2000)

          showAlert("Datos descargados con éxito", "success")
        })
        .catch((error) => {
          console.error("Error:", error)
          showAlert("Error al descargar los datos", "error")

          // Restaurar el botón
          downloadDataBtn.innerHTML =
            '<div class="relative flex items-center justify-center"><svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg><span>Descargar datos</span></div>'
          downloadDataBtn.disabled = false
          downloadDataBtn.classList.remove("opacity-80")
        })
    })
  }
})
