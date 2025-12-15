// Adapter para CGame.js usar autenticação customizada
// Substitui chamadas sb.auth por customAuth

(function(){
    'use strict';
    
    // Criar objeto compatível para CGame usar
    if (!window.sb) {
        window.sb = {};
    }
    
    // Criar interface compatível de auth
    window.sb.auth = {
        getUser: function() {
            return new Promise(function(resolve) {
                var user = window.customAuth ? window.customAuth.getCurrentUser() : null;
                if (user) {
                    resolve({
                        data: {
                            user: {
                                id: user.id,
                                email: user.email,
                                username: user.username
                            }
                        },
                        error: null
                    });
                } else {
                    resolve({
                        data: { user: null },
                        error: { message: 'Not authenticated' }
                    });
                }
            });
        },
        
        getSession: function() {
            return new Promise(function(resolve) {
                var user = window.customAuth ? window.customAuth.getCurrentUser() : null;
                if (user) {
                    resolve({
                        data: {
                            session: {
                                user: {
                                    id: user.id,
                                    email: user.email,
                                    username: user.username
                                }
                            }
                        },
                        error: null
                    });
                } else {
                    resolve({
                        data: { session: null },
                        error: null
                    });
                }
            });
        }
    };
    
    console.log('✅ CGame Custom Auth Adapter carregado');
})();
