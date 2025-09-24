function CRoomConfig(){
    var _aRooms;
    
    this._init = function(){
        _aRooms = {
            "bronze": {
                name: "Mesa Bronze",
                min_bet: 50,
                max_bet: 1000,
                max_players: 8,
                description: "Mesa para iniciantes",
                color: "#CD7F32",
                icon: "bronze_icon"
            },
            "prata": {
                name: "Mesa Prata", 
                min_bet: 100,
                max_bet: 3000,
                max_players: 6,
                description: "Mesa intermediária",
                color: "#C0C0C0",
                icon: "silver_icon"
            },
            "ouro": {
                name: "Mesa Ouro",
                min_bet: 200,
                max_bet: 5000,
                max_players: 4,
                description: "Mesa para experientes",
                color: "#FFD700", 
                icon: "gold_icon"
            }
        };
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
        return oRoom.color;
    };
    
    this.getRoomIcon = function(sRoomType){
        var oRoom = this.getRoomConfig(sRoomType);
        return oRoom.icon;
    };
    
    this.getRoomDescription = function(sRoomType){
        var oRoom = this.getRoomConfig(sRoomType);
        return oRoom.description;
    };
    
    this.getRoomTypes = function(){
        return Object.keys(_aRooms);
    };
    
    this._init();
    
    return this;
}

var s_oRoomConfig = new CRoomConfig();