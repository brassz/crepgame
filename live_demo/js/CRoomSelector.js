function CRoomSelector(){
    var _oContainer;
    var _aRoomButtons;
    var _oCurrentRoomButton;
    var _oBackgroundPanel;
    var _oTitleText;
    var _bVisible;
    var _oCallback;
    
    this._init = function(){
        _aRoomButtons = [];
        _bVisible = false;
        _oCallback = null;
        
        this._createPanel();
        this._createRoomButtons();
        
        this.hide();
    };
    
    this._createPanel = function(){
        _oContainer = new createjs.Container();
        s_oStage.addChild(_oContainer);
        
        // Background semi-transparente
        var oBackgroundGraphics = new createjs.Graphics()
            .beginFill("rgba(0,0,0,0.7)")
            .drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        _oBackgroundPanel = new createjs.Shape(oBackgroundGraphics);
        _oContainer.addChild(_oBackgroundPanel);
        
        // Painel principal
        var iPanelWidth = 600;
        var iPanelHeight = 400;
        var iPanelX = (CANVAS_WIDTH - iPanelWidth) / 2;
        var iPanelY = (CANVAS_HEIGHT - iPanelHeight) / 2;
        
        var oPanelGraphics = new createjs.Graphics()
            .beginFill("#2a2a2a")
            .beginStroke("#555")
            .setStrokeStyle(3)
            .drawRoundRect(iPanelX, iPanelY, iPanelWidth, iPanelHeight, 10);
        var oPanel = new createjs.Shape(oPanelGraphics);
        _oContainer.addChild(oPanel);
        
        // Título
        _oTitleText = new CTLText(_oContainer, 
                    iPanelX + iPanelWidth/2, iPanelY + 30, iPanelWidth, 40, 
                    28, "center", "#FFD700", FONT1, 1,
                    0, 0,
                    "SELECIONAR SALA",
                    true, true, false,
                    false );
        
        // Botão fechar
        var oCloseButton = new CTextButton(iPanelX + iPanelWidth - 60, iPanelY + 20, 
                                           s_oSpriteLibrary.getSprite('but_exit'), 
                                           "", FONT1, "#fff", 16, "center", _oContainer);
        oCloseButton.addEventListener(ON_MOUSE_UP, this.hide, this);
    };
    
    this._createRoomButtons = function(){
        var aRooms = s_oRoomConfig.getAllRooms();
        var iButtonWidth = 150;
        var iButtonHeight = 120;
        var iStartX = (CANVAS_WIDTH - (3 * iButtonWidth + 2 * 30)) / 2; // 3 botões com 30px de espaçamento
        var iStartY = (CANVAS_HEIGHT - iButtonHeight) / 2;
        var iIndex = 0;
        
        for(var sRoomType in aRooms){
            var oRoomConfig = aRooms[sRoomType];
            var iButtonX = iStartX + (iIndex * (iButtonWidth + 30));
            
            var oRoomButton = this._createRoomButton(sRoomType, oRoomConfig, iButtonX, iStartY, iButtonWidth, iButtonHeight);
            _aRoomButtons.push(oRoomButton);
            
            iIndex++;
        }
    };
    
    this._createRoomButton = function(sRoomType, oRoomConfig, iX, iY, iWidth, iHeight){
        var oButtonContainer = new createjs.Container();
        oButtonContainer.x = iX;
        oButtonContainer.y = iY;
        _oContainer.addChild(oButtonContainer);
        
        // Background do botão com cor da sala
        var oButtonGraphics = new createjs.Graphics()
            .beginFill(oRoomConfig.color)
            .beginStroke("#fff")
            .setStrokeStyle(2)
            .drawRoundRect(0, 0, iWidth, iHeight, 8);
        var oButtonBg = new createjs.Shape(oButtonGraphics);
        oButtonContainer.addChild(oButtonBg);
        
        // Efeito hover
        var oHoverGraphics = new createjs.Graphics()
            .beginFill("rgba(255,255,255,0.2)")
            .drawRoundRect(0, 0, iWidth, iHeight, 8);
        var oHoverEffect = new createjs.Shape(oHoverGraphics);
        oHoverEffect.visible = false;
        oButtonContainer.addChild(oHoverEffect);
        
        // Nome da sala
        var oNameText = new CTLText(oButtonContainer, 
                    iWidth/2, 20, iWidth-10, 25, 
                    18, "center", "#fff", FONT1, 1,
                    0, 0,
                    oRoomConfig.name,
                    true, true, false,
                    false );
        
        // Informações da sala
        var sRoomInfo = "Min: " + oRoomConfig.min_bet + " reais\n" +
                       "Max: " + oRoomConfig.max_bet + " reais\n" +
                       "Jogadores: " + s_oMultiplayerManager.getRoomPlayersCount(sRoomType) + "/" + oRoomConfig.max_players;
        
        var oInfoText = new CTLText(oButtonContainer, 
                    iWidth/2, 50, iWidth-10, 60, 
                    12, "center", "#fff", FONT1, 1,
                    0, 0,
                    sRoomInfo,
                    true, true, true,
                    false );
        
        // Evento de clique
        oButtonContainer.on("click", function(event){
            this._onRoomSelected(sRoomType);
        }.bind(this));
        
        // Eventos de hover
        oButtonContainer.on("mouseover", function(){
            oHoverEffect.visible = true;
            oButtonContainer.cursor = "pointer";
        });
        
        oButtonContainer.on("mouseout", function(){
            oHoverEffect.visible = false;
            oButtonContainer.cursor = "default";
        });
        
        return {
            container: oButtonContainer,
            room_type: sRoomType,
            info_text: oInfoText,
            hover_effect: oHoverEffect
        };
    };
    
    this._onRoomSelected = function(sRoomType){
        if(_oCallback){
            _oCallback(sRoomType);
        }
        this.hide();
    };
    
    this.show = function(oCallback){
        _oCallback = oCallback;
        _bVisible = true;
        _oContainer.visible = true;
        this._updateRoomInfo();
        
        // Animação de entrada
        _oContainer.alpha = 0;
        _oContainer.scaleX = 0.8;
        _oContainer.scaleY = 0.8;
        
        createjs.Tween.get(_oContainer)
            .to({alpha: 1, scaleX: 1, scaleY: 1}, 300, createjs.Ease.backOut);
    };
    
    this.hide = function(){
        if(!_bVisible) return;
        
        _bVisible = false;
        
        // Animação de saída
        createjs.Tween.get(_oContainer)
            .to({alpha: 0, scaleX: 0.8, scaleY: 0.8}, 200, createjs.Ease.backIn)
            .call(function(){
                _oContainer.visible = false;
            });
    };
    
    this._updateRoomInfo = function(){
        for(var i = 0; i < _aRoomButtons.length; i++){
            var oButton = _aRoomButtons[i];
            var sRoomType = oButton.room_type;
            var oRoomConfig = s_oRoomConfig.getRoomConfig(sRoomType);
            var iCurrentPlayers = s_oMultiplayerManager.getRoomPlayersCount(sRoomType);
            
            var sRoomInfo = "Min: " + oRoomConfig.min_bet + " reais\n" +
                           "Max: " + oRoomConfig.max_bet + " reais\n" +
                           "Jogadores: " + iCurrentPlayers + "/" + oRoomConfig.max_players;
            
            oButton.info_text.refreshText(sRoomInfo);
            
            // Destacar sala atual
            if(sRoomType === s_oMultiplayerManager.getCurrentRoom()){
                oButton.hover_effect.visible = true;
                oButton.hover_effect.graphics.clear()
                    .beginFill("rgba(0,255,0,0.3)")
                    .drawRoundRect(0, 0, 150, 120, 8);
            } else {
                if(!oButton.container.mouseover){
                    oButton.hover_effect.visible = false;
                }
            }
            
            // Indicar se sala está lotada
            if(iCurrentPlayers >= oRoomConfig.max_players){
                oButton.container.alpha = 0.6;
            } else {
                oButton.container.alpha = 1;
            }
        }
    };
    
    this.isVisible = function(){
        return _bVisible;
    };
    
    this.unload = function(){
        if(_oContainer){
            s_oStage.removeChild(_oContainer);
        }
    };
    
    this._init();
    
    return this;
}

var s_oRoomSelector = null;