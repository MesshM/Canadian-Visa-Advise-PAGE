document.addEventListener("DOMContentLoaded", () => {
  // Modal Crear Asesoría
  const btnAbrirCrear = document.getElementById("btnAbrirCrearAsesoria")
  const modalCrear = document.getElementById("modalCrearAsesoria")
  const formCrear = document.getElementById("formCrearAsesoria")

  if (btnAbrirCrear && modalCrear) {
    btnAbrirCrear.onclick = () => modalCrear.classList.remove("hidden")
  }

  window.cerrarModalCrearAsesoria = () => {
    modalCrear.classList.add("hidden")
  }

  if (formCrear) {
    formCrear.onsubmit = async (e) => {
      e.preventDefault()
      const formData = new FormData(formCrear)
      const data = {}
      formData.forEach((v, k) => (data[k] = v))

      try {
        const resp = await fetch("/admin/asesorias/crear", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })

        if (resp.ok) {
          location.reload()
        } else {
          const error = await resp.json()
          alert("Error al crear asesoría: " + (error.error || "Error desconocido"))
        }
      } catch (error) {
        alert("Error de conexión: " + error.message)
      }
    }
  }

  // Modal Ver Asesoría - MEJORADO
  window.abrirModalVerAsesoria = (id) => {
    const modal = document.getElementById("modalVerAsesoria")
    const contenido = document.getElementById("contenidoVerAsesoria")

    // Mostrar loading
    contenido.innerHTML =
      '<div class="text-center py-4"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div><p class="mt-2 text-gray-600">Cargando...</p></div>'
    modal.classList.remove("hidden")

    fetch(`/admin/asesorias/${id}/ver`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Error al cargar la asesoría")
        }
        return response.json()
      })
      .then((data) => {
        if (data.success && data.asesoria) {
          const asesoria = data.asesoria
          const pagos = data.pagos || []

          const html = `
                        <div class="space-y-6">
                            <!-- Información General -->
                            <div class="bg-gray-50 p-4 rounded-lg">
                                <h3 class="text-lg font-semibold text-gray-900 mb-3">Información General</h3>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Código de Asesoría</label>
                                        <p class="mt-1 text-sm text-gray-900 font-mono">${asesoria.codigo_asesoria || "N/A"}</p>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Tipo de Asesoría</label>
                                        <p class="mt-1 text-sm text-gray-900">${asesoria.tipo_asesoria || "N/A"}</p>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Fecha de Asesoría</label>
                                        <p class="mt-1 text-sm text-gray-900">${asesoria.fecha_asesoria_formatted || "Por programar"}</p>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Lugar</label>
                                        <p class="mt-1 text-sm text-gray-900">${asesoria.lugar || "N/A"}</p>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Estado</label>
                                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${window.getEstadoClass(asesoria.estado)}">${asesoria.estado || "N/A"}</span>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Estado del Proceso</label>
                                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${window.getEstadoProcesoClass(asesoria.estado_proceso)}">${asesoria.estado_proceso || "N/A"}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Información del Cliente -->
                            <div class="bg-blue-50 p-4 rounded-lg">
                                <h3 class="text-lg font-semibold text-gray-900 mb-3">Información del Cliente</h3>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Nombre Completo</label>
                                        <p class="mt-1 text-sm text-gray-900">${asesoria.cliente_nombre || "N/A"}</p>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Correo Electrónico</label>
                                        <p class="mt-1 text-sm text-gray-900">${asesoria.cliente_correo || "N/A"}</p>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Teléfono</label>
                                        <p class="mt-1 text-sm text-gray-900">${asesoria.cliente_telefono || "N/A"}</p>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Fecha de Nacimiento</label>
                                        <p class="mt-1 text-sm text-gray-900">${asesoria.cliente_fecha_nacimiento_formatted || "N/A"}</p>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Tipo de Documento</label>
                                        <p class="mt-1 text-sm text-gray-900">${asesoria.tipo_documento || "N/A"}</p>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Número de Documento</label>
                                        <p class="mt-1 text-sm text-gray-900 font-mono">${asesoria.numero_documento || "N/A"}</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Información del Asesor -->
                            <div class="bg-green-50 p-4 rounded-lg">
                                <h3 class="text-lg font-semibold text-gray-900 mb-3">Información del Asesor</h3>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Asesor Asignado</label>
                                        <p class="mt-1 text-sm text-gray-900">${asesoria.asesor_asignado || asesoria.asesor_nombre || "Sin asignar"}</p>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Correo del Asesor</label>
                                        <p class="mt-1 text-sm text-gray-900">${asesoria.asesor_correo || "N/A"}</p>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Especialidad</label>
                                        <p class="mt-1 text-sm text-gray-900">${asesoria.especialidad || "N/A"}</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Descripción -->
                            ${
                              asesoria.descripcion
                                ? `
                            <div class="bg-yellow-50 p-4 rounded-lg">
                                <h3 class="text-lg font-semibold text-gray-900 mb-3">Descripción</h3>
                                <p class="text-sm text-gray-900">${asesoria.descripcion}</p>
                            </div>
                            `
                                : ""
                            }

                            <!-- Información de Pagos -->
                            ${
                              pagos.length > 0
                                ? `
                            <div class="bg-purple-50 p-4 rounded-lg">
                                <h3 class="text-lg font-semibold text-gray-900 mb-3">Historial de Pagos</h3>
                                <div class="space-y-2">
                                    ${pagos
                                      .map(
                                        (pago) => `
                                        <div class="flex justify-between items-center p-2 bg-white rounded border">
                                            <div>
                                                <p class="text-sm font-medium">$${pago.monto} - ${pago.metodo_pago}</p>
                                                <p class="text-xs text-gray-500">${pago.referencia_pago || "Sin referencia"}</p>
                                            </div>
                                            <span class="px-2 py-1 text-xs font-semibold rounded-full ${window.getPagoEstadoClass(pago.estado_pago)}">${pago.estado_pago}</span>
                                        </div>
                                    `,
                                      )
                                      .join("")}
                                </div>
                            </div>
                            `
                                : ""
                            }

                            <!-- Información de Sistema -->
                            <div class="bg-gray-100 p-4 rounded-lg">
                                <h3 class="text-lg font-semibold text-gray-900 mb-3">Información del Sistema</h3>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Fecha de Creación</label>
                                        <p class="mt-1 text-sm text-gray-900">${asesoria.fecha_creacion_formatted || "N/A"}</p>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Número de Asesoría</label>
                                        <p class="mt-1 text-sm text-gray-900">${asesoria.numero_asesoria || "N/A"}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `

          contenido.innerHTML = html
        } else {
          contenido.innerHTML =
            '<div class="text-center py-4 text-red-600">No se pudo cargar la información de la asesoría</div>'
        }
      })
      .catch((error) => {
        console.error("Error:", error)
        contenido.innerHTML =
          '<div class="text-center py-4 text-red-600">Error al cargar la asesoría: ' + error.message + "</div>"
      })
  }

  window.cerrarModalVerAsesoria = () => {
    document.getElementById("modalVerAsesoria").classList.add("hidden")
  }

  // Modal Editar Asesoría - MEJORADO
  window.abrirModalEditarAsesoria = (id) => {
    const modal = document.getElementById("modalEditarAsesoria")
    const contenido = document.getElementById("contenidoEditarAsesoria")

    // Mostrar loading
    contenido.innerHTML =
      '<div class="text-center py-4"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div><p class="mt-2 text-gray-600">Cargando...</p></div>'
    modal.classList.remove("hidden")

    fetch(`/admin/asesorias/${id}/ver`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Error al cargar la asesoría")
        }
        return response.json()
      })
      .then((data) => {
        if (data.success && data.asesoria) {
          const asesoria = data.asesoria

          const html = `
                        <div class="space-y-4">
                            <!-- Campos no editables -->
                            <div class="bg-gray-50 p-3 rounded">
                                <div class="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span class="font-medium text-gray-700">Código:</span>
                                        <span class="ml-2 font-mono">${asesoria.codigo_asesoria}</span>
                                    </div>
                                    <div>
                                        <span class="font-medium text-gray-700">Cliente:</span>
                                        <span class="ml-2">${asesoria.cliente_nombre || "N/A"}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Campos editables -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Tipo de Asesoría</label>
                                    <select name="tipo_asesoria" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
                                        <option value="Visa de Trabajo" ${asesoria.tipo_asesoria === "Visa de Trabajo" ? "selected" : ""}>Visa de Trabajo</option>
                                        <option value="Visa de Turista" ${asesoria.tipo_asesoria === "Visa de Turista" ? "selected" : ""}>Visa de Turista</option>
                                        <option value="Visa de Estudiante" ${asesoria.tipo_asesoria === "Visa de Estudiante" ? "selected" : ""}>Visa de Estudiante</option>
                                        <option value="Residencia Permanente" ${asesoria.tipo_asesoria === "Residencia Permanente" ? "selected" : ""}>Residencia Permanente</option>
                                        <option value="Reunificación Familiar" ${asesoria.tipo_asesoria === "Reunificación Familiar" ? "selected" : ""}>Reunificación Familiar</option>
                                    </select>
                                </div>

                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Fecha y Hora</label>
                                    <input type="datetime-local" name="fecha_asesoria" 
                                           value="${asesoria.fecha_asesoria ? new Date(asesoria.fecha_asesoria).toISOString().slice(0, 16) : ""}"
                                           class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                </div>

                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Lugar</label>
                                    <select name="lugar" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
                                        <option value="Virtual (Zoom)" ${asesoria.lugar === "Virtual (Zoom)" ? "selected" : ""}>Virtual (Zoom)</option>
                                        <option value="Presencial" ${asesoria.lugar === "Presencial" ? "selected" : ""}>Presencial</option>
                                        <option value="Telefónica" ${asesoria.lugar === "Telefónica" ? "selected" : ""}>Telefónica</option>
                                    </select>
                                </div>

                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                                    <select name="estado" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
                                        <option value="Pendiente" ${asesoria.estado === "Pendiente" ? "selected" : ""}>Pendiente</option>
                                        <option value="Confirmada" ${asesoria.estado === "Confirmada" ? "selected" : ""}>Confirmada</option>
                                        <option value="En Proceso" ${asesoria.estado === "En Proceso" ? "selected" : ""}>En Proceso</option>
                                        <option value="Completada" ${asesoria.estado === "Completada" ? "selected" : ""}>Completada</option>
                                        <option value="Cancelada" ${asesoria.estado === "Cancelada" ? "selected" : ""}>Cancelada</option>
                                    </select>
                                </div>

                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Estado del Proceso</label>
                                    <select name="estado_proceso" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
                                        <option value="Pendiente" ${asesoria.estado_proceso === "Pendiente" ? "selected" : ""}>Pendiente</option>
                                        <option value="Proceso activo" ${asesoria.estado_proceso === "Proceso activo" ? "selected" : ""}>Proceso activo</option>
                                        <option value="Terminado" ${asesoria.estado_proceso === "Terminado" ? "selected" : ""}>Terminado</option>
                                    </select>
                                </div>

                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Asesor Asignado</label>
                                    <input type="text" name="asesor_asignado" 
                                           value="${asesoria.asesor_asignado || ""}"
                                           class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                </div>

                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Tipo de Documento</label>
                                    <select name="tipo_documento" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
                                        <option value="C.C" ${asesoria.tipo_documento === "C.C" ? "selected" : ""}>Cédula de Ciudadanía</option>
                                        <option value="C.E" ${asesoria.tipo_documento === "C.E" ? "selected" : ""}>Cédula de Extranjería</option>
                                        <option value="Pasaporte" ${asesoria.tipo_documento === "Pasaporte" ? "selected" : ""}>Pasaporte</option>
                                    </select>
                                </div>

                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Número de Documento</label>
                                    <input type="text" name="numero_documento" 
                                           value="${asesoria.numero_documento || ""}"
                                           class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                </div>
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Especialidad</label>
                                <input type="text" name="especialidad" 
                                       value="${asesoria.especialidad || ""}"
                                       class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                                <textarea name="descripcion" rows="3" 
                                          class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">${asesoria.descripcion || ""}</textarea>
                            </div>
                        </div>
                    `

          contenido.innerHTML = html

          // Configurar el submit del formulario
          const formEditar = document.getElementById("formEditarAsesoria")
          formEditar.onsubmit = (e) => {
            e.preventDefault()

            const formData = new FormData(formEditar)
            const obj = {}
            for (const [k, v] of formData.entries()) {
              obj[k] = v
            }

            // Mostrar loading en el botón
            const btnGuardar = formEditar.querySelector('button[type="submit"]')
            const textoOriginal = btnGuardar.textContent
            btnGuardar.textContent = "Guardando..."
            btnGuardar.disabled = true

            fetch(`/admin/asesorias/${id}/editar`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(obj),
            })
              .then((response) => {
                if (!response.ok) {
                  throw new Error("Error al actualizar")
                }
                return response.json()
              })
              .then((data) => {
                if (data.success) {
                  alert("Asesoría actualizada exitosamente")
                  location.reload()
                } else {
                  throw new Error(data.error || "Error desconocido")
                }
              })
              .catch((error) => {
                alert("Error al editar asesoría: " + error.message)
                btnGuardar.textContent = textoOriginal
                btnGuardar.disabled = false
              })
          }
        } else {
          contenido.innerHTML =
            '<div class="text-center py-4 text-red-600">No se pudo cargar la información de la asesoría</div>'
        }
      })
      .catch((error) => {
        console.error("Error:", error)
        contenido.innerHTML =
          '<div class="text-center py-4 text-red-600">Error al cargar la asesoría: ' + error.message + "</div>"
      })
  }

  window.cerrarModalEditarAsesoria = () => {
    document.getElementById("modalEditarAsesoria").classList.add("hidden")
  }

  // Modal Eliminar Asesoría - CORREGIDO
  let codigoEliminar = null
  window.abrirModalEliminarAsesoria = (codigo) => {
    console.log("DEBUG JS: Función abrirModalEliminarAsesoria llamada con:", codigo, "tipo:", typeof codigo)
    codigoEliminar = Number.parseInt(codigo) // Asegurar que sea un número
    console.log("DEBUG JS: codigoEliminar asignado:", codigoEliminar, "tipo:", typeof codigoEliminar)
    document.getElementById("modalEliminarAsesoria").classList.remove("hidden")
  }

  window.cerrarModalEliminarAsesoria = () => {
    document.getElementById("modalEliminarAsesoria").classList.add("hidden")
    codigoEliminar = null
  }

  const btnEliminar = document.getElementById("btnConfirmarEliminarAsesoria")
  if (btnEliminar) {
    btnEliminar.onclick = () => {
      console.log("DEBUG JS: Botón eliminar clickeado, codigoEliminar:", codigoEliminar)

      if (!codigoEliminar) {
        alert("Error: No se ha seleccionado una asesoría para eliminar")
        return
      }

      // Mostrar loading
      const textoOriginal = btnEliminar.textContent
      btnEliminar.textContent = "Eliminando..."
      btnEliminar.disabled = true

      const url = `/admin/asesorias/${codigoEliminar}/eliminar`
      console.log("DEBUG JS: URL de eliminación:", url)

      const payload = { motivo: "Eliminada por administrador" }
      console.log("DEBUG JS: Payload:", payload)

      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      })
        .then((response) => {
          console.log("DEBUG JS: Respuesta recibida:", response.status, response.statusText)
          console.log("DEBUG JS: Headers de respuesta:", [...response.headers.entries()])

          if (!response.ok) {
            return response.text().then((text) => {
              console.log("DEBUG JS: Texto de error:", text)
              throw new Error(`Error HTTP: ${response.status} - ${text}`)
            })
          }
          return response.json()
        })
        .then((data) => {
          console.log("DEBUG JS: Datos recibidos:", data)
          if (data.success) {
            alert("Asesoría eliminada exitosamente")
            location.reload()
          } else {
            throw new Error(data.error || "Error desconocido")
          }
        })
        .catch((error) => {
          console.error("DEBUG JS: Error completo:", error)
          alert("Error al eliminar asesoría: " + error.message)
          btnEliminar.textContent = textoOriginal
          btnEliminar.disabled = false
        })
    }
  }

  // Funciones auxiliares para clases CSS
  window.getEstadoClass = (estado) => {
    const clases = {
      Pendiente: "bg-yellow-100 text-yellow-800",
      Confirmada: "bg-blue-100 text-blue-800",
      "En Proceso": "bg-purple-100 text-purple-800",
      Completada: "bg-green-100 text-green-800",
      Cancelada: "bg-red-100 text-red-800",
    }
    return clases[estado] || "bg-gray-100 text-gray-800"
  }

  window.getEstadoProcesoClass = (estado) => {
    const clases = {
      Pendiente: "bg-yellow-100 text-yellow-800",
      "Proceso activo": "bg-blue-100 text-blue-800",
      Terminado: "bg-green-100 text-green-800",
    }
    return clases[estado] || "bg-gray-100 text-gray-800"
  }

  window.getPagoEstadoClass = (estado) => {
    const clases = {
      Pendiente: "bg-yellow-100 text-yellow-800",
      Completado: "bg-green-100 text-green-800",
      Cancelado: "bg-red-100 text-red-800",
    }
    return clases[estado] || "bg-gray-100 text-gray-800"
  }
})
