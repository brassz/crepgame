// Sistema de Profile usando autenticação customizada
(function(){
    var DEFAULT_BALANCE = 1000;

    function getUserId(){
        var user = window.customAuth ? window.customAuth.getCurrentUser() : null;
        return Promise.resolve(user ? user.id : null);
    }

    function getCurrentUser(){
        return window.customAuth ? window.customAuth.getCurrentUser() : null;
    }

    function getBalance(){
        var user = getCurrentUser();
        if (!user) {
            return Promise.reject(new Error('Usuário não autenticado'));
        }
        return Promise.resolve({ data: { balance: user.balance }, error: null });
    }

    function setBalance(userId, newBalance){
        if (!window.sbClient) {
            return Promise.reject(new Error('Cliente Supabase não inicializado'));
        }
        
        // Atualizar no servidor
        return window.sbClient.rpc('update_user_balance', {
            p_user_id: userId,
            p_new_balance: Math.max(0, Math.floor(newBalance))
        }).then(function(response){
            if (response.error) {
                throw response.error;
            }
            
            // Atualizar localmente
            var user = getCurrentUser();
            if (user && user.id === userId) {
                user.balance = Math.max(0, Math.floor(newBalance));
                window.customAuth.updateCurrentUser(user);
            }
            
            return response;
        });
    }

    function refreshBalance(userId){
        if (!userId) {
            var user = getCurrentUser();
            userId = user ? user.id : null;
        }
        
        if (!userId) {
            return Promise.reject(new Error('Usuário não autenticado'));
        }
        
        return window.customAuth.refreshUserBalance(userId);
    }

    function ensureProfile(userId){
        // No sistema customizado, o perfil sempre existe após o login
        // Apenas retornar os dados do usuário atual
        return getUserId().then(function(id){
            if (!id || id !== userId) {
                throw new Error('Usuário não autenticado');
            }
            var user = getCurrentUser();
            return { 
                data: { 
                    id: user.id, 
                    balance: user.balance 
                }, 
                error: null 
            };
        });
    }

    window.ProfileCustom = {
        DEFAULT_BALANCE: DEFAULT_BALANCE,
        getUserId: getUserId,
        getCurrentUser: getCurrentUser,
        getBalance: getBalance,
        setBalance: setBalance,
        refreshBalance: refreshBalance,
        ensureProfile: ensureProfile
    };
    
    // Alias para compatibilidade
    window.Profile = window.ProfileCustom;
})();
