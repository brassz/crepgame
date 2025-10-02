// Script de depuração para testar sincronização de dados
// Execute este script no console do navegador para diagnosticar problemas

function debugSyncSetup() {
    console.log('🔍 === DIAGNÓSTICO DE SINCRONIZAÇÃO DE DADOS ===');
    
    // Verificar componentes básicos
    console.log('\n📦 1. COMPONENTES DISPONÍVEIS:');
    console.log('  - window.sb (Supabase):', !!window.sb);
    console.log('  - window.SupabaseMultiplayer:', !!window.SupabaseMultiplayer);
    console.log('  - window.Realtime:', !!window.Realtime);
    console.log('  - window.s_oGame:', !!window.s_oGame);
    
    // Verificar métodos do jogo
    if (window.s_oGame) {
        console.log('\n🎮 2. MÉTODOS DO JOGO:');
        const gameMethods = Object.keys(window.s_oGame);
        console.log('  - onSynchronizedRoll:', gameMethods.includes('onSynchronizedRoll'));
        console.log('  - onServerRoll:', gameMethods.includes('onServerRoll'));
        console.log('  - _generateRandomDices:', gameMethods.includes('_generateRandomDices'));
        console.log('  - _startRollingAnim:', gameMethods.includes('_startRollingAnim'));
    }
    
    // Verificar autenticação
    if (window.sb && window.sb.auth) {
        console.log('\n🔐 3. VERIFICANDO AUTENTICAÇÃO:');
        window.sb.auth.getUser().then(function(response) {
            const user = response.data?.user;
            if (user) {
                console.log('  ✅ Usuário autenticado:', user.email || user.id);
            } else {
                console.log('  ❌ Usuário NÃO autenticado');
            }
        }).catch(function(error) {
            console.log('  ❌ Erro ao verificar autenticação:', error);
        });
    }
    
    // Verificar estado do SupabaseMultiplayer
    if (window.SupabaseMultiplayer) {
        console.log('\n🌐 4. ESTADO DO SUPABASE MULTIPLAYER:');
        console.log('  - isConnected:', window.SupabaseMultiplayer.isConnected);
        console.log('  - currentRoomId:', window.SupabaseMultiplayer.currentRoomId);
        console.log('  - currentGameSessionId:', window.SupabaseMultiplayer.currentGameSessionId);
        console.log('  - playerSessionId:', window.SupabaseMultiplayer.playerSessionId);
    }
    
    // Verificar estado do Realtime
    if (window.Realtime) {
        console.log('\n📡 5. ESTADO DO REALTIME:');
        console.log('  - isUsingSupabase():', window.Realtime.isUsingSupabase());
    }
    
    console.log('\n🔧 6. TESTES MANUAIS DISPONÍVEIS:');
    console.log('  - testRoll(): Simula uma rolagem de dados');
    console.log('  - testSync(): Testa sincronização diretamente');
    console.log('  - showRealtimeInfo(): Mostra informações da conexão real-time');
    
    return {
        hasSupabase: !!window.sb,
        hasMultiplayer: !!window.SupabaseMultiplayer,
        hasRealtime: !!window.Realtime,
        hasGame: !!window.s_oGame,
        isConnected: window.SupabaseMultiplayer?.isConnected || false
    };
}

// Função para testar rolagem manual
function testRoll() {
    console.log('🎲 Testando rolagem manual...');
    
    if (!window.s_oGame || !window.s_oGame._generateRandomDices) {
        console.error('❌ Método _generateRandomDices não disponível');
        return;
    }
    
    const dice = window.s_oGame._generateRandomDices();
    const rollData = {
        d1: dice[0],
        d2: dice[1],
        total: dice[0] + dice[1],
        ts: Date.now(),
        playerName: 'Teste Manual',
        playerId: 'test-player',
        isMyRoll: true
    };
    
    console.log('🎯 Dados gerados:', rollData);
    
    if (window.s_oGame.onSynchronizedRoll) {
        console.log('📞 Chamando onSynchronizedRoll...');
        window.s_oGame.onSynchronizedRoll(rollData);
    } else {
        console.error('❌ Método onSynchronizedRoll não disponível');
    }
}

// Função para testar sincronização
function testSync() {
    console.log('🔄 Testando sincronização...');
    
    if (!window.SupabaseMultiplayer || !window.SupabaseMultiplayer.recordSynchronizedRoll) {
        console.error('❌ recordSynchronizedRoll não disponível');
        return;
    }
    
    if (!window.SupabaseMultiplayer.isConnected) {
        console.error('❌ Não conectado a uma sala Supabase');
        return;
    }
    
    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    
    console.log(`🎲 Testando sincronização com dados: ${die1}, ${die2}`);
    
    window.SupabaseMultiplayer.recordSynchronizedRoll(die1, die2)
        .then(function(result) {
            console.log('✅ Sincronização bem-sucedida:', result);
        })
        .catch(function(error) {
            console.error('❌ Erro na sincronização:', error);
        });
}

// Função para mostrar informações do real-time
function showRealtimeInfo() {
    console.log('📡 === INFORMAÇÕES DA CONEXÃO REAL-TIME ===');
    
    if (window.SupabaseMultiplayer && window.SupabaseMultiplayer.currentRoomId) {
        console.log('🏠 Sala atual:', window.SupabaseMultiplayer.currentRoomId);
        console.log('🎮 Sessão do jogo:', window.SupabaseMultiplayer.currentGameSessionId);
        console.log('👤 Sessão do jogador:', window.SupabaseMultiplayer.playerSessionId);
        
        // Verificar subscription
        if (window.sb) {
            const channels = window.sb.getChannels();
            console.log('📺 Canais ativos:', channels.length);
            channels.forEach((channel, index) => {
                console.log(`  Canal ${index + 1}:`, channel.topic, 'Estado:', channel.state);
            });
        }
    } else {
        console.log('❌ Não há informações da sala disponíveis');
    }
}

// Tornar funções globais para uso fácil no console
window.debugSyncSetup = debugSyncSetup;
window.testRoll = testRoll;
window.testSync = testSync;
window.showRealtimeInfo = showRealtimeInfo;

console.log('🔧 Script de depuração carregado! Execute debugSyncSetup() para começar.');