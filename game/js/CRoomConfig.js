function CRoomConfig(){
    var _aRooms;
    var _oRoomStatusCache = {};
    var _iLastUpdate = 0;
    var CACHE_DURATION = 5000; // 5 segundos
    
    this._init = function(){
        _aRooms = {
            "principal": {
                name: "Mesa Principal",
                min_bet: 50,
                max_bet: null, // Sem limite máximo
                max_players: 8,
                description: "Mesa principal do jogo",
                color: "#2B5D31"
            },
            "vip": {
                name: "Mesa VIP",
                min_bet: 500,
                max_bet: null,
                max_players: 6,
                description: "Mesa VIP para apostas altas",
                color: "#8B4513"
            },
            "iniciante": {
                name: "Mesa Iniciante", 
                min_bet: 10,
                max_bet: 1000,
                max_players: 10,
                description: "Mesa para iniciantes",
                color: "#4B0082"
            }
        };
    };
    
    this.getRoomConfig = function(sRoomType){
        return _aRooms[sRoomType] || _aRooms["principal"];
    };
    
    this.getAllRooms = function(){
        return _aRooms;
    };
    
    this.getRoomMinBet = function(sRoomType){
        var oRoom = this.getRoomConfig(sRoomType);
        return oRoom.min_bet;
    };
    
    this.getRoomMaxBet = function(sRoomType){
        var oRoom = this.getRoomConfig(sRoomType);
        return oRoom.max_bet; // Retorna null se não há limite
    };
    
    this.getRoomName = function(sRoomType){
        var oRoom = this.getRoomConfig(sRoomType);
        return oRoom.name;
    };
    
    this.getRoomMaxPlayers = function(sRoomType){
        var oRoom = this.getRoomConfig(sRoomType);
        return oRoom.max_players;
    };
    
    this.getRoomColor = function(sRoomType){
        var oRoom = this.getRoomConfig(sRoomType);
        return oRoom.color || "#2B5D31";
    };
    
    this.getRoomDescription = function(sRoomType){
        var oRoom = this.getRoomConfig(sRoomType);
        return oRoom.description || "";
    };
    
    // Métodos para integração multiplayer
    this.fetchRoomStatus = function(callback) {
        var now = Date.now();
        
        // Verificar cache
        if (now - _iLastUpdate < CACHE_DURATION && Object.keys(_oRoomStatusCache).length > 0) {
            if (callback) callback(_oRoomStatusCache);
            return;
        }
        
        // Buscar do servidor
        if (typeof fetch !== 'undefined') {
            fetch('/api/rooms')
                .then(function(response) {
                    return response.json();
                })
                .then(function(data) {
                    _oRoomStatusCache = data;
                    _iLastUpdate = now;
                    if (callback) callback(data);
                })
                .catch(function(error) {
                    console.error('Erro ao buscar status das salas:', error);
                    if (callback) callback(null);
                });
        } else {
            // Fallback para dados estáticos se fetch não estiver disponível
            var fallbackData = {};
            for (var roomId in _aRooms) {
                fallbackData[roomId] = {
                    roomId: roomId,
                    config: _aRooms[roomId],
                    playerCount: 0,
                    maxPlayers: _aRooms[roomId].max_players,
                    gameState: {
                        phase: 'waiting_for_bet',
                        pointNumber: -1,
                        isRolling: false
                    },
                    players: []
                };
            }
            if (callback) callback(fallbackData);
        }
    };
    
    this.updateRoomStatus = function(roomId, status) {
        if (_oRoomStatusCache[roomId]) {
            _oRoomStatusCache[roomId] = status;
        }
    };
    
    this.clearCache = function() {
        _oRoomStatusCache = {};
        _iLastUpdate = 0;
    };
    
    this.isRoomFull = function(sRoomType) {
        if (_oRoomStatusCache[sRoomType]) {
            return _oRoomStatusCache[sRoomType].playerCount >= _oRoomStatusCache[sRoomType].maxPlayers;
        }
        return false;
    };
    
    this.getRoomPlayerCount = function(sRoomType) {
        if (_oRoomStatusCache[sRoomType]) {
            return _oRoomStatusCache[sRoomType].playerCount;
        }
        return 0;
    };
    
    this.getRoomGameState = function(sRoomType) {
        if (_oRoomStatusCache[sRoomType]) {
            return _oRoomStatusCache[sRoomType].gameState;
        }
        return {
            phase: 'waiting_for_bet',
            pointNumber: -1,
            isRolling: false
        };
    };
    
    this.getRoomPlayers = function(sRoomType) {
        if (_oRoomStatusCache[sRoomType]) {
            return _oRoomStatusCache[sRoomType].players || [];
        }
        return [];
    };
    
    // Método para obter informações formatadas de uma sala
    this.getRoomDisplayInfo = function(sRoomType) {
        var config = this.getRoomConfig(sRoomType);
        var status = _oRoomStatusCache[sRoomType];
        
        var info = {
            name: config.name,
            description: config.description,
            minBet: config.min_bet,
            maxBet: config.max_bet,
            color: config.color,
            playerCount: 0,
            maxPlayers: config.max_players,
            isFull: false,
            gamePhase: 'waiting_for_bet',
            pointNumber: -1,
            isActive: false
        };
        
        if (status) {
            info.playerCount = status.playerCount;
            info.isFull = status.playerCount >= status.maxPlayers;
            info.gamePhase = status.gameState.phase;
            info.pointNumber = status.gameState.pointNumber;
            info.isActive = status.playerCount > 0;
        }
        
        return info;
    };
    
    // Método para validar se um jogador pode entrar em uma sala
    this.canJoinRoom = function(sRoomType, iPlayerBalance) {
        var config = this.getRoomConfig(sRoomType);
        var status = _oRoomStatusCache[sRoomType];
        
        // Verificar se a sala existe
        if (!config) {
            return { canJoin: false, reason: "Sala não encontrada" };
        }
        
        // Verificar saldo mínimo
        if (iPlayerBalance < config.min_bet) {
            return { canJoin: false, reason: "Saldo insuficiente para a aposta mínima" };
        }
        
        // Verificar se a sala não está cheia
        if (status && status.playerCount >= config.max_players) {
            return { canJoin: false, reason: "Sala lotada" };
        }
        
        return { canJoin: true };
    };
    
    this._init();
    
    return this;
}

var s_oRoomConfig = new CRoomConfig();