document.addEventListener('DOMContentLoaded', function () {
    // Modal Crear Asesoría
    const btnAbrirCrear = document.getElementById('btnAbrirCrearAsesoria');
    const modalCrear = document.getElementById('modalCrearAsesoria');
    const formCrear = document.getElementById('formCrearAsesoria');

    if (btnAbrirCrear && modalCrear) {
        btnAbrirCrear.onclick = () => modalCrear.classList.remove('hidden');
    }
    window.cerrarModalCrearAsesoria = function () {
        modalCrear.classList.add('hidden');
    };
    if (formCrear) {
        formCrear.onsubmit = async function (e) {
            e.preventDefault();
            const formData = new FormData(formCrear);
            // Cambia aquí según tus campos reales y backend
            const data = {};
            formData.forEach((v, k) => data[k] = v);
            const resp = await fetch('/admin/asesorias/crear', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
            if (resp.ok) {
                location.reload();
            } else {
                alert('Error al crear asesoría');
            }
        };
    }

    // Modal Ver Asesoría
    window.abrirModalVerAsesoria = function (id) {
        fetch(`/admin/asesorias/${id}/ver`)
            .then(r => r.json())
            .then(data => {
                if (data.asesoria) {
                    let html = '';
                    for (const [k, v] of Object.entries(data.asesoria)) {
                        html += `<div class="mb-2"><b>${k.replace(/_/g, ' ')}:</b> ${v ?? ''}</div>`;
                    }
                    document.getElementById('contenidoVerAsesoria').innerHTML = html;
                    document.getElementById('modalVerAsesoria').classList.remove('hidden');
                } else {
                    alert('No se pudo cargar la asesoría');
                }
            });
    };
    window.cerrarModalVerAsesoria = function () {
        document.getElementById('modalVerAsesoria').classList.add('hidden');
    };

    // Modal Editar Asesoría
    window.abrirModalEditarAsesoria = function (id) {
        fetch(`/admin/asesorias/${id}/ver`)
            .then(r => r.json())
            .then(data => {
                if (data.asesoria) {
                    let html = '';
                    for (const [k, v] of Object.entries(data.asesoria)) {
                        if (['codigo_asesoria', 'fecha_creacion'].includes(k)) {
                            html += `<div class="mb-2"><b>${k.replace(/_/g, ' ')}:</b> ${v ?? ''}</div>`;
                        } else {
                            html += `<div class="mb-2">
                                <label class="block text-sm font-medium text-gray-700">${k.replace(/_/g, ' ')}</label>
                                <input name="${k}" value="${v ?? ''}" class="w-full border rounded px-3 py-2 mt-1" />
                            </div>`;
                        }
                    }
                    document.getElementById('contenidoEditarAsesoria').innerHTML = html;
                    const formEditar = document.getElementById('formEditarAsesoria');
                    formEditar.onsubmit = function (e) {
                        e.preventDefault();
                        const formData = new FormData(formEditar);
                        const obj = {};
                        for (const [k, v] of formData.entries()) obj[k] = v;
                        fetch(`/admin/asesorias/${id}/editar`, {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify(obj)
                        }).then(r => {
                            if (r.ok) location.reload();
                            else alert('Error al editar asesoría');
                        });
                    };
                    document.getElementById('modalEditarAsesoria').classList.remove('hidden');
                } else {
                    alert('No se pudo cargar la asesoría');
                }
            });
    };
    window.cerrarModalEditarAsesoria = function () {
        document.getElementById('modalEditarAsesoria').classList.add('hidden');
    };

    // Modal Eliminar Asesoría
    let idEliminar = null;
    window.abrirModalEliminarAsesoria = function (id) {
        idEliminar = id;
        document.getElementById('modalEliminarAsesoria').classList.remove('hidden');
    };
    window.cerrarModalEliminarAsesoria = function () {
        document.getElementById('modalEliminarAsesoria').classList.add('hidden');
        idEliminar = null;
    };
    const btnEliminar = document.getElementById('btnConfirmarEliminarAsesoria');
    if (btnEliminar) {
        btnEliminar.onclick = function () {
            if (!idEliminar) return;
            fetch(`/admin/asesorias/${idEliminar}/cancelar`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({})
            }).then(r => {
                if (r.ok) location.reload();
                else alert('Error al eliminar asesoría');
            });
        };
    }
});
