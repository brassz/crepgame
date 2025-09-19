/* ============================================================================
   REGISTER PAGE JAVASCRIPT
   Handles registration form interactions and validation
   ============================================================================ */

document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const birthDateInput = document.getElementById('birthDate');

    // Form submission
    registerForm.addEventListener('submit', handleRegistration);

    // Real-time validation
    passwordInput.addEventListener('input', handlePasswordChange);
    confirmPasswordInput.addEventListener('input', handleConfirmPasswordChange);
    usernameInput.addEventListener('blur', validateUsername);
    usernameInput.addEventListener('input', clearUsernameError);
    emailInput.addEventListener('blur', validateEmail);
    emailInput.addEventListener('input', clearEmailError);
    birthDateInput.addEventListener('change', validateAge);

    // Set max date for birth date (18 years ago)
    setMaxBirthDate();
});

/* ============================================================================
   FORM HANDLERS
   ============================================================================ */

async function handleRegistration(event) {
    event.preventDefault();
    
    const formData = getFormData();

    // Client-side validation
    if (!validateRegistrationForm(formData)) {
        return;
    }

    try {
        // Disable form during registration
        setFormDisabled(true);

        // Attempt registration
        await window.authSystem.signUp(formData);

    } catch (error) {
        console.error('Registration error:', error);
        setFormDisabled(false);
    }
}

function getFormData() {
    return {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        username: document.getElementById('username').value.trim(),
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value,
        confirmPassword: document.getElementById('confirmPassword').value,
        birthDate: document.getElementById('birthDate').value,
        agreeTerms: document.getElementById('agreeTerms').checked,
        agreeAge: document.getElementById('agreeAge').checked,
        newsletter: document.getElementById('newsletter').checked
    };
}

function handlePasswordChange() {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Update strength indicator
    window.authSystem.updatePasswordStrength(password);
    
    // Check password match if confirm password has value
    if (confirmPassword) {
        checkPasswordMatch(password, confirmPassword);
    }
    
    clearPasswordError();
}

function handleConfirmPasswordChange() {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    checkPasswordMatch(password, confirmPassword);
    clearConfirmPasswordError();
}

/* ============================================================================
   VALIDATION FUNCTIONS
   ============================================================================ */

function validateRegistrationForm(formData) {
    let isValid = true;

    // First name validation
    if (!formData.firstName || formData.firstName.length < 2) {
        showFieldError('firstName', 'Nome deve ter pelo menos 2 caracteres');
        isValid = false;
    }

    // Last name validation
    if (!formData.lastName || formData.lastName.length < 2) {
        showFieldError('lastName', 'Sobrenome deve ter pelo menos 2 caracteres');
        isValid = false;
    }

    // Username validation
    if (!formData.username) {
        showFieldError('username', 'Nome de usuário é obrigatório');
        isValid = false;
    } else if (!window.authSystem.isValidUsername(formData.username)) {
        showFieldError('username', '3-20 caracteres, apenas letras, números e underscore');
        isValid = false;
    }

    // Email validation
    if (!formData.email) {
        showFieldError('email', 'Email é obrigatório');
        isValid = false;
    } else if (!window.authSystem.isValidEmail(formData.email)) {
        showFieldError('email', 'Formato de email inválido');
        isValid = false;
    }

    // Password validation
    if (!formData.password) {
        showFieldError('password', 'Senha é obrigatória');
        isValid = false;
    } else if (formData.password.length < 6) {
        showFieldError('password', 'Senha deve ter pelo menos 6 caracteres');
        isValid = false;
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
        showFieldError('confirmPassword', 'Confirmação de senha é obrigatória');
        isValid = false;
    } else if (formData.password !== formData.confirmPassword) {
        showFieldError('confirmPassword', 'Senhas não coincidem');
        isValid = false;
    }

    // Birth date validation
    if (!formData.birthDate) {
        showFieldError('birthDate', 'Data de nascimento é obrigatória');
        isValid = false;
    } else if (!window.authSystem.isLegalAge(formData.birthDate)) {
        showFieldError('birthDate', 'Você deve ter pelo menos 18 anos');
        isValid = false;
    }

    // Terms agreement validation
    if (!formData.agreeTerms) {
        showFieldError('agreeTerms', 'Você deve concordar com os termos de uso');
        isValid = false;
    }

    // Age confirmation validation
    if (!formData.agreeAge) {
        showFieldError('agreeAge', 'Você deve confirmar que tem pelo menos 18 anos');
        isValid = false;
    }

    return isValid;
}

async function validateUsername() {
    const username = document.getElementById('username').value.trim();
    
    if (!username) {
        return;
    }

    if (!window.authSystem.isValidUsername(username)) {
        showFieldError('username', '3-20 caracteres, apenas letras, números e underscore');
        return false;
    }

    // Check if username is available (this would need to be implemented in auth.js)
    try {
        // This is a placeholder - you'd need to implement username checking
        clearFieldError('username');
        return true;
    } catch (error) {
        showFieldError('username', 'Erro ao verificar disponibilidade do nome de usuário');
        return false;
    }
}

function validateEmail() {
    const email = document.getElementById('email').value.trim();
    
    if (email && !window.authSystem.isValidEmail(email)) {
        showFieldError('email', 'Formato de email inválido');
        return false;
    }
    
    clearFieldError('email');
    return true;
}

function validateAge() {
    const birthDate = document.getElementById('birthDate').value;
    
    if (birthDate && !window.authSystem.isLegalAge(birthDate)) {
        showFieldError('birthDate', 'Você deve ter pelo menos 18 anos para se registrar');
        return false;
    }
    
    clearFieldError('birthDate');
    return true;
}

