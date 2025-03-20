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

  // Funcionalidad para verificación en dos pasos
  const toggle2fa = document.getElementById("toggle-2fa")
  const setup2fa = document.getElementById("2fa-setup")

  if (toggle2fa) {
    toggle2fa.addEventListener("change", () => {
      if (toggle2fa.checked) {
        setup2fa.classList.remove("hidden")
      } else {
        setup2fa.classList.add("hidden")
      }
    })
  }

  // Funcionalidad para subir foto de perfil
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

              // Actualizar la foto en el sidebar si existe
              const sidebarProfileImg = document.querySelector(".sidebar-profile-img")
              if (sidebarProfileImg) {
                sidebarProfileImg.src = photoPreview.src
              }
            } else {
              showAlert(data.error || "Error al actualizar la foto de perfil", "error")
            }
          })
          .catch((error) => {
            console.error("Error:", error)
            showAlert("Error al actualizar la foto de perfil", "error")
          })
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
          } else {
            showAlert(data.error || "Error al enviar el código de verificación", "error")
          }
        })
        .catch((error) => {
          console.error("Error:", error)
          showAlert("Error al enviar el código de verificación", "error")
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
          } else {
            showAlert(data.error || "Error al enviar el código de verificación", "error")
          }
        })
        .catch((error) => {
          console.error("Error:", error)
          showAlert("Error al enviar el código de verificación", "error")
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
          } else {
            showAlert(data.error || "Código de verificación incorrecto", "error")
          }
        })
        .catch((error) => {
          console.error("Error:", error)
          showAlert("Error al verificar el código", "error")
        })
    })
  }

  if (resendCodeBtn) {
    resendCodeBtn.addEventListener("click", () => {
      if (secondsLeft > 0) return

      const method = currentVerificationMethod === "correo electrónico" ? "email" : "sms"
      const value = method === "email" ? document.getElementById("email").value : document.getElementById("phone").value

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
        })
        .catch((error) => {
          console.error("Error:", error)
          showAlert("Error al reenviar el código", "error")
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
            }
          })
          .catch((error) => {
            console.error("Error:", error)
            deleteAccountModal.classList.add("hidden")
            showAlert("Error al eliminar la cuenta", "error")
          })
      }
    })
  }

  // Funcionalidad para descargar datos personales
  const downloadDataBtn = document.getElementById("download-data-btn")

  if (downloadDataBtn) {
    downloadDataBtn.addEventListener("click", () => {
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
        })
        .catch((error) => {
          console.error("Error:", error)
          showAlert("Error al descargar los datos", "error")
        })
    })
  }

  // Funcionalidad para guardar información básica
  const basicInfoForm = document.getElementById("basic-info-form")

  if (basicInfoForm) {
    basicInfoForm.addEventListener("submit", (e) => {
      e.preventDefault()

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
          } else {
            showAlert(data.error || "Error al actualizar la información", "error")
          }
        })
        .catch((error) => {
          console.error("Error:", error)
          showAlert("Error al actualizar la información", "error")
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

      if (!currentPassword || !newPassword || !confirmPassword) {
        showAlert("Por favor, completa todos los campos", "error")
        return
      }

      if (newPassword !== confirmPassword) {
        showAlert("Las contraseñas no coinciden", "error")
        return
      }

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
        })
        .catch((error) => {
          console.error("Error:", error)
          showAlert("Error al actualizar la contraseña", "error")
        })
    })
  }

  // Funcionalidad para guardar preferencias de notificaciones
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
        })
        .catch((error) => {
          console.error("Error:", error)
          showAlert("Error al actualizar las preferencias", "error")
        })
    })
  }

  // Funcionalidad para guardar preferencias de idioma
  const languageForm = document.getElementById("language-form")

  if (languageForm) {
    languageForm.addEventListener("submit", (e) => {
      e.preventDefault()

      const language = document.getElementById("language").value

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
        })
        .catch((error) => {
          console.error("Error:", error)
          showAlert("Error al actualizar las preferencias", "error")
        })
    })
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
            } else {
              showAlert(data.error || "Error al obtener los detalles de la asesoría", "error")
            }
          })
          .catch((error) => {
            console.error("Error:", error)
            showAlert("Error al obtener los detalles de la asesoría", "error")
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
})

