// Sistema de Autenticação Customizado
// Usa tabela customizada no Supabase ao invés de Supabase Auth

(function(){
    'use strict';
    
    // Inicializar cliente Supabase
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
        console.error("Supabase config missing!");
        redirectToLogin();
        return;
    }
    
    if (!window.supabase || !window.supabase.createClient) {
        console.error("Supabase JS not loaded!");
        redirectToLogin();
        return;
    }
    
    window.sbClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    
    // Função para hash de senha (SHA-256)
    async function hashPassword(password) {
        const msgBuffer = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }
    
    // Verificar se usuário está logado
    function checkAuth() {
        const userDataStr = localStorage.getItem('game_user');
        const sessionToken = localStorage.getItem('game_session_token');
        
        if (!userDataStr || !sessionToken) {
            redirectToLogin();
            return null;
        }
        
        try {
            const userData = JSON.parse(userDataStr);
            
            // Verificar se sessão não expirou (24 horas)
            const sessionTime = localStorage.getItem('game_session_time');
            if (sessionTime) {
                const elapsed = Date.now() - parseInt(sessionTime);
                const hoursElapsed = elapsed / (1000 * 60 * 60);
                
                if (hoursElapsed > 24) {
                    console.log('Sessão expirada');
                    logout();
                    return null;
                }
            }
            
            return userData;
        } catch (e) {
            console.error('Erro ao verificar autenticação:', e);
            logout();
            return null;
        }
    }
    
    // Registrar novo usuário
    async function register(email, username, password, fullName, cpf) {
        try {
            const passwordHash = await hashPassword(password);
            
            const { data, error } = await window.sbClient.rpc('register_user', {
                p_email: email,
                p_username: username,
                p_password_hash: passwordHash,
                p_full_name: fullName,
                p_cpf: cpf || null
            });
            
            if (error) {
                console.error('Erro no registro:', error);
                return { success: false, error: error.message };
            }
            
            return data;
        } catch (e) {
            console.error('Erro ao registrar:', e);
            return { success: false, error: e.message };
        }
    }
    
    // Fazer login
    async function login(email, password) {
        try {
            const passwordHash = await hashPassword(password);
            
            const { data, error } = await window.sbClient.rpc('login_user', {
                p_email: email,
                p_password_hash: passwordHash
            });
            
            if (error) {
                console.error('Erro no login:', error);
                return { success: false, error: error.message };
            }
            
            if (data && data.success) {
                // Salvar dados do usuário no localStorage
                localStorage.setItem('game_user', JSON.stringify(data.user));
                localStorage.setItem('game_session_token', generateToken());
                localStorage.setItem('game_session_time', Date.now().toString());
                
                console.log('Login realizado com sucesso!', data.user);
            }
            
            return data;
        } catch (e) {
            console.error('Erro ao fazer login:', e);
            return { success: false, error: e.message };
        }
    }
    
    // Fazer logout
    function logout() {
        localStorage.removeItem('game_user');
        localStorage.removeItem('game_session_token');
        localStorage.removeItem('game_session_time');
        redirectToLogin();
    }
    
    // Obter usuário logado
    function getCurrentUser() {
        const userDataStr = localStorage.getItem('game_user');
        if (!userDataStr) return null;
        
        try {
            return JSON.parse(userDataStr);
        } catch (e) {
            return null;
        }
    }
    
    // Atualizar dados do usuário no localStorage
    function updateCurrentUser(userData) {
        localStorage.setItem('game_user', JSON.stringify(userData));
    }
    
    // Redirecionar para login (FORÇAR redirecionamento imediato)
    function redirectToLogin() {
        const currentPath = window.location.pathname;
        const currentFile = window.location.pathname.split('/').pop();
        
        // Não redirecionar se já estiver nas páginas de auth
        if (currentPath.includes('login.html') || currentPath.includes('register.html')) {
            return;
        }
        
        // Determinar o caminho base
        let base = currentPath.replace(/index\.html$/, '').replace(/\/$/, '');
        if (!base || base === currentPath) {
            base = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
        }
        if (!base) {
            base = './';
        }
        if (!base.endsWith('/')) {
            base += '/';
        }
        
        // Redirecionar IMEDIATAMENTE
        console.log('🔄 Redirecionando para:', base + 'login.html');
        window.location.replace(base + 'login.html');
    }
    
    // Gerar token aleatório
    function generateToken() {
        return Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
    
    // Obter saldo atualizado do servidor
    async function refreshUserBalance(userId) {
        try {
            const { data, error } = await window.sbClient.rpc('get_user_by_id', {
                p_user_id: userId
            });
            
            if (error) {
                console.error('Erro ao atualizar saldo:', error);
                return null;
            }
            
            if (data && data.success && data.user) {
                updateCurrentUser(data.user);
                return data.user.balance;
            }
            
            return null;
        } catch (e) {
            console.error('Erro ao buscar saldo:', e);
            return null;
        }
    }
    
    // Exportar funções
    window.customAuth = {
        checkAuth: checkAuth,
        register: register,
        login: login,
        logout: logout,
        getCurrentUser: getCurrentUser,
        updateCurrentUser: updateCurrentUser,
        refreshUserBalance: refreshUserBalance,
        hashPassword: hashPassword
    };
    
    // CRITICAL: Verificar autenticação IMEDIATAMENTE ao carregar qualquer página
    // Isso garante que o login apareça ANTES de qualquer coisa
    (function checkAuthOnLoad() {
        const currentPath = window.location.pathname;
        const currentFile = window.location.pathname.split('/').pop();
        
        // Se estiver na página de login ou registro, não fazer nada
        if (currentPath.includes('login.html') || currentPath.includes('register.html')) {
            return;
        }
        
        // Se estiver tentando acessar o jogo (index.html ou raiz)
        if (currentPath.includes('index.html') || 
            currentPath.endsWith('/game/') || 
            currentPath.endsWith('/game') ||
            currentFile === '' ||
            currentFile === 'index.html') {
            
            console.log('🔒 Verificando autenticação ANTES de carregar o jogo...');
            
            // Verificar se usuário está logado IMEDIATAMENTE
            const userDataStr = localStorage.getItem('game_user');
            const sessionToken = localStorage.getItem('game_session_token');
            
            if (!userDataStr || !sessionToken) {
                console.log('❌ Usuário não autenticado - redirecionando para login');
                redirectToLogin();
                return;
            }
            
            // Verificar se sessão expirou
            try {
                const sessionTime = localStorage.getItem('game_session_time');
                if (sessionTime) {
                    const elapsed = Date.now() - parseInt(sessionTime);
                    const hoursElapsed = elapsed / (1000 * 60 * 60);
                    
                    if (hoursElapsed > 24) {
                        console.log('❌ Sessão expirada - redirecionando para login');
                        logout();
                        return;
                    }
                }
                
                const userData = JSON.parse(userDataStr);
                console.log('✅ Usuário autenticado:', userData.username);
            } catch (e) {
                console.error('❌ Erro ao verificar sessão - redirecionando para login');
                redirectToLogin();
                return;
            }
        }
    })();
})();
