function CTableSelector(){
    var _oContainer;
    var _oBg;
    var _oTitleText;
    var _aTableButtons;
    var _oCloseBtn;
    var _oListener;
    var _oSelectedRoom = null;
    
    this._init = function(){
        _oContainer = new createjs.Container();
        s_oStage.addChild(_oContainer);
        
        // Background overlay
        _oBg = new createjs.Shape();
        _oBg.graphics.beginFill("rgba(0,0,0,0.7)").drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        _oContainer.addChild(_oBg);
        
        // Main panel background
        var oMainBg = new createjs.Shape();
        oMainBg.graphics.beginFill("#2a2a2a").drawRoundRect(200, 100, 880, 568, 20);
        oMainBg.graphics.setStrokeStyle(3).beginStroke("#4a4a4a").drawRoundRect(200, 100, 880, 568, 20);
        _oContainer.addChild(oMainBg);
        
        // Title
        _oTitleText = new CCTLText(_oContainer, 
                    CANVAS_WIDTH/2, 150, 
                    CANVAS_WIDTH, 60, 
                    60, "center", "#ffffff", FONT_GAME, 1,
                    2, 2, "#000000",
                    true, true, false,
                    false );
        _oTitleText.text = "ESCOLHA SUA MESA";
        
        this._createTableButtons();
        
        // Close button
        var oCloseSprite = s_oSpriteLibrary.getSprite("but_exit");
        _oCloseBtn = new CGfxButton(1050, 130, oCloseSprite, _oContainer);
        _oCloseBtn.addEventListener(ON_MOUSE_UP, this._onCloseBtnRelease, this);
        
        // Add entrance animation
        _oContainer.alpha = 0;
        createjs.Tween.get(_oContainer).to({alpha: 1}, 300);
        
        _oListener = _oContainer.on("click", function(){});
        
        // Store reference for online updates
        window.s_oTableSelector = this;
        
        // Start periodic updates
        this._startPeriodicUpdates();
    };
    
    this._startPeriodicUpdates = function(){
        // Update table info every 3 seconds
        this._updateInterval = setInterval(() => {
            this.updateTableInfo();
        }, 3000);
    };
    
    this._createTableButtons = function(){
        _aTableButtons = [];
        var aRooms = s_oRoomConfig.getAllRooms();
        var aRoomTypes = Object.keys(aRooms);
        
        var iStartY = 220;
        var iSpacing = 140;
        
        for(var i = 0; i < aRoomTypes.length; i++){
            var sRoomType = aRoomTypes[i];
            var oRoom = aRooms[sRoomType];
            
            this._createTableButton(sRoomType, oRoom, 640, iStartY + (i * iSpacing));
        }
    };
    
    this._createTableButton = function(sRoomType, oRoom, iX, iY){
        var oTableContainer = new createjs.Container();
        oTableContainer.x = iX;
        oTableContainer.y = iY;
        _oContainer.addChild(oTableContainer);
        
        // Table background
        var oBg = new createjs.Shape();
        var sColor = oRoom.color || "#4a4a4a";
        oBg.graphics.beginLinearGradientFill([sColor, "#333333"], [0, 1], 0, 0, 0, 80)
                   .drawRoundRect(-300, -40, 600, 80, 10);
        oBg.graphics.setStrokeStyle(2).beginStroke("#666666").drawRoundRect(-300, -40, 600, 80, 10);
        oTableContainer.addChild(oBg);
        
        // Table name
        var oNameText = new CCTLText(oTableContainer, 
                    -280, -25, 
                    200, 30, 
                    24, "left", "#ffffff", FONT_GAME, 1,
                    1, 1, "#000000",
                    true, true, false,
                    false );
        oNameText.text = oRoom.name;
        
        // Bet range
        var sBetRange = "R$" + oRoom.min_bet + " - R$" + oRoom.max_bet;
        var oBetText = new CCTLText(oTableContainer, 
                    -280, 5, 
                    200, 20, 
                    16, "left", "#cccccc", FONT_GAME, 1,
                    1, 1, "#000000",
                    true, true, false,
                    false );
        oBetText.text = sBetRange;
        
        // Players info
        var sPlayersInfo = oRoom.current_players + "/" + oRoom.max_players + " Jogadores";
        var oPlayersText = new CCTLText(oTableContainer, 
                    0, -10, 
                    150, 20, 
                    18, "center", "#ffffff", FONT_GAME, 1,
                    1, 1, "#000000",
                    true, true, false,
                    false );
        oPlayersText.text = sPlayersInfo;
        
        // Status indicator
        var oStatusBg = new createjs.Shape();
        var sStatusColor = s_oRoomConfig.isRoomFull(sRoomType) ? "#ff4444" : "#44ff44";
        var sStatusText = s_oRoomConfig.isRoomFull(sRoomType) ? "CHEIA" : "DISPONÍVEL";
        
        oStatusBg.graphics.beginFill(sStatusColor).drawRoundRect(150, -15, 120, 30, 15);
        oTableContainer.addChild(oStatusBg);
        
        var oStatusText = new CCTLText(oTableContainer, 
                    210, -5, 
                    120, 20, 
                    14, "center", "#000000", FONT_GAME, 1,
                    0, 0, "#000000",
                    true, true, false,
                    false );
        oStatusText.text = sStatusText;
        
        // Join button
        if(!s_oRoomConfig.isRoomFull(sRoomType)){
            var oJoinBg = new createjs.Shape();
            oJoinBg.graphics.beginLinearGradientFill(["#2196F3", "#1976D2"], [0, 1], 0, 0, 0, 25)
                           .drawRoundRect(-50, -12.5, 100, 25, 12.5);
            oJoinBg.x = 210;
            oJoinBg.y = 15;
            oTableContainer.addChild(oJoinBg);
            
            var oJoinText = new CCTLText(oTableContainer, 
                        160, 8, 
                        100, 15, 
                        14, "center", "#ffffff", FONT_GAME, 1,
                        1, 1, "#000000",
                        true, true, false,
                        false );
            oJoinText.text = "ENTRAR";
            
            // Make clickable
            var oHitArea = new createjs.Shape();
            oHitArea.graphics.beginFill("rgba(0,0,0,0.01)").drawRoundRect(-300, -40, 600, 80);
            oTableContainer.addChild(oHitArea);
            
            oTableContainer.cursor = "pointer";
            oTableContainer.on("click", this._onTableSelected.bind(this, sRoomType));
            oTableContainer.on("mouseover", function(){
                createjs.Tween.get(oTableContainer).to({scaleX: 1.02, scaleY: 1.02}, 100);
            });
            oTableContainer.on("mouseout", function(){
                createjs.Tween.get(oTableContainer).to({scaleX: 1, scaleY: 1}, 100);
            });
        }
        
        _aTableButtons.push({
            container: oTableContainer,
            roomType: sRoomType,
            playersText: oPlayersText,
            statusBg: oStatusBg,
            statusText: oStatusText
        });
    };
    
    this._onTableSelected = function(sRoomType){
        if(s_oRoomConfig.isRoomFull(sRoomType)){
            return;
        }
        
        _oSelectedRoom = sRoomType;
        this._joinTable(sRoomType);
    };
    
    this._joinTable = function(sRoomType){
        // Simulate joining the table
        s_oRoomConfig.addPlayer(sRoomType);
        
        // Update current room in game
        if(window.s_oGame && window.s_oGame.setCurrentRoom){
            window.s_oGame.setCurrentRoom(sRoomType);
        } else {
            // Store for when game starts
            window.SELECTED_ROOM = sRoomType;
        }
        
        // Show joining message
        var oJoinMsg = new createjs.Container();
        s_oStage.addChild(oJoinMsg);
        
        var oMsgBg = new createjs.Shape();
        oMsgBg.graphics.beginFill("rgba(0,0,0,0.8)").drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        oJoinMsg.addChild(oMsgBg);
        
        var oMsgText = new CCTLText(oJoinMsg, 
                    CANVAS_WIDTH/2, CANVAS_HEIGHT/2, 
                    400, 60, 
                    36, "center", "#ffffff", FONT_GAME, 1,
                    2, 2, "#000000",
                    true, true, false,
                    false );
        oMsgText.text = "Entrando na " + s_oRoomConfig.getRoomName(sRoomType) + "...";
        
        // Remove message after 2 seconds and close selector
        setTimeout(() => {
            s_oStage.removeChild(oJoinMsg);
            this.unload();
            s_oMain.gotoGame();
        }, 2000);
    };
    
    this.updateTableInfo = function(){
        for(var i = 0; i < _aTableButtons.length; i++){
            var oButton = _aTableButtons[i];
            var sRoomType = oButton.roomType;
            var oRoom = s_oRoomConfig.getRoomConfig(sRoomType);
            
            // Update players count
            var sPlayersInfo = s_oRoomConfig.getCurrentPlayers(sRoomType) + "/" + oRoom.max_players + " Jogadores";
            oButton.playersText.text = sPlayersInfo;
            
            // Update status
            var bFull = s_oRoomConfig.isRoomFull(sRoomType);
            var sStatusColor = bFull ? "#ff4444" : "#44ff44";
            var sStatusText = bFull ? "CHEIA" : "DISPONÍVEL";
            
            oButton.statusBg.graphics.clear().beginFill(sStatusColor).drawRoundRect(150, -15, 120, 30, 15);
            oButton.statusText.text = sStatusText;
        }
    };
    
    this._onCloseBtnRelease = function(){
        this.unload();
    };
    
    this.addEventListener = function(sType, sCallback, sContext) {
        _oContainer.addEventListener(sType, sCallback, sContext);
    };
    
    this.unload = function(){
        if(_oListener){
            _oContainer.off("click", _oListener);
        }
        
        if(this._updateInterval){
            clearInterval(this._updateInterval);
        }
        
        // Clear reference
        if(window.s_oTableSelector === this){
            window.s_oTableSelector = null;
        }
        
        _oCloseBtn.unload();
        
        createjs.Tween.get(_oContainer).to({alpha: 0}, 200).call(() => {
            s_oStage.removeChild(_oContainer);
        });
    };
    
    this._init();
}