function CRoomConfig(){
    var _aRooms;
    var _oActiveSalas; // Salas ativas no momento
    var _iMaxSimultaneousSalas; // Limite de salas simultâneas
    
    this._init = function(){
        _iMaxSimultaneousSalas = 10;
        _oActiveSalas = {};
        
        _aRooms = {
            "bronze": {
                name: "Sala Bronze",
                min_bet: 50,
                max_bet: 1000,
                max_players: 8,
                description: "Sala para apostas de 50 a 1.000 reais",
                type: "bronze"
            },
            "prata": {
                name: "Sala Prata", 
                min_bet: 100,
                max_bet: 3000,
                max_players: 8,
                description: "Sala para apostas de 100 a 3.000 reais",
                type: "prata"
            },
            "ouro": {
                name: "Sala Ouro",
                min_bet: 200,
                max_bet: 5000,
                max_players: 8,
                description: "Sala para apostas de 200 a 5.000 reais", 
                type: "ouro"
            }
        };
    };
    
    this.getRoomConfig = function(sRoomType){
        // Se for uma sala específica (com ID), buscar nas salas ativas
        if(sRoomType && sRoomType.indexOf('_') > -1){
            return _oActiveSalas[sRoomType];
        }
        return _aRooms[sRoomType] || _aRooms["bronze"];
    };
    
    this.getAllRooms = function(){
        return _aRooms;
    };
    
    this.getActiveSalas = function(){
        return _oActiveSalas;
    };
    
    // Cria uma nova sala de um tipo específico
    this.createSala = function(sRoomType){
        if(Object.keys(_oActiveSalas).length >= _iMaxSimultaneousSalas){
            return null; // Limite atingido
        }
        
        if(!_aRooms[sRoomType]){
            return null; // Tipo de sala inválido
        }
        
        var sNewSalaId = sRoomType + "_" + (new Date().getTime());
        var oNewSala = Object.assign({}, _aRooms[sRoomType]);
        oNewSala.id = sNewSalaId;
        oNewSala.current_players = 0;
        oNewSala.created_at = new Date();
        oNewSala.status = "waiting"; // waiting, playing, full
        
        _oActiveSalas[sNewSalaId] = oNewSala;
        
        return oNewSala;
    };
    
    // Remove uma sala ativa
    this.removeSala = function(sSalaId){
        if(_oActiveSalas[sSalaId]){
            delete _oActiveSalas[sSalaId];
            return true;
        }
        return false;
    };
    
    // Adiciona jogador à sala
    this.joinSala = function(sSalaId){
        var oSala = _oActiveSalas[sSalaId];
        if(oSala && oSala.current_players < oSala.max_players){
            oSala.current_players++;
            if(oSala.current_players >= oSala.max_players){
                oSala.status = "full";
            }
            return true;
        }
        return false;
    };
    
    // Remove jogador da sala
    this.leaveSala = function(sSalaId){
        var oSala = _oActiveSalas[sSalaId];
        if(oSala && oSala.current_players > 0){
            oSala.current_players--;
            if(oSala.current_players === 0){
                // Remove sala se não há jogadores
                this.removeSala(sSalaId);
                return true;
            }
            if(oSala.status === "full"){
                oSala.status = "waiting";
            }
            return true;
        }
        return false;
    };
    
    // Busca salas disponíveis de um tipo específico
    this.getAvailableSalas = function(sRoomType){
        var aAvailableSalas = [];
        for(var sSalaId in _oActiveSalas){
            var oSala = _oActiveSalas[sSalaId];
            if(oSala.type === sRoomType && oSala.status !== "full"){
                aAvailableSalas.push(oSala);
            }
        }
        return aAvailableSalas;
    };
    
    // Busca ou cria uma sala disponível
    this.findOrCreateSala = function(sRoomType){
        var aAvailable = this.getAvailableSalas(sRoomType);
        if(aAvailable.length > 0){
            return aAvailable[0]; // Retorna a primeira sala disponível
        }
        // Se não há salas disponíveis, cria uma nova
        return this.createSala(sRoomType);
    };
    
    this.getRoomMinBet = function(sRoomType){
        var oRoom = this.getRoomConfig(sRoomType);
        return oRoom.min_bet;
    };
    
    this.getRoomMaxBet = function(sRoomType){
        var oRoom = this.getRoomConfig(sRoomType);
        return oRoom.max_bet;
    };
    
    this.getRoomName = function(sRoomType){
        var oRoom = this.getRoomConfig(sRoomType);
        return oRoom.name;
    };
    
    this.getRoomMaxPlayers = function(sRoomType){
        var oRoom = this.getRoomConfig(sRoomType);
        return oRoom.max_players;
    };
    
    this.getMaxSimultaneousSalas = function(){
        return _iMaxSimultaneousSalas;
    };
    
    this.getCurrentSalasCount = function(){
        return Object.keys(_oActiveSalas).length;
    };
    
    this._init();
    
    return this;
}

var s_oRoomConfig = new CRoomConfig();