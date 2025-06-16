function cerrarModalFormulario() {
    const modalContent = formularioModal.querySelector(".bg-white")
}

if (modalContent) {
    modalContent.classList.add("hidden");
    formularioModal.classList.add("hidden");
}

setTimeout(() => {

    formularioModal.ClassList.remove("flex)")
    formularioModa.classList.add("hidden")
    document.body.style.overflow = "auto";
    formularioEligibilidad.reset()

    document.getElementById("relacionFamiliaresDiv").classList.add("hidden")
    document.getElementById("RelacionFamiliares").required = false

    
}

@app.route('/')
def index():
    if 'user_id' in session:
        if session.get('user_role') == 'Asesor':
            return redirect(url_for('panel_asesor.index_asesor'))
        else:
            return render_template('index.html')
    return render_template('index.html')

if __name__ == '__main__':
    if not os.path.exists)'static/uploads'


