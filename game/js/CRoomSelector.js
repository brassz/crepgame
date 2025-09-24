function CRoomSelector(oParentContainer){
    var _bUpdate;
    var _oParentContainer;
    var _oContainer;
    var _oBg;
    var _oTitle;
    var _oMsgText;
    var _aRoomButtons;
    var _oCloseButton;
    var _fnOnRoomSelected;
    var _fnOnClose;
    
    this._init = function(oParentContainer){
        _bUpdate = false;
        _oParentContainer = oParentContainer;
        _aRoomButtons = new Array();
        
        _oContainer = new createjs.Container();
        _oContainer.alpha = 0;
        _oContainer.visible = false;
        _oParentContainer.addChild(_oContainer);
        
        // Background com transparência
        var oFade = new createjs.Shape();
        oFade.graphics.beginFill("black").drawRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
        oFade.alpha = 0.7;
        _oContainer.addChild(oFade);
        
        // Background principal do seletor
        _oBg = new createjs.Shape();
        _oBg.graphics.beginFill("#2C3E50").beginStroke("#34495E").setStrokeStyle(3);
        _oBg.graphics.drawRoundRect(CANVAS_WIDTH/2 - 400, CANVAS_HEIGHT/2 - 250, 800, 500, 20);
        _oContainer.addChild(_oBg);
        
        // Título
        _oTitle = new createjs.Text("SELEÇÃO DE SALAS","bold 32px "+FONT1, "#FFFFFF");
        _oTitle.x = CANVAS_WIDTH/2;
        _oTitle.y = CANVAS_HEIGHT/2 - 200;
        _oTitle.textAlign = "center";
        _oTitle.textBaseline = "middle";
        _oContainer.addChild(_oTitle);
        
        // Mensagem informativa
        _oMsgText = new createjs.Text("Escolha uma sala baseada no seu orçamento:","18px "+FONT1, "#BDC3C7");
        _oMsgText.x = CANVAS_WIDTH/2;
        _oMsgText.y = CANVAS_HEIGHT/2 - 160;
        _oMsgText.textAlign = "center";
        _oMsgText.textBaseline = "middle";
        _oContainer.addChild(_oMsgText);
        
        this._createRoomButtons();
        
        // Botão de fechar
        _oCloseButton = new CGfxButton(CANVAS_WIDTH/2 + 350, CANVAS_HEIGHT/2 - 220, s_oSpriteLibrary.getSprite("but_exit"), _oContainer);
        _oCloseButton.addEventListener(ON_MOUSE_UP, this._onClose, this);
    };
    
    this._createRoomButtons = function(){
        var aRooms = s_oRoomConfig.getAvailableRooms();
        var iStartX = CANVAS_WIDTH/2 - 350;
        var iStartY = CANVAS_HEIGHT/2 - 80;
        var iSpacingX = 250;
        
        for(var i = 0; i < aRooms.length; i++){
            var oRoom = aRooms[i];
            var oRoomButton = this._createRoomButton(
                iStartX + (i * iSpacingX), 
                iStartY, 
                oRoom.key, 
                oRoom.config
            );
            _aRoomButtons.push(oRoomButton);
        }
    };
    
    this._createRoomButton = function(iX, iY, sRoomKey, oRoomConfig){
        var oButtonContainer = new createjs.Container();
        oButtonContainer.x = iX;
        oButtonContainer.y = iY;
        _oContainer.addChild(oButtonContainer);
        
        // Background do botão da sala
        var oBtnBg = new createjs.Shape();
        oBtnBg.graphics.beginFill(oRoomConfig.bg_color).beginStroke(oRoomConfig.color).setStrokeStyle(3);
        oBtnBg.graphics.drawRoundRect(-100, -80, 200, 160, 10);
        oButtonContainer.addChild(oBtnBg);
        
        // Nome da sala
        var oRoomName = new createjs.Text(oRoomConfig.name, "bold 20px "+FONT1, oRoomConfig.color);
        oRoomName.textAlign = "center";
        oRoomName.textBaseline = "middle";
        oRoomName.y = -40;
        oButtonContainer.addChild(oRoomName);
        
        // Faixa de apostas
        var sBetRange = "R$ " + oRoomConfig.min_bet + " - R$ " + oRoomConfig.max_bet;
        var oBetRange = new createjs.Text(sBetRange, "16px "+FONT1, "#FFFFFF");
        oBetRange.textAlign = "center";
        oBetRange.textBaseline = "middle";
        oBetRange.y = -10;
        oButtonContainer.addChild(oBetRange);
        
        // Máximo de jogadores
        var sMaxPlayers = "Máx: " + oRoomConfig.max_players + " jogadores";
        var oMaxPlayers = new createjs.Text(sMaxPlayers, "12px "+FONT1, "#BDC3C7");
        oMaxPlayers.textAlign = "center";
        oMaxPlayers.textBaseline = "middle";
        oMaxPlayers.y = 15;
        oButtonContainer.addChild(oMaxPlayers);
        
        // Verificar se o jogador pode entrar (assumindo dinheiro inicial)
        var bCanEnter = s_oRoomConfig.canPlayerEnterRoom(sRoomKey, TOTAL_MONEY || 5000);
        var sStatus = bCanEnter ? "ENTRAR" : "INSUFICIENTE";
        var sStatusColor = bCanEnter ? "#2ECC71" : "#E74C3C";
        
        var oStatusText = new createjs.Text(sStatus, "bold 14px "+FONT1, sStatusColor);
        oStatusText.textAlign = "center";
        oStatusText.textBaseline = "middle";
        oStatusText.y = 40;
        oButtonContainer.addChild(oStatusText);
        
        // Adicionar interatividade apenas se o jogador puder entrar
        if(bCanEnter){
            oButtonContainer.cursor = "pointer";
            
            // Efeitos hover
            oButtonContainer.addEventListener("mouseover", function(){
                oButtonContainer.scaleX = oButtonContainer.scaleY = 1.05;
                oBtnBg.alpha = 0.8;
            });
            
            oButtonContainer.addEventListener("mouseout", function(){
                oButtonContainer.scaleX = oButtonContainer.scaleY = 1;
                oBtnBg.alpha = 1;
            });
            
            oButtonContainer.addEventListener("click", function(){
                playSound("click", 1, false);
                if(_fnOnRoomSelected){
                    _fnOnRoomSelected(sRoomKey);
                }
            });
        } else {
            // Visual para salas bloqueadas
            oBtnBg.alpha = 0.5;
            oRoomName.alpha = 0.6;
            oBetRange.alpha = 0.6;
            oMaxPlayers.alpha = 0.6;
        }
        
        return {
            container: oButtonContainer,
            room_key: sRoomKey,
            can_enter: bCanEnter
        };
    };
    
    this.show = function(fnOnRoomSelected, fnOnClose){
        _fnOnRoomSelected = fnOnRoomSelected;
        _fnOnClose = fnOnClose;
        
        _oContainer.visible = true;
        
        var oTween = createjs.Tween.get(_oContainer);
        oTween.to({alpha: 1}, 500, createjs.Ease.cubicOut);
        
        // Animar botões das salas
        for(var i = 0; i < _aRoomButtons.length; i++){
            var oButton = _aRoomButtons[i];
            oButton.container.alpha = 0;
            oButton.container.scaleX = oButton.container.scaleY = 0.5;
            
            var oButtonTween = createjs.Tween.get(oButton.container);
            oButtonTween.wait(i * 100).to({alpha: 1, scaleX: 1, scaleY: 1}, 400, createjs.Ease.backOut);
        }
        
        _bUpdate = true;
    };
    
    this.hide = function(){
        _bUpdate = false;
        
        var oTween = createjs.Tween.get(_oContainer);
        oTween.to({alpha: 0}, 300, createjs.Ease.cubicIn).call(function(){
            _oContainer.visible = false;
        });
    };
    
    this.updatePlayerMoney = function(iMoney){
        // Atualizar status dos botões baseado no dinheiro atual do jogador
        for(var i = 0; i < _aRoomButtons.length; i++){
            var oButton = _aRoomButtons[i];
            var bCanEnter = s_oRoomConfig.canPlayerEnterRoom(oButton.room_key, iMoney);
            
            // Atualizar visual do botão
            var oStatusText = oButton.container.getChildByName("status_text");
            if(oStatusText){
                oStatusText.text = bCanEnter ? "ENTRAR" : "INSUFICIENTE";
                oStatusText.color = bCanEnter ? "#2ECC71" : "#E74C3C";
            }
            
            oButton.can_enter = bCanEnter;
            oButton.container.alpha = bCanEnter ? 1 : 0.5;
        }
    };
    
    this._onClose = function(){
        playSound("click", 1, false);
        if(_fnOnClose){
            _fnOnClose();
        }
        this.hide();
    };
    
    this.unload = function(){
        _bUpdate = false;
        
        if(_oCloseButton){
            _oCloseButton.unload();
        }
        
        for(var i = 0; i < _aRoomButtons.length; i++){
            // Remover event listeners dos botões
            _aRoomButtons[i].container.removeAllEventListeners();
        }
        
        if(_oContainer){
            _oParentContainer.removeChild(_oContainer);
        }
    };
    
    this.isVisible = function(){
        return _oContainer.visible;
    };
    
    this._init(oParentContainer);
    
    return this;
}