function checkPasswordMatch(password, confirmPassword) {
    const matchElement = document.getElementById('passwordMatch');
    
    if (!confirmPassword) {
        matchElement.textContent = '';
        matchElement.className = 'password-match';
        return;
    }

    if (password === confirmPassword) {
        matchElement.textContent = '✓ Senhas coincidem';
        matchElement.className = 'password-match match';
    } else {
        matchElement.textContent = '✗ Senhas não coincidem';
        matchElement.className = 'password-match no-match';
    }
}

/* ============================================================================
   UI HELPER FUNCTIONS
   ============================================================================ */

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    let formGroup;
    
    // Handle checkbox fields differently
    if (field.type === 'checkbox') {
        formGroup = field.closest('.checkbox-container').parentElement;
    } else {
        formGroup = field.closest('.form-group');
    }
    
    // Remove existing error
    clearFieldError(fieldId);
    
    // Add error styling
    field.classList.add('error');
    
    // Create error message
    const errorElement = document.createElement('small');
    errorElement.className = 'field-error';
    errorElement.style.color = '#dc3545';
    errorElement.style.fontSize = '0.85rem';
    errorElement.style.marginTop = '5px';
    errorElement.style.display = 'block';
    errorElement.textContent = message;
    
    if (field.type === 'checkbox') {
        formGroup.appendChild(errorElement);
    } else {
        formGroup.appendChild(errorElement);
    }
}

function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    let formGroup;
    
    if (field.type === 'checkbox') {
        formGroup = field.closest('.checkbox-container').parentElement;
    } else {
        formGroup = field.closest('.form-group');
    }
    
    const existingError = formGroup.querySelector('.field-error');
    
    field.classList.remove('error');
    if (existingError) {
        existingError.remove();
    }
}

function clearUsernameError() {
    clearFieldError('username');
}

function clearEmailError() {
    clearFieldError('email');
}

function clearPasswordError() {
    clearFieldError('password');
}

function clearConfirmPasswordError() {
    clearFieldError('confirmPassword');
}

function setFormDisabled(disabled) {
    const form = document.getElementById('registerForm');
    const inputs = form.querySelectorAll('input, button');
    
    inputs.forEach(input => {
        input.disabled = disabled;
    });

    const registerButton = document.getElementById('registerButton');
    if (disabled) {
        registerButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando conta...';
    } else {
        registerButton.innerHTML = '<i class="fas fa-user-plus"></i> Criar Conta';
    }
}

function setMaxBirthDate() {
    const today = new Date();
    const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    const maxDate = eighteenYearsAgo.toISOString().split('T')[0];
    
    document.getElementById('birthDate').max = maxDate;
}

/* ============================================================================
   SOCIAL REGISTRATION
   ============================================================================ */

async function registerWithGoogle() {
    try {
        await window.authSystem.signInWithGoogle();
    } catch (error) {
        console.error('Google registration error:', error);
    }
}

/* ============================================================================
   PASSWORD TOGGLE FUNCTIONS
   ============================================================================ */

function togglePassword(inputId) {
    window.authSystem.togglePassword(inputId);
}

/* ============================================================================
   FORM ENHANCEMENT
   ============================================================================ */

// Auto-format username (remove spaces, convert to lowercase)
document.getElementById('username').addEventListener('input', function(e) {
    let value = e.target.value;
    value = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    e.target.value = value;
});

// Auto-capitalize names
document.getElementById('firstName').addEventListener('input', function(e) {
    e.target.value = capitalizeFirstLetter(e.target.value);
});

document.getElementById('lastName').addEventListener('input', function(e) {
    e.target.value = capitalizeFirstLetter(e.target.value);
});

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

/* ============================================================================
   KEYBOARD SHORTCUTS
   ============================================================================ */

document.addEventListener('keydown', function(event) {
    // Enter key submits form
    if (event.key === 'Enter' && event.target.tagName !== 'BUTTON') {
        const form = document.getElementById('registerForm');
        if (form) {
            form.dispatchEvent(new Event('submit'));
        }
    }
    
    // Escape key clears form
    if (event.key === 'Escape') {
        if (confirm('Deseja limpar todos os campos do formulário?')) {
            document.getElementById('registerForm').reset();
            clearAllErrors();
            // Reset password strength indicator
            window.authSystem.updatePasswordStrength('');
            document.getElementById('passwordMatch').textContent = '';
            document.getElementById('passwordMatch').className = 'password-match';
        }
    }
});

function clearAllErrors() {
    const errors = document.querySelectorAll('.field-error');
    errors.forEach(error => error.remove());
    
    const errorFields = document.querySelectorAll('.error');
    errorFields.forEach(field => field.classList.remove('error'));
}

/* ============================================================================
   FORM PROGRESS INDICATOR
   ============================================================================ */

document.addEventListener('input', updateFormProgress);
document.addEventListener('change', updateFormProgress);

function updateFormProgress() {
    const form = document.getElementById('registerForm');
    const requiredFields = form.querySelectorAll('input[required]');
    let filledFields = 0;
    
    requiredFields.forEach(field => {
        if (field.type === 'checkbox') {
            if (field.checked) filledFields++;
        } else {
            if (field.value.trim()) filledFields++;
        }
    });
    
    const progress = (filledFields / requiredFields.length) * 100;
    
    // You could add a progress bar here if desired
    // updateProgressBar(progress);
}

/* ============================================================================
   EXPORT FUNCTIONS
   ============================================================================ */

// Make functions globally available
window.registerPage = {
    registerWithGoogle,
    togglePassword,
    validateUsername,
    validateEmail,
    validateAge,
    validateRegistrationForm
};