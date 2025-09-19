function CRoomSelectionPanel(){
    var _oContainer;
    var _oBg;
    var _oTitleText;
    var _aRoomButtons;
    var _oRefreshButton;
    var _oCloseButton;
    var _bVisible;
    var _oUpdateTimer;
    
    this._init = function(){
        _bVisible = false;
        _aRoomButtons = [];
        _oUpdateTimer = null;
        
        // Create main container
        _oContainer = new createjs.Container();
        _oContainer.visible = false;
        s_oStage.addChild(_oContainer);
        
        // Background
        var oGraphics = new createjs.Graphics()
            .beginFill("rgba(0,0,0,0.8)")
            .drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        _oBg = new createjs.Shape(oGraphics);
        _oContainer.addChild(_oBg);
        
        // Panel background - otimizado para 1280x768 e outras resoluções
        var iPanelWidth = Math.min(800, CANVAS_WIDTH - 80); // Largura máxima 800px
        var iPanelHeight = Math.min(500, CANVAS_HEIGHT - 80); // Altura máxima 500px
        
        // Para resolução 1280x768, usar dimensões específicas
        if(CANVAS_WIDTH === 1280 && CANVAS_HEIGHT === 768) {
            iPanelWidth = 800;
            iPanelHeight = 480;
        }
        
        var iPanelX = CANVAS_WIDTH/2 - iPanelWidth/2;
        var iPanelY = CANVAS_HEIGHT/2 - iPanelHeight/2;
        
        // Garantir que o painel não saia da tela
        if(iPanelX < 20) iPanelX = 20;
        if(iPanelY < 20) iPanelY = 20;
        if(iPanelX + iPanelWidth > CANVAS_WIDTH - 20) iPanelX = CANVAS_WIDTH - iPanelWidth - 20;
        if(iPanelY + iPanelHeight > CANVAS_HEIGHT - 20) iPanelY = CANVAS_HEIGHT - iPanelHeight - 20;
        
        var oPanelGraphics = new createjs.Graphics()
            .beginFill("#2c3e50")
            .beginStroke("#34495e")
            .setStrokeStyle(3)
            .drawRoundRect(0, 0, iPanelWidth, iPanelHeight, 10);
        var oPanelBg = new createjs.Shape(oPanelGraphics);
        oPanelBg.x = iPanelX;
        oPanelBg.y = iPanelY;
        _oContainer.addChild(oPanelBg);
        
        // Title
        _oTitleText = new CTLText(_oContainer, 
            CANVAS_WIDTH/2, iPanelY + 30, iPanelWidth, 40, 
            20, "center", "#fff", FONT1, 1,
            0, 0,
            "SELEÇÃO DE SALA",
            true, true, false,
            false );
        
        // Close button
        _oCloseButton = new CGfxButton(
            iPanelX + iPanelWidth - 35,
            iPanelY + 15,
            s_oSpriteLibrary.getSprite('but_exit'),
            _oContainer
        );
        _oCloseButton.addEventListener(ON_MOUSE_UP, this.hide, this);
        
        // Refresh button
        _oRefreshButton = new CTextButton(
            iPanelX + iPanelWidth/2 - 60,
            iPanelY + iPanelHeight - 50,
            s_oSpriteLibrary.getSprite('but_bg'),
            "ATUALIZAR",
            FONT1,
            "#fff",
            16,
            "center",
            _oContainer
        );
        _oRefreshButton.addEventListener(ON_MOUSE_UP, this._refreshRoomList, this);
        
        this._createRoomList();
    };
    
    this._createRoomList = function(){
        // Clear existing room buttons
        for(var i = 0; i < _aRoomButtons.length; i++){
            _aRoomButtons[i].unload();
        }
        _aRoomButtons = [];
        
        if(!s_oMultiplayerRoomManager){
            return;
        }
        
        var aRoomsInfo = s_oMultiplayerRoomManager.getActiveRoomsInfo();
        
        // Calcular posições baseadas no painel (usar as mesmas dimensões da criação)
        var iPanelWidth = Math.min(800, CANVAS_WIDTH - 80);
        var iPanelHeight = Math.min(500, CANVAS_HEIGHT - 80);
        
        // Para resolução 1280x768, usar dimensões específicas
        if(CANVAS_WIDTH === 1280 && CANVAS_HEIGHT === 768) {
            iPanelWidth = 800;
            iPanelHeight = 480;
        }
        
        var iPanelY = CANVAS_HEIGHT/2 - iPanelHeight/2;
        
        // Garantir que o painel não saia da tela
        if(iPanelY < 20) iPanelY = 20;
        if(iPanelY + iPanelHeight > CANVAS_HEIGHT - 20) iPanelY = CANVAS_HEIGHT - iPanelHeight - 20;
        
        var iStartY = iPanelY + 80; // Espaço para o título
        var iButtonHeight = Math.min(70, Math.max(50, iPanelHeight * 0.15)); // Altura adaptável
        var iSpacing = Math.max(10, iPanelHeight * 0.02); // Espaçamento adaptável
        var iMaxButtons = Math.floor((iPanelHeight - 150) / (iButtonHeight + iSpacing)); // Espaço para título e botão refresh
        
        // Garantir pelo menos 2 botões visíveis
        if(iMaxButtons < 2){
            iButtonHeight = Math.max(40, (iPanelHeight - 150) / 3);
            iSpacing = 5;
            iMaxButtons = Math.floor((iPanelHeight - 150) / (iButtonHeight + iSpacing));
        }
        
        // Limitar número de salas exibidas se necessário
        var aDisplayRooms = aRoomsInfo.slice(0, iMaxButtons);
        
        for(var i = 0; i < aDisplayRooms.length; i++){
            var oRoomInfo = aDisplayRooms[i];
            var iButtonY = iStartY + i * (iButtonHeight + iSpacing);
            
            var oRoomButton = this._createRoomButton(oRoomInfo, iButtonY, iPanelWidth, iButtonHeight);
            _aRoomButtons.push(oRoomButton);
        }
    };
    
    this._createRoomButton = function(oRoomInfo, iY, iPanelWidth, iButtonHeight){
        var iButtonWidth = iPanelWidth - 40; // Margem de 20px de cada lado
        var iButtonX = CANVAS_WIDTH/2 - iButtonWidth/2;
        iButtonHeight = iButtonHeight || 65; // Valor padrão se não fornecido
        
        // Button container
        var oButtonContainer = new createjs.Container();
        oButtonContainer.x = iButtonX;
        oButtonContainer.y = iY;
        _oContainer.addChild(oButtonContainer);
        
        // Button background
        var sColor = oRoomInfo.available ? "#27ae60" : "#e74c3c";
        var oButtonBg = new createjs.Graphics()
            .beginFill(sColor)
            .beginStroke("#fff")
            .setStrokeStyle(2)
            .drawRoundRect(0, 0, iButtonWidth, iButtonHeight, 8);
        var oButtonShape = new createjs.Shape(oButtonBg);
        oButtonContainer.addChild(oButtonShape);
        
        // Calcular posições baseadas na altura do botão
        var iTextY1 = Math.max(5, iButtonHeight * 0.15);
        var iTextY2 = Math.max(25, iButtonHeight * 0.55);
        var iTextSize1 = Math.min(18, Math.max(14, iButtonHeight * 0.25));
        var iTextSize2 = Math.min(14, Math.max(11, iButtonHeight * 0.2));
        
        // Room name
        var oNameText = new CTLText(oButtonContainer, 
            15, iTextY1, iButtonWidth * 0.4, iButtonHeight * 0.3, 
            iTextSize1, "left", "#fff", FONT1, 1,
            0, 0,
            oRoomInfo.name,
            true, true, false,
            false );
        
        // Players count
        var oPlayersText = new CTLText(oButtonContainer, 
            15, iTextY2, iButtonWidth * 0.3, iButtonHeight * 0.3, 
            iTextSize2, "left", "#fff", FONT1, 1,
            0, 0,
            "Jogadores: " + oRoomInfo.players + "/" + oRoomInfo.max_players,
            true, true, false,
            false );
        
        // Bet limits
        var sBetLimits = "Min: " + oRoomInfo.min_bet + "R$";
        if(oRoomInfo.max_bet){
            sBetLimits += " | Max: " + oRoomInfo.max_bet + "R$";
        } else {
            sBetLimits += " | Max: Ilimitado";
        }
        
        var oBetText = new CTLText(oButtonContainer, 
            iButtonWidth * 0.45, iButtonHeight * 0.3, iButtonWidth * 0.35, iButtonHeight * 0.4, 
            Math.min(12, iTextSize2), "left", "#fff", FONT1, 1,
            0, 0,
            sBetLimits,
            true, true, true,
            false );
        
        // Status text
        var sStatus = oRoomInfo.available ? "ENTRAR" : "LOTADA";
        var oStatusText = new CTLText(oButtonContainer, 
            iButtonWidth * 0.82, iButtonHeight * 0.3, iButtonWidth * 0.15, iButtonHeight * 0.4, 
            iTextSize2, "center", "#fff", FONT1, 1,
            0, 0,
            sStatus,
            true, true, true,
            false );
        
        // Click handler
        if(oRoomInfo.available){
            oButtonContainer.cursor = "pointer";
            oButtonContainer.addEventListener("click", function(oRoom){
                return function(){
                    this._joinRoom(oRoom);
                }.bind(this);
            }.bind(this)(oRoomInfo));
        }
        
        return {
            container: oButtonContainer,
            unload: function(){
                if(oButtonContainer.parent){
                    oButtonContainer.parent.removeChild(oButtonContainer);
                }
            }
        };
    };
    
    this._joinRoom = function(oRoomInfo){
        console.log("Joining room:", oRoomInfo.id);
        
        if(s_oGame){
            s_oGame.changeRoom(oRoomInfo.type);
        }
        
        this.hide();
    };
    
    this._refreshRoomList = function(){
        this._createRoomList();
    };
    
    this.show = function(){
        if(_bVisible) return;
        
        _bVisible = true;
        _oContainer.visible = true;
        
        // Refresh room list when showing
        this._refreshRoomList();
        
        // Set up auto-refresh timer
        _oUpdateTimer = setInterval(function(){
            if(_bVisible){
                this._refreshRoomList();
            }
        }.bind(this), 3000); // Refresh every 3 seconds
    };
    
    this.hide = function(){
        if(!_bVisible) return;
        
        _bVisible = false;
        _oContainer.visible = false;
        
        // Clear update timer
        if(_oUpdateTimer){
            clearInterval(_oUpdateTimer);
            _oUpdateTimer = null;
        }
    };
    
    this.isVisible = function(){
        return _bVisible;
    };
    
    this.unload = function(){
        if(_oUpdateTimer){
            clearInterval(_oUpdateTimer);
            _oUpdateTimer = null;
        }
        
        for(var i = 0; i < _aRoomButtons.length; i++){
            _aRoomButtons[i].unload();
        }
        
        _oCloseButton.unload();
        _oRefreshButton.unload();
        
        if(_oContainer && _oContainer.parent){
            _oContainer.parent.removeChild(_oContainer);
        }
    };
    
    this._init();
    
    return this;
}