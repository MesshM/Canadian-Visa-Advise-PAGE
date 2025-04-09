document.addEventListener("DOMContentLoaded", () => {
    // Referencias a los elementos del formulario
    const form = document.getElementById("visa-form")
    const sections = document.querySelectorAll(".form-section")
    const progressBar = document.getElementById("progress-bar")
    const progressText = document.getElementById("progress-text")
    const progressPercentage = document.getElementById("progress-percentage")
  
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
  
    // Variables de estado
    let currentSection = 0
  
    // Inicialización
    updateProgressBar()
    setupConditionalFields()
    setupFileInputs()
  
    // Configurar navegación entre secciones
    next1Button.addEventListener("click", () => {
      if (validateSection(0)) {
        showSection(1)
      }
    })
  
    next2Button.addEventListener("click", () => {
      if (validateSection(1)) {
        showSection(2)
      }
    })
  
    next3Button.addEventListener("click", () => {
      if (validateSection(2)) {
        updateSummary()
        showSection(3)
      }
    })
  
    prev2Button.addEventListener("click", () => {
      showSection(0)
    })
  
    prev3Button.addEventListener("click", () => {
      showSection(1)
    })
  
    prev4Button.addEventListener("click", () => {
      showSection(2)
    })
  
    // Validación del formulario antes de enviar
    form.addEventListener("submit", (event) => {
      event.preventDefault()
  
      if (!document.getElementById("terminos").checked || !document.getElementById("privacidad").checked) {
        alert("Debe aceptar los términos y condiciones y la política de privacidad para continuar.")
        return
      }
  
      // Aquí se enviaría el formulario
      alert("Formulario enviado correctamente. Nos pondremos en contacto contigo pronto.")
      form.submit()
    })
  
    // Funciones auxiliares
    function showSection(sectionIndex) {
      sections.forEach((section, index) => {
        section.classList.add("hidden")
      })
  
      sections[sectionIndex].classList.remove("hidden")
      currentSection = sectionIndex
      updateProgressBar()
    }
  
    function updateProgressBar() {
      const progress = ((currentSection + 1) / sections.length) * 100
      progressBar.style.width = `${progress}%`
      progressText.textContent = `Paso ${currentSection + 1} de ${sections.length}`
      progressPercentage.textContent = `${Math.round(progress)}%`
    }
  
    function validateSection(sectionIndex) {
      const section = sections[sectionIndex]
      const requiredFields = section.querySelectorAll("[required]")
      let valid = true
  
      requiredFields.forEach((field) => {
        if (!field.value) {
          field.classList.add("border-red-500")
          valid = false
        } else {
          field.classList.remove("border-red-500")
        }
      })
  
      if (!valid) {
        alert("Por favor, complete todos los campos obligatorios.")
      }
  
      return valid
    }
  
    function setupConditionalFields() {
      // Mostrar/ocultar campo de relación familiar
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
  
      // Mostrar/ocultar campo de método de pago
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
  
    function setupFileInputs() {
      for (const [id, elements] of Object.entries(fileInputs)) {
        elements.input.addEventListener("change", (e) => {
          const file = e.target.files[0]
          if (file) {
            // Validar tamaño del archivo (4MB máximo)
            if (file.size > 4 * 1024 * 1024) {
              alert("El archivo es demasiado grande. El tamaño máximo permitido es 4MB.")
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
              alert("Tipo de archivo no permitido. Se permiten: PDF, JPG, JPEG, PNG.")
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
  
    function updateSummary() {
      // Actualizar resumen de datos de elegibilidad
      const proposito = document.getElementById("proposito")
      document.getElementById("summary-proposito").textContent = proposito.options[proposito.selectedIndex].text
  
      const tiempoEstadia = document.getElementById("tiempo_estadia")
      document.getElementById("summary-tiempo").textContent = tiempoEstadia.options[tiempoEstadia.selectedIndex].text
  
      document.getElementById("summary-pais").textContent = document.getElementById("pais_residencia").value
  
      const fechaNacimiento = document.getElementById("fecha_nacimiento").value
      document.getElementById("summary-fecha").textContent = formatDate(fechaNacimiento)
  
      const familiarCanadaValue = document.querySelector('input[name="familiar_canada"]:checked').value
      document.getElementById("summary-familiar").textContent = familiarCanadaValue === "si" ? "Sí" : "No"
  
      const estadoCivil = document.getElementById("estado_civil")
      document.getElementById("summary-estado-civil").textContent = estadoCivil.options[estadoCivil.selectedIndex].text
  
      const provinciaDestino = document.getElementById("provincia_destino")
      document.getElementById("summary-provincia").textContent =
        provinciaDestino.options[provinciaDestino.selectedIndex].text
  
      // Actualizar resumen de motivos y condiciones
      const propositoPrincipal = document.getElementById("proposito_principal")
      document.getElementById("summary-proposito-principal").textContent =
        propositoPrincipal.options[propositoPrincipal.selectedIndex].text
  
      const empleoOrigenValue = document.querySelector('input[name="empleo_origen"]:checked').value
      document.getElementById("summary-empleo").textContent = empleoOrigenValue === "si" ? "Sí" : "No"
  
      const dependenciaEconomicaValue = document.querySelector('input[name="dependencia_economica"]:checked').value
      document.getElementById("summary-dependencia").textContent = dependenciaEconomicaValue === "si" ? "Sí" : "No"
  
      const viajesPreviosValue = document.querySelector('input[name="viajes_previos"]:checked').value
      document.getElementById("summary-viajes").textContent = viajesPreviosValue === "si" ? "Sí" : "No"
  
      const acompanaFamiliarValue = document.querySelector('input[name="acompana_familiar"]:checked').value
      document.getElementById("summary-acompana").textContent = acompanaFamiliarValue === "si" ? "Sí" : "No"
  
      const antecedentesPenalesValue = document.querySelector('input[name="antecedentes_penales"]:checked').value
      document.getElementById("summary-antecedentes").textContent = antecedentesPenalesValue === "si" ? "Sí" : "No"
  
      const examenesMedicosValue = document.querySelector('input[name="examenes_medicos"]:checked').value
      document.getElementById("summary-examenes").textContent = examenesMedicosValue === "si" ? "Sí" : "No"
  
      const pagoOnlineValue = document.querySelector('input[name="pago_online"]:checked').value
      document.getElementById("summary-pago").textContent = pagoOnlineValue === "si" ? "Sí" : "No"
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
  
    // Manejo de reportes
    const downloadReportBtn = document.getElementById("download-report")
    const previewReportBtn = document.getElementById("preview-report")
  
    if (downloadReportBtn) {
      downloadReportBtn.addEventListener("click", () => {
        // Recopilar datos del formulario
        const formData = new FormData(form)
  
        // Verificar si hay datos suficientes para generar un reporte
        if (!formData.get("proposito") || !formData.get("pais_residencia")) {
          alert("Por favor, complete al menos los campos básicos del formulario para generar un reporte.")
          return
        }
  
        // Enviar solicitud para generar el PDF
        window.location.href = "/generar_reporte_pdf?" + new URLSearchParams(formData).toString()
      })
    }
  
    if (previewReportBtn) {
      previewReportBtn.addEventListener("click", () => {
        // Recopilar datos del formulario
        const formData = new FormData(form)
  
        // Verificar si hay datos suficientes para generar un reporte
        if (!formData.get("proposito") || !formData.get("pais_residencia")) {
          alert("Por favor, complete al menos los campos básicos del formulario para generar un reporte.")
          return
        }
  
        // Abrir vista previa en una nueva ventana
        window.open("/vista_previa_reporte?" + new URLSearchParams(formData).toString(), "_blank")
      })
    }
  })
  
  