// Funcionalidad para información personal
document.addEventListener("DOMContentLoaded", () => {
  // Reemplazar la función showAlert con la función showNotification de asesorias.js
  // Buscar la función showAlert y reemplazarla con:

  function showAlert(message, type = "success") {
    // Crear el elemento de notificación
    const notification = document.createElement("div")
    notification.className = `fixed top-4 right-4 p-4 rounded-xl shadow-lg z-50 transform transition-all duration-500 translate-x-full`

    // Aplicar estilos según el tipo
    if (type === "success") {
      notification.classList.add("bg-green-100", "text-green-800", "border-l-4", "border-green-500")
    } else if (type === "error") {
      notification.classList.add("bg-red-100", "text-red-800", "border-l-4", "border-red-500")
    } else if (type === "warning") {
      notification.classList.add("bg-yellow-100", "text-yellow-800", "border-l-4", "border-yellow-500")
    } else {
      notification.classList.add("bg-blue-100", "text-blue-800", "border-l-4", "border-blue-200")
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

  // Función específica para actualizar la imagen de perfil
  // Esta función se comunica con _sidebar.js para mantener la coherencia visual
  function actualizarImagenPerfil(imageUrl = null) {
    // Actualizar la imagen en el sidebar usando la función global
    if (window.actualizarImagenPerfilEnSidebar) {
      window.actualizarImagenPerfilEnSidebar(imageUrl)
    }

    // Actualizar la imagen en la página de perfil
    const profileImage = document.getElementById("profile-image")
    const profileInitials = document.getElementById("profile-initials")

    if (profileImage && profileInitials) {
      if (imageUrl) {
        // Si hay una URL de imagen, mostrarla y ocultar las iniciales
        profileImage.src = imageUrl + "?t=" + new Date().getTime()
        profileImage.classList.remove("hidden")
        profileInitials.classList.add("hidden")

        // Mostrar el botón de eliminar si existe
        const deleteBtn = document.getElementById("delete-profile-image")
        if (deleteBtn) {
          deleteBtn.classList.remove("opacity-0", "hidden")
          deleteBtn.classList.add("opacity-100", "hover:opacity-100")
        }
      } else {
        // Si no hay imagen, ocultar la imagen y mostrar las iniciales
        profileImage.classList.add("hidden")
        profileInitials.classList.remove("hidden")

        // Ocultar el botón de eliminar si existe
        const deleteBtn = document.getElementById("delete-profile-image")
        if (deleteBtn) {
          deleteBtn.classList.add("hidden", "opacity-0")
          deleteBtn.classList.remove("opacity-100", "hover:opacity-100")
        }
      }
    }
  }

  // Funcionalidad para la imagen de perfil
  const profileImageContainer = document.getElementById("profile-image-container")
  const profileImage = document.getElementById("profile-image")
  const profileImageUpload = document.getElementById("profile-image-upload")
  const changeProfileImageBtn = document.getElementById("change-profile-image")
  const deleteProfileModal = document.getElementById("delete-profile-modal")
  const closeDeleteProfileModalBtn = document.getElementById("close-delete-profile-modal")
  const cancelDeleteProfileBtn = document.getElementById("cancel-delete-profile")
  const confirmDeleteProfileBtn = document.getElementById("confirm-delete-profile")

  // Cargar la imagen de perfil al iniciar
  // Modificar la función loadProfileImage para manejar el overlay y el botón de cámara
  function loadProfileImage() {
    fetch("/perfil/obtener_imagen_perfil")
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          if (data.has_image) {
            // Si hay imagen de perfil, mostrarla
            // Añadir parámetro de tiempo para evitar caché
            profileImage.src = data.image_url + "?t=" + new Date().getTime()
            profileImage.classList.remove("hidden")
            document.getElementById("profile-initials").classList.add("hidden")

            // Mostrar el overlay para cambiar la imagen y ocultar el botón de cámara
            const imageOverlay = document.getElementById("profile-image-overlay")
            imageOverlay.classList.remove("hidden")
            document.getElementById("change-profile-image").classList.add("hidden")

            // Mostrar el botón de eliminar
            const deleteBtn = document.getElementById("delete-profile-image")
            deleteBtn.classList.remove("opacity-0", "hidden")
            deleteBtn.classList.add("opacity-100")
            // Permitir que el botón responda al hover
            deleteBtn.classList.add("hover:opacity-100")

            // Actualizar también la imagen en el sidebar usando la función global
            if (window.actualizarImagenPerfilEnSidebar) {
              window.actualizarImagenPerfilEnSidebar(data.image_url)
            }
          } else {
            // Si no hay imagen de perfil, mostrar iniciales
            profileImage.classList.add("hidden")
            const initialsElement = document.getElementById("profile-initials")

            // Obtener las iniciales del usuario
            const firstInitial = data.nombres ? data.nombres.charAt(0) : "U"
            const lastInitial = data.apellidos ? data.apellidos.charAt(0) : "S"
            initialsElement.textContent = firstInitial + lastInitial

            initialsElement.classList.remove("hidden")
            initialsElement.classList.add("animate-initials-appear")

            // Ocultar el overlay y mostrar el botón de cámara
            document.getElementById("profile-image-overlay").classList.add("hidden")
            document.getElementById("change-profile-image").classList.remove("hidden")

            // Ocultar completamente el botón de eliminar
            const deleteBtn = document.getElementById("delete-profile-image")
            deleteBtn.classList.add("hidden", "opacity-0")
            deleteBtn.classList.remove("opacity-100", "hover:opacity-100", "group-hover:opacity-100")

            // Actualizar el sidebar para mostrar iniciales usando la función global
            if (window.actualizarImagenPerfilEnSidebar) {
              window.actualizarImagenPerfilEnSidebar(null)
            }
          }
        } else {
          // En caso de error, mostrar iniciales
          profileImage.classList.add("hidden")
          document.getElementById("profile-initials").classList.remove("hidden")

          // Ocultar el overlay y mostrar el botón de cámara
          document.getElementById("profile-image-overlay").classList.add("hidden")
          document.getElementById("change-profile-image").classList.remove("hidden")

          // Ocultar completamente el botón de eliminar
          const deleteBtn = document.getElementById("delete-profile-image")
          deleteBtn.classList.add("hidden", "opacity-0")
          deleteBtn.classList.remove("opacity-100", "hover:opacity-100", "group-hover:opacity-100")

          // Actualizar el sidebar para mostrar iniciales
          if (window.actualizarImagenPerfilEnSidebar) {
            window.actualizarImagenPerfilEnSidebar(null)
          }
        }
      })
      .catch((error) => {
        console.error("Error al cargar la imagen de perfil:", error)
        // En caso de error, mostrar iniciales
        profileImage.classList.add("hidden")
        document.getElementById("profile-initials").classList.remove("hidden")

        // Ocultar el overlay y mostrar el botón de cámara
        document.getElementById("profile-image-overlay").classList.add("hidden")
        document.getElementById("change-profile-image").classList.remove("hidden")

        // Ocultar completamente el botón de eliminar
        const deleteBtn = document.getElementById("delete-profile-image")
        deleteBtn.classList.add("hidden", "opacity-0")
        deleteBtn.classList.remove("opacity-100", "hover:opacity-100", "group-hover:opacity-100")

        // Actualizar el sidebar para mostrar iniciales
        if (window.actualizarImagenPerfilEnSidebar) {
          window.actualizarImagenPerfilEnSidebar(null)
        }
      })
  }

  // Mejora 3: Mejorar la interacción con la imagen de perfil
  if (profileImageContainer && profileImageUpload && changeProfileImageBtn) {
    // Cargar imagen al iniciar
    loadProfileImage()

    // Abrir selector de archivos al hacer clic en el botón o en la imagen
    changeProfileImageBtn.addEventListener("click", () => {
      profileImageUpload.click()
    })

    profileImageContainer.addEventListener("click", () => {
      profileImageUpload.click()
    })

    // Añadir efecto de hover
    profileImageContainer.addEventListener("mouseenter", () => {
      profileImage.classList.add("scale-105")
    })

    profileImageContainer.addEventListener("mouseleave", () => {
      profileImage.classList.remove("scale-105")
    })

    // Manejar la selección de archivo con mejor feedback visual
    profileImageUpload.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0]

        // Validar tipo de archivo
        if (!file.type.match("image.*")) {
          showAlert("Por favor, selecciona una imagen válida", "error")
          return
        }

        // Validar tamaño (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
          showAlert("La imagen es demasiado grande. El tamaño máximo es 5MB", "error")
          return
        }

        // Previsualizar la imagen con animación
        const reader = new FileReader()
        reader.onload = (e) => {
          profileImage.classList.add("opacity-0", "transition-opacity", "duration-300")
          setTimeout(() => {
            profileImage.src = e.target.result
            profileImage.classList.remove("opacity-0")
          }, 300)
        }
        reader.readAsDataURL(file)

        // Mostrar indicador de carga mejorado
        profileImageContainer.classList.add("animate-pulse", "border-primary-300")
        changeProfileImageBtn.innerHTML = `
    <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
  `

        const formData = new FormData()
        formData.append("profile_image", file)

        // Modificar la función de subir imagen de perfil para actualizar el sidebar
        fetch("/perfil/subir_imagen_perfil", {
          method: "POST",
          body: formData,
        })
          .then((response) => response.json())
          .then((data) => {
            profileImageContainer.classList.remove("animate-pulse", "border-primary-300")
            changeProfileImageBtn.innerHTML = `
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
</svg>
`

            if (data.success) {
              showAlert("Imagen de perfil actualizada con éxito", "success")
              // Actualizar la imagen con la URL del servidor para asegurar que se carga la versión WebP
              profileImage.classList.add("opacity-0", "transition-opacity", "duration-300")
              setTimeout(() => {
                profileImage.src = data.image_url + "?t=" + new Date().getTime()
                profileImage.classList.remove("opacity-0", "hidden")
                document.getElementById("profile-initials").classList.add("hidden")

                // Mostrar el overlay y ocultar el botón de cámara
                document.getElementById("profile-image-overlay").classList.remove("hidden")
                document.getElementById("change-profile-image").classList.add("hidden")

                // Mostrar el botón de eliminar
                document.getElementById("delete-profile-image").classList.remove("opacity-0", "hidden")
                document.getElementById("delete-profile-image").classList.add("opacity-100", "hover:opacity-100")

                // Actualizar inmediatamente la imagen en el sidebar
                if (window.actualizarImagenPerfilEnSidebar) {
                  window.actualizarImagenPerfilEnSidebar(data.image_url)
                }
              }, 300)
            } else {
              showAlert(data.error || "Error al subir la imagen", "error")
            }
          })
          .catch((error) => {
            profileImageContainer.classList.remove("animate-pulse", "border-primary-300")
            changeProfileImageBtn.innerHTML = `
  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
  </svg>
`
            console.error("Error:", error)
            showAlert("Error al subir la imagen", "error")
          })
      }
    })
  }

  // Funcionalidad para eliminar la imagen de perfil
  const deleteProfileImageBtn = document.getElementById("delete-profile-image")

  if (deleteProfileImageBtn) {
    deleteProfileImageBtn.addEventListener("click", (e) => {
      e.stopPropagation() // Evitar que el clic se propague al contenedor

      // Mostrar el modal personalizado en lugar del confirm nativo
      deleteProfileModal.classList.remove("hidden")
      deleteProfileModal.classList.add("flex")

      // Añadir animación de entrada
      const modalContent = deleteProfileModal.querySelector(".bg-white")
      modalContent.classList.add("animate-scale-in")
    })
  }

  // Cerrar el modal de eliminación de foto de perfil
  if (closeDeleteProfileModalBtn) {
    closeDeleteProfileModalBtn.addEventListener("click", () => {
      closeDeleteProfileModal()
    })
  }

  if (cancelDeleteProfileBtn) {
    cancelDeleteProfileBtn.addEventListener("click", () => {
      closeDeleteProfileModal()
    })
  }

  // Update modal animations to match asesorias.js
  // Function to close the modal with animation
  function closeDeleteProfileModal() {
    const modalContent = deleteProfileModal.querySelector(".bg-white")
    modalContent.classList.add("opacity-0", "scale-95", "transition-all", "duration-300")
    setTimeout(() => {
      deleteProfileModal.classList.add("hidden")
      deleteProfileModal.classList.remove("flex")
      modalContent.classList.remove("opacity-0", "scale-95")
    }, 300)
  }

  // Cerrar el modal al hacer clic fuera del contenido
  deleteProfileModal.addEventListener("click", (e) => {
    if (e.target === deleteProfileModal) {
      closeDeleteProfileModal()
    }
  })

  // Confirmar eliminación de foto de perfil
  if (confirmDeleteProfileBtn) {
    confirmDeleteProfileBtn.addEventListener("click", () => {
      // Añadir animación de carga
      confirmDeleteProfileBtn.innerHTML = `
    <div class="flex items-center justify-center">
      <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
      <span>Eliminando...</span>
    </div>
  `
      confirmDeleteProfileBtn.disabled = true
      cancelDeleteProfileBtn.disabled = true

      fetch("/perfil/eliminar_imagen_perfil", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then((response) => response.json())
        .then((data) => {
          // Modificar la función para eliminar la imagen de perfil
          // Dentro del bloque .then((data) => { ... }) después de la eliminación exitosa
          if (data.success) {
            // Cerrar el modal después de un momento
            setTimeout(() => {
              closeDeleteProfileModal()

              // Actualizar la visualización para mostrar iniciales
              profileImage.classList.add("hidden")
              document.getElementById("profile-initials").classList.remove("hidden")
              document.getElementById("profile-initials").classList.add("animate-initials-appear")

              // Ocultar el overlay y mostrar el botón de cámara
              document.getElementById("profile-image-overlay").classList.add("hidden")
              document.getElementById("change-profile-image").classList.remove("hidden")

              // Ocultar el botón de eliminar
              const deleteBtn = document.getElementById("delete-profile-image")
              deleteBtn.classList.add("hidden", "opacity-0")
              deleteBtn.classList.remove("opacity-100", "hover:opacity-100")

              // Actualizar inmediatamente el sidebar para mostrar iniciales
              if (window.actualizarImagenPerfilEnSidebar) {
                window.actualizarImagenPerfilEnSidebar(null)
              }

              showAlert("Imagen de perfil eliminada correctamente", "success")
            }, 1500)
          } else {
            closeDeleteProfileModal()
            showAlert(data.error || "Error al eliminar la imagen de perfil", "error")
          }
        })
        .catch((error) => {
          closeDeleteProfileModal()
          console.error("Error:", error)
          showAlert("Error al eliminar la imagen de perfil", "error")
        })
        .finally(() => {
          // Restaurar el botón
          confirmDeleteProfileBtn.innerHTML = `
      <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
      </svg>
      <span>Eliminar</span>
    `
          confirmDeleteProfileBtn.disabled = false
          cancelDeleteProfileBtn.disabled = false
        })
    })
  }

  // Funcionalidad para editar datos personales
  const personalDataForm = document.getElementById("personal-data-form")
  const editPersonalDataBtn = document.getElementById("edit-personal-data-btn")
  const passwordVerificationModal = document.getElementById("password-verification-modal")
  const closePasswordVerificationModal = document.getElementById("close-password-verification-modal")
  const cancelVerification = document.getElementById("cancel-verification")
  const confirmVerification = document.getElementById("confirm-verification")
  const verificationPassword = document.getElementById("verification-password")
  const passwordError = document.getElementById("password-error")

  // Validación para el campo de celular
  const celularInput = document.getElementById("celular")
  if (celularInput) {
    celularInput.addEventListener("input", function (e) {
      // Eliminar cualquier carácter que no sea número
      this.value = this.value.replace(/\D/g, "")

      // Limitar a 10 dígitos (estándar para Colombia)
      if (this.value.length > 10) {
        this.value = this.value.slice(0, 10)
      }
    })
  }

  if (editPersonalDataBtn) {
    editPersonalDataBtn.addEventListener("click", () => {
      // Verificar si hay cambios en el formulario
      const formData = new FormData(personalDataForm)
      const originalData = {
        nombres: personalDataForm.querySelector("#nombres").defaultValue,
        apellidos: personalDataForm.querySelector("#apellidos").defaultValue,
        correo: personalDataForm.querySelector("#correo").defaultValue,
        fecha_nacimiento: personalDataForm.querySelector("#fecha_nacimiento").defaultValue,
        celular: personalDataForm.querySelector("#celular").defaultValue,
      }

      const currentData = {
        nombres: formData.get("nombres"),
        apellidos: formData.get("apellidos"),
        correo: formData.get("correo"),
        fecha_nacimiento: formData.get("fecha_nacimiento"),
        celular: formData.get("celular"),
      }

      // Verificar si hay cambios
      const hasChanges = Object.keys(originalData).some((key) => originalData[key] !== currentData[key])

      if (!hasChanges) {
        showAlert("No hay cambios para guardar", "info")
        return
      }

      // Mostrar modal de verificación de contraseña
      passwordVerificationModal.classList.remove("hidden")
      passwordVerificationModal.classList.add("flex")
      verificationPassword.value = ""
      passwordError.classList.add("hidden")
      verificationPassword.focus()
    })
  }

  // Cerrar modal de verificación
  if (closePasswordVerificationModal) {
    closePasswordVerificationModal.addEventListener("click", closeVerificationModal)
  }

  if (cancelVerification) {
    cancelVerification.addEventListener("click", closeVerificationModal)
  }

  // Function to close verification modal
  function closeVerificationModal() {
    const modalContent = passwordVerificationModal.querySelector(".bg-white")
    modalContent.classList.add("opacity-0", "scale-95", "transition-all", "duration-300")
    setTimeout(() => {
      passwordVerificationModal.classList.add("hidden")
      passwordVerificationModal.classList.remove("flex")
      modalContent.classList.remove("opacity-0", "scale-95")
    }, 300)
  }

  // Cerrar el modal al hacer clic fuera del contenido
  passwordVerificationModal.addEventListener("click", (e) => {
    if (e.target === passwordVerificationModal) {
      closeVerificationModal()
    }
  })

  // Confirmar verificación y guardar cambios
  // Modificar la función para actualizar datos personales para verificar el correo cuando cambie
  // Buscar la sección donde se maneja el evento del botón "confirm-verification" y modificarla:

  if (confirmVerification) {
    confirmVerification.addEventListener("click", () => {
      const password = verificationPassword.value

      if (!password) {
        passwordError.textContent = "Por favor, ingresa tu contraseña"
        passwordError.classList.remove("hidden")
        return
      }

      // Añadir animación de carga
      confirmVerification.innerHTML =
        '<div class="flex items-center justify-center"><div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div><span>Verificando...</span></div>'
      confirmVerification.disabled = true

      // Obtener los datos del formulario
      const formData = new FormData(personalDataForm)
      const userData = {
        nombres: formData.get("nombres"),
        apellidos: formData.get("apellidos"),
        correo: formData.get("correo"),
        fecha_nacimiento: formData.get("fecha_nacimiento"),
        celular: formData.get("celular"),
        password: password,
      }

      // Verificar si el correo ha cambiado
      const originalEmail = personalDataForm.querySelector("#correo").defaultValue
      const newEmail = userData.correo
      const emailChanged = originalEmail !== newEmail

      // Enviar solicitud para actualizar datos
      fetch("/perfil/actualizar_datos_personales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            closeVerificationModal()

            // Mostrar mensaje de éxito más detallado
            showAlert(
              "¡Datos personales actualizados con éxito! Los cambios han sido guardados correctamente.",
              "success",
            )

            // Añadir efecto visual de éxito al formulario
            const formContainer = personalDataForm.closest(".bg-white")
            formContainer.classList.add("border-green-200")
            setTimeout(() => {
              formContainer.classList.remove("border-green-200")
            }, 3000)

            // Actualizar los valores por defecto del formulario
            personalDataForm.querySelector("#nombres").defaultValue = userData.nombres
            personalDataForm.querySelector("#apellidos").defaultValue = userData.apellidos
            personalDataForm.querySelector("#correo").defaultValue = userData.correo
            personalDataForm.querySelector("#fecha_nacimiento").defaultValue = userData.fecha_nacimiento

            // Actualizar el nombre mostrado en la página
            const nameDisplay = document.querySelector(".text-base.font-medium.text-gray-900")
            if (nameDisplay) {
              nameDisplay.textContent = `${userData.nombres} ${userData.apellidos}`
            }

            // Actualizar el nombre en la sección de Foto de Perfil
            const profileNameDisplay = document.getElementById("profile-name-display")
            if (profileNameDisplay) {
              profileNameDisplay.textContent = `${userData.nombres} ${userData.apellidos}`
            }

            // Actualizar el nombre en el sidebar sin recargar la página
            if (window.actualizarNombreUsuarioEnSidebar) {
              window.actualizarNombreUsuarioEnSidebar(`${userData.nombres} ${userData.apellidos}`)
            }

            // Actualizar el correo mostrado en la página
            const emailDisplay = document.querySelector(".text-sm.text-gray-500")
            if (emailDisplay) {
              emailDisplay.textContent = userData.correo
            }

            // Si el correo ha cambiado, actualizar la UI para mostrar que necesita verificación
            if (emailChanged) {
              // Actualizar el estado de verificación del correo
              const emailVerificationStatus = document.getElementById("email-verification-status")
              if (emailVerificationStatus) {
                emailVerificationStatus.innerHTML = `
    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
    Es necesario verificar tu nuevo correo electrónico
  `
                emailVerificationStatus.classList.remove("text-green-500")
                emailVerificationStatus.classList.add("text-yellow-500")
              }

              // Mostrar el botón de verificación
              const verifyEmailBtn = document.getElementById("verify-email-btn")
              if (verifyEmailBtn && verifyEmailBtn.parentNode) {
                // Reemplazar el check de verificación con el botón
                verifyEmailBtn.parentNode.innerHTML = `
                <button type="button" id="verify-email-btn" class="bg-primary-100 hover:bg-primary-200 text-primary-700 text-sm font-medium py-1.5 px-4 rounded-lg transition-colors duration-300 hover:shadow-sm">
                  Verificar
                </button>
              `

                // Volver a añadir el evento al nuevo botón
                document.getElementById("verify-email-btn").addEventListener("click", () => {
                  const email = document.getElementById("correo").value.trim()
                  if (!email) {
                    showAlert("Por favor, ingresa un correo electrónico válido", "error")
                    return
                  }

                  // Validar formato de correo
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                  if (!emailRegex.test(email)) {
                    showAlert("Por favor, ingresa un correo electrónico válido", "error")
                    return
                  }

                  // Cambiar el botón a estado de carga
                  const verifyBtn = document.getElementById("verify-email-btn")
                  verifyBtn.innerHTML = `
                  <div class="flex items-center">
                    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-1"></div>
                    <span>Enviando...</span>
                  </div>
                `
                  verifyBtn.disabled = true

                  // Enviar solicitud para verificar correo
                  fetch("/perfil/enviar_verificacion_correo", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ email: email }),
                  })
                    .then((response) => response.json())
                    .then((data) => {
                      if (data.success) {
                        // Mostrar el modal de verificación OTP
                        const otpModal = document.getElementById("otp-modal")
                        if (otpModal) {
                          otpModal.classList.remove("hidden")
                          otpModal.classList.add("flex")

                          // Añadir animación de entrada al contenido del modal
                          const modalContent = otpModal.querySelector(".bg-white")
                          modalContent.classList.add("animate-scale-in")

                          // Actualizar el método de verificación en el modal
                          const verificationMethod = document.getElementById("verification-method")
                          if (verificationMethod) {
                            verificationMethod.textContent = "correo electrónico"
                          }

                          // Limpiar los campos de OTP
                          otpInputs.forEach((input) => {
                            input.value = ""
                          })

                          // Enfocar el primer campo
                          if (otpInputs.length > 0) {
                            otpInputs[0].focus()
                          }

                          // Inicializar el temporizador para el botón de reenvío
                          setupResendButton()

                          // Configurar el botón de verificación OTP
                          const verifyOtpBtn = document.getElementById("verify-otp-btn")
                          if (verifyOtpBtn) {
                            verifyOtpBtn.onclick = () => {
                              // Obtener el código OTP completo
                              let otp = ""
                              document.querySelectorAll(".otp-input").forEach((input) => {
                                otp += input.value
                              })

                              if (otp.length !== 6) {
                                showAlert("Por favor, ingresa el código completo de 6 dígitos", "error")
                                return
                              }

                              // Cambiar el botón a estado de carga
                              verifyOtpBtn.innerHTML = `
                                <div class="flex items-center justify-center">
                                  <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  <span>Verificando...</span>
                                </div>
                              `
                              verifyOtpBtn.disabled = true

                              // Enviar solicitud para verificar el código OTP
                              fetch("/perfil/verificar_codigo_correo", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({ otp: otp, email: email }),
                              })
                                .then((response) => response.json())
                                .then((data) => {
                                  if (data.success) {
                                    // Cerrar el modal con animación
                                    const modalContent = otpModal.querySelector(".bg-white")
                                    modalContent.classList.add(
                                      "opacity-0",
                                      "scale-95",
                                      "transition-all",
                                      "duration-300",
                                    )
                                    setTimeout(() => {
                                      otpModal.classList.add("hidden")
                                      otpModal.classList.remove("flex")
                                      modalContent.classList.remove("opacity-0", "scale-95")
                                    }, 300)

                                    // Actualizar la UI para mostrar que el correo está verificado
                                    if (verifyEmailBtn.parentNode) {
                                      verifyEmailBtn.parentNode.innerHTML = `
                                        <span class="text-green-500 flex items-center" title="Correo verificado">
                                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                          </svg>
                                        </span>
                                      `
                                    }

                                    if (emailVerificationStatus) {
                                      emailVerificationStatus.textContent = "Correo verificado"
                                      emailVerificationStatus.classList.remove("text-gray-500", "text-yellow-500")
                                      emailVerificationStatus.classList.add("text-green-500")
                                    }

                                    showAlert("¡Correo electrónico verificado con éxito!", "success")
                                  } else {
                                    showAlert(data.error || "Error al verificar el código", "error")

                                    // Restaurar el botón
                                    verifyOtpBtn.innerHTML = `
                                      <span class="absolute right-0 -mt-12 h-32 w-8 opacity-20 transform rotate-12 transition-all duration-1000 translate-x-12 bg-white group-hover:-translate-x-40"></span>
                                      <div class="relative flex items-center justify-center">
                                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                        </svg>
                                        <span>Verificar</span>
                                      </div>
                                    `
                                    verifyOtpBtn.disabled = false
                                  }
                                })
                                .catch((error) => {
                                  console.error("Error:", error)
                                  showAlert("Error al verificar el código", "error")

                                  // Restaurar el botón
                                  verifyOtpBtn.innerHTML = `
                                      <span class="absolute right-0 -mt-12 h-32 w-8 opacity-20 transform rotate-12 transition-all duration-1000 translate-x-12 bg-white group-hover:-translate-x-40"></span>
                                      <div class="relative flex items-center justify-center">
                                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                        </svg>
                                        <span>Verificar</span>
                                      </div>
                                    `
                                  verifyOtpBtn.disabled = false
                                })
                            }
                          }

                          // Configurar el botón de cancelar con animación
                          const cancelOtpBtn = document.getElementById("cancel-otp-btn")
                          if (cancelOtpBtn) {
                            cancelOtpBtn.onclick = () => {
                              const modalContent = otpModal.querySelector(".bg-white")
                              modalContent.classList.add("opacity-0", "scale-95", "transition-all", "duration-300")
                              setTimeout(() => {
                                otpModal.classList.add("hidden")
                                otpModal.classList.remove("flex")
                                modalContent.classList.remove("opacity-0", "scale-95")
                              }, 300)
                            }
                          }

                          // Configurar el botón de cerrar con animación
                          const closeOtpModal = document.getElementById("close-otp-modal")
                          if (closeOtpModal) {
                            closeOtpModal.onclick = () => {
                              const modalContent = otpModal.querySelector(".bg-white")
                              modalContent.classList.add("opacity-0", "scale-95", "transition-all", "duration-300")
                              setTimeout(() => {
                                otpModal.classList.add("hidden")
                                otpModal.classList.remove("flex")
                                modalContent.classList.remove("opacity-0", "scale-95")
                              }, 300)
                            }
                          }

                          // Cerrar el modal al hacer clic fuera del contenido
                          otpModal.addEventListener("click", (e) => {
                            if (e.target === otpModal) {
                              const modalContent = otpModal.querySelector(".bg-white")
                              modalContent.classList.add("opacity-0", "scale-95", "transition-all", "duration-300")
                              setTimeout(() => {
                                otpModal.classList.add("hidden")
                                otpModal.classList.remove("flex")
                                modalContent.classList.remove("opacity-0", "scale-95")
                              }, 300)
                            }
                          })
                        }

                        showAlert("Código de verificación enviado a tu correo electrónico", "success")
                      } else {
                        showAlert(data.error || "Error al enviar el código de verificación", "error")
                      }
                    })
                    .catch((error) => {
                      console.error("Error:", error)
                      showAlert("Error al enviar el código de verificación", "error")
                    })
                    .finally(() => {
                      // Restaurar el botón
                      verifyEmailBtn.innerHTML = "Verificar"
                      verifyEmailBtn.disabled = false
                    })
                })
              }

              // Mostrar una alerta adicional sobre la verificación
              setTimeout(() => {
                showAlert(
                  "Tu correo electrónico ha cambiado. Por favor, verifica tu nuevo correo para mantener la seguridad de tu cuenta.",
                  "warning",
                )
              }, 1000)
            }
          } else {
            passwordError.textContent = data.error || "Error al verificar la contraseña"
            passwordError.classList.remove("hidden")
          }
        })
        .catch((error) => {
          console.error("Error:", error)
          passwordError.textContent = "Error al procesar la solicitud"
          passwordError.classList.remove("hidden")
        })
        .finally(() => {
          // Restaurar el botón
          confirmVerification.innerHTML = `
          <span class="absolute right-0 -mt-12 h-32 w-8 opacity-20 transform rotate-12 transition-all duration-1000 translate-x-12 bg-white group-hover:-translate-x-40"></span>
          <div class="relative flex items-center justify-center">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span>Confirmar</span>
          </div>
        `
          confirmVerification.disabled = false
        })
    })
  }

  // Permitir enviar el formulario con Enter en el campo de contraseña
  if (verificationPassword) {
    verificationPassword.addEventListener("keyup", (e) => {
      if (e.key === "Enter") {
        confirmVerification.click()
      }
    })
  }

  // Funcionalidad para verificar correo electrónico
  const emailVerificationStatus = document.getElementById("email-verification-status")
  const emailInput = document.getElementById("correo")

  // Modificar la función verifyEmailBtnClickHandler para manejar el cooldown desde el backend
  // Buscar la función verifyEmailBtnClickHandler y reemplazarla con:

  const verifyEmailBtnClickHandler = () => {
    const email = emailInput.value.trim()

    if (!email) {
      showAlert("Por favor, ingresa un correo electrónico válido", "error")
      return
    }

    // Validar formato de correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      showAlert("Por favor, ingresa un correo electrónico válido", "error")
      return
    }

    // Cambiar el botón a estado de carga
    verifyEmailBtn.innerHTML = `
    <div class="flex items-center">
      <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-1"></div>
      <span>Enviando...</span>
    </div>
  `
    verifyEmailBtn.disabled = true

    // Enviar solicitud para verificar correo
    fetch("/perfil/enviar_verificacion_correo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: email }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          // Mostrar el modal de verificación OTP
          const otpModal = document.getElementById("otp-modal")
          if (otpModal) {
            otpModal.classList.remove("hidden")
            otpModal.classList.add("flex")

            // Añadir animación de entrada al contenido del modal
            const modalContent = otpModal.querySelector(".bg-white")
            modalContent.classList.add("animate-scale-in")

            // Actualizar el método de verificación en el modal
            const verificationMethod = document.getElementById("verification-method")
            if (verificationMethod) {
              verificationMethod.textContent = "correo electrónico"
            }

            // Limpiar los campos de OTP
            otpInputs.forEach((input) => {
              input.value = ""
            })

            // Enfocar el primer campo
            if (otpInputs.length > 0) {
              otpInputs[0].focus()
            }

            // Inicializar el temporizador para el botón de reenvío con el tiempo del servidor
            if (data.cooldown_seconds) {
              startResendTimer(data.cooldown_seconds)
            } else {
              startResendTimer(60) // Valor por defecto si el servidor no lo proporciona
            }

            // Configurar el botón de verificación OTP
            const verifyOtpBtn = document.getElementById("verify-otp-btn")
            if (verifyOtpBtn) {
              verifyOtpBtn.onclick = () => {
                // Obtener el código OTP completo
                let otp = ""
                document.querySelectorAll(".otp-input").forEach((input) => {
                  otp += input.value
                })

                if (otp.length !== 6) {
                  showAlert("Por favor, ingresa el código completo de 6 dígitos", "error")
                  return
                }

                // Cambiar el botón a estado de carga
                verifyOtpBtn.innerHTML = `
                <div class="flex items-center justify-center">
                  <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  <span>Verificando...</span>
                </div>
              `
                verifyOtpBtn.disabled = true

                // Enviar solicitud para verificar el código OTP
                fetch("/perfil/verificar_codigo_correo", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ otp: otp, email: email }),
                })
                  .then((response) => response.json())
                  .then((data) => {
                    if (data.success) {
                      // Cerrar el modal con animación
                      const modalContent = otpModal.querySelector(".bg-white")
                      modalContent.classList.add("opacity-0", "scale-95", "transition-all", "duration-300")
                      setTimeout(() => {
                        otpModal.classList.add("hidden")
                        otpModal.classList.remove("flex")
                        modalContent.classList.remove("opacity-0", "scale-95")
                      }, 300)

                      // Actualizar la UI para mostrar que el correo está verificado
                      if (verifyEmailBtn.parentNode) {
                        verifyEmailBtn.parentNode.innerHTML = `
                        <span class="text-green-500 flex items-center" title="Correo verificado">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                        </span>
                      `
                      }

                      if (emailVerificationStatus) {
                        emailVerificationStatus.textContent = "Correo verificado"
                        emailVerificationStatus.classList.remove("text-gray-500", "text-yellow-500")
                        emailVerificationStatus.classList.add("text-green-500")
                      }

                      showAlert("¡Correo electrónico verificado con éxito!", "success")
                    } else {
                      showAlert(data.error || "Error al verificar el código", "error")

                      // Restaurar el botón
                      verifyOtpBtn.innerHTML = `
                      <span class="absolute right-0 -mt-12 h-32 w-8 opacity-20 transform rotate-12 transition-all duration-1000 translate-x-12 bg-white group-hover:-translate-x-40"></span>
                      <div class="relative flex items-center justify-center">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span>Verificar</span>
                      </div>
                    `
                      verifyOtpBtn.disabled = false
                    }
                  })
                  .catch((error) => {
                    console.error("Error:", error)
                    showAlert("Error al verificar el código", "error")

                    // Restaurar el botón
                    verifyOtpBtn.innerHTML = `
                      <span class="absolute right-0 -mt-12 h-32 w-8 opacity-20 transform rotate-12 transition-all duration-1000 translate-x-12 bg-white group-hover:-translate-x-40"></span>
                      <div class="relative flex items-center justify-center">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span>Verificar</span>
                      </div>
                    `
                    verifyOtpBtn.disabled = false
                  })
              }
            }

            // Configurar el botón de cancelar con animación
            const cancelOtpBtn = document.getElementById("cancel-otp-btn")
            if (cancelOtpBtn) {
              cancelOtpBtn.onclick = () => {
                const modalContent = otpModal.querySelector(".bg-white")
                modalContent.classList.add("opacity-0", "scale-95", "transition-all", "duration-300")
                setTimeout(() => {
                  otpModal.classList.add("hidden")
                  otpModal.classList.remove("flex")
                  modalContent.classList.remove("opacity-0", "scale-95")
                }, 300)
              }
            }

            // Configurar el botón de cerrar con animación
            const closeOtpModal = document.getElementById("close-otp-modal")
            if (closeOtpModal) {
              closeOtpModal.onclick = () => {
                const modalContent = otpModal.querySelector(".bg-white")
                modalContent.classList.add("opacity-0", "scale-95", "transition-all", "duration-300")
                setTimeout(() => {
                  otpModal.classList.add("hidden")
                  otpModal.classList.remove("flex")
                  modalContent.classList.remove("opacity-0", "scale-95")
                }, 300)
              }
            }

            // Cerrar el modal al hacer clic fuera del contenido
            otpModal.addEventListener("click", (e) => {
              if (e.target === otpModal) {
                const modalContent = otpModal.querySelector(".bg-white")
                modalContent.classList.add("opacity-0", "scale-95", "transition-all", "duration-300")
                setTimeout(() => {
                  otpModal.classList.add("hidden")
                  otpModal.classList.remove("flex")
                  modalContent.classList.remove("opacity-0", "scale-95")
                }, 300)
              }
            })
          }

          showAlert("Código de verificación enviado a tu correo electrónico", "success")
        } else if (data.cooldown) {
          // Si hay un tiempo de espera activo, mostrar mensaje con tiempo restante
          showAlert(`Debes esperar ${data.remaining_seconds} segundos antes de solicitar un nuevo código`, "warning")
        } else {
          showAlert(data.error || "Error al enviar el código de verificación", "error")
        }
      })
      .catch((error) => {
        console.error("Error:", error)
        showAlert("Error al enviar el código de verificación", "error")
      })
      .finally(() => {
        // Restaurar el botón
        verifyEmailBtn.innerHTML = "Verificar"
        verifyEmailBtn.disabled = false
      })
  }

  const verifyEmailBtn = document.getElementById("verify-email-btn")

  if (verifyEmailBtn) {
    verifyEmailBtn.addEventListener("click", verifyEmailBtnClickHandler)
  }

  // NUEVA IMPLEMENTACIÓN DE LA FUNCIONALIDAD OTP
  // Función para configurar los campos OTP
  function setupOTPInputs() {
    const otpInputs = document.querySelectorAll(".otp-input")

    // Eliminar eventos anteriores para evitar duplicados
    otpInputs.forEach((input) => {
      const newInput = input.cloneNode(true)
      input.parentNode.replaceChild(newInput, input)
    })

    // Obtener referencias actualizadas
    const refreshedInputs = document.querySelectorAll(".otp-input")

    refreshedInputs.forEach((input, index) => {
      // Manejar el evento keydown
      input.addEventListener("keydown", function (e) {
        // Permitir solo números y teclas de control
        if (!/^\d$/.test(e.key) && !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)) {
          e.preventDefault()
          return
        }

        // Si es un número
        if (/^\d$/.test(e.key)) {
          // Reemplazar el contenido actual
          this.value = e.key

          // Mover al siguiente campo si no es el último
          if (index < refreshedInputs.length - 1) {
            e.preventDefault() // Prevenir la entrada predeterminada
            refreshedInputs[index + 1].focus()
          }

          // Disparar evento para validación
          this.dispatchEvent(new Event("input"))
          // Disparar evento de cambio para asegurar que el valor se registre
          this.dispatchEvent(new Event("change"))

          // Si es el último campo y se ha ingresado un número, verificar automáticamente
          if (index === refreshedInputs.length - 1) {
            // Verificar si todos los campos están llenos
            const allFilled = Array.from(refreshedInputs).every((input) => input.value.length === 1)
            if (allFilled) {
              // Opcional: verificar automáticamente después de un breve retraso
              setTimeout(() => {
                const verifyOtpBtn = document.getElementById("verify-otp-btn")
                if (verifyOtpBtn) verifyOtpBtn.click()
              }, 500)
            }
          }
          return
        }

        // Manejar retroceso (Backspace)
        if (e.key === "Backspace") {
          if (this.value) {
            // Si hay un valor, borrarlo
            this.value = ""
          } else if (index > 0) {
            // Si no hay valor y no es el primer campo, ir al anterior
            e.preventDefault()
            refreshedInputs[index - 1].focus()
            refreshedInputs[index - 1].value = ""
          }
        }

        // Manejar teclas de flecha
        if (e.key === "ArrowLeft" && index > 0) {
          e.preventDefault()
          refreshedInputs[index - 1].focus()
        }

        if (e.key === "ArrowRight" && index < refreshedInputs.length - 1) {
          e.preventDefault()
          refreshedInputs[index + 1].focus()
        }
      })

      // Prevenir entrada directa en el evento input
      input.addEventListener("input", function (e) {
        // Si se ingresó más de un carácter, mantener solo el primero
        if (this.value.length > 1) {
          this.value = this.value.charAt(0)
        }

        // Asegurarse de que sea un número
        if (!/^\d*$/.test(this.value)) {
          this.value = ""
        }
      })

      // Seleccionar todo el contenido al enfocar
      input.addEventListener("focus", function () {
        this.select()
      })

      // Manejar pegado de texto
      input.addEventListener("paste", (e) => {
        e.preventDefault()

        // Obtener el texto pegado
        const pastedText = (e.clipboardData || window.clipboardData).getData("text").trim()

        // Si es un número de 6 dígitos, distribuirlo en los campos
        if (/^\d{6}$/.test(pastedText)) {
          refreshedInputs.forEach((input, i) => {
            input.value = pastedText.charAt(i)
          })

          // Enfocar el último campo
          refreshedInputs[refreshedInputs.length - 1].focus()
        }
      })
    })
  }

  // Configurar los campos OTP inicialmente
  setupOTPInputs()

  // Configurar los campos OTP cuando se abra el modal
  const otpModal = document.getElementById("otp-modal")
  if (otpModal) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class" && !otpModal.classList.contains("hidden")) {
          // Limpiar y configurar los campos OTP
          const otpInputs = document.querySelectorAll(".otp-input")
          otpInputs.forEach((input) => (input.value = ""))

          // Enfocar el primer campo después de un breve retraso
          setTimeout(() => {
            if (otpInputs.length > 0) otpInputs[0].focus()
          }, 100)

          // Configurar los campos OTP
          setupOTPInputs()
        }
      })
    })

    observer.observe(otpModal, { attributes: true })
  }

  // Modificar la función setupResendButton para consultar el estado del cooldown desde el servidor
  // Buscar la función setupResendButton y reemplazarla con:

  function setupResendButton() {
    const resendBtn = document.getElementById("resend-code")
    const countdownEl = document.getElementById("countdown")

    if (resendBtn && countdownEl) {
      let countdownTime = 60 // 1 minuto en segundos por defecto
      let countdownInterval = null

      // Función para actualizar el contador
      function updateCountdown() {
        if (countdownTime <= 0) {
          // Detener el intervalo
          if (countdownInterval) {
            clearInterval(countdownInterval)
            countdownInterval = null
          }

          // Habilitar el botón cuando el contador llega a cero
          resendBtn.classList.remove("cursor-not-allowed", "text-gray-400")
          resendBtn.classList.add("text-primary-600", "hover:text-primary-800")
          countdownEl.textContent = "Puedes solicitar un nuevo código ahora"
          resendBtn.disabled = false
          return
        }

        // Mostrar el tiempo restante
        countdownEl.textContent = `Puedes solicitar un nuevo código en ${countdownTime} segundos`
        countdownTime--
      }

      // Iniciar el contador con un tiempo específico
      function startResendTimer(seconds = 60) {
        // Detener cualquier intervalo existente
        if (countdownInterval) {
          clearInterval(countdownInterval)
        }

        // Deshabilitar el botón
        resendBtn.classList.add("cursor-not-allowed", "text-gray-400")
        resendBtn.classList.remove("text-primary-600", "hover:text-primary-800")
        resendBtn.disabled = true

        // Iniciar el contador con el tiempo proporcionado
        countdownTime = seconds
        updateCountdown() // Actualizar inmediatamente
        countdownInterval = setInterval(updateCountdown, 1000)
      }

      // Verificar el estado del cooldown desde el servidor cuando se abre el modal
      function checkServerCooldown() {
        fetch("/perfil/verificar_cooldown_correo")
          .then((response) => response.json())
          .then((data) => {
            if (data.cooldown && data.remaining_seconds > 0) {
              startResendTimer(data.remaining_seconds)
            } else {
              // Si no hay cooldown activo, habilitar el botón
              resendBtn.classList.remove("cursor-not-allowed", "text-gray-400")
              resendBtn.classList.add("text-primary-600", "hover:text-primary-800")
              countdownEl.textContent = "Puedes solicitar un nuevo código ahora"
              resendBtn.disabled = false
            }
          })
          .catch((error) => {
            console.error("Error al verificar cooldown:", error)
            // En caso de error, usar el comportamiento predeterminado
            startResendTimer()
          })
      }

      // Configurar el evento de clic para reenviar el código
      resendBtn.addEventListener("click", function () {
        if (this.disabled) return

        const email = document.getElementById("correo").value.trim()

        // Validar el correo
        if (!email) {
          showAlert("Por favor, ingresa un correo electrónico válido", "error")
          return
        }

        // Validar formato de correo
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
          showAlert("Por favor, ingresa un correo electrónico válido", "error")
          return
        }

        // Mostrar estado de carga
        this.innerHTML = `
      <div class="flex items-center">
        <div class="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-600 mr-1"></div>
        <span>Enviando...</span>
      </div>
    `

        // Enviar solicitud para verificar correo
        fetch("/perfil/enviar_verificacion_correo", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: email }),
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.success) {
              showAlert("Nuevo código de verificación enviado a tu correo electrónico", "success")

              // Limpiar los campos de OTP
              const otpInputs = document.querySelectorAll(".otp-input")
              otpInputs.forEach((input) => {
                input.value = ""
              })

              // Enfocar el primer campo
              if (otpInputs.length > 0) {
                otpInputs[0].focus()
              }

              // Restaurar el texto del botón
              this.textContent = "Reenviar"

              // Iniciar el temporizador con el tiempo proporcionado por el servidor
              if (data.cooldown_seconds) {
                startResendTimer(data.cooldown_seconds)
              } else {
                startResendTimer(60) // Valor por defecto
              }
            } else if (data.cooldown) {
              // Si hay un tiempo de espera activo, mostrar mensaje y actualizar el contador
              showAlert(
                `Debes esperar ${data.remaining_seconds} segundos antes de solicitar un nuevo código`,
                "warning",
              )
              startResendTimer(data.remaining_seconds)
              this.textContent = "Reenviar"
            } else {
              showAlert(data.error || "Error al enviar el código de verificación", "error")
              this.textContent = "Reenviar"
            }
          })
          .catch((error) => {
            console.error("Error:", error)
            showAlert("Error al enviar el código de verificación", "error")
            this.textContent = "Reenviar"
          })
      })

      // Inicializar el temporizador cuando se muestra el modal
      if (otpModal) {
        // Observar cambios en la visibilidad del modal
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.attributeName === "class") {
              if (!otpModal.classList.contains("hidden")) {
                // Verificar el estado del cooldown desde el servidor
                checkServerCooldown()
              }
            }
          })
        })

        observer.observe(otpModal, { attributes: true })

        // También verificar el estado si el modal ya está visible
        if (!otpModal.classList.contains("hidden")) {
          checkServerCooldown()
        }
      }

      // Exponer la función startResendTimer para que pueda ser llamada desde fuera
      window.startResendTimer = startResendTimer
    }
  }

  // Inicializar el temporizador para el botón de reenvío cuando el DOM esté listo
  setupResendButton()

  // Exportar la función para que esté disponible globalmente
  window.actualizarImagenPerfil = actualizarImagenPerfil

  // Declarar otpInputs aquí para que esté en el scope correcto
  const otpInputs = document.querySelectorAll(".otp-input")
})
