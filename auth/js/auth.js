/* ============================================================================
   CRAPS GAME - AUTHENTICATION SYSTEM
   Supabase integration for user management
   ============================================================================ */

// Supabase Configuration
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // Replace with your Supabase URL
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your Supabase anon key

// Initialize Supabase client (with fallback for testing)
let supabase = null;
try {
    if (SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        console.log('Supabase not configured - using demo mode only');
    }
} catch (error) {
    console.log('Supabase initialization failed - using demo mode only');
}

// Global auth state
let currentUser = null;

/* ============================================================================
   UTILITY FUNCTIONS
   ============================================================================ */

// Show loading overlay
function showLoading(message = 'Carregando...') {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        const loadingText = overlay.querySelector('p');
        if (loadingText) loadingText.textContent = message;
        overlay.classList.add('show');
    }
}

// Hide loading overlay
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('show');
    }
}

// Show alert message
function showAlert(message, type = 'info') {
    const container = document.getElementById('alertContainer');
    if (!container) return;

    const alert = document.createElement('div');
    alert.className = `alert ${type}`;
    
    const icon = getAlertIcon(type);
    alert.innerHTML = `
        <i class="${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(alert);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => alert.remove(), 300);
        }
    }, 5000);
}

// Get alert icon based on type
function getAlertIcon(type) {
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    return icons[type] || icons.info;
}

// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validate username format
function isValidUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
}

// Calculate password strength
function calculatePasswordStrength(password) {
    let score = 0;
    let feedback = [];

    if (password.length >= 8) score += 1;
    else feedback.push('pelo menos 8 caracteres');

    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('letras minúsculas');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('letras maiúsculas');

    if (/[0-9]/.test(password)) score += 1;
    else feedback.push('números');

    if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    else feedback.push('caracteres especiais');

    const strength = ['weak', 'weak', 'fair', 'good', 'strong'][Math.min(score, 4)];
    const strengthText = {
        weak: 'Fraca',
        fair: 'Regular',
        good: 'Boa',
        strong: 'Forte'
    };

    return {
        score,
        strength,
        text: strengthText[strength],
        feedback: feedback.length > 0 ? `Adicione: ${feedback.join(', ')}` : 'Senha forte!'
    };
}

// Update password strength indicator
function updatePasswordStrength(password, strengthFillId = 'strengthFill', strengthTextId = 'strengthText') {
    const strengthFill = document.getElementById(strengthFillId);
    const strengthText = document.getElementById(strengthTextId);
    
    if (!strengthFill || !strengthText) return;

    if (!password) {
        strengthFill.className = 'strength-fill';
        strengthText.textContent = 'Digite uma senha';
        return;
    }

    const result = calculatePasswordStrength(password);
    strengthFill.className = `strength-fill ${result.strength}`;
    strengthText.textContent = result.feedback;
}

// Toggle password visibility
function togglePassword(inputId = 'password') {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(inputId + 'Icon');
    
    if (!input || !icon) return;

    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

// Check if user is of legal age
function isLegalAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        return age - 1 >= 18;
    }
    
    return age >= 18;
}

/* ============================================================================
   AUTHENTICATION FUNCTIONS
   ============================================================================ */

// Sign up with email and password
async function signUp(userData) {
    try {
        showLoading('Criando conta...');

        // Validate required fields
        if (!userData.email || !userData.password || !userData.username) {
            throw new Error('Todos os campos obrigatórios devem ser preenchidos');
        }

        // Validate email format
        if (!isValidEmail(userData.email)) {
            throw new Error('Formato de email inválido');
        }

        // Validate username format
        if (!isValidUsername(userData.username)) {
            throw new Error('Nome de usuário deve ter 3-20 caracteres (apenas letras, números e underscore)');
        }

        // Validate password strength
        const passwordStrength = calculatePasswordStrength(userData.password);
        if (passwordStrength.score < 2) {
            throw new Error('Senha muito fraca. Use pelo menos 8 caracteres com letras e números');
        }

        // Validate age
        if (userData.birthDate && !isLegalAge(userData.birthDate)) {
            throw new Error('Você deve ter pelo menos 18 anos para se registrar');
        }

        // Check if username is already taken
        const { data: existingUser } = await supabase
            .from('users')
            .select('username')
            .eq('username', userData.username)
            .single();

        if (existingUser) {
            throw new Error('Nome de usuário já está em uso');
        }

        // Sign up with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: userData.email,
            password: userData.password,
            options: {
                data: {
                    username: userData.username,
                    first_name: userData.firstName,
                    last_name: userData.lastName,
                    birth_date: userData.birthDate,
                    newsletter: userData.newsletter
                }
            }
        });

        if (authError) throw authError;

        // Insert user data into custom users table
        const { error: dbError } = await supabase
            .from('users')
            .insert({
                id: authData.user.id,
                username: userData.username,
                email: userData.email,
                balance: 1000.00, // Welcome bonus
                created_at: new Date().toISOString()
            });

        if (dbError) throw dbError;

        hideLoading();
        showAlert('Conta criada com sucesso! Verifique seu email para ativar a conta.', 'success');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 3000);

        return authData;

    } catch (error) {
        hideLoading();
        showAlert(error.message, 'error');
        throw error;
    }
}

// Sign in with email and password
async function signIn(email, password, remember = false) {
    try {
        showLoading('Entrando...');

        if (!email || !password) {
            throw new Error('Email e senha são obrigatórios');
        }

        if (!isValidEmail(email)) {
            throw new Error('Formato de email inválido');
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        // Get user data from custom table
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (userError) throw userError;

        currentUser = userData;

        // Store remember me preference
        if (remember) {
            localStorage.setItem('rememberMe', 'true');
        }

        hideLoading();
        showAlert(`Bem-vindo, ${userData.username}!`, 'success');
        
        // Redirect to game
        setTimeout(() => {
            window.location.href = '../game/index.html';
        }, 1500);

        return data;

    } catch (error) {
        hideLoading();
        showAlert(error.message, 'error');
        throw error;
    }
}

// Sign in with Google
async function signInWithGoogle() {
    try {
        showLoading('Conectando com Google...');

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/game/index.html`
            }
        });

        if (error) throw error;

        return data;

    } catch (error) {
        hideLoading();
        showAlert(error.message, 'error');
        throw error;
    }
}

