document.addEventListener('DOMContentLoaded', function() {
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm_password');
    const toggleButton = document.getElementById('togglePassword');
    const eyeIcon = document.getElementById('eyeIcon');
    const eyeOffIcon = document.getElementById('eyeOffIcon');
    const passwordStrength = document.getElementById('passwordStrength');
    const passwordStrengthText = document.getElementById('passwordStrengthText');
    const passwordMatch = document.getElementById('passwordMatch');
    
    // Función para mostrar/ocultar contraseña
    toggleButton.addEventListener('click', function() {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            eyeIcon.classList.add('hidden');
            eyeOffIcon.classList.remove('hidden');
        } else {
            passwordInput.type = 'password';
            eyeIcon.classList.remove('hidden');
            eyeOffIcon.classList.add('hidden');
        }
    });
    
    // Función para evaluar la fortaleza de la contraseña
    passwordInput.addEventListener('input', function() {
        const password = passwordInput.value;
        let strength = 0;
        let feedback = '';
        
        // Criterios de fortaleza
        if (password.length > 0) strength += 1;
        if (password.length >= 8) strength += 1;
        if (/[A-Z]/.test(password)) strength += 1;
        if (/[0-9]/.test(password)) strength += 1;
        if (/[^A-Za-z0-9]/.test(password)) strength += 1;
        
        // Actualizar la barra de progreso y el texto según la fortaleza
        switch(strength) {
            case 0:
                passwordStrength.style.width = '0%';
                passwordStrength.className = 'h-full w-0 transition-all duration-300 rounded-full';
                passwordStrengthText.textContent = 'Ingresa tu contraseña';
                passwordStrengthText.className = 'text-xs mt-1 text-zinc-500';
                break;
            case 1:
                passwordStrength.style.width = '20%';
                passwordStrength.className = 'h-full transition-all duration-300 rounded-full bg-red-600';
                passwordStrengthText.textContent = 'Muy débil';
                passwordStrengthText.className = 'text-xs mt-1 text-red-500';
                break;
            case 2:
                passwordStrength.style.width = '40%';
                passwordStrength.className = 'h-full transition-all duration-300 rounded-full bg-orange-500';
                passwordStrengthText.textContent = 'Débil';
                passwordStrengthText.className = 'text-xs mt-1 text-orange-500';
                break;
            case 3:
                passwordStrength.style.width = '60%';
                passwordStrength.className = 'h-full transition-all duration-300 rounded-full bg-yellow-500';
                passwordStrengthText.textContent = 'Media';
                passwordStrengthText.className = 'text-xs mt-1 text-yellow-500';
                break;
            case 4:
                passwordStrength.style.width = '80%';
                passwordStrength.className = 'h-full transition-all duration-300 rounded-full bg-lime-500';
                passwordStrengthText.textContent = 'Fuerte';
                passwordStrengthText.className = 'text-xs mt-1 text-lime-500';
                break;
            case 5:
                passwordStrength.style.width = '100%';
                passwordStrength.className = 'h-full transition-all duration-300 rounded-full bg-green-500';
                passwordStrengthText.textContent = 'Muy fuerte';
                passwordStrengthText.className = 'text-xs mt-1 text-green-500';
                break;
        }
        
        // Verificar si las contraseñas coinciden
        checkPasswordsMatch();
    });
    
    // Función para verificar si las contraseñas coinciden
    function checkPasswordsMatch() {
        if (confirmPasswordInput.value === '') {
            passwordMatch.classList.add('hidden');
            return;
        }
        
        if (passwordInput.value === confirmPasswordInput.value) {
            passwordMatch.textContent = 'Las contraseñas coinciden';
            passwordMatch.className = 'text-xs mt-1 text-green-500';
            passwordMatch.classList.remove('hidden');
        } else {
            passwordMatch.textContent = 'Las contraseñas no coinciden';
            passwordMatch.className = 'text-xs mt-1 text-red-500';
            passwordMatch.classList.remove('hidden');
        }
    }
    
    // Verificar coincidencia cuando se modifica la confirmación
    confirmPasswordInput.addEventListener('input', checkPasswordsMatch);
});