document.addEventListener("DOMContentLoaded", () => {
  // Función específica para perfil.js que actualiza la imagen de perfil
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

  // Navegación de pestañas
  const tabButtons = document.querySelectorAll(".tab-button")
  const tabContents = document.querySelectorAll(".tab-content")

  // Mejora 1: Añadir animaciones más suaves para las transiciones de pestañas
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tabId = button.getAttribute("data-tab")

      // Actualizar botones con transiciones más suaves y efectos mejorados
      tabButtons.forEach((btn) => {
        btn.classList.remove("bg-primary-50", "text-primary-700", "border", "shadow-sm", "scale-105")
        btn.classList.add("text-gray-600", "hover:bg-gray-50", "hover:text-gray-900", "transition-all", "duration-300")

        // Reducir el tamaño de los iconos en las pestañas inactivas
        const icon = btn.querySelector("svg")
        if (icon) {
          icon.classList.remove("text-primary-600")
          icon.classList.add("text-gray-500")
        }
      })

      button.classList.remove("text-gray-600", "hover:bg-gray-50", "hover:text-gray-900")
      button.classList.add(
        "bg-primary-50",
        "text-primary-700",
        "border",
        "shadow-sm",
        "transition-all",
        "duration-300",
        "scale-105",
      )

      // Destacar el icono en la pestaña activa
      const activeIcon = button.querySelector("svg")
      if (activeIcon) {
        activeIcon.classList.remove("text-gray-500")
        activeIcon.classList.add("text-primary-600")
      }

      // Actualizar contenidos con animación de fade
      tabContents.forEach((content) => {
        content.classList.add("hidden")
        content.classList.remove("animate-fade-in")
      })
      const activeContent = document.getElementById(`${tabId}-content`)
      activeContent.classList.remove("hidden")
      // Forzar un reflow para que la animación se ejecute
      void activeContent.offsetWidth
      activeContent.classList.add("animate-fade-in")

      // Guardar la pestaña activa en localStorage
      localStorage.setItem("activeTab", tabId)
    })
  })

  // Añadir efectos de hover mejorados a las pestañas
  tabButtons.forEach((button) => {
    button.addEventListener("mouseenter", () => {
      if (!button.classList.contains("bg-primary-50")) {
        button.classList.add("bg-gray-50", "scale-105", "shadow-sm")

        const icon = button.querySelector("svg")
        if (icon) {
          icon.classList.add("text-gray-700")
        }
      }
    })

    button.addEventListener("mouseleave", () => {
      if (!button.classList.contains("bg-primary-50")) {
        button.classList.remove("bg-gray-50", "scale-105", "shadow-sm")

        const icon = button.querySelector("svg")
        if (icon) {
          icon.classList.remove("text-gray-700")
        }
      }
    })
  })

  // Restaurar la pestaña activa desde localStorage
  const activeTab = localStorage.getItem("activeTab")
  if (activeTab) {
    const activeButton = document.querySelector(`.tab-button[data-tab="${activeTab}"]`)
    if (activeButton) {
      activeButton.click()
    }
  }

  // Funcionalidad para mostrar/ocultar contraseñas
  const togglePasswordButtons = document.querySelectorAll(".toggle-password")
  togglePasswordButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.getAttribute("data-target")
      const passwordInput = document.getElementById(targetId)
      const eyeIcon = button.querySelector(".eye-icon")
      const eyeOffIcon = button.querySelector(".eye-off-icon")

      if (passwordInput.type === "password") {
        passwordInput.type = "text"
        eyeIcon.classList.add("hidden")
        eyeOffIcon.classList.remove("hidden")
      } else {
        passwordInput.type = "password"
        eyeIcon.classList.remove("hidden")
        eyeOffIcon.classList.add("hidden")
      }
    })
  })

  // Verificación de fortaleza de contraseña
  const newPasswordInput = document.getElementById("new-password")
  const confirmPasswordInput = document.getElementById("confirm-password")
  const passwordStrength = document.getElementById("password-strength")
  const passwordStrengthText = document.getElementById("password-strength-text")
  const passwordMatch = document.getElementById("password-match")

  if (newPasswordInput) {
    newPasswordInput.addEventListener("input", () => {
      const password = newPasswordInput.value
      let strength = 0
      let message = ""

      if (password.length >= 8) strength += 1
      if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength += 1
      if (password.match(/\d/)) strength += 1
      if (password.match(/[^a-zA-Z\d]/)) strength += 1

      switch (strength) {
        case 0:
          passwordStrength.style.width = "0%"
          passwordStrength.style.backgroundColor = "#ef4444"
          message = "Muy débil"
          break
        case 1:
          passwordStrength.style.width = "25%"
          passwordStrength.style.backgroundColor = "#ef4444"
          message = "Débil"
          break
        case 2:
          passwordStrength.style.width = "50%"
          passwordStrength.style.backgroundColor = "#eab308"
          message = "Regular"
          break
        case 3:
          passwordStrength.style.width = "75%"
          passwordStrength.style.backgroundColor = "#22c55e"
          message = "Buena"
          break
        case 4:
          passwordStrength.style.width = "100%"
          passwordStrength.style.backgroundColor = "#22c55e"
          message = "Excelente"
          break
      }

      passwordStrengthText.textContent = message

      // Verificar si las contraseñas coinciden
      if (confirmPasswordInput.value) {
        checkPasswordMatch()
      }
    })
  }

  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener("input", checkPasswordMatch)
  }

  function checkPasswordMatch() {
    if (newPasswordInput.value === confirmPasswordInput.value && newPasswordInput.value !== "") {
      passwordMatch.textContent = "Las contraseñas coinciden"
      passwordMatch.classList.remove("hidden", "text-primary-600")
      passwordMatch.classList.add("text-green-500")
    } else if (confirmPasswordInput.value !== "") {
      passwordMatch.textContent = "Las contraseñas no coinciden"
      passwordMatch.classList.remove("hidden", "text-green-500")
      passwordMatch.classList.add("text-primary-600")
    } else {
      passwordMatch.classList.add("hidden")
    }
  }

  // Funcionalidad para verificación en dos pasos
  const toggle2fa = document.getElementById("toggle-2fa")
  const setup2fa = document.getElementById("2fa-setup")
  const setup2faBtn = document.getElementById("setup-2fa-btn")

  if (toggle2fa) {
    toggle2fa.addEventListener("change", () => {
      if (toggle2fa.checked) {
        setup2fa.classList.remove("hidden")
        setup2fa.classList.add("animate-fade-in")
      } else {
        setup2fa.classList.add("hidden")
      }
    })

    // Asegurar que el toggle funcione correctamente
    toggle2fa.addEventListener("click", function () {
      this.checked = !this.checked
      if (this.checked) {
        setup2fa.classList.remove("hidden")
        setup2fa.classList.add("animate-fade-in")
      } else {
        setup2fa.classList.add("hidden")
      }
    })
  }

  if (setup2faBtn) {
    setup2faBtn.addEventListener("click", () => {
      const selectedMethod = document.querySelector('input[name="2fa-method"]:checked')

      if (!selectedMethod) {
        showAlert("Por favor, selecciona un método de verificación", "error")
        return
      }

      // Simulación de configuración exitosa
      showAlert("Verificación en dos pasos configurada correctamente", "success")

      // Actualizar el estado visual
      const statusText = document.querySelector("#toggle-2fa").parentElement.previousElementSibling.querySelector("p")
      if (statusText) {
        statusText.textContent = "Actualmente activada"
        statusText.classList.remove("text-gray-500")
        statusText.classList.add("text-green-500")
      }
    })
  }

  // Funcionalidad para verificar correo electrónico
  const verifyEmailBtn = document.getElementById("verify-email-btn")
  const verifyPhoneBtn = document.getElementById("verify-phone-btn")
  const otpModal = document.getElementById("otp-modal")
  const verificationMethod = document.getElementById("verification-method")
  const cancelOtpBtn = document.getElementById("cancel-otp-btn")
  const verifyOtpBtn = document.getElementById("verify-otp-btn")
  const otpInputs = document.querySelectorAll(".otp-input")
  const resendCodeBtn = document.getElementById("resend-code")
  const countdownEl = document.getElementById("countdown")

  let currentVerificationMethod = ""
  let countdownInterval
  let secondsLeft = 60

  if (verifyEmailBtn) {
    verifyEmailBtn.addEventListener("click", () => {
      currentVerificationMethod = "correo electrónico"
      verificationMethod.textContent = currentVerificationMethod

      const email = document.getElementById("email").value
      if (!email) {
        showAlert("Por favor, ingresa tu correo electrónico", "error")
        return
      }

      // Añadir animación de carga
      verifyEmailBtn.innerHTML = '<span class="animate-pulse">Enviando...</span>'
      verifyEmailBtn.disabled = true

      // Enviar solicitud para verificar correo
      fetch("/enviar_codigo_verificacion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          method: "email",
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            otpModal.classList.remove("hidden")
            otpModal.classList.add("flex")
            resetOtpInputs()
            startCountdown()
          } else {
            showAlert(data.error || "Error al enviar el código de verificación", "error")
          }

          // Restaurar el botón
          verifyEmailBtn.innerHTML = "Verificar"
          verifyEmailBtn.disabled = false
        })
        .catch((error) => {
          console.error("Error:", error)
          showAlert("Error al enviar el código de verificación", "error")

          // Restaurar el botón
          verifyEmailBtn.innerHTML = "Verificar"
          verifyEmailBtn.disabled = false
        })
    })
  }

  if (verifyPhoneBtn) {
    verifyPhoneBtn.addEventListener("click", () => {
      currentVerificationMethod = "teléfono"
      verificationMethod.textContent = currentVerificationMethod

      const phone = document.getElementById("phone").value
      if (!phone) {
        showAlert("Por favor, ingresa tu número de teléfono", "error")
        return
      }

      // Añadir animación de carga
      verifyPhoneBtn.innerHTML = '<span class="animate-pulse">Enviando...</span>'
      verifyPhoneBtn.disabled = true

      // Enviar solicitud para verificar teléfono
      fetch("/enviar_codigo_verificacion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: phone,
          method: "sms",
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            otpModal.classList.remove("hidden")
            otpModal.classList.add("flex")
            resetOtpInputs()
            startCountdown()
          } else {
            showAlert(data.error || "Error al enviar el código de verificación", "error")
          }

          // Restaurar el botón
          verifyPhoneBtn.innerHTML = "Verificar"
          verifyPhoneBtn.disabled = false
        })
        .catch((error) => {
          console.error("Error:", error)
          showAlert("Error al enviar el código de verificación", "error")

          // Restaurar el botón
          verifyPhoneBtn.innerHTML = "Verificar"
          verifyPhoneBtn.disabled = false
        })
    })
  }

  // 1. Para el modal OTP (verificación de código)
  if (cancelOtpBtn) {
    cancelOtpBtn.addEventListener("click", () => {
      // Añadir animación de cierre
      const modalContent = otpModal.querySelector(".bg-white")
      modalContent.classList.add("opacity-0", "scale-95", "transition-all", "duration-300")
      setTimeout(() => {
        otpModal.classList.add("hidden")
        otpModal.classList.remove("flex")
        modalContent.classList.remove("opacity-0", "scale-95")
        clearInterval(countdownInterval)
      }, 300)
    })
  }

  if (otpInputs.length > 0) {
    // Manejar la entrada de OTP
    otpInputs.forEach((input, index) => {
      input.addEventListener("keyup", (e) => {
        if (e.key >= "0" && e.key <= "9") {
          // Avanzar al siguiente input
          if (index < otpInputs.length - 1) {
            otpInputs[index + 1].focus()
          }
        } else if (e.key === "Backspace") {
          // Retroceder al input anterior
          if (index > 0) {
            otpInputs[index - 1].focus()
          }
        }
      })

      input.addEventListener("paste", (e) => {
        e.preventDefault()
        const pasteData = e.clipboardData.getData("text")
        const digits = pasteData.replace(/\D/g, "").split("").slice(0, otpInputs.length)

        digits.forEach((digit, i) => {
          if (i < otpInputs.length) {
            otpInputs[i].value = digit
          }
        })

        if (digits.length > 0 && digits.length <= otpInputs.length) {
          otpInputs[Math.min(digits.length, otpInputs.length - 1)].focus()
        }
      })
    })
  }

  // Función para iniciar el contador de tiempo para reenviar código
  function startCountdown() {
    secondsLeft = 60
    countdownEl.textContent = `Puedes solicitar un nuevo código en ${secondsLeft} segundos`

    clearInterval(countdownInterval)
    countdownInterval = setInterval(() => {
      secondsLeft--
      countdownEl.textContent = `Puedes solicitar un nuevo código en ${secondsLeft} segundos`

      if (secondsLeft <= 0) {
        clearInterval(countdownInterval)
        countdownEl.textContent = "Puedes solicitar un nuevo código ahora"
        // Habilitar visualmente el botón de reenvío
        resendCodeBtn.classList.add("text-primary-600", "hover:text-primary-800")
        resendCodeBtn.classList.remove("text-gray-400", "cursor-not-allowed")
      }
    }, 1000)
  }

  // Verificar el código OTP con animaciones mejoradas
  if (verifyOtpBtn) {
    verifyOtpBtn.addEventListener("click", () => {
      const otp = Array.from(otpInputs)
        .map((input) => input.value)
        .join("")

      if (otp.length !== otpInputs.length) {
        showAlert("Por favor, ingresa el código completo", "error")
        // Añadir animación de shake a los inputs incompletos
        otpInputs.forEach((input) => {
          if (!input.value) {
            input.classList.add("border-red-500", "animate-shake")
            setTimeout(() => {
              input.classList.remove("border-red-500", "animate-shake")
            }, 500)
          }
        })
        return
      }

      // Añadir animación de carga con diseño mejorado
      verifyOtpBtn.innerHTML =
        '<div class="relative flex items-center justify-center"><div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div><span>Verificando...</span></div>'
      verifyOtpBtn.disabled = true

      // Verificar el código OTP
      fetch("/verificar_codigo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          otp: otp,
          method: currentVerificationMethod === "correo electrónico" ? "email" : "sms",
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            // Añadir animación de éxito antes de cerrar el modal
            otpModal.querySelector(".bg-white").classList.add("border-green-500", "border-2")

            // Mostrar mensaje de éxito dentro del modal
            const successMessage = document.createElement("div")
            successMessage.className =
              "bg-green-100 text-green-700 p-3 rounded-lg mt-4 flex items-center animate-fade-in"
            successMessage.innerHTML = `
        <svg class="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <span>${currentVerificationMethod === "correo electrónico" ? "Correo" : "Teléfono"} verificado con éxito</span>
      `
            otpModal.querySelector(".bg-white").appendChild(successMessage)

            // Cerrar el modal después de mostrar el mensaje
            setTimeout(() => {
              otpModal.classList.add("hidden")
              otpModal.classList.remove("flex")
              clearInterval(countdownInterval)
              showAlert(
                `${currentVerificationMethod === "correo electrónico" ? "Correo" : "Teléfono"} verificado con éxito`,
                "success",
              )

              // Actualizar visualmente el estado de verificación
              const verifyBtn = currentVerificationMethod === "correo electrónico" ? verifyEmailBtn : verifyPhoneBtn
              verifyBtn.textContent = "Verificado"
              verifyBtn.classList.remove(
                "bg-gradient-to-r",
                "from-primary-600",
                "to-primary-500",
                "hover:from-primary-500",
                "hover:to-primary-600",
              )
              verifyBtn.classList.add("bg-green-500", "hover:bg-green-600")
              verifyBtn.disabled = true
            }, 1500)
          } else {
            showAlert(data.error || "Código de verificación incorrecto", "error")

            // Añadir animación de error a los inputs
            otpInputs.forEach((input) => {
              input.classList.add("border-red-500", "animate-shake")
              setTimeout(() => {
                input.classList.remove("border-red-500", "animate-shake")
              }, 500)
            })

            // Restaurar el botón
            verifyOtpBtn.innerHTML =
              '<div class="relative flex items-center justify-center"><svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg><span>Verificar</span></div>'
            verifyOtpBtn.disabled = false
          }
        })
        .catch((error) => {
          console.error("Error:", error)
          showAlert("Error al verificar el código", "error")

          // Restaurar el botón
          verifyOtpBtn.innerHTML =
            '<div class="relative flex items-center justify-center"><svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg><span>Verificar</span></div>'
          verifyOtpBtn.disabled = false
        })
    })
  }

  if (resendCodeBtn) {
    resendCodeBtn.addEventListener("click", () => {
      if (secondsLeft > 0) return

      const method = currentVerificationMethod === "correo electrónico" ? "email" : "sms"
      const value = method === "email" ? document.getElementById("email").value : document.getElementById("phone").value

      // Añadir animación de carga y deshabilitar el botón
      resendCodeBtn.innerHTML =
        '<span class="inline-flex items-center"><div class="animate-spin rounded-full h-3 w-3 border-b-2 border-t-2 border-primary-600 mr-1"></div>Enviando...</span>'
      resendCodeBtn.disabled = true
      resendCodeBtn.classList.add("opacity-50", "cursor-not-allowed")

      fetch("/enviar_codigo_verificacion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          [method]: value,
          method: method,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            resetOtpInputs()
            startCountdown()

            // Mostrar mensaje de éxito dentro del modal
            const successMessage = document.createElement("div")
            successMessage.className =
              "bg-green-100 text-green-700 p-2 rounded-lg mt-2 text-xs flex items-center animate-fade-in"
            successMessage.innerHTML = `
        <svg class="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <span>Código reenviado correctamente</span>
      `

            // Añadir el mensaje al contenedor adecuado
            const messageContainer = document.querySelector("#otp-modal .text-center.mb-6")
            if (messageContainer) {
              // Eliminar mensajes anteriores si existen
              const oldMessage = messageContainer.querySelector(".bg-green-100")
              if (oldMessage) oldMessage.remove()

              messageContainer.appendChild(successMessage)

              // Eliminar el mensaje después de 3 segundos
              setTimeout(() => {
                successMessage.classList.add("opacity-0", "transition-opacity", "duration-500")
                setTimeout(() => successMessage.remove(), 500)
              }, 3000)
            }
          } else {
            showAlert(data.error || "Error al reenviar el código", "error")
          }

          // Restaurar el botón
          resendCodeBtn.innerHTML = "Reenviar"
          resendCodeBtn.disabled = false
          resendCodeBtn.classList.add("text-gray-400", "cursor-not-allowed")
        })
        .catch((error) => {
          console.error("Error:", error)
          showAlert("Error al reenviar el código", "error")

          // Restaurar el botón
          resendCodeBtn.innerHTML = "Reenviar"
          resendCodeBtn.disabled = false
          resendCodeBtn.classList.add("text-gray-400", "cursor-not-allowed")
        })
    })
  }

  function resetOtpInputs() {
    otpInputs.forEach((input) => {
      input.value = ""
    })
    if (otpInputs.length > 0) {
      otpInputs[0].focus()
    }
  }

  // Funcionalidad para eliminar cuenta
  const deleteAccountBtn = document.getElementById("delete-account-btn")
  const deleteAccountModal = document.getElementById("delete-account-modal")
  const cancelDeleteBtn = document.getElementById("cancel-delete-btn")
  const confirmDeleteBtn = document.getElementById("confirm-delete-btn")
  const deleteConfirmationInput = document.getElementById("delete-confirmation")

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
  // Modificar la función loadProfileImage para manejar URLs absolutas
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

  // Función para cerrar el modal con animación
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
          if (data.success) {
            // Cerrar el modal después de un momento
            setTimeout(() => {
              closeDeleteProfileModal()

              // Actualizar la visualización para mostrar iniciales
              profileImage.classList.add("hidden")
              document.getElementById("profile-initials").classList.remove("hidden")
              document.getElementById("profile-initials").classList.add("animate-initials-appear")

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

          // Restaurar el botón
          confirmDeleteProfileBtn.innerHTML = `Eliminar`
          confirmDeleteProfileBtn.disabled = false
          cancelDeleteProfileBtn.disabled = false
        })
        .catch((error) => {
          console.error("Error:", error)
          closeDeleteProfileModal()
          showAlert("Error al eliminar la imagen de perfil", "error")

          // Restaurar el botón
          confirmDeleteProfileBtn.innerHTML = `Eliminar`
          confirmDeleteProfileBtn.disabled = false
          cancelDeleteProfileBtn.disabled = false
        })
    })
  }

  // Mejorar la función para mostrar alertas con animaciones más suaves
  function showAlert(message, type) {
    const alertContainer = document.getElementById("alert-container")
    const alert = document.getElementById("alert")

    if (alertContainer && alert) {
      alert.textContent = message
      alert.className = "p-4 rounded-xl border animate-fade-in shadow-md transform transition-all duration-300"

      if (type === "success") {
        alert.classList.add("bg-green-50", "text-green-800", "border-green-200")
        alert.innerHTML = `
  <div class="flex items-center">
    <div class="flex-shrink-0">
      <svg class="h-5 w-5 text-green-500 animate-check-mark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
    </div>
    <div class="ml-3">
      <p class="text-sm font-medium">${message}</p>
    </div>
    <div class="ml-auto pl-3">
      <button class="inline-flex text-green-400 hover:text-green-500 focus:outline-none cursor-pointer transition-colors duration-300">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  </div>
`
      } else if (type === "error") {
        alert.classList.add("bg-primary-50", "text-primary-800", "border-primary-200")
        alert.innerHTML = `
  <div class="flex items-center">
    <div class="flex-shrink-0">
      <svg class="h-5 w-5 text-primary-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    </div>
    <div class="ml-3">
      <p class="text-sm font-medium">${message}</p>
    </div>
    <div class="ml-auto pl-3">
      <button class="inline-flex text-primary-400 hover:text-primary-500 focus:outline-none cursor-pointer transition-colors duration-300">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  </div>
`
      } else if (type === "warning") {
        alert.classList.add("bg-yellow-50", "text-yellow-800", "border-yellow-200")
        alert.innerHTML = `
  <div class="flex items-center">
    <div class="flex-shrink-0">
      <svg class="h-5 w-5 text-yellow-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    </div>
    <div class="ml-3">
      <p class="text-sm font-medium">${message}</p>
    </div>
    <div class="ml-auto pl-3">
      <button class="inline-flex text-yellow-400 hover:text-yellow-500 focus:outline-none cursor-pointer transition-colors duration-300">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  </div>
`
      } else {
        alert.classList.add("bg-blue-50", "text-blue-800", "border-blue-200")
        alert.innerHTML = `
  <div class="flex items-center">
    <div class="flex-shrink-0">
      <svg class="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    </div>
    <div class="ml-3">
      <p class="text-sm font-medium">${message}</p>
    </div>
    <div class="ml-auto pl-3">
      <button class="inline-flex text-blue-400 hover:text-blue-500 focus:outline-none cursor-pointer transition-colors duration-300">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  </div>
`
      }

      alertContainer.classList.remove("hidden")
      alertContainer.classList.add("flex")

      // Añadir evento para cerrar la alerta al hacer clic en el botón con animación
      const closeBtn = alert.querySelector("button")
      if (closeBtn) {
        closeBtn.addEventListener("click", () => {
          alert.classList.add("opacity-0", "transform", "translate-y-[-10px]", "transition-all", "duration-500")
          setTimeout(() => {
            alertContainer.classList.add("hidden")
            alertContainer.classList.remove("flex")
            alert.classList.remove("opacity-0", "transform", "translate-y-[-10px]", "transition-all", "duration-500")
          }, 500)
        })
      }

      // Cerrar automáticamente después de 5 segundos con animación de salida
      setTimeout(() => {
        alert.classList.add("opacity-0", "transform", "translate-y-[-10px]", "transition-all", "duration-500")
        setTimeout(() => {
          alertContainer.classList.add("hidden")
          alertContainer.classList.remove("flex")
          alert.classList.remove("opacity-0", "transform", "translate-y-[-10px]", "transition-all", "duration-500")
        }, 500)
      }, 5000)
    }
  }

  // Función para enumerar y ordenar asesorías
  function ordenarYNumerarAsesorias() {
    const tbody = document.getElementById("asesorias-table-body")
    if (!tbody) return // Evitar errores si no existe el elemento

    const rows = Array.from(tbody.querySelectorAll("tr"))

    // Ordenar de mayor a menor por "codigo_asesoria"
    rows.sort((a, b) => {
      const numCell = a.querySelector(".numero-asesoria")
      const numCellB = b.querySelector(".numero-asesoria")
      if (!numCell || !numCellB) return 0

      const idA = Number.parseInt(numCell.textContent.replace("#", ""))
      const idB = Number.parseInt(numCellB.textContent.replace("#", ""))
      return idB - idA // Orden descendente
    })

    // Reorganizar filas en el DOM y renumerar
    rows.forEach((row, index) => {
      const numCell = row.querySelector(".numero-asesoria")
      if (numCell) {
        numCell.textContent = `#${rows.length - index}` // Asigna número inverso
      }
      tbody.appendChild(row) // Mueve la fila al final
    })
  }

  // Asegurar que los toggles de notificaciones funcionen
  const notificationToggles = [
    document.getElementById("toggle-visa-updates"),
    document.getElementById("toggle-document-reminders"),
    document.getElementById("toggle-news"),
    document.getElementById("toggle-appointments"),
  ]

  notificationToggles.forEach((toggle) => {
    if (toggle) {
      toggle.addEventListener("click", function () {
        // Forzar el cambio de estado
        this.checked = !this.checked
      })
    }
  })

  // Asegurar que los checkboxes de canales de notificación funcionen
  const channelCheckboxes = [
    document.getElementById("channel-email"),
    document.getElementById("channel-sms"),
    document.getElementById("channel-app"),
  ]

  channelCheckboxes.forEach((checkbox) => {
    if (checkbox) {
      checkbox.addEventListener("click", function () {
        // Forzar el cambio de estado
        this.checked = !this.checked
      })
    }
  })

  // Function to check if asesoria date is in the future
  function isAsesoriaVigente(fechaAsesoria) {
    const fechaAsesoriaDate = new Date(fechaAsesoria)
    const now = new Date()
    return fechaAsesoriaDate > now
  }

  // Inicializar el resto de funcionalidades
  ordenarYNumerarAsesorias()

  // Buscar todos los botones de cierre (x) en los modales y añadirles la funcionalidad de cierre con animación
  const closeButtons = document.querySelectorAll(".modal-close-btn")
  closeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Encontrar el modal padre
      const modal = btn.closest("[id$='-modal']")
      if (!modal) return

      // Añadir animación de cierre
      const modalContent = modal.querySelector(".bg-white")
      if (modalContent) {
        modalContent.classList.add("opacity-0", "scale-95", "transition-all", "duration-300")
        setTimeout(() => {
          modal.classList.add("hidden")
          modal.classList.remove("flex")
          modalContent.classList.remove("opacity-0", "scale-95")

          // Limpiar el intervalo si es el modal OTP
          if (modal.id === "otp-modal") {
            clearInterval(countdownInterval)
          }

          // Limpiar el campo de confirmación si es el modal de eliminar cuenta
          if (modal.id === "delete-account-modal" && deleteConfirmationInput) {
            deleteConfirmationInput.value = ""
            confirmDeleteBtn.disabled = true
          }
        }, 300)
      }
    })
  })

  // Asegurarnos de que el botón de cierre del modal de eliminar foto de perfil funcione correctamente
  if (closeDeleteProfileModalBtn) {
    closeDeleteProfileModalBtn.addEventListener("click", () => {
      const modalContent = deleteProfileModal.querySelector(".bg-white")
      modalContent.classList.add("opacity-0", "scale-95", "transition-all", "duration-300")
      setTimeout(() => {
        deleteProfileModal.classList.add("hidden")
        deleteProfileModal.classList.remove("flex")
        modalContent.classList.remove("opacity-0", "scale-95")
      }, 300)
    })
  }

  // Solución específica para el botón de cierre (x) del modal de eliminar cuenta
  const deleteAccountCloseBtn = document.querySelector(
    "#delete-account-modal .modal-close-btn, #delete-account-modal [aria-label='Cerrar']",
  )
  if (deleteAccountCloseBtn) {
    deleteAccountCloseBtn.addEventListener("click", () => {
      const modal = document.getElementById("delete-account-modal")
      const modalContent = modal.querySelector(".bg-white")

      modalContent.classList.add("opacity-0", "scale-95", "transition-all", "duration-300")
      setTimeout(() => {
        modal.classList.add("hidden")
        modal.classList.remove("flex")
        modalContent.classList.remove("opacity-0", "scale-95")

        // Limpiar el campo de confirmación
        if (deleteConfirmationInput) {
          deleteConfirmationInput.value = ""
          confirmDeleteBtn.disabled = true
        }
      }, 300)
    })
  }
})

// Inicializar la pestaña activa con efectos visuales mejorados
window.addEventListener("DOMContentLoaded", () => {
  const activeTab = localStorage.getItem("activeTab") || "personal-info"
  const activeButton = document.querySelector(`.tab-button[data-tab="${activeTab}"]`)

  if (activeButton) {
    // Añadir un pequeño retraso para que la animación sea visible
    setTimeout(() => {
      activeButton.click()
    }, 100)
  }
})
