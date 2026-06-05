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

    // SHA-256 em JS puro (LAN via http://192.168.x.x não tem crypto.subtle)
    function sha256HexFallback(message) {
        function rotr(n, x) { return (x >>> n) | (x << (32 - n)); }
        function ch(x, y, z) { return (x & y) ^ (~x & z); }
        function maj(x, y, z) { return (x & y) ^ (x & z) ^ (y & z); }
        function sigma0(x) { return rotr(2, x) ^ rotr(13, x) ^ rotr(22, x); }
        function sigma1(x) { return rotr(6, x) ^ rotr(11, x) ^ rotr(25, x); }
        function gamma0(x) { return rotr(7, x) ^ rotr(18, x) ^ (x >>> 3); }
        function gamma1(x) { return rotr(17, x) ^ rotr(19, x) ^ (x >>> 10); }

        var K = [
            0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
            0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
            0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
            0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
            0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
            0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
            0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
            0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
        ];

        var bytes = new TextEncoder().encode(message);
        var bitLen = bytes.length * 8;
        var withPadding = new Uint8Array(((bytes.length + 9 + 63) >> 6) << 6);
        withPadding.set(bytes);
        withPadding[bytes.length] = 0x80;
        var view = new DataView(withPadding.buffer);
        view.setUint32(withPadding.length - 4, bitLen, false);

        var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
        for (var offset = 0; offset < withPadding.length; offset += 64) {
            var W = new Array(64);
            for (var i = 0; i < 16; i++) {
                W[i] = view.getUint32(offset + i * 4, false);
            }
            for (var j = 16; j < 64; j++) {
                W[j] = (gamma1(W[j - 2]) + W[j - 7] + gamma0(W[j - 15]) + W[j - 16]) >>> 0;
            }
            var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
            for (var t = 0; t < 64; t++) {
                var T1 = (h + sigma1(e) + ch(e, f, g) + K[t] + W[t]) >>> 0;
                var T2 = (sigma0(a) + maj(a, b, c)) >>> 0;
                h = g; g = f; f = e; e = (d + T1) >>> 0;
                d = c; c = b; b = a; a = (T1 + T2) >>> 0;
            }
            H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
            H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
        }
        return H.map(function (v) { return v.toString(16).padStart(8, '0'); }).join('');
    }

    // Função para hash de senha (SHA-256) — funciona em localhost, HTTPS e LAN (IP local)
    async function hashPassword(password) {
        if (window.crypto && window.crypto.subtle && typeof window.crypto.subtle.digest === 'function') {
            try {
                const msgBuffer = new TextEncoder().encode(password);
                const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            } catch (err) {
                console.warn('crypto.subtle indisponível, usando fallback SHA-256:', err);
            }
        }
        return sha256HexFallback(password);
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
