function CRoomSelector(){
    var _oBg;
    var _oContainer;
    var _aRoomButtons;
    var _oSelectedRoom;
    var _oTitleText;
    var _oDescText;
    var _oStartButton;
    var _oBackButton;
    var _sFadeInTween;
    var _sFadeOutTween;
    
    var _pStartPosTitle = {x: CANVAS_WIDTH/2, y: 120};
    var _pStartPosDesc = {x: CANVAS_WIDTH/2, y: 520};
    var _pStartPosStart = {x: CANVAS_WIDTH/2 + 150, y: 620};
    var _pStartPosBack = {x: CANVAS_WIDTH/2 - 150, y: 620};
    
    this._init = function(){
        _oContainer = new createjs.Container();
        s_oStage.addChild(_oContainer);
        
        // Background
        _oBg = new createjs.Shape();
        _oBg.graphics.beginFill("rgba(0,0,0,0.8)").drawRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
        _oContainer.addChild(_oBg);
        
        // Title
        _oTitleText = new CTLText(_oContainer, 
                    _pStartPosTitle.x - 200, _pStartPosTitle.y - 20, 400, 40, 
                    32, "center", "#fff", FONT1, 1,
                    0, 0,
                    TEXT_SELECT_TABLE,
                    true, true, false,
                    false );
        
        // Description
        _oDescText = new CTLText(_oContainer, 
                    _pStartPosDesc.x - 300, _pStartPosDesc.y - 30, 600, 60, 
                    18, "center", "#ffde00", FONT1, 1,
                    0, 0,
                    TEXT_SELECT_TABLE_DESC,
                    true, true, true,
                    false );
        
        this._createRoomButtons();
        
        // Start button
        _oStartButton = new CTextButton(_pStartPosStart.x, _pStartPosStart.y, 
                        s_oSpriteLibrary.getSprite('but_play'), 
                        TEXT_START, FONT1, "#fff", 20, "center", _oContainer);
        _oStartButton.addEventListener(ON_MOUSE_UP, this._onStartGame, this);
        _oStartButton.setVisible(false);
        
        // Back button  
        _oBackButton = new CTextButton(_pStartPosBack.x, _pStartPosBack.y,
                        s_oSpriteLibrary.getSprite('but_exit'), 
                        TEXT_BACK, FONT1, "#fff", 20, "center", _oContainer);
        _oBackButton.addEventListener(ON_MOUSE_UP, this._onBack, this);
        
        _aRoomButtons = [];
        _oSelectedRoom = null;
        
        this._showWithAnimation();
    };
    
    this._createRoomButtons = function(){
        var aRooms = s_oRoomConfig.getAllRooms();
        var aRoomKeys = ["bronze", "prata", "ouro"]; // Ordem específica
        var iRoomCount = aRoomKeys.length;
        
        var iStartX = CANVAS_WIDTH/2 - ((iRoomCount - 1) * 200) / 2;
        var iY = 320;
        
        for(var i = 0; i < aRoomKeys.length; i++){
            var sRoomKey = aRoomKeys[i];
            var oRoom = aRooms[sRoomKey];
            
            if(oRoom){
                var iX = iStartX + (i * 200);
                this._createRoomButton(iX, iY, sRoomKey, oRoom);
            }
        }
    };
    
    this._createRoomButton = function(iX, iY, sRoomKey, oRoomData){
        // Container do botão
        var oButtonContainer = new createjs.Container();
        oButtonContainer.x = iX;
        oButtonContainer.y = iY;
        _oContainer.addChild(oButtonContainer);
        
        // Background do botão com cor da mesa
        var oButtonBg = new createjs.Shape();
        oButtonBg.graphics.beginLinearGradientFill([oRoomData.color, "#333"], [0, 1], 0, -60, 0, 60)
                         .drawRoundRect(-80, -60, 160, 120, 10);
        oButtonContainer.addChild(oButtonBg);
        
        // Borda
        var oBorder = new createjs.Shape();
        oBorder.graphics.setStrokeStyle(3).beginStroke("#fff")
                       .drawRoundRect(-80, -60, 160, 120, 10);
        oButtonContainer.addChild(oBorder);
        
        // Nome da mesa
        var oNameText = new CTLText(oButtonContainer, 
                    -70, -35, 140, 25, 
                    18, "center", "#000", FONT1, 1.2,
                    0, 0,
                    oRoomData.name,
                    true, true, false,
                    false );
        
        // Informações da mesa
        var sInfo = "Min: R$" + oRoomData.min_bet + "\n" +
                   "Max: R$" + oRoomData.max_bet + "\n" + 
                   "Players: " + oRoomData.max_players;
                   
        var oInfoText = new CTLText(oButtonContainer, 
                    -70, -10, 140, 50, 
                    14, "center", "#000", FONT1, 1,
                    0, 0,
                    sInfo,
                    true, true, true,
                    false );
        
        // Eventos do botão
        oButtonContainer.cursor = "pointer";
        oButtonContainer.on("mousedown", this._onRoomSelect.bind(this, sRoomKey, oButtonContainer, oBorder));
        oButtonContainer.on("mouseover", function(){
            oButtonContainer.scaleX = oButtonContainer.scaleY = 1.05;
        });
        oButtonContainer.on("mouseout", function(){
            oButtonContainer.scaleX = oButtonContainer.scaleY = 1;
        });
        
        // Guardar referência
        _aRoomButtons.push({
            key: sRoomKey,
            container: oButtonContainer,
            border: oBorder,
            data: oRoomData
        });
    };
    
    this._onRoomSelect = function(sRoomKey, oContainer, oBorder){
        // Limpar seleção anterior
        for(var i = 0; i < _aRoomButtons.length; i++){
            _aRoomButtons[i].border.graphics.clear()
                           .setStrokeStyle(3).beginStroke("#fff")
                           .drawRoundRect(-80, -60, 160, 120, 10);
        }
        
        // Destacar seleção atual
        oBorder.graphics.clear()
               .setStrokeStyle(5).beginStroke("#ffde00")
               .drawRoundRect(-80, -60, 160, 120, 10);
        
        _oSelectedRoom = sRoomKey;
        
        // Atualizar descrição
        var oRoom = s_oRoomConfig.getRoomConfig(sRoomKey);
        _oDescText.refreshText(oRoom.description);
        
        // Mostrar botão de iniciar
        _oStartButton.setVisible(true);
        
        playSound("click", 0.5, false);
    };
    
    this._onStartGame = function(){
        if(_oSelectedRoom){
            // Salvar seleção de mesa
            localStorage.setItem("selected_room", _oSelectedRoom);
            
            this._hideWithAnimation(function(){
                s_oMain.gotoGame();
            });
        }
    };
    
    this._onBack = function(){
        this._hideWithAnimation(function(){
            s_oMain.gotoMenu();
        });
    };
    
    this._showWithAnimation = function(){
        _oContainer.alpha = 0;
        _oContainer.scaleX = _oContainer.scaleY = 0.8;
        
        _sFadeInTween = createjs.Tween.get(_oContainer)
                      .to({alpha: 1, scaleX: 1, scaleY: 1}, 400, createjs.Ease.backOut);
    };
    
    this._hideWithAnimation = function(callback){
        _sFadeOutTween = createjs.Tween.get(_oContainer)
                        .to({alpha: 0, scaleX: 0.8, scaleY: 0.8}, 300, createjs.Ease.backIn)
                        .call(function(){
                            if(callback) callback();
                        });
    };
    
    this.unload = function(){
        if(_sFadeInTween) _sFadeInTween.paused = true;
        if(_sFadeOutTween) _sFadeOutTween.paused = true;
        
        _oStartButton.unload();
        _oBackButton.unload();
        
        s_oStage.removeChild(_oContainer);
        _oContainer = null;
    };
    
    this._init();
}

var s_oRoomSelector = null;