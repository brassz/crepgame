(function(){
    var DEFAULT_BALANCE = 1000;

    function getUserId(){
        return sb && sb.auth && sb.auth.getUser ? sb.auth.getUser().then(function(r){ return r.data && r.data.user ? r.data.user.id : null; }) : Promise.resolve(null);
    }

    function ensureProfile(userId){
        // Validate user ID before proceeding
        if (!userId || userId === '00000000-0000-0000-0000-000000000000') {
            return Promise.reject(new Error('Invalid or null user ID provided'));
        }

        return sb.from('profiles').select('id,balance').eq('id', userId).maybeSingle()
            .then(function(res){
                if (res.error && res.error.code !== 'PGRST116') { // not found vs other errors
                    throw res.error;
                }
                if (!res.data) {
                    // Verify user exists in auth.users before creating profile
                    return sb.auth.admin.getUserById(userId).then(function(userRes){
                        if (userRes.error || !userRes.data.user) {
                            throw new Error('User does not exist in authentication system');
                        }
                        // User exists, safe to create profile
                        return sb.from('profiles').insert({ 
                            id: userId, 
                            balance: DEFAULT_BALANCE,
                            email: userRes.data.user.email,
                            username: userRes.data.user.user_metadata?.username || userRes.data.user.email?.split('@')[0]
                        }).select('id,balance').single();
                    }).catch(function(authError){
                        // If admin API not available (client-side), try direct insert with better error handling
                        console.warn('Cannot verify user existence, attempting direct profile creation');
                        return sb.from('profiles').insert({ 
                            id: userId, 
                            balance: DEFAULT_BALANCE 
                        }).select('id,balance').single().catch(function(insertError){
                            // Check if it's a foreign key constraint error
                            if (insertError.code === '23503' && insertError.message.includes('profiles_id_fkey')) {
                                throw new Error('Cannot create profile: User ID does not exist in authentication system');
                            }
                            throw insertError;
                        });
                    });
                }
                return res;
            });
    }

    function getBalance(userId){
        return sb.from('profiles').select('balance').eq('id', userId).single();
    }

    function setBalance(userId, balance){
        return sb.from('profiles').update({ balance: Math.max(0, Math.floor(balance)) }).eq('id', userId);
    }

    window.Profile = {
        DEFAULT_BALANCE: DEFAULT_BALANCE,
        getUserId: getUserId,
        ensureProfile: ensureProfile,
        getBalance: getBalance,
        setBalance: setBalance
    };
})();

