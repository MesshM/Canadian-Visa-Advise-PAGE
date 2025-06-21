// Add these functions outside the DOMContentLoaded listener, but within the script scope
function saveFormData(codigoAsesoria) {
  const form = document.getElementById("formularioElegibilidad")
  if (!form) return

  const formData = new FormData(form)
  const dataToSave = {}

  for (const [key, value] of formData.entries()) {
    // Exclude file inputs and their related state selects
    if (!key.endsWith("_file_input") && !key.endsWith("_estado")) {
      // Handle radio buttons and checkboxes correctly
      const inputElement = form.querySelector(`[name="${key}"]`)
      if (inputElement && inputElement.type === "radio") {
        if (inputElement.checked) {
          dataToSave[key] = value
        }
      } else if (inputElement && inputElement.type === "checkbox") {
        dataToSave[key] = inputElement.checked
      } else {
        dataToSave[key] = value
      }
    }
  }

  // Manually add values for radio groups that might not have a checked value if not interacted with
  const radioGroups = [
    "tiene_pasaporte",
    "empleo_origen",
    "empleo_extranjero",
    "tiene_negocios_actuales",
    "dependencia_economica",
    "familiares_canada",
    "puede_comprobar_relacion",
    "acompana_familiar",
    "viaja_conocido",
    "co_deudor",
    "viajes_recientes",
    "antecedente_judiciales",
    "examenes_medicos",
    "aplicacion_familiares",
    "biometricos_canada",
    "pago_tasas",
    "posee_ahorros",
    "estudios_en_curso",
    "rechazado_canada",
    "habla_idioma_oficial",
    "aplicado_programa_migratorio",
    "intencion_extender_estadia",
  ]

  radioGroups.forEach((groupName) => {
    const checkedRadio = form.querySelector(`input[name="${groupName}"]:checked`)
    if (checkedRadio) {
      dataToSave[groupName] = checkedRadio.value
    } else if (!dataToSave.hasOwnProperty(groupName)) {
      dataToSave[groupName] = null // Or an empty string, depending on how you want to represent unchecked
    }
  })

  localStorage.setItem(`form_data_${codigoAsesoria}`, JSON.stringify(dataToSave))
  console.log(`Form data for ${codigoAsesoria} saved.`)
}

function restoreFormData(codigoAsesoria) {
  const form = document.getElementById("formularioElegibilidad")
  if (!form) return

  const savedData = localStorage.getItem(`form_data_${codigoAsesoria}`)
  if (!savedData) {
    console.log(`No saved data found for ${codigoAsesoria}.`)
    return
  }

  const data = JSON.parse(savedData)
  console.log(`Restoring form data for ${codigoAsesoria}:`, data)

  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const value = data[key]
      const inputElement = form.querySelector(`[name="${key}"]`)

      if (inputElement) {
        // Skip restoring motivo_viaje if it's already disabled (meaning it was pre-set)
        if (key === "motivo_viaje" && inputElement.disabled) {
          continue
        }
        if (inputElement.type === "radio") {
          const radioButtons = form.querySelectorAll(`input[name="${key}"]`)
          radioButtons.forEach((radio) => {
            if (radio.value === value) {
              radio.checked = true
              // Trigger change event for radio buttons to update dependent fields
              radio.dispatchEvent(new Event("change", { bubbles: true }))
            }
          })
        } else if (inputElement.type === "checkbox") {
          inputElement.checked = value
        } else if (inputElement.tagName === "SELECT") {
          inputElement.value = value
          // Trigger change event for select elements (e.g., motivoViaje)
          inputElement.dispatchEvent(new Event("change", { bubbles: true }))
        } else {
          inputElement.value = value
        }
      }
    }
  }
  // Re-evaluate conditional display logic after restoring data
  // This is crucial for fields like 'numeroPasaporteDiv', 'trabajoActualDiv', etc.
  // Trigger change events for relevant inputs to re-run their display logic
  const relevantInputs = [
    "tiene_pasaporte",
    "empleo_origen",
    "empleo_extranjero",
    "tiene_negocios_actuales",
    "familiares_canada",
    "acompana_familiar",
  ]
  relevantInputs.forEach((name) => {
    const input = form.querySelector(`[name="${name}"]:checked`) || form.querySelector(`[name="${name}"]`)
    if (input) {
      input.dispatchEvent(new Event("change", { bubbles: true }))
    }
  })
}

