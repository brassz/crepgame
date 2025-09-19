/* ============================================================================
   LOGIN PAGE JAVASCRIPT
   Handles login form interactions and validation
   ============================================================================ */

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const rememberCheckbox = document.getElementById('remember');
    const loginButton = document.getElementById('loginButton');

    // Check if user is already logged in
    checkExistingSession();

    // Form submission
    loginForm.addEventListener('submit', handleLogin);

    // Real-time email validation
    emailInput.addEventListener('blur', validateEmail);
    emailInput.addEventListener('input', clearEmailError);

    // Password input handling
    passwordInput.addEventListener('input', handlePasswordInput);

    // Remember me checkbox
    if (localStorage.getItem('rememberMe') === 'true') {
        rememberCheckbox.checked = true;
        const savedEmail = localStorage.getItem('savedEmail');
        if (savedEmail) {
            emailInput.value = savedEmail;
        }
    }

    // Auto-fill demo credentials button
    createDemoCredentialsButton();
});

/* ============================================================================
   FORM HANDLERS
   ============================================================================ */

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const remember = document.getElementById('remember').checked;

    // Client-side validation
    if (!validateLoginForm(email, password)) {
        return;
    }

    try {
        // Disable form during login
        setFormDisabled(true);

        // Attempt login
        await window.authSystem.signIn(email, password, remember);

        // Save email for remember me
        if (remember) {
            localStorage.setItem('savedEmail', email);
        } else {
            localStorage.removeItem('savedEmail');
        }

    } catch (error) {
        console.error('Login error:', error);
        setFormDisabled(false);
    }
}

function handlePasswordInput() {
    const password = document.getElementById('password').value;
    clearPasswordError();
}

/* ============================================================================
   VALIDATION FUNCTIONS
   ============================================================================ */

function validateLoginForm(email, password) {
    let isValid = true;

    // Email validation
    if (!email) {
        showFieldError('email', 'Email é obrigatório');
        isValid = false;
    } else if (!window.authSystem.isValidEmail(email)) {
        showFieldError('email', 'Formato de email inválido');
        isValid = false;
    }

    // Password validation
    if (!password) {
        showFieldError('password', 'Senha é obrigatória');
        isValid = false;
    } else if (password.length < 6) {
        showFieldError('password', 'Senha deve ter pelo menos 6 caracteres');
        isValid = false;
    }

    return isValid;
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

/* ============================================================================
   UI HELPER FUNCTIONS
   ============================================================================ */

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const formGroup = field.closest('.form-group');
    
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
    
    formGroup.appendChild(errorElement);
}

function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    const formGroup = field.closest('.form-group');
    const existingError = formGroup.querySelector('.field-error');
    
    field.classList.remove('error');
    if (existingError) {
        existingError.remove();
    }
}

function clearEmailError() {
    clearFieldError('email');
}

function clearPasswordError() {
    clearFieldError('password');
}

function setFormDisabled(disabled) {
    const form = document.getElementById('loginForm');
    const inputs = form.querySelectorAll('input, button');
    
    inputs.forEach(input => {
        input.disabled = disabled;
    });

    const loginButton = document.getElementById('loginButton');
    if (disabled) {
        loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
    } else {
        loginButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
    }
}

/* ============================================================================
   SOCIAL LOGIN FUNCTIONS
   ============================================================================ */

async function loginWithGoogle() {
    try {
        await window.authSystem.signInWithGoogle();
    } catch (error) {
        console.error('Google login error:', error);
    }
}

/* ============================================================================
   DEMO AND UTILITY FUNCTIONS
   ============================================================================ */

async function loginDemo() {
    try {
        await window.authSystem.loginDemo();
    } catch (error) {
        console.error('Demo login error:', error);
    }
}

function createDemoCredentialsButton() {
    // Create demo credentials button for testing
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const demoSection = document.querySelector('.demo-section');
        if (demoSection) {
            const demoCredentialsBtn = document.createElement('button');
            demoCredentialsBtn.type = 'button';
            demoCredentialsBtn.className = 'demo-button';
            demoCredentialsBtn.style.marginTop = '10px';
            demoCredentialsBtn.innerHTML = '<i class="fas fa-user-cog"></i> Preencher Dados Demo';
            demoCredentialsBtn.onclick = fillDemoCredentials;
            
            demoSection.appendChild(demoCredentialsBtn);
        }
    }
}

function fillDemoCredentials() {
    document.getElementById('email').value = 'demo@craps.game';
    document.getElementById('password').value = 'demo123456';
    document.getElementById('remember').checked = true;
    
    window.authSystem.showAlert('Credenciais demo preenchidas!', 'info');
}

/* ============================================================================
   SESSION MANAGEMENT
   ============================================================================ */

async function checkExistingSession() {
    try {
        const user = await window.authSystem.getCurrentUser();
        
        if (user && !user.is_demo) {
            // User is already logged in, redirect to game
            window.authSystem.showAlert('Você já está logado. Redirecionando...', 'info');
            setTimeout(() => {
                window.location.href = '../game/index.html';
            }, 1500);
        }
    } catch (error) {
        console.error('Error checking session:', error);
    }
}

/* ============================================================================
   KEYBOARD SHORTCUTS
   ============================================================================ */

document.addEventListener('keydown', function(event) {
    // Enter key submits form
    if (event.key === 'Enter' && event.target.tagName !== 'BUTTON') {
        const form = document.getElementById('loginForm');
        if (form) {
            form.dispatchEvent(new Event('submit'));
        }
    }
    
    // Escape key clears form
    if (event.key === 'Escape') {
        document.getElementById('loginForm').reset();
        clearAllErrors();
    }
});

function clearAllErrors() {
    const errors = document.querySelectorAll('.field-error');
    errors.forEach(error => error.remove());
    
    const errorFields = document.querySelectorAll('.error');
    errorFields.forEach(field => field.classList.remove('error'));
}

/* ============================================================================
   FORGOT PASSWORD (Placeholder for future implementation)
   ============================================================================ */

document.addEventListener('click', function(event) {
    if (event.target.classList.contains('forgot-password')) {
        event.preventDefault();
        window.authSystem.showAlert('Funcionalidade em desenvolvimento. Entre em contato com o suporte.', 'info');
    }
});

/* ============================================================================
   EXPORT FUNCTIONS
   ============================================================================ */

// Make functions globally available
window.loginPage = {
    loginWithGoogle,
    loginDemo,
    fillDemoCredentials,
    validateEmail,
    validateLoginForm
};