function CSalaSelector(){
    var _oContainer;
    var _oBg;
    var _oFade;
    var _oSalaButtons;
    var _oTitleText;
    var _oInfoText;
    var _oCloseButton;
    var _bVisible;
    var _fnOnSalaSelected;
    var _fnOnClose;
    
    this._init = function(){
        _bVisible = false;
        _oSalaButtons = [];
        
        // Fade background
        _oFade = new createjs.Shape();
        _oFade.graphics.beginFill("rgba(0,0,0,0.7)").drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        _oFade.visible = false;
        s_oStage.addChild(_oFade);
        
        // Main container
        _oContainer = new createjs.Container();
        _oContainer.visible = false;
        s_oStage.addChild(_oContainer);
        
        // Background panel
        _oBg = createBitmap(s_oSpriteLibrary.getSprite('msg_box'));
        _oBg.x = CANVAS_WIDTH/2 - _oBg.getBounds().width/2;
        _oBg.y = CANVAS_HEIGHT/2 - _oBg.getBounds().height/2;
        _oContainer.addChild(_oBg);
        
        // Title
        _oTitleText = new CTLText(_oContainer,
            CANVAS_WIDTH/2 - 150, 200, 300, 40,
            32, "center", "#ffde00", FONT1, 1,
            0, 0,
            "ESCOLHA SUA SALA",
            true, true, true,
            false);
            
        // Info text
        _oInfoText = new CTLText(_oContainer,
            CANVAS_WIDTH/2 - 200, 250, 400, 60,
            18, "center", "#ffffff", FONT1, 1,
            0, 0,
            "Selecione o tipo de sala baseado no seu orçamento.\nCada sala tem limites de aposta específicos.",
            true, true, true,
            false);
        
        // Create sala buttons
        this._createSalaButtons();
        
        // Close button
        _oCloseButton = new CGfxButton(CANVAS_WIDTH/2 + 150, 180, s_oSpriteLibrary.getSprite('but_exit'), _oContainer);
        _oCloseButton.addEventListener(ON_MOUSE_UP, this._onClose, this);
    };
    
    this._createSalaButtons = function(){
        var aSalaTypes = ["bronze", "prata", "ouro"];
        var aColors = ["#CD7F32", "#C0C0C0", "#FFD700"]; // Bronze, Prata, Ouro
        var iStartY = 320;
        var iSpacing = 120;
        
        for(var i = 0; i < aSalaTypes.length; i++){
            var sType = aSalaTypes[i];
            var oRoomConfig = s_oRoomConfig.getAllRooms()[sType];
            var iButtonY = iStartY + (i * iSpacing);
            
            // Container for each sala button
            var oSalaContainer = new createjs.Container();
            oSalaContainer.x = CANVAS_WIDTH/2;
            oSalaContainer.y = iButtonY;
            _oContainer.addChild(oSalaContainer);
            
            // Sala button background
            var oButtonBg = new createjs.Shape();
            oButtonBg.graphics.beginFill(aColors[i]).drawRoundRect(-150, -40, 300, 80, 10);
            oButtonBg.graphics.beginStroke("#ffffff").setStrokeStyle(2).drawRoundRect(-150, -40, 300, 80, 10);
            oSalaContainer.addChild(oButtonBg);
            
            // Sala name
            var oSalaName = new CTLText(oSalaContainer,
                -140, -25, 120, 25,
                20, "left", "#000000", FONT1, 1.2,
                0, 0,
                oRoomConfig.name,
                true, true, false,
                false);
            
            // Sala info
            var sSalaInfo = "Aposta: R$" + oRoomConfig.min_bet + " - R$" + oRoomConfig.max_bet;
            var oSalaInfo = new CTLText(oSalaContainer,
                -140, 5, 280, 20,
                14, "left", "#000000", FONT1, 1,
                0, 0,
                sSalaInfo,
                true, true, false,
                false);
            
            // Salas ativas info
            var iActiveSalas = s_oRoomConfig.getAvailableSalas(sType).length;
            var sSalasAtivas = "Salas Disponíveis: " + iActiveSalas;
            var oSalasAtivas = new CTLText(oSalaContainer,
                -140, 25, 200, 15,
                12, "left", "#333333", FONT1, 1,
                0, 0,
                sSalasAtivas,
                true, true, false,
                false);
            
            // Make button interactive
            oSalaContainer.cursor = "pointer";
            oSalaContainer.sala_type = sType;
            oSalaContainer.on("click", this._onSalaClick.bind(this));
            
            // Hover effect
            oSalaContainer.on("mouseover", function(e){
                e.currentTarget.scaleX = e.currentTarget.scaleY = 1.05;
            });
            
            oSalaContainer.on("mouseout", function(e){
                e.currentTarget.scaleX = e.currentTarget.scaleY = 1;
            });
            
            _oSalaButtons.push(oSalaContainer);
        }
        
        // Add stats info
        var iTotalSalas = s_oRoomConfig.getCurrentSalasCount();
        var iMaxSalas = s_oRoomConfig.getMaxSimultaneousSalas();
        var sStatsText = "Salas Ativas: " + iTotalSalas + "/" + iMaxSalas;
        
        var oStatsText = new CTLText(_oContainer,
            CANVAS_WIDTH/2 - 100, 680, 200, 20,
            14, "center", "#ffffff", FONT1, 1,
            0, 0,
            sStatsText,
            true, true, false,
            false);
    };
    
    this.show = function(fnOnSalaSelected, fnOnClose){
        _fnOnSalaSelected = fnOnSalaSelected;
        _fnOnClose = fnOnClose;
        
        _oFade.visible = true;
        _oContainer.visible = true;
        _bVisible = true;
        
        this._updateSalaInfo();
    };
    
    this.hide = function(){
        _oFade.visible = false;
        _oContainer.visible = false;
        _bVisible = false;
    };
    
    this._updateSalaInfo = function(){
        // Update available salas count for each button
        var aSalaTypes = ["bronze", "prata", "ouro"];
        for(var i = 0; i < _oSalaButtons.length && i < aSalaTypes.length; i++){
            var sType = aSalaTypes[i];
            var iActiveSalas = s_oRoomConfig.getAvailableSalas(sType).length;
            // Update the text would require more complex reference keeping
            // For now, we'll recreate the buttons when needed
        }
    };
    
    this._onSalaClick = function(event){
        var sSelectedType = event.currentTarget.sala_type;
        
        // Try to find or create a sala of the selected type
        var oSelectedSala = s_oRoomConfig.findOrCreateSala(sSelectedType);
        
        if(oSelectedSala){
            playSound("click", 1, false);
            
            if(_fnOnSalaSelected){
                _fnOnSalaSelected(oSelectedSala);
            }
            
            this.hide();
        } else {
            // Show error message if no sala could be created
            var oErrorMsg = new CScoreText("Limite de salas atingido! Tente novamente.", CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
        }
    };
    
    this._onClose = function(){
        playSound("click", 1, false);
        
        if(_fnOnClose){
            _fnOnClose();
        }
        
        this.hide();
    };
    
    this.isVisible = function(){
        return _bVisible;
    };
    
    this.unload = function(){
        _oCloseButton.unload();
        s_oStage.removeChild(_oFade);
        s_oStage.removeChild(_oContainer);
    };
    
    this._init();
    
    return this;
}