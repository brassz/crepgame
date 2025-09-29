function CMultiplayerManager(){
    var _aRooms;
    var _oCurrentPlayer;
    var _sCurrentRoom;
    var _oBankSystem;
    
    this._init = function(){
        _aRooms = {};
        _oCurrentPlayer = null;
        _sCurrentRoom = "bronze"; // Sala padrão
        _oBankSystem = new CBankSystem();
        
        // Inicializar as salas
        var aAllRooms = s_oRoomConfig.getAllRooms();
        for(var sRoomType in aAllRooms){
            _aRooms[sRoomType] = {
                players: [],
                bank: _oBankSystem,
                active_bets: {},
                game_state: "waiting", // waiting, betting, rolling, finished
                current_round: 0
            };
        }
    };
    
    // Sistema de Jogadores
    this.addPlayerToRoom = function(oPlayer, sRoomType){
        if(!_aRooms[sRoomType]){
            return {success: false, reason: "Sala não existe"};
        }
        
        var oRoom = _aRooms[sRoomType];
        var iMaxPlayers = s_oRoomConfig.getRoomMaxPlayers(sRoomType);
        
        if(oRoom.players.length >= iMaxPlayers){
            return {success: false, reason: "Sala lotada"};
        }
        
        // Verificar se jogador já está na sala
        for(var i = 0; i < oRoom.players.length; i++){
            if(oRoom.players[i].id === oPlayer.id){
                return {success: false, reason: "Jogador já está na sala"};
            }
        }
        
        // Remover jogador de outras salas
        this.removePlayerFromAllRooms(oPlayer.id);
        
        // Adicionar à nova sala
        oRoom.players.push(oPlayer);
        
        return {success: true, room: sRoomType, players_count: oRoom.players.length};
    };
    
    this.removePlayerFromRoom = function(iPlayerId, sRoomType){
        if(!_aRooms[sRoomType]) return false;
        
        var oRoom = _aRooms[sRoomType];
        for(var i = 0; i < oRoom.players.length; i++){
            if(oRoom.players[i].id === iPlayerId){
                oRoom.players.splice(i, 1);
                delete oRoom.active_bets[iPlayerId];
                return true;
            }
        }
        return false;
    };
    
    this.removePlayerFromAllRooms = function(iPlayerId){
        for(var sRoomType in _aRooms){
            this.removePlayerFromRoom(iPlayerId, sRoomType);
        }
    };
    
    this.getRoomPlayers = function(sRoomType){
        if(!_aRooms[sRoomType]) return [];
        return _aRooms[sRoomType].players;
    };
    
    this.getRoomPlayersCount = function(sRoomType){
        if(!_aRooms[sRoomType]) return 0;
        return _aRooms[sRoomType].players.length;
    };
    
    // Sistema de Apostas
    this.placeBet = function(iPlayerId, sRoomType, sBetType, iBetAmount){
        if(!_aRooms[sRoomType]) return {success: false, reason: "Sala não existe"};
        
        // Validar aposta para a sala
        var oValidation = s_oRoomConfig.validateBetForRoom(sRoomType, iBetAmount);
        if(!oValidation.valid){
            return {success: false, reason: oValidation.reason};
        }
        
        var oRoom = _aRooms[sRoomType];
        
        // Verificar se jogador está na sala
        var bPlayerInRoom = false;
        for(var i = 0; i < oRoom.players.length; i++){
            if(oRoom.players[i].id === iPlayerId){
                bPlayerInRoom = true;
                break;
            }
        }
        
        if(!bPlayerInRoom){
            return {success: false, reason: "Jogador não está na sala"};
        }
        
        // Inicializar apostas do jogador se não existir
        if(!oRoom.active_bets[iPlayerId]){
            oRoom.active_bets[iPlayerId] = {};
        }
        
        // Adicionar/atualizar aposta
        if(!oRoom.active_bets[iPlayerId][sBetType]){
            oRoom.active_bets[iPlayerId][sBetType] = 0;
        }
        oRoom.active_bets[iPlayerId][sBetType] += iBetAmount;
        
        return {success: true, total_bet: oRoom.active_bets[iPlayerId][sBetType]};
    };
    
    this.getRoomBets = function(sRoomType){
        if(!_aRooms[sRoomType]) return {};
        return _aRooms[sRoomType].active_bets;
    };
    
    this.getPlayerBets = function(iPlayerId, sRoomType){
        if(!_aRooms[sRoomType] || !_aRooms[sRoomType].active_bets[iPlayerId]) return {};
        return _aRooms[sRoomType].active_bets[iPlayerId];
    };
    
    // Estado do Jogo
    this.setRoomGameState = function(sRoomType, sState){
        if(!_aRooms[sRoomType]) return false;
        _aRooms[sRoomType].game_state = sState;
        return true;
    };
    
    this.getRoomGameState = function(sRoomType){
        if(!_aRooms[sRoomType]) return "unknown";
        return _aRooms[sRoomType].game_state;
    };
    
    // Sistema da Banca
    this.getBankCoverage = function(sRoomType){
        if(!_aRooms[sRoomType]) return 0;
        return _aRooms[sRoomType].bank.getCoverageAmount(sRoomType);
    };
    
    this.calculateRoomPayout = function(sRoomType, aResults){
        if(!_aRooms[sRoomType]) return {player_payouts: {}, bank_coverage: 0};
        
        var oRoom = _aRooms[sRoomType];
        var oPlayerPayouts = {};
        var iTotalPayout = 0;
        var iTotalBets = 0;
        
        // Calcular pagamentos para cada jogador
        for(var iPlayerId in oRoom.active_bets){
            oPlayerPayouts[iPlayerId] = 0;
            var oPlayerBets = oRoom.active_bets[iPlayerId];
            
            for(var sBetType in oPlayerBets){
                var iBetAmount = oPlayerBets[sBetType];
                iTotalBets += iBetAmount;
                
                // Verificar se a aposta ganhou
                if(this._checkBetWin(sBetType, aResults)){
                    var iWinAmount = this._calculateBetPayout(sBetType, iBetAmount);
                    oPlayerPayouts[iPlayerId] += iWinAmount;
                    iTotalPayout += iWinAmount;
                }
            }
        }
        
        // Calcular cobertura da banca
        var iBankCoverage = _aRooms[sRoomType].bank.calculateCoverage(sRoomType, iTotalBets, iTotalPayout);
        
        return {
            player_payouts: oPlayerPayouts,
            bank_coverage: iBankCoverage,
            total_bets: iTotalBets,
            total_payout: iTotalPayout
        };
    };
    
    this.clearRoomBets = function(sRoomType){
        if(!_aRooms[sRoomType]) return false;
        _aRooms[sRoomType].active_bets = {};
        return true;
    };
    
    // Métodos auxiliares
    this._checkBetWin = function(sBetType, aResults){
        // Implementar lógica específica do jogo para verificar se aposta ganhou
        // Esta é uma implementação simplificada - deve ser expandida conforme as regras do jogo
        switch(sBetType){
            case "pass_line":
                return aResults.pass_line_win || false;
            case "dont_pass":
                return aResults.dont_pass_win || false;
            case "field":
                return aResults.field_win || false;
            case "any_craps":
                return aResults.any_craps_win || false;
            default:
                return false;
        }
    };
    
    this._calculateBetPayout = function(sBetType, iBetAmount){
        // Implementar cálculo de pagamento específico do jogo
        // Esta é uma implementação simplificada - deve ser expandida conforme as regras do jogo
        switch(sBetType){
            case "pass_line":
                return iBetAmount * 2; // 1:1
            case "dont_pass":
                return iBetAmount * 2; // 1:1
            case "field":
                return iBetAmount * 2; // 1:1 (pode variar)
            case "any_craps":
                return iBetAmount * 8; // 7:1
            default:
                return iBetAmount;
        }
    };
    
    // Getters/Setters
    this.getCurrentRoom = function(){
        return _sCurrentRoom;
    };
    
    this.setCurrentRoom = function(sRoomType){
        if(_aRooms[sRoomType]){
            _sCurrentRoom = sRoomType;
            return true;
        }
        return false;
    };
    
    this.getCurrentPlayer = function(){
        return _oCurrentPlayer;
    };
    
    this.setCurrentPlayer = function(oPlayer){
        _oCurrentPlayer = oPlayer;
    };
    
    this.getAllRooms = function(){
        return _aRooms;
    };
    
    this.getRoomInfo = function(sRoomType){
        if(!_aRooms[sRoomType]) return null;
        
        var oRoom = _aRooms[sRoomType];
        var oConfig = s_oRoomConfig.getRoomConfig(sRoomType);
        
        return {
            name: oConfig.name,
            level: oConfig.level,
            color: oConfig.color,
            min_bet: oConfig.min_bet,
            max_bet: oConfig.max_bet,
            max_players: oConfig.max_players,
            current_players: oRoom.players.length,
            game_state: oRoom.game_state,
            description: oConfig.description
        };
    };
    
    this._init();
    
    return this;
}

