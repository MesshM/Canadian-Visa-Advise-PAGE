// Variables globales
let datosMetricas = null;

// Inicialización cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    cargarMetricasPagos();
});

/**
 * Carga las métricas de pagos desde el servidor
 */
async function cargarMetricasPagos() {
    try {
        mostrarLoadingTransacciones(true);
        
        const response = await fetch('/asesor/api/metricas-pagos');
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        datosMetricas = await response.json();
        
        // Actualizar estadísticas principales
        actualizarEstadisticasPrincipales(datosMetricas);
        
        // Cargar gráficos
        cargarGraficos(datosMetricas);
        
        // Cargar transacciones recientes
        cargarTransaccionesRecientes(datosMetricas.transacciones_recientes);
        
    } catch (error) {
        console.error('Error al cargar métricas:', error);
        mostrarError('Error al cargar las métricas de pagos. Por favor, intente nuevamente.');
    } finally {
        mostrarLoadingTransacciones(false);
    }
}

/**
 * Actualiza las estadísticas principales en las tarjetas
 */
function actualizarEstadisticasPrincipales(datos) {
    // Formatear números con separadores de miles
    const formatearMoneda = (valor) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(valor);
    };
    
    const formatearNumero = (valor) => {
        return new Intl.NumberFormat('es-ES').format(valor);
    };
    
    // Actualizar valores
    document.getElementById('totalIngresos').textContent = formatearMoneda(datos.total_ingresos);
    document.getElementById('totalTransacciones').textContent = formatearNumero(datos.total_transacciones);
    document.getElementById('pagosPendientes').textContent = formatearNumero(datos.pagos_pendientes);
    document.getElementById('pagosCompletados').textContent = formatearNumero(datos.pagos_completados);
    document.getElementById('promedioTransaccion').textContent = formatearMoneda(datos.promedio_transaccion);
    
    // Animación de conteo para las estadísticas
    animarContadores();
}

/**
 * Carga y muestra los gráficos
 */
function cargarGraficos(datos) {
    // Gráfico de ingresos mensuales
    if (datos.grafico_ingresos_mensuales) {
        const contenedorIngresos = document.getElementById('contenedorGraficoIngresos');
        contenedorIngresos.innerHTML = `
            <img src="data:image/png;base64,${datos.grafico_ingresos_mensuales}" 
                 alt="Gráfico de Ingresos Mensuales" 
                 class="w-full h-auto rounded-lg shadow-sm">
        `;
    } else {
        mostrarGraficoVacio('contenedorGraficoIngresos', 'No hay datos de ingresos mensuales');
    }
    
    // Gráfico de tipos de visa
    if (datos.grafico_tipos_visa) {
        const contenedorTipos = document.getElementById('contenedorGraficoTipos');
        contenedorTipos.innerHTML = `
            <img src="data:image/png;base64,${datos.grafico_tipos_visa}" 
                 alt="Gráfico de Tipos de Visa" 
                 class="w-full h-auto rounded-lg shadow-sm">
        `;
    } else {
        mostrarGraficoVacio('contenedorGraficoTipos', 'No hay datos de tipos de visa');
    }
    
    // Gráfico de métodos de pago
    if (datos.grafico_metodos_pago) {
        const contenedorMetodos = document.getElementById('contenedorGraficoMetodos');
        contenedorMetodos.innerHTML = `
            <img src="data:image/png;base64,${datos.grafico_metodos_pago}" 
                 alt="Gráfico de Métodos de Pago" 
                 class="w-full h-auto rounded-lg shadow-sm">
        `;
    } else {
        mostrarGraficoVacio('contenedorGraficoMetodos', 'No hay datos de métodos de pago');
    }
    
    // Gráfico de tendencia semanal
    if (datos.grafico_tendencia_semanal) {
        const contenedorTendencia = document.getElementById('contenedorGraficoTendencia');
        contenedorTendencia.innerHTML = `
            <img src="data:image/png;base64,${datos.grafico_tendencia_semanal}" 
                 alt="Gráfico de Tendencia Semanal" 
                 class="w-full h-auto rounded-lg shadow-sm">
        `;
    } else {
        mostrarGraficoVacio('contenedorGraficoTendencia', 'No hay datos de tendencia semanal');
    }
}

