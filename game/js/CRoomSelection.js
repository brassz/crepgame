function CRoomSelection(){
    var _oContainer;
    var _oBackground;
    var _oTitle;
    var _oCloseButton;
    var _aRoomButtons;
    var _oPlayerBalanceText;
    var _iPlayerBalance;
    
    this._init = function(iBalance){
        _iPlayerBalance = iBalance;
        _aRoomButtons = [];
        
        _oContainer = new createjs.Container();
        _oContainer.x = 0;
        _oContainer.y = 0;
        s_oStage.addChild(_oContainer);
        
        // Background semi-transparente
        var oBgRect = new createjs.Shape();
        oBgRect.graphics.beginFill("rgba(0,0,0,0.8)").drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        _oContainer.addChild(oBgRect);
        
        // Background do painel
        _oBackground = new createjs.Shape();
        _oBackground.graphics.beginFill("#2c3e50").beginStroke("#34495e").setStrokeStyle(3);
        _oBackground.graphics.drawRoundRect(0, 0, 800, 500, 10);
        _oBackground.x = (CANVAS_WIDTH - 800) / 2;
        _oBackground.y = (CANVAS_HEIGHT - 500) / 2;
        _oContainer.addChild(_oBackground);
        
        // Título
        _oTitle = new CTLText(_oContainer,
            _oBackground.x + 400, _oBackground.y + 40, 700, 40,
            32, "center", "#ffffff", FONT1, 1,
            0, 0,
            "SELECIONE UMA MESA",
            true, true, false, false
        );
        
        // Saldo do jogador
        _oPlayerBalanceText = new CTLText(_oContainer,
            _oBackground.x + 400, _oBackground.y + 80, 700, 30,
            20, "center", "#f1c40f", FONT1, 1,
            0, 0,
            "SEU SALDO: R$ " + formatMoney(_iPlayerBalance),
            true, true, false, false
        );
        
        this._createRoomButtons();
    };
    
    this._createRoomButtons = function(){
        var aRooms = s_oRoomConfig.getAvailableRooms(_iPlayerBalance);
        var iStartY = _oBackground.y + 140;
        var iSpacing = 120;
        
        for(var i = 0; i < aRooms.length; i++){
            var oRoom = aRooms[i];
            this._createRoomButton(oRoom, _oBackground.x + 100, iStartY + (i * iSpacing), i);
        }
    };
    
    this._createRoomButton = function(oRoomData, iX, iY, iIndex){
        var oRoom = oRoomData.config;
        var sRoomId = oRoomData.id;
        
        // Container do botão
        var oButtonContainer = new createjs.Container();
        oButtonContainer.x = iX;
        oButtonContainer.y = iY;
        _oContainer.addChild(oButtonContainer);
        
        // Background do botão
        var oButtonBg = new createjs.Shape();
        var bCanJoin = s_oRoomConfig.canPlayerJoinRoom(sRoomId, _iPlayerBalance);
        var sColor = bCanJoin ? oRoom.color : "#7f8c8d";
        var sStrokeColor = bCanJoin ? "#ffffff" : "#95a5a6";
        
        oButtonBg.graphics.beginFill(sColor).beginStroke(sStrokeColor).setStrokeStyle(2);
        oButtonBg.graphics.drawRoundRect(0, 0, 600, 100, 8);
        oButtonContainer.addChild(oButtonBg);
        
        // Ícone da sala
        var oIcon = new CTLText(oButtonContainer,
            20, 20, 60, 60,
            48, "center", "#ffffff", FONT1, 1,
            0, 0,
            oRoom.icon,
            true, true, false, false
        );
        
        // Nome da sala
        var oRoomName = new CTLText(oButtonContainer,
            100, 20, 400, 30,
            24, "left", "#ffffff", FONT1, 1,
            0, 0,
            oRoom.name,
            true, true, false, false
        );
        
        // Informações da mesa
        var sInfo = "Aposta: R$ " + oRoom.min_bet + " - R$ " + oRoom.max_bet;
        var oRoomInfo = new CTLText(oButtonContainer,
            100, 50, 400, 20,
            16, "left", "#ecf0f1", FONT1, 1,
            0, 0,
            sInfo,
            true, true, false, false
        );
        
        // Jogadores online (simulado por enquanto)
        var iPlayersOnline = Math.floor(Math.random() * oRoom.max_players);
        var oPlayersInfo = new CTLText(oButtonContainer,
            100, 70, 400, 20,
            16, "left", "#ecf0f1", FONT1, 1,
            0, 0,
            "Jogadores: " + iPlayersOnline + "/" + oRoom.max_players,
            true, true, false, false
        );
        
        // Status da mesa
        var sStatus = bCanJoin ? "JOGAR" : "SALDO INSUFICIENTE";
        var sStatusColor = bCanJoin ? "#2ecc71" : "#e74c3c";
        var oStatusText = new CTLText(oButtonContainer,
            500, 35, 80, 30,
            14, "center", sStatusColor, FONT1, 1,
            0, 0,
            sStatus,
            true, true, false, false
        );
        
        if(bCanJoin){
            oButtonContainer.cursor = "pointer";
            oButtonContainer.on("click", function(){
                this.unload();
                window.startGameInRoom(sRoomId);
            }.bind(this));
            
            oButtonContainer.on("mouseover", function(){
                oButtonBg.graphics.clear();
                oButtonBg.graphics.beginFill(sColor).beginStroke("#ffffff").setStrokeStyle(4);
                oButtonBg.graphics.drawRoundRect(0, 0, 600, 100, 8);
            });
            
            oButtonContainer.on("mouseout", function(){
                oButtonBg.graphics.clear();
                oButtonBg.graphics.beginFill(sColor).beginStroke(sStrokeColor).setStrokeStyle(2);
                oButtonBg.graphics.drawRoundRect(0, 0, 600, 100, 8);
            });
        }
        
        _aRoomButtons.push(oButtonContainer);
    };
    
    this.show = function(){
        _oContainer.visible = true;
    };
    
    this.hide = function(){
        _oContainer.visible = false;
    };
    
    this.unload = function(){
        if(_oContainer){
            s_oStage.removeChild(_oContainer);
            _oContainer = null;
        }
    };
    
    this._init(arguments[0]);
    
    return this;
}