// Funcionalidad para seguridad
document.addEventListener("DOMContentLoaded", () => {
  // Import showAlert function or declare it
  // Assuming showAlert is defined elsewhere and needs to be imported
  // For example:
  // import { showAlert } from './utils';
  // Or, if showAlert is a global function, you might need to include the script where it's defined before this one.
  // If showAlert is not defined elsewhere, you can define it here:
  const showAlert = (message, type) => {
    const alertDiv = document.createElement("div")
    alertDiv.className = `alert ${type === "success" ? "alert-success" : "alert-error"}`
    alertDiv.textContent = message
    document.body.appendChild(alertDiv)
    setTimeout(() => {
      document.body.removeChild(alertDiv)
    }, 3000)
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
})
