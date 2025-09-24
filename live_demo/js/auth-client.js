// Initializes a global Supabase client using values from auth-config.js
// Requires the CDN script: https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
(function(){
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
        console.error("Supabase config missing. Set SUPABASE_URL and SUPABASE_ANON_KEY in game/js/auth-config.js");
        return;
    }
    if (!window.supabase || !window.supabase.createClient) {
        console.error("Supabase JS not loaded. Include the @supabase/supabase-js@2 CDN before this file.");
        return;
    }
    window.sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
})();