/**
 * Muestra un mensaje cuando no hay datos para un gráfico
 */
function mostrarGraficoVacio(contenedorId, mensaje) {
    const contenedor = document.getElementById(contenedorId);
    contenedor.innerHTML = `
        <div class="text-center py-12">
            <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
            <p class="text-gray-500 text-sm">${mensaje}</p>
        </div>
    `;
}

/**
 * Carga las transacciones recientes en la tabla
 */
function cargarTransaccionesRecientes(transacciones) {
    const tbody = document.getElementById('tablaTransaccionesRecientes');
    
    if (!transacciones || transacciones.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="p-8 text-center text-gray-500">
                    <svg class="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    No hay transacciones recientes
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = transacciones.map(transaccion => {
        const estadoClass = obtenerClaseEstado(transaccion.estado_pago);
        const fechaFormateada = formatearFecha(transaccion.fecha_pago);
        const montoFormateado = formatearMoneda(transaccion.monto);
        
        return `
            <tr class="hover:bg-gray-50 transition-colors duration-200">
                <td class="p-4 border-b border-gray-200">
                    <div class="flex items-center">
                        <div class="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                            <svg class="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                            </svg>
                        </div>
                        <div>
                            <p class="text-sm font-medium text-gray-900">${transaccion.nombres} ${transaccion.apellidos}</p>
                            <p class="text-xs text-gray-500">ID: ${transaccion.id_solicitante}</p>
                        </div>
                    </div>
                </td>
                <td class="p-4 border-b border-gray-200">
                    <span class="text-sm font-semibold text-gray-900">${montoFormateado}</span>
                </td>
                <td class="p-4 border-b border-gray-200">
                    <span class="text-sm text-gray-600">${transaccion.metodo_pago}</span>
                </td>
                <td class="p-4 border-b border-gray-200">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoClass}">
                        ${transaccion.estado_pago}
                    </span>
                </td>
                <td class="p-4 border-b border-gray-200">
                    <span class="text-sm text-gray-600">${fechaFormateada}</span>
                </td>
                <td class="p-4 border-b border-gray-200">
                    <span class="text-sm text-gray-600">${transaccion.tipo_asesoria}</span>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Obtiene la clase CSS para el estado del pago
 */
function obtenerClaseEstado(estado) {
    const estados = {
        'Completado': 'bg-green-100 text-green-800',
        'Pendiente': 'bg-yellow-100 text-yellow-800',
        'Cancelado': 'bg-red-100 text-red-800'
    };
    return estados[estado] || 'bg-gray-100 text-gray-800';
}

/**
 * Formatea una fecha para mostrar
 */
function formatearFecha(fecha) {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Formatea un valor monetario
 */
function formatearMoneda(valor) {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(valor);
}

/**
 * Anima los contadores de las estadísticas principales
 */
function animarContadores() {
    const contadores = [
        { elemento: 'totalIngresos', valor: datosMetricas.total_ingresos, esMoneda: true },
        { elemento: 'totalTransacciones', valor: datosMetricas.total_transacciones, esMoneda: false },
        { elemento: 'pagosPendientes', valor: datosMetricas.pagos_pendientes, esMoneda: false },
        { elemento: 'pagosCompletados', valor: datosMetricas.pagos_completados, esMoneda: false },
        { elemento: 'promedioTransaccion', valor: datosMetricas.promedio_transaccion, esMoneda: true }
    ];
    
    contadores.forEach(contador => {
        animarContador(contador.elemento, contador.valor, contador.esMoneda);
    });
}

/**
 * Anima un contador individual
 */
function animarContador(elementoId, valorFinal, esMoneda = false) {
    const elemento = document.getElementById(elementoId);
    const duracion = 2000; // 2 segundos
    const pasos = 60;
    const incremento = valorFinal / pasos;
    let valorActual = 0;
    let paso = 0;
    
    const intervalo = setInterval(() => {
        valorActual += incremento;
        paso++;
        
        if (paso >= pasos) {
            valorActual = valorFinal;
            clearInterval(intervalo);
        }
        
        if (esMoneda) {
            elemento.textContent = formatearMoneda(valorActual);
        } else {
            elemento.textContent = new Intl.NumberFormat('es-ES').format(Math.floor(valorActual));
        }
    }, duracion / pasos);
}

/**
 * Actualiza las métricas (botón actualizar)
 */
async function actualizarMetricas() {
    const boton = event.target.closest('button');
    const textoOriginal = boton.innerHTML;
    
    // Mostrar loading en el botón
    boton.innerHTML = `
        <div class="relative flex items-center justify-center">
            <svg class="animate-spin w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            <span>Actualizando...</span>
        </div>
    `;
    boton.disabled = true;
    
    try {
        await cargarMetricasPagos();
        mostrarExito('Métricas actualizadas correctamente');
    } catch (error) {
        mostrarError('Error al actualizar las métricas');
    } finally {
        // Restaurar botón
        setTimeout(() => {
            boton.innerHTML = textoOriginal;
            boton.disabled = false;
        }, 1000);
    }
}

/**
 * Exporta el reporte de pagos
 */
async function exportarReporte() {
    const boton = event.target.closest('button');
    const textoOriginal = boton.innerHTML;
    
    // Mostrar loading en el botón
    boton.innerHTML = `
        <div class="flex items-center justify-center">
            <svg class="animate-spin w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            <span>Exportando...</span>
        </div>
    `;
    boton.disabled = true;
    
    try {
        const response = await fetch('/asesor/api/exportar-reporte');
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Crear y descargar archivo CSV
        const blob = new Blob([data.csv_data], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', data.filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        mostrarExito('Reporte exportado correctamente');
        
    } catch (error) {
        console.error('Error al exportar reporte:', error);
        mostrarError('Error al exportar el reporte. Por favor, intente nuevamente.');
    } finally {
        // Restaurar botón
        setTimeout(() => {
            boton.innerHTML = textoOriginal;
            boton.disabled = false;
        }, 1000);
    }
}

/**
 * Muestra/oculta el loading de transacciones
 */
function mostrarLoadingTransacciones(mostrar) {
    const loading = document.getElementById('loadingTransacciones');
    const tabla = document.getElementById('tablaTransaccionesRecientes').closest('.overflow-x-auto');
    
    if (mostrar) {
        loading.classList.remove('hidden');
        tabla.style.opacity = '0.5';
    } else {
        loading.classList.add('hidden');
        tabla.style.opacity = '1';
    }
}

/**
 * Muestra mensaje de éxito
 */
function mostrarExito(mensaje) {
    // Implementar sistema de notificaciones toast
    console.log('Éxito:', mensaje);
    // Aquí puedes agregar tu sistema de notificaciones
}

/**
 * Muestra mensaje de error
 */
function mostrarError(mensaje) {
    // Implementar sistema de notificaciones toast
    console.error('Error:', mensaje);
    // Aquí puedes agregar tu sistema de notificaciones
}

/**
 * Maneja errores de carga de imágenes
 */
document.addEventListener('error', function(e) {
    if (e.target.tagName === 'IMG') {
        e.target.style.display = 'none';
        const contenedor = e.target.parentElement;
        contenedor.innerHTML = `
            <div class="text-center py-12">
                <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
                <p class="text-gray-500 text-sm">Error al cargar el gráfico</p>
            </div>
        `;
    }
}, true);