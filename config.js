/* ============================================================================
   CRAPS GAME - CONFIGURATION FILE
   Configure your Supabase credentials and game settings here
   ============================================================================ */

// SUPABASE CONFIGURATION
// Replace these with your actual Supabase project credentials
// You can find these in your Supabase dashboard under Settings > API
const SUPABASE_CONFIG = {
    url: 'YOUR_SUPABASE_PROJECT_URL', // e.g., 'https://xyzcompany.supabase.co'
    anonKey: 'YOUR_SUPABASE_ANON_KEY' // Your public anon key
};

// GAME CONFIGURATION
const GAME_CONFIG = {
    // Default game settings
    defaultBalance: 1000,      // Starting balance for new users
    minBet: 50,               // Minimum bet amount
    maxBet: null,             // Maximum bet (null = no limit)
    
    // Demo mode settings
    demoBalance: 1000,        // Starting balance for demo users
    
    // UI Settings
    showWelcomeBonus: true,   // Show welcome bonus message
    enableSound: false,       // Enable sound by default
    enableFullscreen: true,   // Show fullscreen button
    
    // Session settings
    sessionTimeout: 30 * 60 * 1000, // 30 minutes in milliseconds
    autoSave: true,           // Auto-save user progress
    
    // Room settings
    maxPlayersPerRoom: 8,     // Maximum players per room
    defaultRoom: 'principal'  // Default room code
};

// AUTHENTICATION SETTINGS
const AUTH_CONFIG = {
    // Redirect URLs
    loginRedirect: '../auth/login.html',
    gameRedirect: '../game/index.html',
    
    // Session management
    rememberMeEnabled: true,
    
    // Social login providers (configure in Supabase dashboard)
    enableGoogleLogin: true,
    enableFacebookLogin: false,
    enableDiscordLogin: false,
    
    // Password requirements
    minPasswordLength: 6,
    requireSpecialChars: false,
    requireNumbers: true,
    requireUppercase: false
};

// DEVELOPMENT SETTINGS
const DEV_CONFIG = {
    // Enable console logging
    enableLogging: true,
    
    // Enable demo credentials button (only on localhost)
    enableDemoCredentials: true,
    
    // Mock Supabase for testing (when Supabase is not configured)
    mockSupabase: true,
    
    // Debug mode
    debugMode: false
};

// EXPORT CONFIGURATIONS
if (typeof window !== 'undefined') {
    // Browser environment
    window.SUPABASE_CONFIG = SUPABASE_CONFIG;
    window.GAME_CONFIG = GAME_CONFIG;
    window.AUTH_CONFIG = AUTH_CONFIG;
    window.DEV_CONFIG = DEV_CONFIG;
}

if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = {
        SUPABASE_CONFIG,
        GAME_CONFIG,
        AUTH_CONFIG,
        DEV_CONFIG
    };
}

/* ============================================================================
   SETUP INSTRUCTIONS
   ============================================================================
   
   1. CREATE SUPABASE PROJECT:
      - Go to https://supabase.com
      - Create a new project
      - Copy your project URL and anon key
      - Replace the values above
   
   2. RUN THE SQL SCHEMA:
      - Go to your Supabase dashboard
      - Navigate to SQL Editor
      - Run the contents of supabase.sql
   
   3. CONFIGURE AUTHENTICATION:
      - Go to Authentication > Settings
      - Configure your site URL
      - Enable Google OAuth if desired
      - Set up email templates
   
   4. UPDATE THIS FILE:
      - Replace YOUR_SUPABASE_PROJECT_URL with your actual URL
      - Replace YOUR_SUPABASE_ANON_KEY with your actual anon key
      - Adjust game settings as needed
   
   5. DEPLOY YOUR GAME:
      - Upload all files to your web server
      - Ensure HTTPS is enabled for production
      - Test authentication flow
   
   ============================================================================ */