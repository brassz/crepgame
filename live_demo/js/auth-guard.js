(function(){
    function redirectToLogin(){
        var base = window.location.pathname.replace('index.html','');
        window.location.href = base + 'login.html';
    }
    if (!window.sb || !window.sb.auth) {
        // Supabase not ready yet; try after DOM load
        document.addEventListener('DOMContentLoaded', function(){
            if (!window.sb || !window.sb.auth) {
                redirectToLogin();
                return;
            }
            window.sb.auth.getSession().then(function(res){
                if(!res.data || !res.data.session){
                    redirectToLogin();
                }
            });
        });
        return;
    }
    window.sb.auth.getSession().then(function(res){
        if(!res.data || !res.data.session){
            redirectToLogin();
        }
    });
})();

