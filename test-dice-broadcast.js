/**
 * Teste para verificar se o lançamento de dados está sendo transmitido para todos os jogadores
 * Execute este script no console do navegador após carregar o jogo
 */

async function testDiceBroadcast() {
    console.log('🧪 ===== TESTE DE TRANSMISSÃO DE DADOS =====');
    
    // 1. Verificar se o sistema está disponível
    if (!window.SupabaseRealtimeDice) {
        console.error('❌ SupabaseRealtimeDice não está disponível');
        return;
    }
    
    if (!window.sb) {
        console.error('❌ Cliente Supabase não está disponível');
        return;
    }
    
    console.log('✅ Sistemas básicos disponíveis');
    
    // 2. Obter informações de debug
    const debugInfo = window.SupabaseRealtimeDice.getDebugInfo();
    console.log('🔧 Informações de debug:', debugInfo);
    
    // 3. Testar conexão realtime
    try {
        console.log('🔧 Testando conexão realtime...');
        const connectionTest = await window.SupabaseRealtimeDice.testRealtimeConnection();
        console.log('✅ Teste de conexão realtime passou:', connectionTest);
    } catch (error) {
        console.error('❌ Teste de conexão realtime falhou:', error);
        return;
    }
    
    // 4. Verificar se há outros jogadores na sala
    try {
        const { data: roomSessions, error } = await window.sb
            .from('room_sessions')
            .select('user_id, is_active, joined_at')
            .eq('room_id', debugInfo.currentRoom)
            .eq('is_active', true);
            
        if (error) {
            console.error('❌ Erro ao buscar sessões da sala:', error);
            return;
        }
        
        console.log('👥 Jogadores ativos na sala:', roomSessions);
        
        if (roomSessions.length < 2) {
            console.warn('⚠️ Apenas 1 jogador na sala. Para testar a transmissão, abra outra aba/janela e entre na mesma sala.');
        }
    } catch (error) {
        console.error('❌ Erro ao verificar jogadores na sala:', error);
    }
    
    // 5. Verificar movimentos recentes
    try {
        const { data: recentMoves, error } = await window.sb
            .from('game_moves')
            .select('id, room_id, player_id, dice_1, dice_2, created_at')
            .eq('room_id', debugInfo.currentRoom)
            .order('created_at', { ascending: false })
            .limit(5);
            
        if (error) {
            console.error('❌ Erro ao buscar movimentos recentes:', error);
            return;
        }
        
        console.log('🎲 Movimentos recentes na sala:', recentMoves);
    } catch (error) {
        console.error('❌ Erro ao verificar movimentos recentes:', error);
    }
    
    // 6. Instruções para teste manual
    console.log('📋 ===== INSTRUÇÕES PARA TESTE MANUAL =====');
    console.log('1. Abra uma segunda aba/janela do navegador');
    console.log('2. Faça login com um usuário diferente (ou use modo incógnito)');
    console.log('3. Entre na mesma sala (' + debugInfo.currentRoom + ')');
    console.log('4. Em uma das janelas, faça uma aposta e lance os dados');
    console.log('5. Verifique se a animação aparece em AMBAS as janelas');
    console.log('');
    console.log('🔍 Para monitorar eventos em tempo real, execute:');
    console.log('window.SupabaseRealtimeDice.getDebugInfo()');
    console.log('');
    console.log('🎲 Para simular um lançamento (apenas se for sua vez):');
    console.log('window.SupabaseRealtimeDice.requestRoll()');
    
    console.log('🧪 ===== FIM DO TESTE =====');
}

// Executar o teste automaticamente
testDiceBroadcast().catch(console.error);

// Disponibilizar função globalmente para uso manual
window.testDiceBroadcast = testDiceBroadcast;