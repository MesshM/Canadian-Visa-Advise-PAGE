document.addEventListener("DOMContentLoaded", () => {
  // Navegación de pestañas
  const tabButtons = document.querySelectorAll(".tab-button")
  const tabContents = document.querySelectorAll(".tab-content")

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tabId = button.getAttribute("data-tab")

      // Actualizar botones
      tabButtons.forEach((btn) => {
        btn.classList.remove("border-red-500", "text-red-500")
        btn.classList.add("border-transparent", "text-gray-500")
      })
      button.classList.remove("border-transparent", "text-gray-500")
      button.classList.add("border-red-500", "text-red-500")

      // Actualizar contenidos
      tabContents.forEach((content) => {
        content.classList.add("hidden")
      })
      document.getElementById(`${tabId}-content`).classList.remove("hidden")

      // Guardar la pestaña activa en localStorage
      localStorage.setItem("activeTab", tabId)
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
      passwordMatch.classList.remove("hidden", "text-red-500")
      passwordMatch.classList.add("text-green-500")
    } else if (confirmPasswordInput.value !== "") {
      passwordMatch.textContent = "Las contraseñas no coinciden"
      passwordMatch.classList.remove("hidden", "text-green-500")
      passwordMatch.classList.add("text-red-500")
    } else {
      passwordMatch.classList.add("hidden")
    }
  }

  // Funcionalidad para verificación en dos pasos - CORREGIDO
  const toggle2fa = document.getElementById("toggle-2fa")
  const setup2fa = document.getElementById("2fa-setup")
  const setup2faBtn = document.getElementById("setup-2fa-btn")

  if (toggle2fa) {
    toggle2fa.addEventListener("change", () => {
      if (toggle2fa.checked) {
        setup2fa.classList.remove("hidden")
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

  // Funcionalidad para subir foto de perfil - CORREGIDO
  const changePhotoBtn = document.getElementById("change-photo-btn")
  const photoUpload = document.getElementById("photo-upload")
  const profileImage = document.getElementById("profile-image")
  const photoPreview = document.getElementById("photo-preview")
  const photoPreviewContainer = document.getElementById("photo-preview-container")
  const savePhotoBtn = document.getElementById("save-photo-btn")
  const cancelPhotoBtn = document.getElementById("cancel-photo-btn")

  if (changePhotoBtn) {
    changePhotoBtn.addEventListener("click", () => {
      photoUpload.click()
    })
  }

  if (photoUpload) {
    photoUpload.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        const file = e.target.files[0]
        const reader = new FileReader()

        reader.onload = (e) => {
          photoPreview.src = e.target.result
          photoPreviewContainer.classList.remove("hidden")
        }

        reader.readAsDataURL(file)
      }
    })
  }

  if (cancelPhotoBtn) {
    cancelPhotoBtn.addEventListener("click", () => {
      photoPreviewContainer.classList.add("hidden")
      photoUpload.value = ""
    })
  }

  if (savePhotoBtn) {
    savePhotoBtn.addEventListener("click", () => {
      if (photoUpload.files.length > 0) {
        const file = photoUpload.files[0]
        const formData = new FormData()
        formData.append("photo", file)

        // Añadir animación de carga
        savePhotoBtn.innerHTML = '<span class="animate-pulse">Guardando...</span>'
        savePhotoBtn.disabled = true

        fetch("/actualizar_foto_perfil", {
          method: "POST",
          body: formData,
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.success) {
              profileImage.src = photoPreview.src
              photoPreviewContainer.classList.add("hidden")
              showAlert("Foto de perfil actualizada con éxito", "success")

              // Actualizar la foto en el sidebar
              const sidebarProfileImg = document.querySelector(".sidebar-profile-img")
              if (sidebarProfileImg) {
                sidebarProfileImg.src = photoPreview.src
              }

              // Actualizar la foto en el círculo del perfil en el sidebar
              const profileCircleImg = document.querySelector(".w-10.h-10.rounded-full svg")
              if (profileCircleImg) {
                const parentDiv = profileCircleImg.parentElement
                profileCircleImg.remove()

                const newImg = document.createElement("img")
                newImg.src = photoPreview.src
                newImg.alt = "Foto de perfil"
                newImg.className = "w-full h-full object-cover rounded-full"
                parentDiv.appendChild(newImg)
              }
            } else {
              showAlert(data.error || "Error al actualizar la foto de perfil", "error")
            }

            // Restaurar el botón
            savePhotoBtn.innerHTML = "Guardar"
            savePhotoBtn.disabled = false
          })
          .catch((error) => {
            console.error("Error:", error)
            showAlert("Error al actualizar la foto de perfil", "error")

            // Restaurar el botón
            savePhotoBtn.innerHTML = "Guardar"
            savePhotoBtn.disabled = false
          })
      }
    })
  }

  // Funcionalidad para verificar correo electrónico - CORREGIDO
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
            resetOtpInputs()
            startCountdown()

            // Añadir clase para animación de entrada
            otpModal.querySelector(".bg-white").classList.add("animate-bounce-in")
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
            resetOtpInputs()
            startCountdown()

            // Añadir clase para animación de entrada
            otpModal.querySelector(".bg-white").classList.add("animate-bounce-in")
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

  if (cancelOtpBtn) {
    cancelOtpBtn.addEventListener("click", () => {
      otpModal.classList.add("hidden")
      clearInterval(countdownInterval)
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

  if (verifyOtpBtn) {
    verifyOtpBtn.addEventListener("click", () => {
      const otp = Array.from(otpInputs)
        .map((input) => input.value)
        .join("")

      if (otp.length !== otpInputs.length) {
        showAlert("Por favor, ingresa el código completo", "error")
        return
      }

      // Añadir animación de carga
      verifyOtpBtn.innerHTML = '<span class="animate-pulse">Verificando...</span>'
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
            otpModal.classList.add("hidden")
            clearInterval(countdownInterval)
            showAlert(
              `${currentVerificationMethod === "correo electrónico" ? "Correo" : "Teléfono"} verificado con éxito`,
              "success",
            )

            // Actualizar visualmente el estado de verificación
            const verifyBtn = currentVerificationMethod === "correo electrónico" ? verifyEmailBtn : verifyPhoneBtn
            verifyBtn.textContent = "Verificado"
            verifyBtn.classList.remove("bg-red-500", "hover:bg-red-600")
            verifyBtn.classList.add("bg-green-500", "hover:bg-green-600")
            verifyBtn.disabled = true
          } else {
            showAlert(data.error || "Código de verificación incorrecto", "error")

            // Restaurar el botón
            verifyOtpBtn.innerHTML = "Verificar"
            verifyOtpBtn.disabled = false
          }
        })
        .catch((error) => {
          console.error("Error:", error)
          showAlert("Error al verificar el código", "error")

          // Restaurar el botón
          verifyOtpBtn.innerHTML = "Verificar"
          verifyOtpBtn.disabled = false
        })
    })
  }

  if (resendCodeBtn) {
    resendCodeBtn.addEventListener("click", () => {
      if (secondsLeft > 0) return

      const method = currentVerificationMethod === "correo electrónico" ? "email" : "sms"
      const value = method === "email" ? document.getElementById("email").value : document.getElementById("phone").value

      // Añadir animación de carga
      resendCodeBtn.innerHTML = '<span class="animate-pulse">Enviando...</span>'
      resendCodeBtn.disabled = true

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
            showAlert("Código reenviado", "success")
          } else {
            showAlert(data.error || "Error al reenviar el código", "error")
          }

          // Restaurar el botón
          resendCodeBtn.innerHTML = "Reenviar"
          resendCodeBtn.disabled = false
        })
        .catch((error) => {
          console.error("Error:", error)
          showAlert("Error al reenviar el código", "error")

          // Restaurar el botón
          resendCodeBtn.innerHTML = "Reenviar"
          resendCodeBtn.disabled = false
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
      }
    }, 1000)
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

      // Añadir clase para animación de entrada
      deleteAccountModal.querySelector(".bg-white").classList.add("animate-bounce-in")
    })
  }

  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener("click", () => {
      deleteAccountModal.classList.add("hidden")
      deleteConfirmationInput.value = ""
      confirmDeleteBtn.disabled = true
    })
  }

  if (deleteConfirmationInput) {
    deleteConfirmationInput.addEventListener("input", () => {
      confirmDeleteBtn.disabled = deleteConfirmationInput.value !== "ELIMINAR"
    })
  }

  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", () => {
      if (deleteConfirmationInput.value === "ELIMINAR") {
        // Añadir animación de carga
        confirmDeleteBtn.innerHTML = '<span class="animate-pulse">Eliminando...</span>'
        confirmDeleteBtn.disabled = true

        fetch("/eliminar_cuenta", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.success) {
              window.location.href = "/logout"
            } else {
              deleteAccountModal.classList.add("hidden")
              showAlert(data.error || "Error al eliminar la cuenta", "error")

              // Restaurar el botón
              confirmDeleteBtn.innerHTML = "Eliminar cuenta"
              confirmDeleteBtn.disabled = false
            }
          })
          .catch((error) => {
            console.error("Error:", error)
            deleteAccountModal.classList.add("hidden")
            showAlert("Error al eliminar la cuenta", "error")

            // Restaurar el botón
            confirmDeleteBtn.innerHTML = "Eliminar cuenta"
            confirmDeleteBtn.disabled = false
          })
      }
    })
  }

  // Funcionalidad para descargar datos personales
  const downloadDataBtn = document.getElementById("download-data-btn")

  if (downloadDataBtn) {
    downloadDataBtn.addEventListener("click", () => {
      // Añadir animación de carga
      downloadDataBtn.innerHTML = '<span class="animate-pulse">Descargando...</span>'
      downloadDataBtn.disabled = true

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
          showAlert("Datos descargados con éxito", "success")

          // Restaurar el botón
          downloadDataBtn.innerHTML = "Descargar datos"
          downloadDataBtn.disabled = false
        })
        .catch((error) => {
          console.error("Error:", error)
          showAlert("Error al descargar los datos", "error")

          // Restaurar el botón
          downloadDataBtn.innerHTML = "Descargar datos"
          downloadDataBtn.disabled = false
        })
    })
  }

  // Funcionalidad para guardar información básica - CORREGIDO
  const basicInfoForm = document.getElementById("basic-info-form")
  const saveInfoBtn = document.getElementById("save-info-btn")

  if (basicInfoForm) {
    basicInfoForm.addEventListener("submit", (e) => {
      e.preventDefault()

      // Añadir animación de carga
      saveInfoBtn.innerHTML = '<span class="animate-pulse">Guardando...</span>'
      saveInfoBtn.disabled = true

      const formData = new FormData(basicInfoForm)
      const data = Object.fromEntries(formData.entries())

      fetch("/actualizar_informacion_basica", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            showAlert("Información actualizada con éxito", "success")

            // Actualizar el nombre en el sidebar si cambió
            const sidebarName = document.querySelector(".font-medium.text-gray-900.group-hover\\:text-red-500")
            if (sidebarName) {
              const firstName = document.getElementById("first-name").value
              const lastName = document.getElementById("last-name").value
              sidebarName.textContent = `${firstName} ${lastName}`
            }
          } else {
            showAlert(data.error || "Error al actualizar la información", "error")
          }

          // Restaurar el botón
          saveInfoBtn.innerHTML = "<span>Guardar Cambios</span>"
          saveInfoBtn.disabled = false
        })
        .catch((error) => {
          console.error("Error:", error)
          showAlert("Error al actualizar la información", "error")

          // Restaurar el botón
          saveInfoBtn.innerHTML = "<span>Guardar Cambios</span>"
          saveInfoBtn.disabled = false
        })
    })
  }

  // Funcionalidad para cambiar contraseña
  const passwordForm = document.getElementById("password-form")

  if (passwordForm) {
    passwordForm.addEventListener("submit", (e) => {
      e.preventDefault()

      const currentPassword = document.getElementById("current-password").value
      const newPassword = document.getElementById("new-password").value
      const confirmPassword = document.getElementById("confirm-password").value
      const submitBtn = passwordForm.querySelector('button[type="submit"]')

      if (!currentPassword || !newPassword || !confirmPassword) {
        showAlert("Por favor, completa todos los campos", "error")
        return
      }

      if (newPassword !== confirmPassword) {
        showAlert("Las contraseñas no coinciden", "error")
        return
      }

      // Añadir animación de carga
      submitBtn.innerHTML = '<span class="animate-pulse">Actualizando...</span>'
      submitBtn.disabled = true

      fetch("/cambiar_contrasena", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            showAlert("Contraseña actualizada con éxito", "success")
            passwordForm.reset()
            passwordStrength.style.width = "0%"
            passwordStrengthText.textContent = "Ingresa tu contraseña"
            passwordMatch.classList.add("hidden")
          } else {
            showAlert(data.error || "Error al actualizar la contraseña", "error")
          }

          // Restaurar el botón
          submitBtn.innerHTML = "<span>Actualizar Contraseña</span>"
          submitBtn.disabled = false
        })
        .catch((error) => {
          console.error("Error:", error)
          showAlert("Error al actualizar la contraseña", "error")

          // Restaurar el botón
          submitBtn.innerHTML = "<span>Actualizar Contraseña</span>"
          submitBtn.disabled = false
        })
    })
  }

  // Funcionalidad para guardar preferencias de notificaciones - CORREGIDO
  const notificationsForm = document.getElementById("notifications-form")

  if (notificationsForm) {
    notificationsForm.addEventListener("submit", (e) => {
      e.preventDefault()

      const visaUpdates = document.getElementById("toggle-visa-updates").checked
      const documentReminders = document.getElementById("toggle-document-reminders").checked
      const news = document.getElementById("toggle-news").checked
      const appointments = document.getElementById("toggle-appointments").checked
      const channelEmail = document.getElementById("channel-email").checked
      const channelSms = document.getElementById("channel-sms").checked
      const channelApp = document.getElementById("channel-app").checked
      const submitBtn = notificationsForm.querySelector('button[type="submit"]')

      // Añadir animación de carga
      submitBtn.innerHTML = '<span class="animate-pulse">Guardando...</span>'
      submitBtn.disabled = true

      // Guardar preferencias en localStorage para persistencia
      localStorage.setItem("notif_visa_updates", visaUpdates)
      localStorage.setItem("notif_document_reminders", documentReminders)
      localStorage.setItem("notif_news", news)
      localStorage.setItem("notif_appointments", appointments)
      localStorage.setItem("notif_channel_email", channelEmail)
      localStorage.setItem("notif_channel_sms", channelSms)
      localStorage.setItem("notif_channel_app", channelApp)

      fetch("/actualizar_preferencias_notificaciones", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          visa_updates: visaUpdates,
          document_reminders: documentReminders,
          news: news,
          appointments: appointments,
          channel_email: channelEmail,
          channel_sms: channelSms,
          channel_app: channelApp,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            showAlert("Preferencias de notificaciones actualizadas con éxito", "success")
          } else {
            showAlert(data.error || "Error al actualizar las preferencias", "error")
          }

          // Restaurar el botón
          submitBtn.innerHTML = "<span>Guardar Preferencias</span>"
          submitBtn.disabled = false
        })
        .catch((error) => {
          console.error("Error:", error)
          showAlert("Error al actualizar las preferencias", "error")

          // Restaurar el botón
          submitBtn.innerHTML = "<span>Guardar Preferencias</span>"
          submitBtn.disabled = false
        })
    })

    // Cargar preferencias guardadas al iniciar
    document.getElementById("toggle-visa-updates").checked = localStorage.getItem("notif_visa_updates") === "true"
    document.getElementById("toggle-document-reminders").checked =
      localStorage.getItem("notif_document_reminders") === "true"
    document.getElementById("toggle-news").checked = localStorage.getItem("notif_news") === "true"
    document.getElementById("toggle-appointments").checked = localStorage.getItem("notif_appointments") === "true"
    document.getElementById("channel-email").checked = localStorage.getItem("notif_channel_email") === "true"
    document.getElementById("channel-sms").checked = localStorage.getItem("notif_channel_sms") === "true"
    document.getElementById("channel-app").checked = localStorage.getItem("notif_channel_app") === "true"
  }

  // Funcionalidad para guardar preferencias de idioma
  const languageForm = document.getElementById("language-form")

  if (languageForm) {
    languageForm.addEventListener("submit", (e) => {
      e.preventDefault()

      const language = document.getElementById("language").value
      const submitBtn = languageForm.querySelector('button[type="submit"]')

      // Añadir animación de carga
      submitBtn.innerHTML = '<span class="animate-pulse">Guardando...</span>'
      submitBtn.disabled = true

      // Guardar en localStorage
      localStorage.setItem("language_preference", language)

      fetch("/actualizar_preferencias_idioma", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language: language,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            showAlert("Preferencias de idioma actualizadas con éxito", "success")
          } else {
            showAlert(data.error || "Error al actualizar las preferencias", "error")
          }

          // Restaurar el botón
          submitBtn.innerHTML = "<span>Guardar Preferencias</span>"
          submitBtn.disabled = false
        })
        .catch((error) => {
          console.error("Error:", error)
          showAlert("Error al actualizar las preferencias", "error")

          // Restaurar el botón
          submitBtn.innerHTML = "<span>Guardar Preferencias</span>"
          submitBtn.disabled = false
        })
    })

    // Cargar preferencia guardada
    const savedLanguage = localStorage.getItem("language_preference")
    if (savedLanguage) {
      document.getElementById("language").value = savedLanguage
    }
  }

  // Funcionalidad para ver detalles de asesoría
  const viewDetailsButtons = document.querySelectorAll(".view-details")
  const asesoriaDetailsModal = document.getElementById("asesoria-details-modal")
  const asesoriaDetailsContent = document.getElementById("asesoria-details-content")
  const closeDetailsBtn = document.getElementById("close-details-btn")
  const closeDetailsBtnBottom = document.getElementById("close-details-btn-bottom")

  if (viewDetailsButtons.length > 0) {
    viewDetailsButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const asesoriaId = button.getAttribute("data-id")

        // Añadir animación de carga
        button.innerHTML = '<span class="animate-pulse">Cargando...</span>'
        button.disabled = true

        fetch(`/obtener_detalles_asesoria/${asesoriaId}`)
          .then((response) => response.json())
          .then((data) => {
            if (data.success) {
              const asesoria = data.asesoria

              // Formatear la fecha
              const fecha = new Date(asesoria.fecha_asesoria)
              const fechaFormateada = fecha.toLocaleDateString("es-ES", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })
              const horaFormateada = fecha.toLocaleTimeString("es-ES", {
                hour: "2-digit",
                minute: "2-digit",
              })

              // Crear el contenido HTML
              asesoriaDetailsContent.innerHTML = `
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p class="text-sm font-medium text-gray-500">ID Asesoría</p>
                                        <p class="text-base font-semibold text-gray-900">${asesoria.codigo_asesoria}</p>
                                    </div>
                                    <div>
                                        <p class="text-sm font-medium text-gray-500">Tipo</p>
                                        <p class="text-base font-semibold text-gray-900">${asesoria.tipo_asesoria}</p>
                                    </div>
                                    <div>
                                        <p class="text-sm font-medium text-gray-500">Fecha</p>
                                        <p class="text-base font-semibold text-gray-900">${fechaFormateada}</p>
                                    </div>
                                    <div>
                                        <p class="text-sm font-medium text-gray-500">Hora</p>
                                        <p class="text-base font-semibold text-gray-900">${horaFormateada}</p>
                                    </div>
                                    <div>
                                        <p class="text-sm font-medium text-gray-500">Asesor</p>
                                        <p class="text-base font-semibold text-gray-900">${asesoria.asesor_asignado}</p>
                                    </div>
                                    <div>
                                        <p class="text-sm font-medium text-gray-500">Estado</p>
                                        <p class="text-base font-semibold ${asesoria.estado === "Pagada" ? "text-green-600" : asesoria.estado === "Pendiente" ? "text-yellow-600" : "text-red-600"}">${asesoria.estado}</p>
                                    </div>
                                </div>
                                <div class="mt-4">
                                    <p class="text-sm font-medium text-gray-500">Descripción</p>
                                    <p class="text-base text-gray-900">${asesoria.descripcion || "Sin descripción"}</p>
                                </div>
                                ${
                                  asesoria.estado === "Pagada"
                                    ? `
                                <div class="mt-4 p-4 bg-green-50 rounded-lg">
                                    <p class="text-sm font-medium text-green-800">Información de pago</p>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                        <div>
                                            <p class="text-xs text-green-600">Método de pago</p>
                                            <p class="text-sm font-medium text-green-800">${asesoria.metodo_pago_stripe || asesoria.metodo_pago || "No especificado"}</p>
                                        </div>
                                        <div>
                                            <p class="text-xs text-green-600">Monto</p>
                                            <p class="text-sm font-medium text-green-800">$${asesoria.precio} USD</p>
                                        </div>
                                    </div>
                                </div>
                                `
                                    : ""
                                }
                            `

              asesoriaDetailsModal.classList.remove("hidden")

              // Añadir clase para animación de entrada
              asesoriaDetailsModal.querySelector(".bg-white").classList.add("animate-bounce-in")
            } else {
              showAlert(data.error || "Error al obtener los detalles de la asesoría", "error")
            }

            // Restaurar el botón
            button.innerHTML = "Ver detalles"
            button.disabled = false
          })
          .catch((error) => {
            console.error("Error:", error)
            showAlert("Error al obtener los detalles de la asesoría", "error")

            // Restaurar el botón
            button.innerHTML = "Ver detalles"
            button.disabled = false
          })
      })
    })
  }

  if (closeDetailsBtn) {
    closeDetailsBtn.addEventListener("click", () => {
      asesoriaDetailsModal.classList.add("hidden")
    })
  }

  if (closeDetailsBtnBottom) {
    closeDetailsBtnBottom.addEventListener("click", () => {
      asesoriaDetailsModal.classList.add("hidden")
    })
  }

  // Función para mostrar alertas
  function showAlert(message, type) {
    const alertContainer = document.getElementById("alert-container")
    const alert = document.getElementById("alert")

    if (alertContainer && alert) {
      alert.textContent = message
      alert.className = "p-4 rounded-lg border animate-fade-in"

      if (type === "success") {
        alert.classList.add("bg-green-50", "text-green-800", "border-green-200")
      } else if (type === "error") {
        alert.classList.add("bg-red-50", "text-red-800", "border-red-200")
      } else if (type === "warning") {
        alert.classList.add("bg-yellow-50", "text-yellow-800", "border-yellow-200")
      } else {
        alert.classList.add("bg-blue-50", "text-blue-800", "border-blue-200")
      }

      alertContainer.classList.remove("hidden")

      setTimeout(() => {
        alertContainer.classList.add("hidden")
      }, 5000)
    }
  }

  // Añadir estas líneas al final del evento DOMContentLoaded para asegurar que los toggles funcionen correctamente

  // Asegurar que los toggles de verificación en dos pasos funcionen
  if (toggle2fa) {
    // Forzar la inicialización del estado del toggle
    toggle2fa.addEventListener("click", function () {
      if (this.checked) {
        setup2fa.classList.remove("hidden")
      } else {
        setup2fa.classList.add("hidden")
      }
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
})