// Sign out
async function signOut() {
    try {
        showLoading('Saindo...');

        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        currentUser = null;
        localStorage.removeItem('rememberMe');

        hideLoading();
        showAlert('Logout realizado com sucesso', 'success');
        
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);

    } catch (error) {
        hideLoading();
        showAlert(error.message, 'error');
    }
}

// Demo login (guest mode)
async function loginDemo() {
    try {
        showLoading('Entrando como visitante...');

        // Create temporary demo user data
        currentUser = {
            id: 'demo-' + Date.now(),
            username: 'Visitante',
            email: 'demo@craps.game',
            balance: 1000.00,
            is_demo: true
        };

        // Store demo user in sessionStorage
        sessionStorage.setItem('demoUser', JSON.stringify(currentUser));

        hideLoading();
        showAlert('Entrando como visitante com R$ 1.000!', 'success');
        
        setTimeout(() => {
            window.location.href = '../game/index.html';
        }, 1500);

    } catch (error) {
        hideLoading();
        showAlert('Erro ao entrar como visitante', 'error');
    }
}

// Get current user
async function getCurrentUser() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            // Check for demo user
            const demoUser = sessionStorage.getItem('demoUser');
            if (demoUser) {
                return JSON.parse(demoUser);
            }
            return null;
        }

        // Get user data from custom table
        const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) throw error;

        currentUser = userData;
        return userData;

    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

// Update user balance
async function updateUserBalance(userId, newBalance) {
    try {
        const { data, error } = await supabase
            .from('users')
            .update({ balance: newBalance, updated_at: new Date().toISOString() })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;

        return data;

    } catch (error) {
        console.error('Error updating balance:', error);
        throw error;
    }
}

// Record transaction
async function recordTransaction(userId, gameId, betId, type, amount, balanceBefore, balanceAfter, description) {
    try {
        const { data, error } = await supabase
            .from('transactions')
            .insert({
                user_id: userId,
                game_id: gameId,
                bet_id: betId,
                transaction_type: type,
                amount: amount,
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                description: description,
                created_at: new Date().toISOString()
            });

        if (error) throw error;

        return data;

    } catch (error) {
        console.error('Error recording transaction:', error);
        throw error;
    }
}

/* ============================================================================
   INITIALIZATION
   ============================================================================ */

// Initialize auth state
document.addEventListener('DOMContentLoaded', async () => {
    // Check for existing session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        currentUser = await getCurrentUser();
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN') {
            currentUser = await getCurrentUser();
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
        }
    });
});

/* ============================================================================
   EXPORT FUNCTIONS (for use in other files)
   ============================================================================ */

// Make functions globally available
window.authSystem = {
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    loginDemo,
    getCurrentUser,
    updateUserBalance,
    recordTransaction,
    showAlert,
    showLoading,
    hideLoading,
    togglePassword,
    updatePasswordStrength,
    isValidEmail,
    isValidUsername,
    isLegalAge,
    currentUser: () => currentUser
};