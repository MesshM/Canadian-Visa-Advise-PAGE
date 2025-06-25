document.addEventListener('DOMContentLoaded', function () {
    // Toast notification helper
    function showToast(message, type = "success") {
        let container = document.getElementById("toast-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "toast-container";
            container.className = "fixed top-6 right-6 z-[9999] space-y-2";
            document.body.appendChild(container);
        }
        const toast = document.createElement("div");
        toast.className = `flex items-center px-4 py-3 rounded shadow text-white transition-opacity duration-500 ${
            type === "success"
                ? "bg-green-600"
                : type === "error"
                ? "bg-red-600"
                : type === "info"
                ? "bg-blue-600"
                : "bg-gray-800"
        }`;
        toast.innerHTML = `
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                ${
                    type === "success"
                        ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />'
                        : type === "error"
                        ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />'
                        : type === "info"
                        ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />'
                        : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />'
                }
            </svg>
            <span>${message}</span>
        `;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add("opacity-0");
            setTimeout(() => {
                if (container.contains(toast)) {
                    container.removeChild(toast);
                }
            }, 500);
        }, 3000);
    }

    // Loading indicator
    let loadingIndicator = document.getElementById("loading-indicator");
    if (!loadingIndicator) {
        loadingIndicator = document.createElement("div");
        loadingIndicator.id = "loading-indicator";
        loadingIndicator.className = "hidden text-center py-4";
        loadingIndicator.innerHTML = `
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p class="mt-2 text-gray-600">Filtrando pagos...</p>
        `;
        document.body.appendChild(loadingIndicator);
    }

    // Filtros automáticos por columna (frontend)
    const searchCliente = document.getElementById('searchCliente');
    const filterMetodo = document.getElementById('filterMetodo');
    const filterEstado = document.getElementById('filterEstado');
    const filterFechaInicio = document.getElementById('filterFechaInicio');
    const pagosTableBody = document.getElementById('pagosTableBody');

    function normalizar(str) {
        return (str || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    function filtrarTablaPagos() {
        loadingIndicator.classList.remove("hidden");
        setTimeout(() => {
            const buscar = normalizar(searchCliente.value);
            const metodo = filterMetodo.value;
            const estado = filterEstado.value;
            const fecha = filterFechaInicio.value;

            Array.from(pagosTableBody.querySelectorAll('tr')).forEach(tr => {
                // Si es la fila de "No hay pagos registrados", siempre mostrarla si no hay resultados
                if (tr.querySelector('td[colspan]')) {
                    tr.style.display = '';
                    return;
                }
                let mostrar = true;

                // Cliente (nombre o correo)
                if (buscar) {
                    const cliente = normalizar(tr.querySelector('td:nth-child(2) .text-sm.font-medium')?.textContent) + ' ' +
                                    normalizar(tr.querySelector('td:nth-child(2) .text-sm.text-gray-500')?.textContent);
                    if (!cliente.includes(buscar)) mostrar = false;
                }

                // Método de pago
                if (metodo) {
                    const metodoTd = tr.querySelector('td:nth-child(5)');
                    if (!metodoTd || metodoTd.textContent.trim() !== metodo) mostrar = false;
                }

                // Estado
                if (estado) {
                    const estadoSpan = tr.querySelector('td:nth-child(7) span');
                    if (!estadoSpan || estadoSpan.textContent.trim() !== estado) mostrar = false;
                }

                // Fecha
                if (fecha) {
                    const fechaTd = tr.querySelector('td:nth-child(6)');
                    if (!fechaTd) {
                        mostrar = false;
                    } else {
                        // Extraer fecha en formato yyyy-mm-dd
                        const texto = fechaTd.textContent.trim();
                        const match = texto.match(/(\d{2})\/(\d{2})\/(\d{4})/);
                        if (match) {
                            const fechaPago = `${match[3]}-${match[2]}-${match[1]}`;
                            if (fechaPago !== fecha) mostrar = false;
                        } else {
                            mostrar = false;
                        }
                    }
                }

                tr.style.display = mostrar ? '' : 'none';
            });

            // Mostrar/ocultar la fila de "No hay pagos registrados"
            const visibles = Array.from(pagosTableBody.querySelectorAll('tr')).filter(tr => tr.style.display !== 'none' && !tr.querySelector('td[colspan]'));
            const filaVacia = pagosTableBody.querySelector('tr td[colspan]');
            if (filaVacia) {
                filaVacia.parentElement.style.display = visibles.length === 0 ? '' : 'none';
            }

            loadingIndicator.classList.add("hidden");
        }, 150); // Simula carga breve
    }

    [searchCliente, filterMetodo, filterEstado, filterFechaInicio].forEach(el => {
        if (el) {
            el.addEventListener('input', filtrarTablaPagos);
            el.addEventListener('change', filtrarTablaPagos);
        }
    });

    // Seleccionar todos
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        selectAll.addEventListener('change', function () {
            document.querySelectorAll('input[name="pago_ids"]').forEach(cb => {
                cb.checked = selectAll.checked;
            });
        });
    }

    // Acciones de pago (aprobar, rechazar, ver detalles, editar, recibo)
    document.getElementById('pagosTableBody').addEventListener('click', async function (e) {
        const btn = e.target.closest('button[data-pago-id]');
        if (!btn) return;
        const pagoId = btn.getAttribute('data-pago-id');
        const action = btn.getAttribute('data-action');

        if (action === 'approve') {
            if (!confirm('¿Aprobar este pago?')) return;
            await cambiarEstadoPago(pagoId, 'Completado');
        }
        if (action === 'reject') {
            if (!confirm('¿Rechazar este pago?')) return;
            await cambiarEstadoPago(pagoId, 'Cancelado');
        }
        if (action === 'edit') {
            mostrarEditarPago(pagoId);
        }
        if (action === 'receipt') {
            descargarRecibo(pagoId);
        }
        if (action === 'view') {
            mostrarDetallesPago(pagoId);
        }
    });

    async function cambiarEstadoPago(id, estado) {
        try {
            showToast("Procesando...", "info");
            const resp = await fetch(`/admin/pagos/${id}/cambiar-estado`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado })
            });
            const data = await resp.json();
            if (data.success) {
                showToast(data.mensaje, "success");
                window.location.reload();
            } else {
                showToast(data.error || 'Error al cambiar estado', "error");
            }
        } catch (err) {
            showToast('Error de red', "error");
        }
    }

    // Modal de detalles y acciones
    const modal = document.getElementById('modalPago');
    const modalContent = document.getElementById('modalPagoContent');
    const modalActions = document.getElementById('modalPagoActions');
    const cerrarModal = document.getElementById('cerrarModalPago');

    function abrirModalPago(pago) {
        modalContent.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <b>Cliente:</b> ${pago.cliente_nombre || 'N/A'}<br>
                    <span class="text-gray-500">${pago.cliente_correo || ''}</span>
                </div>
                <div>
                    <b>Asesoría:</b> ${pago.tipo_asesoria || 'N/A'}<br>
                    <span class="text-gray-500">Código: ${pago.codigo_asesoria || 'N/A'}</span>
                </div>
                <div>
                    <b>Monto:</b> $${pago.monto || '0.00'}
                </div>
                <div>
                    <b>Método:</b> ${pago.metodo_pago || 'N/A'}
                </div>
                <div>
                    <b>Fecha:</b> ${pago.fecha_pago ? new Date(pago.fecha_pago).toLocaleString() : 'N/A'}
                </div>
                <div>
                    <b>Estado:</b> ${pago.estado_pago || 'Pendiente'}
                </div>
                <div>
                    <b>Referencia:</b> ${pago.referencia_pago || 'N/A'}
                </div>
                <div>
                    <b>Nota interna:</b> <span id="notaPagoText">${pago.datos_adicionales || ''}</span>
                    <button class="ml-2 text-blue-600 underline" onclick="editarNotaPago('${pago.id_pago}')">Editar</button>
                </div>
            </div>
        `;

        let acciones = [];
        // Solo mostrar aprobar/rechazar si está pendiente
        if (pago.estado_pago === 'Pendiente') {
            acciones.push(`<button class="px-3 py-1 bg-green-600 text-white rounded" onclick="aprobarPagoModal('${pago.id_pago}')">Aprobar</button>`);
            acciones.push(`<button class="px-3 py-1 bg-red-600 text-white rounded" onclick="rechazarPagoModal('${pago.id_pago}')">Rechazar</button>`);
        }
        modalActions.innerHTML = acciones.join(' ');

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    function cerrarModalPago() {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    cerrarModal.addEventListener('click', cerrarModalPago);
    modal.addEventListener('click', function (e) {
        if (e.target === modal) cerrarModalPago();
    });

    window.aprobarPagoModal = async function (id) {
        await cambiarEstadoPago(id, 'Completado');
        cerrarModalPago();
    };
    window.rechazarPagoModal = async function (id) {
        await cambiarEstadoPago(id, 'Cancelado');
        cerrarModalPago();
    };
    window.editarPagoModal = function (id) {
        mostrarEditarPago(id);
        cerrarModalPago();
    };

    async function mostrarDetallesPago(id) {
        try {
            showToast("Cargando detalles...", "info");
            const resp = await fetch(`/admin/pagos/${id}/detalles`);
            const data = await resp.json();
            if (data.success) {
                abrirModalPago(data.pago);
            } else {
                showToast(data.error || 'No se pudo obtener detalles', "error");
            }
        } catch (err) {
            showToast('Error de red', "error");
        }
    }

    // Actualiza la nota en el modal tras editar
    window.editarNotaPago = async function (id) {
        const nota = prompt('Ingrese la nota interna para este pago:');
        if (nota === null) return;
        try {
            showToast("Guardando nota...", "info");
            const resp = await fetch(`/admin/pagos/${id}/nota`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nota })
            });
            const data = await resp.json();
            if (data.success) {
                document.getElementById('notaPagoText').textContent = nota;
                showToast("Nota guardada", "success");
            } else {
                showToast(data.error || 'Error al guardar nota', "error");
            }
        } catch (err) {
            showToast('Error de red', "error");
        }
    };

    // Descargar recibo PDF
    window.descargarRecibo = function (id) {
        window.open(`/admin/pagos/${id}/recibo`, '_blank');
    };

    // Exportar todos los pagos a PDF
    window.exportarPagosPDF = async function () {
        try {
            showToast("Generando PDF...", "info");
            const resp = await fetch('/admin/pagos/exportar-todos-pdf');
            if (!resp.ok) throw new Error('No se pudo generar el PDF');
            const blob = await resp.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `pagos_reporte_${new Date().toISOString().slice(0, 10)}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            showToast("PDF generado exitosamente", "success");
        } catch (err) {
            showToast('Error al exportar PDF', "error");
        }
    };

    // Modal de edición de pago
    let modalEditarPago = null;
    let formEditarPago = null;

    function crearModalEditarPago() {
        if (document.getElementById('modalEditarPago')) return;
        const modal = document.createElement('div');
        modal.id = 'modalEditarPago';
        modal.className = 'fixed inset-0 z-50 flex justify-center items-center bg-black/30 hidden';
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
                <button id="cerrarModalEditarPago" class="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">&times;</button>
                <h2 class="text-xl font-bold mb-4">Editar Pago</h2>
                <form id="formEditarPago" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                        <input type="number" step="0.01" name="monto" class="w-full px-3 py-2 border rounded" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
                        <select name="metodo_pago" class="w-full px-3 py-2 border rounded" required>
                            <option value="">Seleccione método</option>
                            <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
                            <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                            <option value="PayPal">PayPal</option>
                            <option value="Stripe">Stripe</option>
                            <option value="Efectivo">Efectivo</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Referencia</label>
                        <input type="text" name="referencia_pago" class="w-full px-3 py-2 border rounded">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Nota interna</label>
                        <textarea name="datos_adicionales" class="w-full px-3 py-2 border rounded"></textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Estado del Pago</label>
                        <select name="estado_pago" class="w-full px-3 py-2 border rounded" required>
                            <option value="Pendiente">Pendiente</option>
                            <option value="Completado">Completado</option>
                            <option value="Cancelado">Cancelado</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Fecha de Pago</label>
                        <input type="datetime-local" name="fecha_pago" class="w-full px-3 py-2 border rounded">
                    </div>
                    <div class="flex justify-end gap-2 pt-2">
                        <button type="button" id="cancelarEditarPago" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancelar</button>
                        <button type="submit" class="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700">Guardar</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        modalEditarPago = modal;
        formEditarPago = modal.querySelector('#formEditarPago');
        modal.querySelector('#cerrarModalEditarPago').onclick = cerrarModalEditarPago;
        modal.querySelector('#cancelarEditarPago').onclick = cerrarModalEditarPago;
    }

    function abrirModalEditarPago(pago) {
        crearModalEditarPago();
        formEditarPago.monto.value = pago.monto || '';
        // Seleccionar el método de pago en el select
        if (formEditarPago.metodo_pago) {
            formEditarPago.metodo_pago.value = pago.metodo_pago || '';
        }
        formEditarPago.referencia_pago.value = pago.referencia_pago || '';
        formEditarPago.datos_adicionales.value = pago.datos_adicionales || '';
        formEditarPago.estado_pago.value = pago.estado_pago || 'Pendiente';
        // fecha_pago: convertir a formato yyyy-MM-ddTHH:mm
        if (pago.fecha_pago) {
            const dt = new Date(pago.fecha_pago);
            formEditarPago.fecha_pago.value = dt.toISOString().slice(0,16);
        } else {
            formEditarPago.fecha_pago.value = '';
        }
        modalEditarPago.classList.remove('hidden');
        modalEditarPago.classList.add('flex');
        formEditarPago.onsubmit = async function (e) {
            e.preventDefault();
            const datos = {
                monto: formEditarPago.monto.value,
                metodo_pago: formEditarPago.metodo_pago.value,
                referencia_pago: formEditarPago.referencia_pago.value,
                datos_adicionales: formEditarPago.datos_adicionales.value,
                estado_pago: formEditarPago.estado_pago.value,
                fecha_pago: formEditarPago.fecha_pago.value ? new Date(formEditarPago.fecha_pago.value).toISOString().slice(0, 19).replace('T', ' ') : null
            };
            try {
                showToast("Guardando cambios...", "info");
                const resp = await fetch(`/admin/pagos/${pago.id_pago}/editar`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datos)
                });
                const data = await resp.json();
                if (data.success) {
                    showToast('Pago actualizado correctamente', "success");
                    cerrarModalEditarPago();
                    window.location.reload();
                } else {
                    showToast(data.error || 'Error al actualizar pago', "error");
                }
            } catch (err) {
                showToast('Error de red', "error");
            }
        };
    }

    function cerrarModalEditarPago() {
        if (modalEditarPago) {
            modalEditarPago.classList.add('hidden');
            modalEditarPago.classList.remove('flex');
        }
    }

    window.mostrarEditarPago = async function (id) {
        try {
            const resp = await fetch(`/admin/pagos/${id}/detalles`);
            const data = await resp.json();
            if (!data.success) return showToast(data.error || 'No se pudo obtener detalles', "error");
            abrirModalEditarPago(data.pago);
        } catch (err) {
            showToast('Error de red', "error");
        }
    };
});