document.addEventListener("DOMContentLoaded", () => {
  // Elementos del DOM
  const asesoriasContainer = document.getElementById("asesoriasContainer")
  const loadingSpinner = document.getElementById("loadingSpinner")
  const formularioModal = document.getElementById("formularioModal")
  const formularioElegibilidad = document.getElementById("formularioElegibilidad")
  const cerrarModal = document.getElementById("cerrarModal")
  const paginationContainer = document.getElementById("paginationContainer") // Nuevo elemento para paginación

  // Elementos del stepper
  const stepperPrevBtn = document.getElementById("stepper-prev-btn")
  const stepperNextBtn = document.getElementById("stepper-next-btn")
  const stepperSubmitBtn = document.getElementById("stepper-submit-btn")
  const progressBar = document.getElementById("progress-bar")
  const currentStepSpan = document.getElementById("current-step")

  // Elementos del paso 4 simplificado
  const toggleDocumentos = document.getElementById("toggle-documentos")
  const documentosContenido = document.getElementById("documentos-contenido")
  const documentosContador = document.getElementById("documentos-contador")

  // Variables del stepper
  let currentStep = 0
  const totalSteps = 4 // Asumiendo 4 pasos de contenido antes del mensaje de éxito

  // Variables de paginación
  let allAsesorias = [] // Almacena todas las asesorías
  const itemsPerPage = 9 // Número de tarjetas por página
  let currentPage = 1 // Página actual

  // Almacenamiento para archivos a subir
  let filesToUploadGlobally = {} // { docId: File }
  let fileUrlsFromUpload = {} // { docId: cloudinaryUrl }

  // Variables para modal de documentos faltantes
  let documentosModal = null
  let currentCodigoAsesoria = null

  // Contenido original del drop area para restaurarlo
  const originalDropAreaContent = `
  <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
  <div class="flex text-sm text-gray-600">
    <p class="pl-1">Arrastra y suelta archivos aquí o <span class="font-medium text-primary-600 hover:text-primary-500">haz clic para seleccionar</span></p>
  </div>
  <p class="text-xs text-gray-500">PDF, JPG, PNG, DOC, DOCX hasta 10MB</p>
`

  // Cargar asesorías pagadas al iniciar
  cargarAsesoriasPagadas()

  // Event listeners principales
  cerrarModal.addEventListener("click", cerrarModalFormulario)

  // Event listeners del stepper
  if (stepperPrevBtn) stepperPrevBtn.addEventListener("click", prevStep)
  if (stepperNextBtn) stepperNextBtn.addEventListener("click", nextStep)
  if (stepperSubmitBtn) stepperSubmitBtn.addEventListener("click", () => enviarFormulario(new Event("submit")))

  // Event listeners del paso 4 simplificado
  if (toggleDocumentos) {
    toggleDocumentos.addEventListener("click", toggleDocumentosSection)
  }

  document.addEventListener("change", (e) => {
    if (e.target.name === "familiares_canada") {
      const relacionDiv = document.getElementById("relacionFamiliaresDiv")
      if (e.target.value === "Si") {
        relacionDiv.classList.remove("hidden")
        relacionDiv.classList.add("animate-fade-in")
        document.getElementById("relacionFamiliares").required = true
      } else {
        relacionDiv.classList.add("hidden")
        document.getElementById("relacionFamiliares").required = false
        document.getElementById("relacionFamiliares").value = ""
      }
    }

    if (e.target.name === "familiares_canada") {
      const comprobarDiv = document.getElementById("puedeComprobarRelacionDiv")
      const comprobarRadios = document.getElementsByName("puede_comprobar_relacion")
      if (e.target.value === "Si") {
        comprobarDiv.classList.remove("hidden")
        comprobarRadios.forEach((radio) => radio.setAttribute("required", "required"))
      } else {
        comprobarDiv.classList.add("hidden")
        comprobarRadios.forEach((radio) => {
          radio.removeAttribute("required")
          radio.checked = false
        })
      }
    }

    if (e.target.name === "empleo_origen") {
      const trabajoActualDiv = document.getElementById("trabajoActualDiv")
      const trabajoActualInput = document.getElementById("trabajoActual")
      const empleoExtranjeroDiv = document.getElementById("empleoExtranjeroDiv")
      const trabajoActualExtranjeroDiv = document.getElementById("trabajoActualExtranjeroDiv")
      const trabajoActualExtranjeroInput = document.getElementById("trabajoActualExtranjero")
      const motivoNoTrabajoDiv = document.getElementById("motivoNoTrabajoDiv")
      const motivoNoTrabajoInput = document.getElementById("motivoNoTrabajo")

      if (e.target.value === "Si") {
        trabajoActualDiv.style.display = ""
        trabajoActualDiv.classList.add("animate-fade-in")
        trabajoActualInput.setAttribute("required", "required")
        empleoExtranjeroDiv.style.display = "none"
        empleoExtranjeroDiv.classList.remove("animate-fade-in") // quitar animación al ocultar
        trabajoActualExtranjeroDiv.style.display = "none"
        trabajoActualExtranjeroInput.removeAttribute("required")
        trabajoActualExtranjeroInput.value = ""
        motivoNoTrabajoDiv.style.display = "none"
        motivoNoTrabajoDiv.classList.remove("animate-fade-in") // quitar animación al ocultar
        motivoNoTrabajoInput.removeAttribute("required")
        motivoNoTrabajoInput.value = ""
      } else {
        trabajoActualDiv.style.display = "none"
        trabajoActualDiv.classList.remove("animate-fade-in")
        trabajoActualInput.removeAttribute("required")
        trabajoActualInput.value = ""
        empleoExtranjeroDiv.style.display = ""
        empleoExtranjeroDiv.classList.add("animate-fade-in") // animación agregada
        trabajoActualExtranjeroDiv.style.display = "none"
        trabajoActualExtranjeroInput.removeAttribute("required")
        trabajoActualExtranjeroInput.value = ""
        motivoNoTrabajoDiv.style.display = "none"
        motivoNoTrabajoDiv.classList.remove("animate-fade-in")
        motivoNoTrabajoInput.removeAttribute("required")
        motivoNoTrabajoInput.value = ""
      }
    }

    if (e.target.name === "empleo_extranjero") {
      const trabajoActualExtranjeroDiv = document.getElementById("trabajoActualExtranjeroDiv")
      const trabajoActualExtranjeroInput = document.getElementById("trabajoActualExtranjero")
      const motivoNoTrabajoDiv = document.getElementById("motivoNoTrabajoDiv")
      const motivoNoTrabajoInput = document.getElementById("motivoNoTrabajo")

      if (e.target.value === "Si") {
        trabajoActualExtranjeroDiv.style.display = ""
        trabajoActualExtranjeroDiv.classList.add("animate-fade-in")
        trabajoActualExtranjeroInput.setAttribute("required", "required")
        motivoNoTrabajoDiv.style.display = "none"
        motivoNoTrabajoDiv.classList.remove("animate-fade-in")
        motivoNoTrabajoInput.removeAttribute("required")
        motivoNoTrabajoInput.value = ""
      } else if (e.target.value === "No") {
        trabajoActualExtranjeroDiv.style.display = "none"
        trabajoActualExtranjeroDiv.classList.remove("animate-fade-in")
        trabajoActualExtranjeroInput.removeAttribute("required")
        trabajoActualExtranjeroInput.value = ""
        motivoNoTrabajoDiv.style.display = ""
        motivoNoTrabajoDiv.classList.add("animate-fade-in") // animación agregada
        motivoNoTrabajoInput.setAttribute("required", "required")
      }
    }

    if (e.target.name === "tiene_negocios_actuales") {
      const descripcionNegociosDiv = document.getElementById("descripcionNegociosDiv")
      const descripcionNegociosInput = document.getElementById("descripcionNegociosActuales")
      if (e.target.value === "Si") {
        descripcionNegociosDiv.style.display = ""
        descripcionNegociosDiv.classList.add("animate-fade-in")
        descripcionNegociosInput.setAttribute("required", "required")
      } else {
        descripcionNegociosDiv.style.display = "none"
        descripcionNegociosDiv.classList.remove("animate-fade-in")
        descripcionNegociosInput.removeAttribute("required")
        descripcionNegociosInput.value = ""
      }
    }

    if (e.target.name === "acompana_familiar") {
      const relacionDiv = document.getElementById("relacionAcompanaFamiliarDiv")
      const relacionInput = document.getElementById("relacionAcompanaFamiliar")
      if (e.target.value === "Si") {
        relacionDiv.classList.remove("hidden")
        relacionDiv.classList.add("animate-fade-in")
        relacionInput.setAttribute("required", "required")
      } else {
        relacionDiv.classList.add("hidden")
        relacionDiv.classList.remove("animate-fade-in")
        relacionInput.removeAttribute("required")
        relacionInput.value = ""
      }
    }

    if (e.target.name === "tiene_pasaporte") {
      const numeroPasaporteDiv = document.getElementById("numeroPasaporteDiv")
      const numeroPasaporteInput = document.getElementById("numeroPasaporte")
      const advertenciaPasaporte = document.getElementById("advertenciaPasaporte")

      if (e.target.value === "Si") {
        numeroPasaporteDiv.style.display = ""
        numeroPasaporteDiv.classList.add("animate-fade-in")
        numeroPasaporteInput.setAttribute("required", "required")
        advertenciaPasaporte.classList.add("hidden")
        advertenciaPasaporte.classList.remove("animate-fade-in")
        numeroPasaporteInput.value = ""
      } else {
        numeroPasaporteDiv.style.display = "none"
        numeroPasaporteDiv.classList.remove("animate-fade-in")
        numeroPasaporteInput.removeAttribute("required")
        numeroPasaporteInput.value = ""
        advertenciaPasaporte.classList.remove("hidden")
        advertenciaPasaporte.classList.add("animate-fade-in") // animación agregada
      }
    }

    // Animación para el campo numeroDocumento
    if (e.target.id === "numeroDocumento") {
      const numeroDocumentoInput = document.getElementById("numeroDocumento")
      if (numeroDocumentoInput && numeroDocumentoInput.value !== "") {
        numeroDocumentoInput.classList.add("animate-fade-in")
      } else if (numeroDocumentoInput) {
        numeroDocumentoInput.classList.remove("animate-fade-in")
      }
    }
  })

  formularioModal.addEventListener("click", (e) => {
    if (e.target === formularioModal) {
      cerrarModalFormulario()
    }
  })

  function toggleDocumentosSection() {
    const icon = toggleDocumentos.querySelector("svg")
    const isExpanded = !documentosContenido.classList.contains("max-h-0")

    if (isExpanded) {
      documentosContenido.style.maxHeight = "0px"
      documentosContenido.classList.add("max-h-0")
      icon.style.transform = "rotate(0deg)"
    } else {
      documentosContenido.style.maxHeight = documentosContenido.scrollHeight + "px"
      documentosContenido.classList.remove("max-h-0")
      icon.style.transform = "rotate(180deg)"
    }
  }

  function showNotification(message, type = "success") {
    const notification = document.createElement("div")
    notification.className = `fixed top-4 right-4 p-4 rounded-xl shadow-lg z-50 transform transition-all duration-500 translate-x-full max-w-md`

    if (type === "success") {
      notification.classList.add("bg-green-100", "text-green-800", "border-l-4", "border-green-500")
    } else if (type === "error") {
      notification.classList.add("bg-red-100", "text-red-800", "border-l-4", "border-red-500")
    } else if (type === "warning") {
      notification.classList.add("bg-yellow-100", "text-yellow-800", "border-l-4", "border-yellow-500")
    } else {
      notification.classList.add("bg-blue-100", "text-blue-800", "border-l-4", "border-blue-500")
    }

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
          <p class="text-sm font-medium">${message}</p>
      </div>
      <div class="ml-auto pl-3">
          <button class="inline-flex text-gray-400 hover:text-gray-500 focus:outline-none cursor-pointer transition-colors duration-200">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
      </div>
  </div>
`
    document.body.appendChild(notification)
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
  }

  async function cargarAsesoriasPagadas() {
    try {
      mostrarSpinner(true)
      const response = await fetch("/formularios/asesorias_pagadas")
      const data = await response.json()
      if (data.success) {
        allAsesorias = data.asesorias.sort((a, b) => b.codigo_asesoria - a.codigo_asesoria)
        const totalAsesorias = allAsesorias.length
        allAsesorias.forEach((asesoria, idx) => {
          asesoria.numero_secuencial = totalAsesorias - idx
        })
        renderedCardsByPage = {} // <--- Limpia el cache aquí
        await renderPaginatedAsesorias()
      } else {
        showNotification("Error al cargar las asesorías: " + data.message, "error")
      }
    } catch (error) {
      console.error("Error:", error)
      showNotification("Error de conexión al cargar las asesorías", "error")
    } finally {
      mostrarSpinner(false) // Spinner hidden here, after all rendering is complete
    }
  }

  async function verificarEstadoDocumentos(codigoAsesoria) {
    try {
      const response = await fetch(`/formularios/verificar_documentos/${codigoAsesoria}`)
      const data = await response.json()

      if (data.success) {
        return {
          estado: data.estado,
          documentos_faltantes: data.documentos_faltantes,
          motivo_viaje: data.motivo_viaje,
        }
      } else {
        return {
          estado: "Sin formulario",
          documentos_faltantes: [],
          motivo_viaje: null,
        }
      }
    } catch (error) {
      console.error("Error al verificar documentos:", error)
      return {
        estado: "Error",
        documentos_faltantes: [],
        motivo_viaje: null,
      }
    }
  }

  let renderedCardsByPage = {} // Nuevo: cache de cards por página

  // Cambia la función renderPaginatedAsesorias para precargar todas las páginas la primera vez
  async function renderPaginatedAsesorias() {
    asesoriasContainer.innerHTML = ""

    if (allAsesorias.length === 0) {
      asesoriasContainer.innerHTML = `
      <div class="col-span-full text-center py-12 animate-fade-in">
          <div class="text-gray-500 text-lg">
              <svg class="w-20 h-20 mx-auto mb-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <h3 class="text-xl font-medium text-gray-900 mb-2">No hay asesorías pagadas disponibles</h3>
              <p class="text-gray-600">Una vez que tenga asesorías pagadas, aparecerán aquí para completar el formulario de elegibilidad.</p>
          </div>
      </div>
    `
      paginationContainer.innerHTML = ""
      paginationContainer.classList.add("hidden")
      return
    }

    const totalPages = Math.ceil(allAsesorias.length / itemsPerPage)

    // Precarga todas las páginas solo si el cache está vacío
    if (Object.keys(renderedCardsByPage).length === 0) {
      for (let page = 1; page <= totalPages; page++) {
        const startIndex = (page - 1) * itemsPerPage
        const endIndex = startIndex + itemsPerPage
        const asesoriasToDisplay = allAsesorias.slice(startIndex, endIndex)
        const cardElements = await renderCardsForPage(asesoriasToDisplay)
        renderedCardsByPage[page] = cardElements
      }
    }

    // Muestra solo las cards de la página actual
    renderedCardsByPage[currentPage].forEach(card => asesoriasContainer.appendChild(card))

    renderPaginationButtons()
  }

  async function renderCardsForPage(asesoriasToDisplay) {
    // No limpiar el contenedor aquí, solo retorna las cards
    const cardPromises = asesoriasToDisplay.map((asesoria, i) => crearCardAsesoria(asesoria, i))
    const cardElements = await Promise.all(cardPromises)
    return cardElements
  }

  function renderPaginationButtons() {
    paginationContainer.innerHTML = "" // Limpia los botones existentes
    const totalPages = Math.ceil(allAsesorias.length / itemsPerPage)

    if (totalPages <= 1) {
      paginationContainer.classList.add("hidden")
      return
    }

    paginationContainer.classList.remove("hidden")
    paginationContainer.className = "flex flex-wrap justify-center items-center space-x-2 mt-8 animate-fade-in delay-300"

    // Botón "Anterior"
    const prevButton = document.createElement("button")
    prevButton.className = `px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
      currentPage === 1
        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
        : "bg-primary-100 text-primary-700 hover:bg-primary-200"
    }`
    prevButton.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>`
    prevButton.disabled = currentPage === 1
    prevButton.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--
        renderPaginatedAsesorias()
      }
    })
    paginationContainer.appendChild(prevButton)

    // Responsive: mostrar solo 1,2,3,...,N en móvil
    const isMobile = window.innerWidth < 640 // sm: breakpoint de Tailwind

    if (isMobile && totalPages > 4) {
      // Mostrar 1, 2, 3, ..., N
      for (let i = 1; i <= 3; i++) {
        const pageButton = document.createElement("button")
        pageButton.className = `px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
          i === currentPage ? "bg-primary-600 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        }`
        pageButton.textContent = i
        pageButton.addEventListener("click", () => {
          currentPage = i
          renderPaginatedAsesorias()
        })
        paginationContainer.appendChild(pageButton)
      }

      // Puntos suspensivos
      const dots = document.createElement("span")
      dots.className = "px-2 text-gray-400 select-none"
      dots.textContent = "..."
      paginationContainer.appendChild(dots)

      // Última página
      const lastButton = document.createElement("button")
      lastButton.className = `px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
        totalPages === currentPage ? "bg-primary-600 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`
      lastButton.textContent = totalPages
      lastButton.addEventListener("click", () => {
        currentPage = totalPages
        renderPaginatedAsesorias()
      })
      paginationContainer.appendChild(lastButton)
    } else {
      // Desktop: mostrar todos los números normalmente
      for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement("button")
        pageButton.className = `px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
          i === currentPage ? "bg-primary-600 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        }`
        pageButton.textContent = i
        pageButton.addEventListener("click", () => {
          currentPage = i
          renderPaginatedAsesorias()
        })
        paginationContainer.appendChild(pageButton)
      }
    }

    // Botón "Siguiente"
    const nextButton = document.createElement("button")
    nextButton.className = `px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
      currentPage === totalPages
        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
        : "bg-primary-100 text-primary-700 hover:bg-primary-200"
    }`
    nextButton.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>`
    nextButton.disabled = currentPage === totalPages
    nextButton.addEventListener("click", () => {
      if (currentPage < totalPages) {
        currentPage++
        renderPaginatedAsesorias()
      }
    })
    paginationContainer.appendChild(nextButton)
  }

  async function crearCardAsesoria(asesoria, index) {
    const card = document.createElement("div")
    card.className = `bg-white rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] animate-fade-in`
    card.style.animationDelay = `${index * 100}ms`

    const fechaFormateada = new Date(asesoria.fecha_asesoria).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

    let estadoFormularioTexto = "Pendiente"
    let colorEstado = "bg-yellow-100 text-yellow-800"
    let actionButtonHtml = ""

    if (asesoria.completado === 1) {
      const { estado, documentos_faltantes, motivo_viaje } = await verificarEstadoDocumentos(asesoria.codigo_asesoria)
      if (estado === "Completo") {
        estadoFormularioTexto = "Completo"
        colorEstado = "bg-green-100 text-green-800"
        actionButtonHtml = `<button disabled class="w-full px-6 py-3 bg-gray-300 text-gray-500 rounded-xl cursor-not-allowed font-medium flex items-center justify-center"><svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>Formulario Completado</button>`
      } else {
        estadoFormularioTexto = "Pendiente (Documentos)"
        colorEstado = "bg-red-100 text-red-800"
        actionButtonHtml = `<button onclick="abrirModalDocumentosFaltantes(this, ${asesoria.codigo_asesoria}, '${motivo_viaje}')" class="w-full relative overflow-hidden group bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-600 text-white font-roboto py-3 px-6 rounded-xl shadow-lg hover:shadow-primary-500/30 transition-all duration-300 cursor-pointer transform hover:scale-[1.02]"><span class="absolute right-0 -mt-12 h-32 w-8 opacity-20 transform rotate-12 transition-all duration-1000 translate-x-12 bg-white group-hover:-translate-x-40"></span><div class="relative flex items-center justify-center"><svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg><span>Adjuntar Documentos Faltantes</span></div></button>`
      }
    } else {
      estadoFormularioTexto = "Pendiente (Formulario)"
      colorEstado = "bg-yellow-100 text-yellow-800"
      actionButtonHtml = `<button onclick="abrirFormularioElegibilidad(${asesoria.codigo_asesoria}, ${asesoria.id_solicitante})" class="w-full relative overflow-hidden group bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-600 text-white font-roboto py-3 px-6 rounded-xl shadow-lg hover:shadow-primary-500/30 transition-all duration-300 cursor-pointer transform hover:scale-[1.02]"><span class="absolute right-0 -mt-12 h-32 w-8 opacity-20 transform rotate-12 transition-all duration-1000 translate-x-12 bg-white group-hover:-translate-x-40"></span><div class="relative flex items-center justify-center"><svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg><span>Llenar Formulario de Elegibilidad</span></div></button>`
    }
    card.innerHTML = `
  <div class="p-6">
      <div class="flex justify-between items-start mb-6">
          <div>
              <h3 class="text-xl font-bold text-gray-900 font-roboto">
                  Formulario #${asesoria.numero_secuencial}
              </h3>
              <p class="text-sm text-primary-600 font-medium">Visa de ${asesoria.tipo_asesoria}</p>
          </div>
          <!-- Eliminado el span de asesoria.estado -->
      </div>
      <div class="space-y-4 mb-6">
          <div class="flex items-center text-sm text-gray-600">
              <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                  <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a2 2 0 012 2v9a2 2 0 01-2-2H5a2 2 0 01-2-2V9a2 2 0 012-2h3z"></path></svg>
              </div>
              <div><p class="font-medium text-gray-900">${fechaFormateada}</p><p class="text-xs text-gray-500">Fecha de la asesoría</p></div>
          </div>
          <div class="flex items-center text-sm text-gray-600">
              <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                  <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
              </div>
              <div><p class="font-medium text-gray-900">${asesoria.nombre_asesor || "Asesor no asignado"}</p><p class="text-xs text-gray-500">Asesor especializado</p></div>
          </div>
      </div>
      <div class="mb-6">
          <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div class="flex items-center">
                  <svg class="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  <span class="text-sm font-medium text-gray-700">Estado del Formulario:</span>
              </div>
              <span class="px-3 py-1 text-xs font-semibold rounded-full ${colorEstado}">${estadoFormularioTexto}</span>
          </div>
      </div>
      <div class="pt-4 border-t border-gray-200">
          ${actionButtonHtml}
      </div>
  </div>
  `
    return card
  }

  window.abrirFormularioElegibilidad = (codigoAsesoria, idSolicitante) => {
    document.getElementById("codigoAsesoria").value = codigoAsesoria
    if (formularioElegibilidad) {
      formularioElegibilidad.dataset.idSolicitante = idSolicitante
    }

    const motivoViajeInput = document.getElementById("motivoViaje")
    const asesoria = allAsesorias.find((a) => a.codigo_asesoria === codigoAsesoria)
    if (asesoria && asesoria.tipo_asesoria) {
      let tipoVisa = asesoria.tipo_asesoria.trim()
      motivoViajeInput.value = tipoVisa
      motivoViajeInput.dataset.realValue = tipoVisa
    } else {
      motivoViajeInput.value = ""
      motivoViajeInput.dataset.realValue = ""
    }
    motivoViajeInput.readOnly = true
    motivoViajeInput.classList.add("bg-gray-100", "cursor-not-allowed")

    resetStepper()
    renderDocumentosPaso4()
    formularioModal.classList.remove("hidden")
    formularioModal.classList.add("flex")
    document.body.style.overflow = "hidden"
    const modalContent = formularioModal.querySelector(".bg-white")
    if (modalContent) modalContent.classList.add("animate-scale-in")

    restoreFormData(codigoAsesoria)
  }

  function cerrarModalFormulario() {
    const modalContent = formularioModal.querySelector(".bg-white")
    if (modalContent) modalContent.classList.add("opacity-0", "scale-95", "transition-all", "duration-300")

    // Save form data before closing
    const codigoAsesoria = document.getElementById("codigoAsesoria").value
    if (codigoAsesoria) {
      saveFormData(codigoAsesoria)
    }

    setTimeout(() => {
      formularioModal.classList.remove("flex")
      formularioModal.classList.add("hidden")
      document.body.style.overflow = "auto"
      // Restaurar contenido original de todos los drop areas
      document.querySelectorAll('[id$="_drop_area_content"]').forEach((contentDiv) => {
        contentDiv.innerHTML = originalDropAreaContent
        contentDiv.classList.remove("text-green-600", "text-red-600", "items-center", "justify-center")
        contentDiv.classList.add("space-y-1", "text-center")
        const parentLabel = contentDiv.closest("label")
        if (parentLabel) {
          parentLabel.classList.remove("border-red-500", "bg-red-50", "animate-shake")
          parentLabel.classList.add("border-gray-300", "bg-gray-50")
        }
      })
      document.querySelectorAll('input[type="file"]').forEach((input) => (input.value = null))
      
      if (modalContent) modalContent.classList.remove("opacity-0", "scale-95", "transition-all", "duration-300")
    }, 300)
  }

  // Agregar estas funciones para actualizar el indicador móvil

function updateMobileStepIndicator(stepNumber) {
  const mobileStepNumber = document.getElementById('current-step-number');
  const mobileStepText = document.getElementById('current-step-text');
  
  if (mobileStepNumber) mobileStepNumber.textContent = stepNumber.toString();
  if (mobileStepText) mobileStepText.textContent = `Paso ${stepNumber} de 4`;
}

  function resetStepper() {
    currentStep = 0
    showStep(0)

    // Actualizar indicador móvil al resetear
    updateMobileStepIndicator(1);

    const steps = document.querySelectorAll(".stepper-step")
    const stepperPrevBtn = document.getElementById("stepper-prev-btn")
    const stepperNextBtn = document.getElementById("stepper-next-btn")
    const stepperSubmitBtn = document.getElementById("stepper-submit-btn")
    const connectors = document.querySelectorAll(".stepper-connector")

    // Reset all steps to default (grey with number)
    steps.forEach((step, index) => {
      step.classList.remove("active", "completed")
      const circle = step.querySelector("div:first-child")
      if (circle) {
        circle.classList.remove("bg-primary-600", "text-white")
        circle.classList.add("bg-gray-200", "text-gray-500")
        circle.innerHTML = `<span>${index + 1}</span>`
      }
    })

    // Reset all connectors to grey
    connectors.forEach((connector) => {
      connector.classList.remove("bg-primary-600")
      connector.classList.add("bg-gray-200")
    })

    // Set the first step to active (primary-600 with number 1)
    const firstStep = steps[0]
    if (firstStep) {
      firstStep.classList.add("active")
      const firstCircle = firstStep.querySelector("div:first-child")
      if (firstCircle) {
        firstCircle.classList.remove("bg-gray-200", "text-gray-500")
        firstCircle.classList.add("bg-primary-600", "text-white")
        firstCircle.innerHTML = `<span>1</span>`
      }
    }

    // Update buttons for the first step
    if (stepperPrevBtn) stepperPrevBtn.classList.add("hidden")
    if (stepperNextBtn) stepperNextBtn.classList.remove("hidden")
    if (stepperSubmitBtn) stepperSubmitBtn.classList.add("hidden")
  }

  // Replace the entire `prevStep` function with the following:
  function prevStep() {
    const steps = document.querySelectorAll(".stepper-step")
    const contents = document.querySelectorAll(".stepper-content")
    const connectors = document.querySelectorAll(".stepper-connector")
    const stepperPrevBtn = document.getElementById("stepper-prev-btn")
    const stepperNextBtn = document.getElementById("stepper-next-btn")
    const stepperSubmitBtn = document.getElementById("stepper-submit-btn")

    const activeIndex = currentStep // Use currentStep directly

    if (activeIndex <= 0) return // Already at the first step

    // Animate the exit of the current content
    contents[activeIndex].classList.add("transform", "transition-all", "duration-500", "translate-x-full", "opacity-0")

    // After a brief delay, hide the current content and show the previous one
    setTimeout(() => {
      contents[activeIndex].classList.add("hidden")
      contents[activeIndex].classList.remove(
        "transform",
        "transition-all",
        "duration-500",
        "translate-x-full",
        "opacity-0",
      )

      // Prepare the previous content for the entrance animation
      contents[activeIndex - 1].classList.remove("hidden")
      contents[activeIndex - 1].classList.add(
        "transform",
        "transition-all",
        "duration-500",
        "translate-x-full",
        "opacity-0",
      )

      // Force a reflow for the animation to work
      contents[activeIndex - 1].offsetHeight

      // Animate the entrance of the previous content
      contents[activeIndex - 1].classList.remove("translate-x-full", "opacity-0")
      contents[activeIndex - 1].classList.add("translate-x-0", "opacity-100")
    }, 300)

    const currentCircle = steps[activeIndex].querySelector("div:first-child")
    if (currentCircle) {
      currentCircle.classList.add("transition-all", "duration-500")
      currentCircle.classList.remove("bg-primary-600", "text-white")
      currentCircle.classList.add("bg-gray-200", "text-gray-500")
      currentCircle.innerHTML = `<span>${activeIndex + 1}</span>`
    }

    steps[activeIndex].classList.remove("active", "completed")
    steps[activeIndex - 1].classList.add("active")
    steps[activeIndex - 1].classList.remove("completed")

    setTimeout(() => {
      if (activeIndex > 0 && activeIndex - 1 < connectors.length) {
        connectors[activeIndex - 1].classList.add("transition-all", "duration-700")
        connectors[activeIndex - 1].classList.remove("bg-primary-600")
        connectors[activeIndex - 1].classList.add("bg-gray-200")
      }
    }, 300)

    setTimeout(() => {
      const prevCircle = steps[activeIndex - 1].querySelector("div:first-child")
      if (prevCircle) {
        prevCircle.classList.add("transition-all", "duration-500")
        prevCircle.classList.remove("bg-gray-200", "text-gray-500")
        prevCircle.classList.add("bg-primary-600", "text-white") // Always make it primary-600 when it becomes the active step

        // If it's the first step (index 0), show the number 1
        if (activeIndex - 1 === 0) {
          prevCircle.innerHTML = `<span>1</span>`
        } else {
          // For other steps, show their number
          prevCircle.innerHTML = `<span class="inline-block animate-fade-in">${activeIndex}</span>`
        }
      }
    }, 600)

    currentStep-- // Después de decrementar currentStep
  
    // Actualizar indicador móvil
    updateMobileStepIndicator(currentStep + 1);

    // Update buttons
    if (currentStep === 0) {
      stepperPrevBtn.classList.add("hidden")
    }
    stepperNextBtn.classList.remove("hidden")
    stepperSubmitBtn.classList.add("hidden")
  }

  // Replace the entire `nextStep` function with the following:
  function nextStep() {
    const steps = document.querySelectorAll(".stepper-step")
    const contents = document.querySelectorAll(".stepper-content")
    const connectors = document.querySelectorAll(".stepper-connector")
    const stepperPrevBtn = document.getElementById("stepper-prev-btn")
    const stepperNextBtn = document.getElementById("stepper-next-btn")
    const stepperSubmitBtn = document.getElementById("stepper-submit-btn")

    const activeIndex = currentStep // Use currentStep directly

    if (!validateCurrentStep()) {
      return
    }

    if (activeIndex >= totalSteps - 1) return // Already at the last step

    // Animate the exit of the current content with a more evident transition
    contents[activeIndex].classList.add(
      "transform",
      "transition-all",
      "duration-500",
      "translate-x-[-100%]",
      "opacity-0",
    )

    // After a brief delay, hide the current content and show the next one
    setTimeout(() => {
      contents[activeIndex].classList.add("hidden")
      contents[activeIndex].classList.remove(
        "transform",
        "transition-all",
        "duration-500",
        "translate-x-[-100%]",
        "opacity-0",
      )

      // Prepare the next content for the entrance animation
      contents[activeIndex + 1].classList.remove("hidden")
      contents[activeIndex + 1].classList.add(
        "transform",
        "transition-all",
        "duration-500",
        "translate-x-[-100%]",
        "opacity-0",
      )

      // Force a reflow to make the animation work
      contents[activeIndex + 1].offsetHeight

      // Animate the entrance of the next content
      contents[activeIndex + 1].classList.remove("translate-x-[-100%]", "opacity-0")
      contents[activeIndex + 1].classList.add("translate-x-0", "opacity-100")
    }, 300)

    if (activeIndex < connectors.length) {
      connectors[activeIndex].classList.remove("bg-gray-200")
      connectors[activeIndex].classList.add("bg-primary-600", "transition-all", "duration-700")

      setTimeout(() => {
        steps[activeIndex].classList.remove("active")
        steps[activeIndex].classList.add("completed")
        steps[activeIndex + 1].classList.add("active")

        const currentCircle = steps[activeIndex].querySelector("div:first-child")
        const nextCircle = steps[activeIndex + 1].querySelector("div:first-child")

        if (currentCircle) {
          currentCircle.classList.remove("bg-gray-200", "text-gray-500")
          currentCircle.classList.add("bg-primary-600", "text-white", "transition-all", "duration-500")
          currentCircle.innerHTML =
            '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
        }

        if (nextCircle) {
          nextCircle.classList.remove("bg-gray-200", "text-gray-500")
          nextCircle.classList.add("bg-primary-600", "text-white", "transition-all", "duration-500")
          nextCircle.innerHTML = `<span>${activeIndex + 2}</span>`
        }
      }, 300)
    }

    currentStep++ // Después de incrementar currentStep
  
    // Actualizar indicador móvil
    updateMobileStepIndicator(currentStep + 1);

    // Update buttons
    stepperPrevBtn.classList.remove("hidden")

    if (currentStep === totalSteps - 1) {
      stepperNextBtn.classList.add("hidden")
      stepperSubmitBtn.classList.remove("hidden")
    }

    if (currentStep === 3 && documentosContenido.classList.contains("max-h-0")) {
      setTimeout(() => toggleDocumentosSection(), 300)
    }
  }

  // Remove the entire `updateStepperUI` function as its logic is now integrated into `prevStep` and `nextStep`.
  // This function is no longer needed.

  function showStep(stepIndex) {
    const contents = document.querySelectorAll(".stepper-content")
    contents.forEach((content, index) => {
      if (index === stepIndex) {
        content.classList.remove("hidden")
        content.classList.add("animate-fade-in")
      } else {
        content.classList.add("hidden")
        content.classList.remove("animate-fade-in")
      }
    })
    // Si es el paso 4 (índice 3), renderiza los documentos requeridos
    if (stepIndex === 3) {
      renderDocumentosPaso4()
    }
    if (stepIndex === totalSteps) {
      if (stepperPrevBtn) stepperPrevBtn.classList.add("hidden")
      if (stepperNextBtn) stepperNextBtn.classList.add("hidden")
      if (stepperSubmitBtn) stepperSubmitBtn.classList.add("hidden")
    }
  }

  function validateCurrentStep() {
    const currentContent = document.querySelectorAll(".stepper-content")[currentStep]
    if (!currentContent) return false
    const requiredFields = currentContent.querySelectorAll("[required]")
    for (const field of requiredFields) {
      if (field.type === "radio") {
        const radioGroup = currentContent.querySelectorAll(`[name="${field.name}"]`)
        const isChecked = Array.from(radioGroup).some((radio) => radio.checked)
        if (!isChecked) {
          showNotification(
            `Por favor, seleccione una opción para: ${field.dataset.label || field.name.replace(/_/g, " ")}`,
            "error",
          )
          return false
        }
      } else if (field.type === "checkbox") {
        if (!field.checked) {
          showNotification("Debe aceptar los términos y condiciones", "error")
          return false
        }
      } else if (!field.value.trim()) {
        showNotification(
          `Por favor, complete el campo: ${field.dataset.label || field.name.replace(/_/g, " ")}`,
          "error",
        )
        return false
      }
    }
    if (currentStep === 3) {
      const tipoVisa = getTipoVisaClave()
      const docs = documentosPorVisa[tipoVisa] || []
      for (const doc of docs) {
        const estadoSelect = document.getElementById(`${doc.name}_estado`)
        if (!estadoSelect || !estadoSelect.value) {
          showNotification(`Debe seleccionar un estado para: ${doc.label}`, "error")
          return false
        }
        if (estadoSelect.value === "Disponible") {
          const fileIsSelected = filesToUploadGlobally[doc.name]
          const urlAlreadyExists =
            fileUrlsFromUpload[doc.name] ||
            (document.getElementById(doc.name) && document.getElementById(doc.name).value)
          if (!fileIsSelected && !urlAlreadyExists) {
            showNotification(
              `Debe seleccionar un archivo para: ${doc.label} (ya que está marcado como Disponible)`,
              "error",
            )
            return false
          }
        }
      }
    }
    return true
  }

  function mostrarSpinner(mostrar) {
    if (mostrar) {
      loadingSpinner.classList.remove("hidden")
      asesoriasContainer.classList.add("hidden")
      paginationContainer.classList.add("hidden") // Ocultar paginación también
    } else {
      loadingSpinner.classList.add("hidden")
      asesoriasContainer.classList.remove("hidden")
      // La visibilidad de paginationContainer se maneja en renderPaginationButtons
    }
  }

  const inputsConfig = [
    { id: "numeroDocumento", type: "numberOnly" },
    { id: "propositoPrincipal", type: "textOnly" },
    { id: "propositoDetallado", type: "textOnly" },
    { id: "relacionFamiliares", type: "textOnly" },
    { id: "tiempoEstadiaCantidad", type: "numberOnly" },
    { id: "nombreCompleto", type: "alphaSpaceOnly" },
    { id: "ingresosMensuales", type: "currency" },
    { id: "relacionAcompanaFamiliar", type: "textOnly" },
    { id: "trabajoActual", type: "textOnly" },
    { id: "numeroPasaporte", type: "alphaNumericOnly" },
    { id: "motivoNoTrabajo", type: "textOnly" },
    { id: "trabajoActualExtranjero", type: "textOnly" },
    { id: "descripcionNegociosActuales", type: "textOnly" },
  ]

  inputsConfig.forEach((config) => {
    const inputElement = document.getElementById(config.id)
    if (inputElement) {
      if (config.type === "numberOnly") {
        inputElement.addEventListener("keydown", (e) => {
          if (
            !(
              (e.keyCode >= 48 && e.keyCode <= 57) ||
              (e.keyCode >= 96 && e.keyCode <= 105) ||
              [8, 9, 13, 27, 35, 36, 37, 39, 46].includes(e.keyCode) ||
              (e.ctrlKey && [65, 67, 86, 88].includes(e.keyCode))
            )
          )
            e.preventDefault()
        })
        inputElement.addEventListener("paste", (e) => {
          if (!/^\d+$/.test((e.clipboardData || window.clipboardData).getData("text"))) e.preventDefault()
        })
        inputElement.addEventListener("input", function () {
          this.value = this.value.replace(/\D/g, "")
        })
      } else if (config.type === "textOnly") {
        inputElement.addEventListener("input", function () {
          this.value = this.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñüÜ\s.,;:¡!¿?()"'-]/g, "")
        })
      } else if (config.type === "alphaSpaceOnly") {
        inputElement.addEventListener("input", function () {
          this.value = this.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñüÜ\s]/g, "")
        })
      } else if (config.type === "alphaNumericOnly") {
        inputElement.addEventListener("input", function () {
          this.value = this.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñüÜ0-9]/g, "")
        })
      } else if (config.type === "currency") {
        inputElement.addEventListener("input", function () {
          let valor = this.value.replace(/\D/g, "")
          valor = valor.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
          this.value = valor
        })
        inputElement.addEventListener("keydown", (e) => {
          if (
            !(
              (e.keyCode >= 48 && e.keyCode <= 57) ||
              (e.keyCode >= 96 && e.keyCode <= 105) ||
              [8, 9, 13, 27, 46].includes(e.keyCode) ||
              (e.ctrlKey && [65, 67, 86, 88].includes(e.keyCode)) ||
              (e.keyCode >= 35 && e.keyCode <= 39)
            )
          )
            e.preventDefault()
        })
        inputElement.addEventListener("paste", (e) => {
          if (!/^\d+$/.test((e.clipboardData || window.clipboardData).getData("text").replace(/\./g, "")))
            e.preventDefault()
        })
      }
    }
  })

  resetStepper()

  const documentosPorVisa = {
    
    "Turismo": [
      { label: "Itinerario de viaje", name: "doc_itinerario_viaje", required: true },
      { label: "Carta de motivación o carta de intención", name: "doc_carta_motivacion", required: true },
      { label: "Carta laboral o de estudio", name: "doc_carta_laboral", required: true },
      { label: "Certificados de propiedad", name: "doc_certificados_propiedad", required: false },
      { label: "Declaraciones de renta o extractos bancarios", name: "doc_extractos_bancarios", required: true },
      { label: "Carta de invitación (si aplica)", name: "doc_carta_invitacion", required: false },
      { label: "Carta de invitación del familiar en Canadá (si aplica)", name: "doc_carta_invitacion_familiar", required: false },
      { label: "Prueba de parentesco (si aplica)", name: "doc_prueba_parentesco", required: false },
      { label: "Documentos financieros del familiar (si cubre gastos)", name: "doc_finanzas_familiar", required: false },
    ],
    "Estudios": [
      { label: "Carta de aceptación de una institución educativa canadiense (DLI)", name: "doc_carta_aceptacion", required: true },
      { label: "Comprobante de pago de matrícula", name: "doc_pago_matricula", required: true },
      { label: "Pruebas de fondos para cubrir matrícula y manutención", name: "doc_pruebas_fondos", required: true },
      { label: "Carta de motivación para estudios", name: "doc_carta_motivacion_estudio", required: true },
      { label: "Historial académico (diplomas, certificados, notas)", name: "doc_historial_academico", required: true },
      { label: "Examen médico (si aplica)", name: "doc_examen_medico_estudio", required: false },
      { label: "Formulario custodia (si es menor de edad)", name: "doc_formulario_custodia", required: false },
    ],
    "Trabajo Temporal": [
      { label: "Oferta laboral firmada (Job Offer Letter)", name: "doc_oferta_laboral", required: true },
      { label: "LMIA o documento de exención", name: "doc_lmia", required: true },
      { label: "Contrato laboral", name: "doc_contrato_laboral", required: true },
      { label: "Certificados de experiencia laboral previa", name: "doc_certificados_experiencia", required: true },
      { label: "Hoja de vida actualizada", name: "doc_hoja_vida", required: true },
      { label: "Diplomas o certificados relacionados al cargo", name: "doc_diplomas", required: true },
      { label: "Examen médico (si aplica)", name: "doc_examen_medico", required: false },
      { label: "Carta de motivación (opcional)", name: "doc_carta_motivacion_trabajo", required: false },
    ],
    "Negocios": [
      { label: "Carta de invitación de la empresa canadiense", name: "doc_carta_invitacion_negocios", required: true },
      { label: "Registro de Cámara de Comercio de la empresa solicitante", name: "doc_registro_camara", required: true },
      { label: "Certificados bancarios y financieros de la empresa", name: "doc_certificados_bancarios_empresa", required: true },
      { label: "Itinerario de negocios", name: "doc_itinerario_negocios", required: true },
      { label: "Carta del empleador (si aplica)", name: "doc_carta_empleador", required: false },
      { label: "Contratos comerciales previos (si existen)", name: "doc_contratos_comerciales", required: false },
      { label: "Documentación que demuestre vínculo comercial", name: "doc_vinculo_comercial", required: true },
    ],
    "Residencia Permanente": [
      { label: "Resultados del examen de idioma (IELTS/CELPIP)", name: "doc_idioma", required: true },
      { label: "Evaluación de credenciales académicas (ECA)", name: "doc_eca", required: true },
      { label: "Pasaporte vigente", name: "doc_pasaporte", required: true },
      { label: "Historial laboral (referencias, cartas laborales)", name: "doc_historial_laboral", required: true },
      { label: "Carta de intención (por qué desea inmigrar)", name: "doc_carta_intencion_residencia", required: true },
      { label: "Resultados de exámenes médicos (cuando aplica)", name: "doc_examen_medico_residencia", required: false },
      { label: "Certificado de antecedentes penales", name: "doc_antecedentes", required: true },
    ],
  }

  function renderDocumentosPorVisa(tipoVisa, targetContainerId = "documentosDinamicos") {
    const contenedor = document.getElementById(targetContainerId)
    contenedor.innerHTML = ""
    if (!tipoVisa || !documentosPorVisa[tipoVisa]) {
      contenedor.innerHTML = `<div class="col-span-full text-center py-12 text-gray-500"><svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg><h3 class="text-lg font-medium text-gray-900 mb-2">Seleccione un motivo de viaje</h3><p class="text-sm">Vaya al Paso 1 y seleccione un motivo de viaje para ver los documentos requeridos</p></div>`
      return
    }
    const documentos = documentosPorVisa[tipoVisa]
    if (targetContainerId === "documentosDinamicos") {
      // Solo actualizar el contador en el modal principal
      documentosContador.textContent = `${documentos.length} documento${documentos.length !== 1 ? "s" : ""}`
    }

    for (let i = 0; i < documentos.length; i += 2) {
      const fila = document.createElement("div")
      fila.className = "grid grid-cols-1 lg:grid-cols-2 gap-4"
      fila.appendChild(
        crearElementoDocumentoSimplificado(documentos[i], i, targetContainerId === "documentosModalContent"),
      )
      if (i + 1 < documentos.length)
        fila.appendChild(
          crearElementoDocumentoSimplificado(documentos[i + 1], i + 1, targetContainerId === "documentosModalContent"),
        )
      contenedor.appendChild(fila)
    }
  }

  function crearElementoDocumentoSimplificado(doc, index, isModalContext = false) {
    const docId = doc.name
    const isRequired = doc.required
    const bloque = document.createElement("div")
    bloque.className =
      "p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-sm"
    bloque.setAttribute("data-doc-id", docId)

    bloque.innerHTML = `
  <div class="space-y-3">
    <div class="flex items-start justify-between">
      <div class="flex items-start space-x-3 flex-1">
        <span class="w-6 h-6 rounded-full bg-primary-100 text-primary-600 text-xs font-bold flex items-center justify-center mt-0.5 flex-shrink-0">${index + 1}</span>
        <div class="flex-1 min-w-0">
          <label class="block text-sm font-medium text-gray-800 leading-tight mb-1">${doc.label}</label>
          <span class="text-xs text-gray-500 flex items-center">
            <span class="${isRequired ? "text-red-500" : "text-blue-500"} mr-1 font-medium">*</span>
            ${isRequired ? "Requerido" : "Opcional"}
          </span>
        </div>
      </div>
    </div>
    <div class="space-y-3">
      <select name="${docId}_estado" id="${docId}_estado" class="w-full py-2.5 px-3 border border-gray-200 bg-white rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-200">
        <option value="">Seleccione el estado del documento</option>
        <option value="Disponible">Disponible</option>
        <option value="En proceso">En proceso</option>
        <option value="No disponible">No disponible</option>
      </select>
      <div id="${docId}_upload_area" class="hidden">
        <input type="file" name="${docId}_file_input" id="${docId}_file_input" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" class="hidden"/>
        <label for="${docId}_file_input" id="${docId}_drop_area" class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-primary-500 bg-gray-50 hover:bg-primary-50 transition-all duration-200">
          <div id="${docId}_drop_area_content" class="space-y-1 text-center">
            ${originalDropAreaContent}
          </div>
        </label>
        <!-- El span para mensajes de subida se elimina de aquí, ya que el contenido del drop_area_content lo reemplazará -->
      </div>
    </div>
  </div>
  `
    const selectEstado = bloque.querySelector(`#${docId}_estado`)
    const uploadArea = bloque.querySelector(`#${docId}_upload_area`)
    const fileInput = bloque.querySelector(`#${docId}_file_input`)
    const dropAreaLabel = bloque.querySelector(`#${docId}_drop_area`) // El label
    const dropAreaContent = bloque.querySelector(`#${docId}_drop_area_content`) // El div interno

    const triggerErrorAnimation = () => {
      dropAreaLabel.classList.add("border-red-500", "bg-red-50", "animate-shake")
      dropAreaContent.innerHTML = `<p class="text-red-500 font-medium">Archivo inválido o muy grande.</p><p class="text-xs text-red-400">Máx 10MB. Formatos: PDF, JPG, PNG, DOC, DOCX</p>`
      dropAreaContent.classList.remove("space-y-1", "text-center")
      dropAreaContent.classList.add("items-center", "justify-center", "flex", "flex-col")

      setTimeout(() => {
        dropAreaLabel.classList.remove("border-red-500", "bg-red-50", "animate-shake")
        // No restaurar el contenido aquí, se hará si el usuario intenta de nuevo o limpia
      }, 1500) // Duración de la animación + un poco más
    }

    const handleFile = (file) => {
      // Resetear estilos de error/éxito previos
      dropAreaLabel.classList.remove("border-red-500", "bg-red-50", "animate-shake", "border-green-500", "bg-green-50")
      dropAreaLabel.classList.add("border-gray-300", "bg-gray-50")
      dropAreaContent.classList.remove(
        "text-green-600",
        "text-red-600",
        "items-center",
        "justify-center",
        "flex",
        "flex-col",
        "break-all",
      )
      dropAreaContent.classList.add("space-y-1", "text-center")

      if (file) {
        const allowedTypes = [
          "application/pdf",
          "image/jpeg",
          "image/png",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ]
        if (file.size > 10 * 1024 * 1024 || !allowedTypes.includes(file.type)) {
          showNotification(
            file.size > 10 * 1024 * 1024
              ? "El archivo es demasiado grande. Máximo 10MB."
              : "Tipo de archivo no permitido.",
            "error",
          )
          fileInput.value = null
          delete filesToUploadGlobally[docId]
          triggerErrorAnimation()
          return
        }
        filesToUploadGlobally[docId] = file
        dropAreaContent.innerHTML = `
       
        <svg class="mx-auto h-10 w-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
        <p class="text-sm font-medium text-green-700 break-all">${file.name}</p>
        <p class="text-xs text-gray-500">Archivo listo para subir</p>`
        dropAreaContent.classList.remove("space-y-1", "text-center")
        dropAreaContent.classList.add("items-center", "justify-center", "flex", "flex-col", "break-all")
        dropAreaLabel.classList.add("border-green-500", "bg-green-50")
      } else {
        delete filesToUploadGlobally[docId]
        dropAreaContent.innerHTML = originalDropAreaContent // Restaurar contenido original
        dropAreaContent.classList.remove(
          "items-center",
          "justify-center",
          "flex",
          "flex-col",
          "text-green-600",
          "break-all",
        )
        dropAreaContent.classList.add("space-y-1", "text-center")
        dropAreaLabel.classList.remove("border-green-500", "bg-green-50")
      }
    }

    selectEstado.addEventListener("change", function () {
      if (this.value === "Disponible") {
        uploadArea.classList.remove("hidden")
      } else {
        uploadArea.classList.add("hidden")
       
        if (filesToUploadGlobally[docId]) {
          delete filesToUploadGlobally[docId]
          fileInput.value = null
          handleFile(null) // Para resetear la UI del drop area
        }
      }
    })

    fileInput.addEventListener("change", (event) => {
      handleFile(event.target.files && event.target.files[0] ? event.target.files[0] : null)
    })

    if (dropAreaLabel) {
      ;["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
        dropAreaLabel.addEventListener(eventName, preventDefaults, false)
        document.body.addEventListener(eventName, preventDefaults, false)
      })
      ;["dragenter", "dragover"].forEach((eventName) => {
        dropAreaLabel.addEventListener(
          eventName,
          () => {
            if (
              !dropAreaLabel.classList.contains("border-red-500") &&
              !dropAreaLabel.classList.contains("border-green-500")
            ) {
              dropAreaLabel.classList.add("border-primary-500", "bg-primary-50")
            }
          },
          false,
        )
      })
      ;["dragleave", "drop"].forEach((eventName) => {
        dropAreaLabel.addEventListener(
          eventName,
          () => {
            if (
              !dropAreaLabel.classList.contains("border-red-500") &&
              !dropAreaLabel.classList.contains("border-green-500")
            ) {
              dropAreaLabel.classList.remove("border-primary-500", "bg-primary-50")
            }
          },
          false,
        )
      })

      dropAreaLabel.addEventListener(
        "drop",
        (e) => {
          const dt = e.dataTransfer
          const files = dt.files
          if (files && files.length > 0) {
            fileInput.files = files
            handleFile(files[0])
          }
        },
        false,
      )
    }
    return bloque
  }

  function preventDefaults(e) {
    e.preventDefault()
    e.stopPropagation()
  }

  const motivoViajeSelect = document.getElementById("motivoViaje")
  if (motivoViajeSelect) {
    motivoViajeSelect.addEventListener("change", function () {
      renderDocumentosPorVisa(this.value)
    })
    // No llamar renderDocumentosPorVisa aquí, se llamará desde abrirFormularioElegibilidad
    // if (motivoViajeSelect.value) renderDocumentosPorVisa(motivoViajeSelect.value)
  }

  async function uploadSingleFileToCloudinary(docId, file, { idUsuario, idSolicitante, codigoAsesoria }) {
    const timestamp = Date.now()
    const baseFileName = `${docId}_${idSolicitante}_${codigoAsesoria}_${timestamp}`
    const cloudinaryFolder = `doc_users/doc_${idUsuario}`

    const formDataCloud = new FormData()
    formDataCloud.append("file", file)
    formDataCloud.append("upload_preset", "ml_default")
    formDataCloud.append("folder", cloudinaryFolder)
    formDataCloud.append("public_id", baseFileName)

    const dropAreaContent = document.getElementById(`${docId}_drop_area_content`)

    if (dropAreaContent) {
      dropAreaContent.innerHTML = `
     <div class="flex items-center justify-center text-blue-600">
         <svg class="animate-spin -ml-1 mr-2 h-5 w-5 border-b-2 border-white"></div><span>Subiendo ${file.name}...</p>
     </div>`
      dropAreaContent.classList.remove("space-y-1", "text-center")
      dropAreaContent.classList.add("items-center", "justify-center", "flex", "flex-col")
    }

    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/de7443iby/auto/upload", {
        method: "POST",
        body: formDataCloud,
      })
      const data = await res.json()

      if (data.secure_url) {
        if (dropAreaContent) {
          dropAreaContent.innerHTML = `

         <svg class="mx-auto h-10 w-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
         <p class="text-sm font-medium text-green-700 break-all">${file.name} subido.</p>
         <p class="text-xs text-gray-500">¡Listo!</p>`
        }
        return { docId, url: data.secure_url }
      } else {
        if (dropAreaContent) {
          dropAreaContent.innerHTML = `

         <svg class="mx-auto h-10 w-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
         <p class="text-sm font-medium text-red-700 break-all">Error al subir ${file.name}.</p>
         <p class="text-xs text-red-500">${data.error ? data.error.message : "Intente de nuevo"}</p>`
        }
        console.error("Cloudinary upload error for", docId, data)
        throw new Error(
          `Error al subir ${docId}: ${data.error ? data.error.message : "Error desconocido de Cloudinary"}`,
        )
      }
    } catch (error) {
      if (dropAreaContent) {
        dropAreaContent.innerHTML = `

        <svg class="mx-auto h-10 w-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <p class="text-sm font-medium text-red-700 break-all">Error de conexión al subir.</p>
        <p class="text-xs text-red-500">Verifique su conexión e intente de nuevo.</p>`
      }
      console.error("Network error during Cloudinary upload for", docId, error)
      throw new Error(`Error de red al subir ${docId}: ${error.message}`)
    }
  }

  async function enviarFormulario(e) {
    e.preventDefault()
    if (!validateCurrentStep()) return

    const submitButton = stepperSubmitBtn
    const originalButtonContent = submitButton.innerHTML
    submitButton.disabled = true
    submitButton.innerHTML = `<div class="relative flex items-center justify-center"><div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div><span>Procesando...</span></div>`

    try {
      const uploadPromises = []
      // Obtén los datos necesarios del DOM o de variables globales
      const idUsuarioElement = document.getElementById("id_usuario")
      const idUsuario = idUsuarioElement ? idUsuarioElement.value : "unknown_user"
      const idSolicitante = formularioElegibilidad.dataset.idSolicitante || "unknown_sol"
      const codigoAsesoria = document.getElementById("codigoAsesoria").value

      for (const docId in filesToUploadGlobally) {
        if (filesToUploadGlobally.hasOwnProperty(docId)) {
          const file = filesToUploadGlobally[docId]
          const estadoSelect = document.getElementById(`${docId}_estado`)
          if (estadoSelect && estadoSelect.value === "Disponible" && file) {
            if (
              !fileUrlsFromUpload[docId] &&
              !(document.getElementById(docId) && document.getElementById(docId).value)
            ) {
              uploadPromises.push(
                uploadSingleFileToCloudinary(docId, file, {
                  idUsuario,
                  idSolicitante,
                  codigoAsesoria,
                })
              )
            }
          }
        }
      }

      if (uploadPromises.length > 0) {
        submitButton.innerHTML = `<div class="relative flex items-center justify-center"><div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div><span>Subiendo documentos... (${uploadPromises.length})</span></div>`
        const uploadResults = await Promise.all(uploadPromises)
        uploadResults.forEach((result) => {
          if (result && result.url) {
            fileUrlsFromUpload[result.docId] = result.url
            let urlInput = document.getElementById(result.docId)
            if (!urlInput) {
              urlInput = document.createElement("input")
              urlInput.type = "hidden"
              urlInput.name = result.docId
              urlInput.id = result.docId
              formularioElegibilidad.appendChild(urlInput)
            }
            urlInput.value = result.url
          }
        })
      }

      submitButton.innerHTML = `<div class="relative flex items-center justify-center"><div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div><span>Enviando formulario...</span></div>`

      const formData = new FormData(formularioElegibilidad)
      const datos = {}
      for (const [key, value] of formData.entries()) {
        if (!key.endsWith("_file_input")) {
          datos[key] = value
        }
      }

      if (datos.terminos === "on") datos.terminos = 1
      else if (!datos.terminos) datos.terminos = 0
      if (datos.privacidad === "on") datos.privacidad = 1
      else if (!datos.privacidad) datos.privacidad = 0

      datos.codigo_asesoria = Number.parseInt(datos.codigo_asesoria)
      if (datos.tiempo_estadia_cantidad && datos.tiempo_estadia_unidad) {
        datos.tiempo_estadia = `${datos.tiempo_estadia_cantidad} ${datos.tiempo_estadia_unidad}`
        delete datos.tiempo_estadia_cantidad
        delete datos.tiempo_estadia_unidad
      }

      const finalDatos = { ...datos }
      Object.keys(datos).forEach((key) => {
        if (key.endsWith("_estado")) {
          delete finalDatos[key]
        }
      })

      const tipoVisa = document.getElementById("motivoViaje").value
      if (tipoVisa && documentosPorVisa[tipoVisa]) {
        documentosPorVisa[tipoVisa].forEach((doc) => {
          if (!finalDatos.hasOwnProperty(doc.name)) {
            finalDatos[doc.name] = null
          } else if (finalDatos[doc.name] === "" && fileUrlsFromUpload[doc.name]) {
            finalDatos[doc.name] = fileUrlsFromUpload[doc.name]
          } else if (!fileUrlsFromUpload[doc.name] && !finalDatos[doc.name]) {
            finalDatos[doc.name] = null
          }
          const estadoSelect = document.getElementById(`${doc.name}_estado`)
          if (estadoSelect && estadoSelect.value !== "Disponible") {
            finalDatos[doc.name] = null
          }
        })
      }

      console.log("Enviando datos finales:", finalDatos)

      const response = await fetch("/formularios/procesar_elegibilidad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalDatos),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }))
        throw new Error(`Error ${response.status}: ${errorData.message || "Error desconocido del servidor"}`)
      }
      const result = await response.json()

      if (result.success) {
        showStep(totalSteps)
        showNotification("¡Formulario enviado exitosamente! Su información ha sido procesada correctamente.", "success")
        cargarAsesoriasPagadas()

        // Clear saved data from localStorage on successful submission
        const codigoAsesoria = document.getElementById("codigoAsesoria").value
        if (codigoAsesoria) {
          localStorage.removeItem(`form_data_${codigoAsesoria}`)
          console.log(`Form data for ${codigoAsesoria} cleared from localStorage.`)
        }

        setTimeout(() => cerrarModalFormulario(), 5000)
      } else {
        showNotification("Error al enviar el formulario: " + (result.message || "Error desconocido."), "error")
      }
    } catch (error) {
      console.error("Error detallado en enviarFormulario:", error)
      showNotification(`Error al procesar el formulario: ${error.message}`, "error")
    } finally {
      submitButton.disabled = false
      submitButton.innerHTML = originalButtonContent
    }
  }

  // --- Lógica para el nuevo modal de documentos faltantes ---
  window.abrirModalDocumentosFaltantes = async (buttonElement, codigoAsesoria, motivoViaje) => {
    const documentosModal = document.getElementById("documentosFaltantesModal")
    const cerrarBtn = documentosModal.querySelector("#cerrarDocumentosModal")
    const submitBtn = documentosModal.querySelector("#submitDocumentosModal")
    const modalContentContainer = documentosModal.querySelector("#documentosModalContent")
    const motivoViajeSpan = documentosModal.querySelector("#modalMotivoViaje")

    const originalButtonContent = buttonElement.innerHTML
    buttonElement.disabled = true
    buttonElement.innerHTML = `<div class="relative flex items-center justify-center"><div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div><span>Cargando...</span></div>`

    currentCodigoAsesoria = codigoAsesoria
    filesToUploadGlobally = {} // Limpiar archivos para el nuevo modal
    fileUrlsFromUpload = {} // Limpiar URLs

    // Asigna eventos cada vez que se abre el modal
    if (cerrarBtn) cerrarBtn.onclick = cerrarModalDocumentosFaltantes
    if (submitBtn) submitBtn.onclick = enviarDocumentosFaltantes
    documentosModal.onclick = (e) => {
      if (e.target === documentosModal) cerrarModalDocumentosFaltantes()
    }

    try {
      // Obtener documentos faltantes y renderizarlos
      const { documentos_faltantes, motivo_viaje } = await verificarEstadoDocumentos(codigoAsesoria)
      if (motivoViajeSpan) motivoViajeSpan.textContent = motivo_viaje || motivoViaje || ""
      modalContentContainer.innerHTML = "" // Limpiar contenido previo

      if (documentos_faltantes.length === 0) {
        modalContentContainer.innerHTML = `
        <div class="col-span-full text-center py-12 text-gray-500">
            <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-2">¡Todos los documentos requeridos están adjuntos!</h3>
            <p class="text-sm">Puede cerrar esta ventana.</p>
        </div>
      `
        if (submitBtn) submitBtn.classList.add("hidden")
      } else {
        if (submitBtn) submitBtn.classList.remove("hidden")
        for (let i = 0; i < documentos_faltantes.length; i += 2) {
          const fila = document.createElement("div")
          fila.className = "grid grid-cols-1 lg:grid-cols-2 gap-4"
          fila.appendChild(crearElementoDocumentoSimplificado(documentos_faltantes[i], i, true))
          if (i + 1 < documentos_faltantes.length)
            fila.appendChild(crearElementoDocumentoSimplificado(documentos_faltantes[i + 1], i + 1, true))
          modalContentContainer.appendChild(fila)
        }
        // Asegurarse de que los select de estado estén en "Disponible" por defecto para los faltantes
        documentos_faltantes.forEach((doc) => {
          const select = modalContentContainer.querySelector(`#${doc.name}_estado`)
          if (select) {
            select.value = "Disponible"
            select.dispatchEvent(new Event("change")) // Trigger change to show upload area
          }
        })
      }

      documentosModal.classList.remove("hidden")
      documentosModal.classList.add("flex")
      document.body.style.overflow = "hidden"
      const modalContent = documentosModal.querySelector(".bg-white")
      if (modalContent) modalContent.classList.add("animate-scale-in")
    } catch (error) {
      console.error("Error al abrir modal de documentos faltantes:", error)
      showNotification("Error al cargar los documentos faltantes.", "error")
    } finally {
      buttonElement.disabled = false
      buttonElement.innerHTML = originalButtonContent
    }
  }

  function cerrarModalDocumentosFaltantes() {
    const documentosModal = document.getElementById("documentosFaltantesModal")
    const modalContent = documentosModal.querySelector(".bg-white")
    if (modalContent) modalContent.classList.add("opacity-0", "scale-95", "transition-all", "duration-300")
    setTimeout(() => {
      documentosModal.classList.remove("flex")
      documentosModal.classList.add("hidden")
      document.body.style.overflow = "auto"
      // Limpiar el contenido del modal y resetear estados
      const modalContentContainer = documentosModal.querySelector("#documentosModalContent")
      if (modalContentContainer) modalContentContainer.innerHTML = ""
      filesToUploadGlobally = {}
      fileUrlsFromUpload = {}
      currentCodigoAsesoria = null
      if (modalContent) modalContent.classList.remove("opacity-0", "scale-95", "transition-all", "duration-300")
    }, 300)
  }

  async function enviarDocumentosFaltantes() {
    const submitButton = document.getElementById("submitDocumentosModal")
    const originalButtonContent = submitButton.innerHTML
    submitButton.disabled = true
    submitButton.innerHTML = `<div class="relative flex items-center justify-center"><div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div><span>Procesando...</span></div>`

    try {
      const uploadPromises = []
      const documentosAActualizar = {}

      // Obtén los datos necesarios del DOM o de variables globales
      const idUsuarioElement = document.getElementById("id_usuario")
      const idUsuario = idUsuarioElement ? idUsuarioElement.value : "unknown_user"
      const idSolicitante = formularioElegibilidad.dataset.idSolicitante || "unknown_sol"
      const codigoAsesoria = document.getElementById("codigoAsesoria").value

      const allDocElements = document.querySelectorAll("#documentosModalContent [data-doc-id]")
      for (const docElement of allDocElements) {
        const docId = docElement.getAttribute("data-doc-id")
        const estadoSelect = docElement.querySelector(`#${docId}_estado`)
        const fileInput = docElement.querySelector(`#${docId}_file_input`)

        if (estadoSelect && estadoSelect.value === "Disponible" && filesToUploadGlobally[docId]) {
          // Pasa los datos explícitamente
          uploadPromises.push(
            uploadSingleFileToCloudinary(docId, filesToUploadGlobally[docId], {
              idUsuario,
              idSolicitante,
              codigoAsesoria,
            })
          )
        } else if (estadoSelect && estadoSelect.value === "No disponible") {
          documentosAActualizar[docId] = null // Marcar como nulo si el usuario lo pone como no disponible
        }
      }

      if (uploadPromises.length > 0) {
        submitButton.innerHTML = `<div class="relative flex items-center justify-center"><div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div><span>Subiendo documentos... (${uploadPromises.length})</span></div>`
        const uploadResults = await Promise.all(uploadPromises)
        uploadResults.forEach((result) => {
          if (result && result.url) {
            documentosAActualizar[result.docId] = result.url
          }
        })
      }

      if (Object.keys(documentosAActualizar).length === 0) {
        showNotification("No hay documentos para actualizar.", "warning")
        return
      }

      submitButton.innerHTML = `<div class="relative flex items-center justify-center"><div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div><span>Actualizando formulario...</span></div>`

      const response = await fetch("/formularios/actualizar_documentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo_asesoria: currentCodigoAsesoria,
          ...documentosAActualizar,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }))
        throw new Error(`Error ${response.status}: ${errorData.message || "Error desconocido del servidor"}`)
      }
      const result = await response.json()

      if (result.success) {
        showNotification("¡Documentos actualizados exitosamente!", "success")
        cargarAsesoriasPagadas() // Recargar las tarjetas para reflejar el nuevo estado
        cerrarModalDocumentosFaltantes()
      } else {
        showNotification("Error al actualizar documentos: " + (result.message || "Error desconocido."), "error")
      }
    } catch (error) {
      console.error("Error detallado en enviarDocumentosFaltantes:", error)
      showNotification(`Error al procesar la actualización: ${error.message}`, "error")
    } finally {
      submitButton.disabled = false
      submitButton.innerHTML = originalButtonContent
    }
  }

  function getTipoVisaClave() {
    // Usa el valor real guardado en el dataset
    const motivoViajeInput = document.getElementById("motivoViaje")
    return motivoViajeInput && motivoViajeInput.dataset.realValue
      ? motivoViajeInput.dataset.realValue
      : (motivoViajeInput ? motivoViajeInput.value.trim() : "")
  }

  // Llama a esta función cada vez que debas renderizar los documentos (por ejemplo, al mostrar el paso 4)
  function renderDocumentosPaso4() {
    const tipoVisaClave = getTipoVisaClave()
    console.log("Clave real para documentos:", tipoVisaClave)
    renderDocumentosPorVisa(tipoVisaClave)
  }
})
