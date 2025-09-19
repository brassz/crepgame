/* ============================================================================
   CRAPS GAME - AUTHENTICATION INTEGRATION
   Integrates Supabase authentication with the game
   ============================================================================ */

var CAuth = function() {
    var _oThis = this;
    var _supabase = null;
    var _currentUser = null;
    var _isDemo = false;

    this.init = function() {
        // Initialize Supabase client (replace with your credentials)
        try {
            if (typeof window.supabase !== 'undefined') {
                _supabase = window.supabase.createClient(
                    'YOUR_SUPABASE_URL', // Replace with your Supabase URL
                    'YOUR_SUPABASE_ANON_KEY' // Replace with your Supabase anon key
                );
            }
        } catch (error) {
            console.log('Supabase not available, using demo mode');
        }

        this.checkAuthStatus();
    };

    this.checkAuthStatus = async function() {
        try {
            // Check for demo user first
            const demoUser = sessionStorage.getItem('demoUser');
            if (demoUser) {
                _currentUser = JSON.parse(demoUser);
                _isDemo = true;
                this.onAuthSuccess(_currentUser);
                return;
            }

            // Check for authenticated user
            if (_supabase) {
                const { data: { session } } = await _supabase.auth.getSession();
                
                if (session) {
                    // Get user data from custom table
                    const { data: userData, error } = await _supabase
                        .from('users')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();

                    if (!error && userData) {
                        _currentUser = userData;
                        _isDemo = false;
                        this.onAuthSuccess(_currentUser);
                        return;
                    }
                }
            }

            // No valid session found, redirect to login
            this.redirectToLogin();

        } catch (error) {
            console.error('Auth check error:', error);
            this.redirectToLogin();
        }
    };

    this.onAuthSuccess = function(user) {
        console.log('User authenticated:', user.username);
        
        // Update game with user data
        if (typeof s_oGameSettings !== 'undefined') {
            s_oGameSettings.setUserData(user);
        }

        // Show welcome message
        if (typeof s_oInterface !== 'undefined' && s_oInterface.showWelcomeMessage) {
            s_oInterface.showWelcomeMessage(user.username, user.balance);
        }

        // Initialize game with user's balance
        if (typeof s_oGame !== 'undefined' && s_oGame.setUserBalance) {
            s_oGame.setUserBalance(user.balance);
        }
    };

    this.redirectToLogin = function() {
        console.log('No valid session, redirecting to login');
        setTimeout(() => {
            window.location.href = '../auth/login.html';
        }, 2000);
    };

    this.getCurrentUser = function() {
        return _currentUser;
    };

    this.isDemo = function() {
        return _isDemo;
    };

    this.updateBalance = async function(newBalance) {
        if (_isDemo) {
            // Update demo user balance in sessionStorage
            _currentUser.balance = newBalance;
            sessionStorage.setItem('demoUser', JSON.stringify(_currentUser));
            return true;
        }

        if (_supabase && _currentUser) {
            try {
                const { data, error } = await _supabase
                    .from('users')
                    .update({ 
                        balance: newBalance, 
                        updated_at: new Date().toISOString() 
                    })
                    .eq('id', _currentUser.id)
                    .select()
                    .single();

                if (!error) {
                    _currentUser.balance = newBalance;
                    return true;
                }
            } catch (error) {
                console.error('Error updating balance:', error);
            }
        }

        return false;
    };

    this.recordTransaction = async function(gameId, betId, type, amount, balanceBefore, balanceAfter, description) {
        if (_isDemo) {
            // For demo mode, just log the transaction
            console.log('Demo transaction:', {
                type, amount, balanceBefore, balanceAfter, description
            });
            return true;
        }

        if (_supabase && _currentUser) {
            try {
                const { data, error } = await _supabase
                    .from('transactions')
                    .insert({
                        user_id: _currentUser.id,
                        game_id: gameId,
                        bet_id: betId,
                        transaction_type: type,
                        amount: amount,
                        balance_before: balanceBefore,
                        balance_after: balanceAfter,
                        description: description,
                        created_at: new Date().toISOString()
                    });

                return !error;
            } catch (error) {
                console.error('Error recording transaction:', error);
            }
        }

        return false;
    };

    this.logout = async function() {
        try {
            if (_isDemo) {
                sessionStorage.removeItem('demoUser');
            } else if (_supabase) {
                await _supabase.auth.signOut();
            }

            _currentUser = null;
            _isDemo = false;

            // Redirect to login
            window.location.href = '../auth/login.html';

        } catch (error) {
            console.error('Logout error:', error);
            // Force redirect anyway
            window.location.href = '../auth/login.html';
        }
    };

    this.showUserInfo = function() {
        if (_currentUser) {
            const userType = _isDemo ? ' (Visitante)' : '';
            const message = `Usuário: ${_currentUser.username}${userType}\nSaldo: R$ ${_currentUser.balance.toFixed(2)}`;
            alert(message);
        }
    };

    // Initialize on creation
    this.init();
};

// Create global auth instance
var s_oAuth = null;

// Initialize auth when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    s_oAuth = new CAuth();
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CAuth;
}