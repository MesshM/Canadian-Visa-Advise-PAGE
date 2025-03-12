document.addEventListener('DOMContentLoaded', function() {
    const togglePassword = document.getElementById('togglePassword');
    const password = document.getElementById('password');
    const eyeIcon = document.getElementById('eyeIcon');
    const eyeOffIcon = document.getElementById('eyeOffIcon');
    
    togglePassword.addEventListener('click', function() {
        // Cambiar el tipo de input
        const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
        password.setAttribute('type', type);
        
        // Cambiar el icono
        eyeIcon.classList.toggle('hidden');
        eyeOffIcon.classList.toggle('hidden');
    });
});