// Sistema da Banca
function CBankSystem(){
    var _aBankFunds;
    
    this._init = function(){
        // Fundos da banca para cada sala
        _aBankFunds = {
            "bronze": 50000,  // 50k para sala bronze
            "prata": 150000,  // 150k para sala prata  
            "ouro": 300000    // 300k para sala ouro
        };
    };
    
    this.getCoverageAmount = function(sRoomType){
        return _aBankFunds[sRoomType] || 0;
    };
    
    this.calculateCoverage = function(sRoomType, iTotalBets, iTotalPayout){
        var iBankFunds = _aBankFunds[sRoomType] || 0;
        
        // Se há mais apostas que pagamentos, banca lucra
        if(iTotalBets > iTotalPayout){
            var iProfit = iTotalBets - iTotalPayout;
            _aBankFunds[sRoomType] += iProfit;
            return 0; // Banca não precisa cobrir nada
        }
        
        // Se há mais pagamentos que apostas, banca cobre a diferença
        var iDeficit = iTotalPayout - iTotalBets;
        if(iDeficit <= iBankFunds){
            _aBankFunds[sRoomType] -= iDeficit;
            return iDeficit; // Valor que a banca cobriu
        } else {
            // Banca não tem fundos suficientes - situação crítica
            var iAvailable = _aBankFunds[sRoomType];
            _aBankFunds[sRoomType] = 0;
            return iAvailable; // Cobriu o que podia
        }
    };
    
    this.addFunds = function(sRoomType, iAmount){
        if(!_aBankFunds[sRoomType]) _aBankFunds[sRoomType] = 0;
        _aBankFunds[sRoomType] += iAmount;
    };
    
    this.getAllFunds = function(){
        return _aBankFunds;
    };
    
    this._init();
    
    return this;
}

var s_oMultiplayerManager = new CMultiplayerManager();