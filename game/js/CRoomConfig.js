function CRoomConfig(){
    var _aRooms;
    var _sCurrentRoom;
    
    this._init = function(){
        _aRooms = {
            "bronze": {
                name: "Mesa Bronze",
                min_bet: 50,
                max_bet: 1000,
                max_players: 8,
                description: "Mesa para iniciantes - Apostas de $50 a $1.000",
                color: "#CD7F32",
                icon: "bronze_icon",
                level_required: 1
            },
            "prata": {
                name: "Mesa Prata", 
                min_bet: 100,
                max_bet: 3000,
                max_players: 8,
                description: "Mesa intermediária - Apostas de $100 a $3.000",
                color: "#C0C0C0",
                icon: "silver_icon",
                level_required: 5
            },
            "ouro": {
                name: "Mesa Ouro",
                min_bet: 200,
                max_bet: 5000,
                max_players: 8,
                description: "Mesa premium - Apostas de $200 a $5.000",
                color: "#FFD700",
                icon: "gold_icon",
                level_required: 10
            }
        };
        
        // Mesa padrão é bronze
        _sCurrentRoom = "bronze";
    };
    
    this.setCurrentRoom = function(sRoomType){
        if(_aRooms[sRoomType]){
            _sCurrentRoom = sRoomType;
            return true;
        }
        return false;
    };
    
    this.getCurrentRoom = function(){
        return _sCurrentRoom;
    };
    
    this.getCurrentRoomConfig = function(){
        return _aRooms[_sCurrentRoom];
    };
    
    this.getRoomConfig = function(sRoomType){
        return _aRooms[sRoomType] || _aRooms["bronze"];
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
    
    this.getRoomColor = function(sRoomType){
        var oRoom = this.getRoomConfig(sRoomType);
        return oRoom.color;
    };
    
    this.getRoomDescription = function(sRoomType){
        var oRoom = this.getRoomConfig(sRoomType);
        return oRoom.description;
    };
    
    this.getRoomLevelRequired = function(sRoomType){
        var oRoom = this.getRoomConfig(sRoomType);
        return oRoom.level_required;
    };
    
    this.canPlayerAccessRoom = function(sRoomType, iPlayerLevel){
        var oRoom = this.getRoomConfig(sRoomType);
        return iPlayerLevel >= oRoom.level_required;
    };
    
    this._init();
    
    return this;
}

var s_oRoomConfig = new CRoomConfig();