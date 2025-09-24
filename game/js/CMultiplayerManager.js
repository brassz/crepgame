function CMultiplayerManager(){
    var _aOnlinePlayers;
    var _sCurrentRoom;
    var _oSocket;
    var _bConnected;
    var _sPlayerId;
    
    this._init = function(){
        _aOnlinePlayers = [];
        _sCurrentRoom = "bronze";
        _bConnected = false;
        _sPlayerId = this._generatePlayerId();
        
        // Simular conexão WebSocket (aqui você implementaria WebSocket real)
        this._simulateConnection();
    };
    
    this._generatePlayerId = function(){
        return 'player_' + Math.random().toString(36).substr(2, 9);
    };
    
    this._simulateConnection = function(){
        // Simular delay de conexão
        setTimeout(function(){
            s_oMultiplayerManager._onConnectionEstablished();
        }, 1000);
    };
    
    this._onConnectionEstablished = function(){
        _bConnected = true;
        console.log("Multiplayer conectado. ID:", _sPlayerId);
        
        // Simular jogadores online iniciais
        this._addDummyPlayers();
        
        // Atualizar contagem de jogadores na interface
        this._updatePlayersCount();
    };
    
    this._addDummyPlayers = function(){
        var aRooms = ["bronze", "prata", "ouro"];
        
        for(var i = 0; i < aRooms.length; i++){
            var sRoom = aRooms[i];
            var iMaxPlayers = s_oRoomConfig.getRoomMaxPlayers(sRoom);
            var iCurrentPlayers = Math.floor(Math.random() * (iMaxPlayers - 1)) + 1;
            
            for(var j = 0; j < iCurrentPlayers; j++){
                _aOnlinePlayers.push({
                    id: 'bot_' + Math.random().toString(36).substr(2, 9),
                    name: 'Jogador ' + (j + 1),
                    room: sRoom,
                    balance: this._generateRandomBalance(sRoom),
                    isBot: true
                });
            }
        }
        
        console.log("Jogadores online inicializados:", _aOnlinePlayers.length);
    };
    
    this._generateRandomBalance = function(sRoom){
        var oRoomConfig = s_oRoomConfig.getRoomConfig(sRoom);
        var iMinBet = oRoomConfig.min_bet;
        var iMaxBet = oRoomConfig.max_bet;
        
        // Gerar saldo baseado no tipo de mesa
        var iMinBalance = iMinBet * 10;
        var iMaxBalance = iMaxBet ? iMaxBet * 5 : 50000;
        
        return Math.floor(Math.random() * (iMaxBalance - iMinBalance)) + iMinBalance;
    };
    
    this.joinRoom = function(sRoomType){
        _sCurrentRoom = sRoomType;
        
        // Adicionar jogador atual à sala
        var oPlayer = {
            id: _sPlayerId,
            name: "Você",
            room: sRoomType,
            balance: TOTAL_MONEY,
            isBot: false
        };
        
        // Remover jogador de outras salas primeiro
        _aOnlinePlayers = _aOnlinePlayers.filter(function(player){
            return player.id !== _sPlayerId;
        });
        
        // Adicionar à nova sala
        _aOnlinePlayers.push(oPlayer);
        
        console.log("Jogador entrou na sala:", sRoomType);
        this._updatePlayersCount();
        
        // Simular entrada/saída aleatória de bots
        this._startRandomPlayerActivity();
    };
    
    this.leaveRoom = function(){
        if(!_sCurrentRoom) return;
        
        // Remover jogador da sala atual
        _aOnlinePlayers = _aOnlinePlayers.filter(function(player){
            return player.id !== _sPlayerId;
        });
        
        console.log("Jogador saiu da sala:", _sCurrentRoom);
        _sCurrentRoom = null;
        this._updatePlayersCount();
    };
    
    this.getRoomPlayers = function(sRoomType){
        return _aOnlinePlayers.filter(function(player){
            return player.room === sRoomType;
        });
    };
    
    this.getRoomPlayersCount = function(sRoomType){
        return this.getRoomPlayers(sRoomType).length;
    };
    
    this.getCurrentRoomPlayers = function(){
        if(!_sCurrentRoom) return [];
        return this.getRoomPlayers(_sCurrentRoom);
    };
    
    this._updatePlayersCount = function(){
        // Atualizar interface com contagem de jogadores
        if(window.s_oInterface && s_oInterface.updatePlayersCount){
            var aRoomTypes = s_oRoomConfig.getRoomTypes();
            for(var i = 0; i < aRoomTypes.length; i++){
                var sRoom = aRoomTypes[i];
                var iCount = this.getRoomPlayersCount(sRoom);
                s_oInterface.updatePlayersCount(sRoom, iCount);
            }
        }
        
        // Atualizar seletor de salas se estiver ativo
        if(window.s_oRoomSelector && s_oRoomSelector.updatePlayersCount){
            s_oRoomSelector.updatePlayersCount();
        }
    };
    
    this._startRandomPlayerActivity = function(){
        // Simular atividade aleatória de jogadores (entrar/sair)
        setInterval(function(){
            if(Math.random() < 0.3){ // 30% chance por intervalo
                s_oMultiplayerManager._simulatePlayerActivity();
            }
        }, 5000); // A cada 5 segundos
    };
    
    this._simulatePlayerActivity = function(){
        var aRoomTypes = s_oRoomConfig.getRoomTypes();
        var sRandomRoom = aRoomTypes[Math.floor(Math.random() * aRoomTypes.length)];
        var iCurrentCount = this.getRoomPlayersCount(sRandomRoom);
        var iMaxPlayers = s_oRoomConfig.getRoomMaxPlayers(sRandomRoom);
        
        if(Math.random() < 0.6 && iCurrentCount < iMaxPlayers){ // 60% chance de adicionar
            // Adicionar jogador bot
            var oNewPlayer = {
                id: 'bot_' + Math.random().toString(36).substr(2, 9),
                name: 'Jogador ' + Math.floor(Math.random() * 1000),
                room: sRandomRoom,
                balance: this._generateRandomBalance(sRandomRoom),
                isBot: true
            };
            _aOnlinePlayers.push(oNewPlayer);
        } else if(iCurrentCount > 1){ // Remover jogador bot (manter pelo menos 1)
            var aBots = _aOnlinePlayers.filter(function(player){
                return player.room === sRandomRoom && player.isBot;
            });
            
            if(aBots.length > 0){
                var oPlayerToRemove = aBots[Math.floor(Math.random() * aBots.length)];
                _aOnlinePlayers = _aOnlinePlayers.filter(function(player){
                    return player.id !== oPlayerToRemove.id;
                });
            }
        }
        
        this._updatePlayersCount();
    };
    
    this.isConnected = function(){
        return _bConnected;
    };
    
    this.getPlayerId = function(){
        return _sPlayerId;
    };
    
    this.getCurrentRoom = function(){
        return _sCurrentRoom;
    };
    
    this._init();
    
    return this;
}

var s_oMultiplayerManager = new CMultiplayerManager();