(function(){
    var DEFAULT_BALANCE = 1000;

    function getUserId(){
        return sb && sb.auth && sb.auth.getUser ? sb.auth.getUser().then(function(r){ return r.data && r.data.user ? r.data.user.id : null; }) : Promise.resolve(null);
    }

    function ensureProfile(userId){
        return sb.from('profiles').select('id,balance').eq('id', userId).maybeSingle()
            .then(function(res){
                if (res.error && res.error.code !== 'PGRST116') { // not found vs other errors
                    throw res.error;
                }
                if (!res.data) {
                    return sb.from('profiles').insert({ id: userId, balance: DEFAULT_BALANCE }).select('id,balance').single();
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

