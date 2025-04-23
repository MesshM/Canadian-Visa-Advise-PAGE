/**
 * Formulario de Solicitud - JavaScript
 *
 * Este archivo maneja toda la lógica del formulario de solicitud de visa,
 * incluyendo navegación entre secciones, validación, carga de archivos,
 * y envío del formulario mediante AJAX.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Referencias a los elementos del formulario
  const form = document.getElementById("visa-form")
  const sections = document.querySelectorAll(".form-section")
  const progressBar = document.getElementById("progress-bar")
  const progressText = document.getElementById("progress-text")
  const progressPercentage = document.getElementById("progress-percentage")
  const alertContainer = document.getElementById("alert-container")
  const alertElement = document.getElementById("alert")

  // Botones de navegación
  const next1Button = document.getElementById("next-1")
  const next2Button = document.getElementById("next-2")
  const next3Button = document.getElementById("next-3")
  const prev2Button = document.getElementById("prev-2")
  const prev3Button = document.getElementById("prev-3")
  const prev4Button = document.getElementById("prev-4")

  // Campos condicionales
  const familiarCanada = document.querySelectorAll('input[name="familiar_canada"]')
  const relacionFamiliarContainer = document.getElementById("relacion_familiar_container")
  const pagoOnline = document.querySelectorAll('input[name="pago_online"]')
  const metodoPagoContainer = document.getElementById("metodo_pago_container")

  // Campos de archivos
  const fileInputs = {
    doc_historial_viajes: {
      input: document.getElementById("doc_historial_viajes"),
      preview: document.getElementById("file-preview-historial"),
      name: document.getElementById("file-name-historial"),
      remove: document.getElementById("remove-file-historial"),
      summaryItem: document.getElementById("doc-historial-item"),
    },
    doc_recursos_financieros: {
      input: document.getElementById("doc_recursos_financieros"),
      preview: document.getElementById("file-preview-recursos"),
      name: document.getElementById("file-name-recursos"),
      remove: document.getElementById("remove-file-recursos"),
      summaryItem: document.getElementById("doc-recursos-item"),
    },
    doc_relaciones_familiares: {
      input: document.getElementById("doc_relaciones_familiares"),
      preview: document.getElementById("file-preview-relaciones"),
      name: document.getElementById("file-name-relaciones"),
      remove: document.getElementById("remove-file-relaciones"),
      summaryItem: document.getElementById("doc-relaciones-item"),
    },
    doc_hoja_vida: {
      input: document.getElementById("doc_hoja_vida"),
      preview: document.getElementById("file-preview-hoja"),
      name: document.getElementById("file-name-hoja"),
      remove: document.getElementById("remove-file-hoja"),
      summaryItem: document.getElementById("doc-hoja-item"),
    },
  }

  // Botones de reportes
  const downloadReportBtn = document.getElementById("download-report")
  const previewReportBtn = document.getElementById("preview-report")

  // Variables de estado
  let currentSection = 0
  let formSubmitting = false

  // Inicialización
  updateProgressBar()
  setupConditionalFields()
  setupFileInputs()
  setupFormValidation()

  // Configurar navegación entre secciones
  if (next1Button) {
    next1Button.addEventListener("click", () => {
      if (validateSection(0)) {
        showSection(1)
      }
    })
  }

  if (next2Button) {
    next2Button.addEventListener("click", () => {
      if (validateSection(1)) {
        showSection(2)
      }
    })
  }

  if (next3Button) {
    next3Button.addEventListener("click", () => {
      if (validateSection(2)) {
        updateSummary()
        showSection(3)
      }
    })
  }

  if (prev2Button) {
    prev2Button.addEventListener("click", () => {
      showSection(0)
    })
  }

  if (prev3Button) {
    prev3Button.addEventListener("click", () => {
      showSection(1)
    })
  }

  if (prev4Button) {
    prev4Button.addEventListener("click", () => {
      showSection(2)
    })
  }

  // Validación del formulario antes de enviar
  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault()

      if (formSubmitting) {
        return // Evitar envíos múltiples
      }

      if (!validateSection(3)) {
        showAlert("Por favor, complete todos los campos obligatorios y acepte los términos y condiciones.", "error")
        return
      }

      // Mostrar indicador de carga
      formSubmitting = true
      const submitButton = form.querySelector('button[type="submit"]')
      const originalButtonText = submitButton.innerHTML
      submitButton.innerHTML = `
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Enviando...
          `
      submitButton.disabled = true

      try {
        // Enviar formulario con AJAX
        const formData = new FormData(form)

        const response = await fetch(form.action, {
          method: "POST",
          body: formData,
          headers: {
            "X-Requested-With": "XMLHttpRequest",
          },
        })

        // Procesar respuesta
        if (response.redirected) {
          // Si el servidor redirige, seguir la redirección
          window.location.href = response.url
          return
        }

        const data = await response.json()

        if (response.ok) {
          showAlert(
            data.message || "Formulario enviado correctamente. Nos pondremos en contacto contigo pronto.",
            "success",
          )

          // Redirigir después de un breve retraso
          setTimeout(() => {
            window.location.href = data.redirect || "/dashboard"
          }, 2000)
        } else {
          showAlert(data.error || "Error al enviar el formulario. Por favor, inténtelo de nuevo.", "error")
          submitButton.innerHTML = originalButtonText
          submitButton.disabled = false
          formSubmitting = false
        }
      } catch (error) {
        console.error("Error al enviar el formulario:", error)
        showAlert("Error al enviar el formulario. Por favor, inténtelo de nuevo.", "error")
        submitButton.innerHTML = originalButtonText
        submitButton.disabled = false
        formSubmitting = false
      }
    })
  }

  // Manejo de reportes
  if (downloadReportBtn) {
    downloadReportBtn.addEventListener("click", () => {
      // Verificar si hay datos suficientes para generar un reporte
      if (!document.getElementById("proposito").value || !document.getElementById("pais_residencia").value) {
        showAlert("Por favor, complete al menos los campos básicos del formulario para generar un reporte.", "warning")
        return
      }

      // Recopilar datos del formulario
      const formData = new FormData(form)

      // Enviar solicitud para generar el PDF
      window.location.href = "/formularios/generar_reporte_pdf?" + new URLSearchParams(formData).toString()
    })
  }

  if (previewReportBtn) {
    previewReportBtn.addEventListener("click", () => {
      // Verificar si hay datos suficientes para generar un reporte
      if (!document.getElementById("proposito").value || !document.getElementById("pais_residencia").value) {
        showAlert("Por favor, complete al menos los campos básicos del formulario para generar un reporte.", "warning")
        return
      }

      // Recopilar datos del formulario
      const formData = new FormData(form)

      // Abrir vista previa en una nueva ventana
      window.open("/formularios/vista_previa_reporte?" + new URLSearchParams(formData).toString(), "_blank")
    })
  }

  // Funciones auxiliares
  function showSection(sectionIndex) {
    if (!sections || sections.length === 0) return

    sections.forEach((section, index) => {
      section.classList.add("hidden")
    })

    sections[sectionIndex].classList.remove("hidden")
    currentSection = sectionIndex
    updateProgressBar()

    // Scroll al inicio de la sección
    window.scrollTo({
      top: sections[sectionIndex].offsetTop - 100,
      behavior: "smooth",
    })
  }

  function updateProgressBar() {
    if (!progressBar || !progressText || !progressPercentage || !sections || sections.length === 0) return

    const progress = ((currentSection + 1) / sections.length) * 100
    progressBar.style.width = `${progress}%`
    progressText.textContent = `Paso ${currentSection + 1} de ${sections.length}`
    progressPercentage.textContent = `${Math.round(progress)}%`
  }

  function validateSection(sectionIndex) {
    if (!sections || sections.length === 0) return true

    const section = sections[sectionIndex]
    const requiredFields = section.querySelectorAll("[required]")
    let valid = true

    // Limpiar mensajes de error previos
    section.querySelectorAll(".error-message").forEach((el) => el.remove())
    section.querySelectorAll(".border-red-500").forEach((el) => {
      el.classList.remove("border-red-500")
      el.classList.add("border-gray-300")
    })

    requiredFields.forEach((field) => {
      // Validar campos requeridos
      if (!field.value) {
        markFieldAsInvalid(field, "Este campo es obligatorio")
        valid = false
      }
      // Validar correos electrónicos
      else if (field.type === "email" && !validateEmail(field.value)) {
        markFieldAsInvalid(field, "Ingrese un correo electrónico válido")
        valid = false
      }
      // Validar fechas
      else if (field.type === "date" && !validateDate(field.value)) {
        markFieldAsInvalid(field, "Ingrese una fecha válida")
        valid = false
      }
    })

    // Validación específica para la sección final
    if (sectionIndex === 3) {
      const terminos = document.getElementById("terminos")
      const privacidad = document.getElementById("privacidad")

      if (terminos && !terminos.checked) {
        markFieldAsInvalid(terminos, "Debe aceptar los términos y condiciones")
        valid = false
      }

      if (privacidad && !privacidad.checked) {
        markFieldAsInvalid(privacidad, "Debe aceptar la política de privacidad")
        valid = false
      }
    }

    if (!valid) {
      showAlert("Por favor, complete todos los campos obligatorios correctamente.", "error")
    }

    return valid
  }

  function markFieldAsInvalid(field, message) {
    // Añadir clase de error al campo
    field.classList.remove("border-gray-300")
    field.classList.add("border-red-500")

    // Crear mensaje de error
    const errorMessage = document.createElement("p")
    errorMessage.className = "error-message text-red-500 text-xs mt-1"
    errorMessage.textContent = message

    // Para checkboxes y radios, añadir el mensaje después del contenedor padre
    if (field.type === "checkbox" || field.type === "radio") {
      const parent = field.closest("div.flex")
      if (parent) {
        parent.parentNode.appendChild(errorMessage)
      }
    } else {
      // Para otros campos, añadir el mensaje después del campo
      field.parentNode.appendChild(errorMessage)
    }
  }

  function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  function validateDate(dateString) {
    const date = new Date(dateString)
    return !isNaN(date.getTime())
  }

  function setupConditionalFields() {
    // Mostrar/ocultar campo de relación familiar
    if (familiarCanada && familiarCanada.length > 0 && relacionFamiliarContainer) {
      familiarCanada.forEach((radio) => {
        radio.addEventListener("change", function () {
          if (this.value === "si") {
            relacionFamiliarContainer.classList.remove("hidden")
            document.getElementById("relacion_familiar").setAttribute("required", "required")
          } else {
            relacionFamiliarContainer.classList.add("hidden")
            document.getElementById("relacion_familiar").removeAttribute("required")
          }
        })
      })
    }

    // Mostrar/ocultar campo de método de pago
    if (pagoOnline && pagoOnline.length > 0 && metodoPagoContainer) {
      pagoOnline.forEach((radio) => {
        radio.addEventListener("change", function () {
          if (this.value === "si") {
            metodoPagoContainer.classList.remove("hidden")
            document.getElementById("metodo_pago").setAttribute("required", "required")
          } else {
            metodoPagoContainer.classList.add("hidden")
            document.getElementById("metodo_pago").removeAttribute("required")
          }
        })
      })
    }
  }

  function setupFileInputs() {
    for (const [id, elements] of Object.entries(fileInputs)) {
      if (!elements.input || !elements.preview || !elements.name || !elements.remove || !elements.summaryItem) continue

      elements.input.addEventListener("change", (e) => {
        const file = e.target.files[0]
        if (file) {
          // Validar tamaño del archivo (4MB máximo)
          if (file.size > 4 * 1024 * 1024) {
            showAlert("El archivo es demasiado grande. El tamaño máximo permitido es 4MB.", "error")
            e.target.value = ""
            return
          }

          // Validar tipo de archivo
          const fileType = file.type.toLowerCase()
          if (
            !fileType.includes("pdf") &&
            !fileType.includes("jpg") &&
            !fileType.includes("jpeg") &&
            !fileType.includes("png")
          ) {
            showAlert("Tipo de archivo no permitido. Se permiten: PDF, JPG, JPEG, PNG.", "error")
            e.target.value = ""
            return
          }

          // Mostrar vista previa
          elements.name.textContent = file.name
          elements.preview.classList.remove("hidden")
          elements.summaryItem.classList.remove("hidden")
        }
      })

      elements.remove.addEventListener("click", () => {
        elements.input.value = ""
        elements.preview.classList.add("hidden")
        elements.summaryItem.classList.add("hidden")
      })
    }
  }

  function setupFormValidation() {
    // Validar campos al perder el foco
    if (!form) return

    const allInputs = form.querySelectorAll("input, select, textarea")
    allInputs.forEach((input) => {
      input.addEventListener("blur", function () {
        if (this.hasAttribute("required") && !this.value) {
          this.classList.remove("border-gray-300")
          this.classList.add("border-red-500")
        } else {
          this.classList.remove("border-red-500")
          this.classList.add("border-gray-300")
        }
      })

      // Limpiar errores al escribir
      input.addEventListener("input", function () {
        this.classList.remove("border-red-500")
        this.classList.add("border-gray-300")

        const errorMessage = this.parentNode.querySelector(".error-message")
        if (errorMessage) {
          errorMessage.remove()
        }
      })
    })
  }

  function updateSummary() {
    // Actualizar resumen de datos de elegibilidad
    const proposito = document.getElementById("proposito")
    if (proposito && document.getElementById("summary-proposito")) {
      document.getElementById("summary-proposito").textContent = proposito.options[proposito.selectedIndex].text
    }

    const tiempoEstadia = document.getElementById("tiempo_estadia")
    if (tiempoEstadia && document.getElementById("summary-tiempo")) {
      document.getElementById("summary-tiempo").textContent = tiempoEstadia.options[tiempoEstadia.selectedIndex].text
    }

    if (document.getElementById("pais_residencia") && document.getElementById("summary-pais")) {
      document.getElementById("summary-pais").textContent = document.getElementById("pais_residencia").value
    }

    const fechaNacimiento = document.getElementById("fecha_nacimiento")
    if (fechaNacimiento && document.getElementById("summary-fecha")) {
      document.getElementById("summary-fecha").textContent = formatDate(fechaNacimiento.value)
    }

    const familiarCanadaChecked = document.querySelector('input[name="familiar_canada"]:checked')
    if (familiarCanadaChecked && document.getElementById("summary-familiar")) {
      document.getElementById("summary-familiar").textContent = familiarCanadaChecked.value === "si" ? "Sí" : "No"
    }

    const estadoCivil = document.getElementById("estado_civil")
    if (estadoCivil && document.getElementById("summary-estado-civil")) {
      document.getElementById("summary-estado-civil").textContent = estadoCivil.options[estadoCivil.selectedIndex].text
    }

    const provinciaDestino = document.getElementById("provincia_destino")
    if (provinciaDestino && document.getElementById("summary-provincia")) {
      document.getElementById("summary-provincia").textContent =
        provinciaDestino.options[provinciaDestino.selectedIndex].text
    }

    // Actualizar resumen de motivos y condiciones
    const propositoPrincipal = document.getElementById("proposito_principal")
    if (propositoPrincipal && document.getElementById("summary-proposito-principal")) {
      document.getElementById("summary-proposito-principal").textContent =
        propositoPrincipal.options[propositoPrincipal.selectedIndex].text
    }

    const empleoOrigenChecked = document.querySelector('input[name="empleo_origen"]:checked')
    if (empleoOrigenChecked && document.getElementById("summary-empleo")) {
      document.getElementById("summary-empleo").textContent = empleoOrigenChecked.value === "si" ? "Sí" : "No"
    }

    const dependenciaEconomicaChecked = document.querySelector('input[name="dependencia_economica"]:checked')
    if (dependenciaEconomicaChecked && document.getElementById("summary-dependencia")) {
      document.getElementById("summary-dependencia").textContent =
        dependenciaEconomicaChecked.value === "si" ? "Sí" : "No"
    }

    const viajesPreviosChecked = document.querySelector('input[name="viajes_previos"]:checked')
    if (viajesPreviosChecked && document.getElementById("summary-viajes")) {
      document.getElementById("summary-viajes").textContent = viajesPreviosChecked.value === "si" ? "Sí" : "No"
    }

    const acompanaFamiliarChecked = document.querySelector('input[name="acompana_familiar"]:checked')
    if (acompanaFamiliarChecked && document.getElementById("summary-acompana")) {
      document.getElementById("summary-acompana").textContent = acompanaFamiliarChecked.value === "si" ? "Sí" : "No"
    }

    const antecedentesPenalesChecked = document.querySelector('input[name="antecedentes_penales"]:checked')
    if (antecedentesPenalesChecked && document.getElementById("summary-antecedentes")) {
      document.getElementById("summary-antecedentes").textContent =
        antecedentesPenalesChecked.value === "si" ? "Sí" : "No"
    }

    const examenesMedicosChecked = document.querySelector('input[name="examenes_medicos"]:checked')
    if (examenesMedicosChecked && document.getElementById("summary-examenes")) {
      document.getElementById("summary-examenes").textContent = examenesMedicosChecked.value === "si" ? "Sí" : "No"
    }

    const pagoOnlineChecked = document.querySelector('input[name="pago_online"]:checked')
    if (pagoOnlineChecked && document.getElementById("summary-pago")) {
      document.getElementById("summary-pago").textContent = pagoOnlineChecked.value === "si" ? "Sí" : "No"
    }
  }

  function formatDate(dateString) {
    if (!dateString) return ""

    const date = new Date(dateString)
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  function showAlert(message, type = "info") {
    if (!alertContainer || !alertElement) return

    // Configurar clases según el tipo de alerta
    let bgColor, textColor, borderColor

    switch (type) {
      case "success":
        bgColor = "bg-green-50"
        textColor = "text-green-800"
        borderColor = "border-green-400"
        break
      case "error":
        bgColor = "bg-red-50"
        textColor = "text-red-800"
        borderColor = "border-red-400"
        break
      case "warning":
        bgColor = "bg-yellow-50"
        textColor = "text-yellow-800"
        borderColor = "border-yellow-400"
        break
      default: // info
        bgColor = "bg-blue-50"
        textColor = "text-blue-800"
        borderColor = "border-blue-400"
        break
    }

    // Configurar el contenido de la alerta
    alertElement.className = `p-4 rounded-xl border ${bgColor} ${textColor} ${borderColor} animate-fade-in shadow-md`
    alertElement.innerHTML = `
            <div class="flex">
                <div class="flex-shrink-0">
                    ${getAlertIcon(type)}
                </div>
                <div class="ml-3">
                    <p class="text-sm font-medium">${message}</p>
                </div>
                <div class="ml-auto pl-3">
                    <div class="-mx-1.5 -my-1.5">
                        <button type="button" class="inline-flex rounded-md p-1.5 ${textColor} hover:bg-${type}-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${type}-500" onclick="document.getElementById('alert-container').classList.add('hidden')">
                            <span class="sr-only">Cerrar</span>
                            <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `

    // Mostrar la alerta
    alertContainer.classList.remove("hidden")

    // Ocultar automáticamente después de 5 segundos
    setTimeout(() => {
      alertContainer.classList.add("hidden")
    }, 5000)
  }

  function getAlertIcon(type) {
    switch (type) {
      case "success":
        return `<svg class="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>`
      case "error":
        return `<svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>`
      case "warning":
        return `<svg class="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>`
      default: // info
        return `<svg class="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>`
    }
  }
})
