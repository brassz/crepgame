// Funções utilitárias para o sistema de salas

function formatMoney(value) {
    if (typeof value !== 'number') return '0';
    return value.toLocaleString('pt-BR', { 
        minimumFractionDigits: 0,
        maximumFractionDigits: 0 
    });
}

// Gera ID único para jogadores
function generatePlayerId() {
    return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Valida se um jogador pode entrar numa sala
function canPlayerAffordRoom(balance, roomType) {
    if (!s_oRoomConfig) return false;
    var roomConfig = s_oRoomConfig.getRoomConfig(roomType);
    return balance >= roomConfig.min_bet;
}