function CRoomSelectionMenu(){
    var _pStartPosAudio;
    var _pStartPosFullscreen;
    var _oButAudio;
    var _oButFullscreen;
    var _fRequestFullScreen = null;
    var _fCancelFullScreen = null;
    
    var _oBg;
    var _oTitleText;
    var _oRoomButtons = [];
    var _oBackButton;
    var _oFade;
    var _aRoomData;
    
    this._init = function(){
        // Criar background
        _oBg = createBitmap(s_oSpriteLibrary.getSprite('bg_menu'));
        s_oStage.addChild(_oBg);
        
        // Título
        _oTitleText = new CTLText(s_oStage,
            CANVAS_WIDTH/2 - 300, 80, 600, 80,
            50, "center", "#ffffff", FONT1, 1,
            0, 0,
            "ESCOLHA SUA SALA",
            true, true, true,
            false);
        
        // Obter dados das salas
        _aRoomData = s_oRoomConfig.getAvailableRooms();
        
        // Criar botões das salas
        this._createRoomButtons();
        
        // Criar botão voltar
        var oBackSprite = s_oSpriteLibrary.getSprite('but_exit');
        _oBackButton = new CGfxButton(80, 80, oBackSprite, s_oStage);
        _oBackButton.addEventListener(ON_MOUSE_UP, this._onBackButtonRelease, this);
        
        // Configurar botões de áudio e fullscreen (semelhante ao menu principal)
        this._setupUtilityButtons();
        
        // Fade inicial
        _oFade = new createjs.Shape();
        _oFade.graphics.beginFill("black").drawRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
        s_oStage.addChild(_oFade);
        createjs.Tween.get(_oFade).to({alpha:0}, 400).call(function(){_oFade.visible = false;});
        
        this.refreshButtonPos(s_iOffsetX, s_iOffsetY);
    };
    
    this._createRoomButtons = function(){
        var iStartY = 200;
        var iSpacing = 160;
        
        for(var i = 0; i < _aRoomData.length; i++){
            var oRoomData = _aRoomData[i];
            var oRoom = oRoomData.config;
            
            // Criar container para o botão da sala
            var oRoomContainer = new createjs.Container();
            oRoomContainer.x = CANVAS_WIDTH/2;
            oRoomContainer.y = iStartY + (i * iSpacing);
            s_oStage.addChild(oRoomContainer);
            
            // Background do botão (usar sprite de botão existente)
            var oBtnSprite = s_oSpriteLibrary.getSprite('but_bg');
            var oRoomBg = createBitmap(oBtnSprite);
            oRoomBg.regX = oBtnSprite.width/2;
            oRoomBg.regY = oBtnSprite.height/2;
            oRoomBg.scaleX = 2.5;
            oRoomBg.scaleY = 1.2;
            
            // Aplicar cor baseada no tier
            var oColorFilter = new createjs.ColorFilter();
            var color = this._hexToRgb(oRoom.color);
            oColorFilter.setColor(color.r, color.g, color.b, 0.3);
            oRoomBg.filters = [oColorFilter];
            oRoomBg.cache(-oBtnSprite.width/2, -oBtnSprite.height/2, oBtnSprite.width, oBtnSprite.height);
            
            oRoomContainer.addChild(oRoomBg);
            
            // Nome da sala
            var oRoomTitle = new CTLText(oRoomContainer,
                -200, -40, 400, 40,
                32, "center", "#ffffff", FONT1, 1,
                0, 0,
                oRoom.name.toUpperCase(),
                true, true, true,
                false);
            
            // Informações da sala
            var sInfo = "Apostas: R$ " + oRoom.min_bet + " - R$ " + oRoom.max_bet;
            var oRoomInfo = new CTLText(oRoomContainer,
                -200, -5, 400, 30,
                20, "center", "#ffff99", FONT1, 1,
                0, 0,
                sInfo,
                true, true, true,
                false);
            
            // Descrição
            var oRoomDesc = new CTLText(oRoomContainer,
                -200, 20, 400, 30,
                16, "center", "#cccccc", FONT1, 1,
                0, 0,
                oRoom.description,
                true, true, true,
                false);
            
            // Área clicável invisível
            var oHitArea = new createjs.Shape();
            oHitArea.graphics.beginFill("rgba(0,0,0,0.01)").drawRect(-200, -50, 400, 100);
            oRoomContainer.addChild(oHitArea);
            
            // Tornar clicável
            oRoomContainer.cursor = "pointer";
            oRoomContainer.roomId = oRoomData.id;
            
            var that = this;
            (function(container, roomId) {
                container.addEventListener("click", function() {
                    that._onRoomSelected(roomId);
                });
            })(oRoomContainer, oRoomData.id);
            
            _oRoomButtons.push(oRoomContainer);
        }
    };
    
    this._setupUtilityButtons = function(){
        // Áudio
        var oSpriteAudio = s_oSpriteLibrary.getSprite('audio_icon');
        _pStartPosAudio = {x: CANVAS_WIDTH - (oSpriteAudio.height/2)- 10, y: (oSpriteAudio.height/2) + 10}; 
        
        if(DISABLE_SOUND_MOBILE === false || s_bMobile === false){
            _oButAudio = new CToggle(_pStartPosAudio.x,_pStartPosAudio.y,oSpriteAudio,s_bAudioActive,s_oStage);
            _oButAudio.addEventListener(ON_MOUSE_UP, this._onAudioToggle, this);
        }
        
        // Fullscreen
        var doc = window.document;
        var docEl = doc.documentElement;
        _fRequestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
        
        if(ENABLE_FULLSCREEN === false){
            _fRequestFullScreen = false;
        }
        
        if (_fRequestFullScreen && screenfull.isEnabled){
            var oSpriteFullscreen = s_oSpriteLibrary.getSprite('but_fullscreen');
            _pStartPosFullscreen = {x:10 + oSpriteFullscreen.width/4,y:(oSpriteFullscreen.height / 2) + 10};
            _oButFullscreen = new CToggle(_pStartPosFullscreen.x,_pStartPosFullscreen.y,oSpriteFullscreen,s_bFullscreen,s_oStage);
            _oButFullscreen.addEventListener(ON_MOUSE_UP, this._onFullscreenRelease, this);
        }
    };
    
    this._hexToRgb = function(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : {r: 205, g: 127, b: 50}; // Default bronze color
    };
    
    this.refreshButtonPos = function(iNewX, iNewY) {
        if (DISABLE_SOUND_MOBILE === false || s_bMobile === false) {
            _oButAudio.setPosition(_pStartPosAudio.x - iNewX, iNewY + _pStartPosAudio.y);
        }
        if (_fRequestFullScreen && screenfull.isEnabled){
            _oButFullscreen.setPosition(_pStartPosFullscreen.x + iNewX,_pStartPosFullscreen.y + iNewY);
        }
        
        _oBackButton.setPosition(80 + iNewX, 80 + iNewY);
    };
    
    this.unload = function(){
        // Remover botões das salas
        for(var i = 0; i < _oRoomButtons.length; i++){
            s_oStage.removeChild(_oRoomButtons[i]);
        }
        _oRoomButtons = [];
        
        // Remover outros elementos
        _oBackButton.unload();
        _oBackButton = null;
        
        if(DISABLE_SOUND_MOBILE === false || s_bMobile === false){
            _oButAudio.unload();
            _oButAudio = null;
        }
        
        if (_fRequestFullScreen && screenfull.isEnabled){
            _oButFullscreen.unload();
        }
        
        _oTitleText.unload();
        _oTitleText = null;
        
        s_oStage.removeChild(_oBg);
        _oBg = null;
        
        if(_oFade){
            s_oStage.removeChild(_oFade);
            _oFade = null;
        }
        
        s_oRoomSelectionMenu = null;
    };
    
    this._onRoomSelected = function(sRoomId){
        // Armazenar a sala selecionada globalmente
        s_sSelectedRoom = sRoomId;
        
        // Ir para o jogo com a sala selecionada
        this.unload();
        s_oMain.gotoGame();
        
        $(s_oMain).trigger("start_session");
    };
    
    this._onBackButtonRelease = function(){
        this.unload();
        s_oMain.gotoMenu();
    };
    
    this._onAudioToggle = function(){
        Howler.mute(s_bAudioActive);
        s_bAudioActive = !s_bAudioActive;
    };
    
    this._onFullscreenRelease = function(){
        if(s_bFullscreen) { 
            _fCancelFullScreen.call(window.document);
        }else{
            _fRequestFullScreen.call(window.document.documentElement);
        }
        
        sizeHandler();
    };
    
    s_oRoomSelectionMenu = this;
    
    this._init();
}

var s_oRoomSelectionMenu = null;
var s_sSelectedRoom = "bronze"; // Sala padrão