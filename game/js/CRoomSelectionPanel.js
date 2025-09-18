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
        
        // Panel background
        var oPanelBg = createBitmap(s_oSpriteLibrary.getSprite('msg_box'));
        oPanelBg.x = CANVAS_WIDTH/2 - oPanelBg.getBounds().width/2;
        oPanelBg.y = CANVAS_HEIGHT/2 - oPanelBg.getBounds().height/2;
        _oContainer.addChild(oPanelBg);
        
        // Title
        _oTitleText = new CTLText(_oContainer, 
            CANVAS_WIDTH/2, oPanelBg.y + 30, 300, 40, 
            24, "center", "#fff", FONT1, 1,
            0, 0,
            "SELEÇÃO DE SALA",
            true, true, false,
            false );
        
        // Close button
        _oCloseButton = new CGfxButton(
            oPanelBg.x + oPanelBg.getBounds().width - 40,
            oPanelBg.y + 20,
            s_oSpriteLibrary.getSprite('but_exit'),
            _oContainer
        );
        _oCloseButton.addEventListener(ON_MOUSE_UP, this.hide, this);
        
        // Refresh button
        _oRefreshButton = new CTextButton(
            CANVAS_WIDTH/2 - 80,
            oPanelBg.y + oPanelBg.getBounds().height - 60,
            s_oSpriteLibrary.getSprite('but_bg'),
            "ATUALIZAR",
            FONT1,
            "#fff",
            18,
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
        var iStartY = CANVAS_HEIGHT/2 - 100;
        var iButtonHeight = 60;
        var iSpacing = 10;
        
        for(var i = 0; i < aRoomsInfo.length; i++){
            var oRoomInfo = aRoomsInfo[i];
            var iButtonY = iStartY + i * (iButtonHeight + iSpacing);
            
            var oRoomButton = this._createRoomButton(oRoomInfo, iButtonY);
            _aRoomButtons.push(oRoomButton);
        }
    };
    
    this._createRoomButton = function(oRoomInfo, iY){
        var iButtonWidth = 400;
        var iButtonX = CANVAS_WIDTH/2 - iButtonWidth/2;
        
        // Button container
        var oButtonContainer = new createjs.Container();
        oButtonContainer.x = iButtonX;
        oButtonContainer.y = iY;
        _oContainer.addChild(oButtonContainer);
        
        // Button background
        var sColor = oRoomInfo.available ? "#4CAF50" : "#F44336";
        var oButtonBg = new createjs.Graphics()
            .beginFill(sColor)
            .drawRoundRect(0, 0, iButtonWidth, 50, 5);
        var oButtonShape = new createjs.Shape(oButtonBg);
        oButtonContainer.addChild(oButtonShape);
        
        // Room name
        var oNameText = new CTLText(oButtonContainer, 
            10, 5, 200, 20, 
            16, "left", "#fff", FONT1, 1,
            0, 0,
            oRoomInfo.name,
            true, true, false,
            false );
        
        // Players count
        var oPlayersText = new CTLText(oButtonContainer, 
            10, 25, 150, 20, 
            14, "left", "#fff", FONT1, 1,
            0, 0,
            "Jogadores: " + oRoomInfo.players + "/" + oRoomInfo.max_players,
            true, true, false,
            false );
        
        // Bet limits
        var sBetLimits = "Min: " + oRoomInfo.min_bet;
        if(oRoomInfo.max_bet){
            sBetLimits += " | Max: " + oRoomInfo.max_bet;
        } else {
            sBetLimits += " | Max: Sem limite";
        }
        
        var oBetText = new CTLText(oButtonContainer, 
            200, 15, 180, 20, 
            12, "left", "#fff", FONT1, 1,
            0, 0,
            sBetLimits,
            true, true, false,
            false );
        
        // Status text
        var sStatus = oRoomInfo.available ? "DISPONÍVEL" : "LOTADA";
        var oStatusText = new CTLText(oButtonContainer, 
            iButtonWidth - 80, 15, 70, 20, 
            12, "center", "#fff", FONT1, 1,
            0, 0,
            sStatus,
            true, true, false,
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