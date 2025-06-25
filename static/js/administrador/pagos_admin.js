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

    [searchCliente, filterEstado, filterFechaInicio].forEach(el => {
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

    // Acciones de pago (aprobar, rechazar, ver detalles, recibo, refund)
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
        if (action === 'refund') {
            if (!confirm('¿Devolver el pago al cliente? Esta acción es irreversible.')) return;
            await devolverPagoStripe(pagoId);
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

    // Nueva función para reembolso Stripe
    async function devolverPagoStripe(id) {
        try {
            showToast("Procesando devolución...", "info");
            const resp = await fetch(`/admin/pagos/${id}/refund`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await resp.json();
            if (data.success) {
                showToast(data.mensaje, "success");
                window.location.reload();
            } else {
                showToast(data.error || 'Error al procesar devolución', "error");
            }
        } catch (err) {
            showToast('Error de red', "error");
        }
    }
});
