function CMenu(){
    var _pStartPosAudio;
    var _pStartPosInfo;
    var _pStartPosPlay;
    var _pStartPosRoomSelect;
    var _pStartPosFullscreen;
    
    var _oBg;
    var _oButPlay;
    var _oButRoomSelect;
    var _oButInfo;
    var _oAudioToggle;
    var _oButFullscreen;
    var _fRequestFullScreen = null;
    var _fCancelFullScreen = null;
    var _oFade;
    var _oRoomSelector;
    
    this._init = function(){
        _oBg = createBitmap(s_oSpriteLibrary.getSprite('bg_menu'));
        s_oStage.addChild(_oBg);

        // Botão "JOGAR RÁPIDO" - vai direto para a Sala Bronze
        var oSprite = s_oSpriteLibrary.getSprite('but_play');
        _pStartPosPlay = {x:(CANVAS_WIDTH/2) - 120,y:CANVAS_HEIGHT -110};
        _oButPlay = new CTextButton(_pStartPosPlay.x,_pStartPosPlay.y,oSprite,"JOGAR RÁPIDO",FONT1,"#fff",18,"center",s_oStage);
        _oButPlay.addEventListener(ON_MOUSE_UP, this._onButPlayRelease, this);
        
        // Botão "SELECIONAR SALA" - abre o seletor de salas
        _pStartPosRoomSelect = {x:(CANVAS_WIDTH/2) + 120,y:CANVAS_HEIGHT -110};
        _oButRoomSelect = new CTextButton(_pStartPosRoomSelect.x,_pStartPosRoomSelect.y,oSprite,"SELECIONAR SALA",FONT1,"#fff",16,"center",s_oStage);
        _oButRoomSelect.addEventListener(ON_MOUSE_UP, this._onButRoomSelectRelease, this);
        
        var oSprite = s_oSpriteLibrary.getSprite('but_credits');
        if(SHOW_CREDITS){
            _pStartPosInfo = {x: CANVAS_WIDTH - (oSprite.height/2)- 10, y: (oSprite.height/2) + 10}; 
            _oButInfo = new CGfxButton(_pStartPosInfo.x,_pStartPosInfo.y,oSprite,s_oStage);
            _oButInfo.addEventListener(ON_MOUSE_UP, this._onCredits, this);
            
            var oSprite = s_oSpriteLibrary.getSprite('audio_icon');
            _pStartPosAudio = {x: _pStartPosInfo.x - (oSprite.width / 2) - 10, y: (oSprite.height / 2) + 10};
        }else{
            var oSprite = s_oSpriteLibrary.getSprite('audio_icon');
            _pStartPosAudio = {x: CANVAS_WIDTH - (oSprite.height/2)- 10, y: (oSprite.height/2) + 10}; 
        }
        

        if(DISABLE_SOUND_MOBILE === false || s_bMobile === false){
            
            _oAudioToggle = new CToggle(_pStartPosAudio.x,_pStartPosAudio.y,oSprite,s_bAudioActive,s_oStage);
            _oAudioToggle.addEventListener(ON_MOUSE_UP, this._onAudioToggle, this);
        }
        
        var doc = window.document;
        var docEl = doc.documentElement;
        _fRequestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
        _fCancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;
        
        if(ENABLE_FULLSCREEN === false){
            _fRequestFullScreen = false;
        }
        
        if (_fRequestFullScreen && screenfull.isEnabled){
            oSprite = s_oSpriteLibrary.getSprite('but_fullscreen');
            _pStartPosFullscreen = {x:10 + oSprite.width/4,y:(oSprite.height / 2) + 10};
            _oButFullscreen = new CToggle(_pStartPosFullscreen.x,_pStartPosFullscreen.y,oSprite,s_bFullscreen,s_oStage);
            _oButFullscreen.addEventListener(ON_MOUSE_UP, this._onFullscreenRelease, this);
        }
     

        _oFade = new createjs.Shape();
        _oFade.graphics.beginFill("black").drawRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
        
        s_oStage.addChild(_oFade);
        
        createjs.Tween.get(_oFade).to({alpha:0}, 400).call(function(){_oFade.visible = false;});  
        
        // Inicializar seletor de salas
        _oRoomSelector = new CRoomSelector(s_oStage);
        
        this.refreshButtonPos(s_iOffsetX, s_iOffsetY);
    };
    
    this.refreshButtonPos = function (iNewX, iNewY) {
        if (DISABLE_SOUND_MOBILE === false || s_bMobile === false) {
            _oAudioToggle.setPosition(_pStartPosAudio.x - iNewX, iNewY + _pStartPosAudio.y);
        }
        if (_fRequestFullScreen && screenfull.isEnabled){
            _oButFullscreen.setPosition(_pStartPosFullscreen.x + iNewX,_pStartPosFullscreen.y + iNewY);
        }
        
        if(SHOW_CREDITS){
            _oButInfo.setPosition(_pStartPosInfo.x - iNewX,iNewY + _pStartPosInfo.y);
        }
        _oButPlay.setPosition(_pStartPosPlay.x,_pStartPosPlay.y - iNewY);
        _oButRoomSelect.setPosition(_pStartPosRoomSelect.x,_pStartPosRoomSelect.y - iNewY);
    };
    
    this.unload = function(){
        _oButPlay.unload(); 
        _oButPlay = null;
        
        _oButRoomSelect.unload();
        _oButRoomSelect = null;
        
        if(_oRoomSelector){
            _oRoomSelector.unload();
            _oRoomSelector = null;
        }
        
        if(SHOW_CREDITS){
            _oButInfo.unload();
            _oButInfo = null;
        }
        
        if(DISABLE_SOUND_MOBILE === false || s_bMobile === false){
            _oAudioToggle.unload();
            _oAudioToggle = null;
        }

        if (_fRequestFullScreen && screenfull.isEnabled){
            _oButFullscreen.unload();
        }
        
        s_oStage.removeChild(_oBg);
        _oBg = null;
        
        s_oStage.removeChild(_oFade);
        _oFade = null;
        s_oMenu = null;
    };
    
    this._onButPlayRelease = function(){
        // Inicia o jogo direto na Sala Bronze (jogo rápido)
        s_oMain.setSelectedRoom("bronze");
        this.unload();
        s_oMain.gotoGame();
        
        $(s_oMain).trigger("start_session");
    };
    
    this._onButRoomSelectRelease = function(){
        // Mostra o seletor de salas
        playSound("click", 1, false);
        _oRoomSelector.show(this._onRoomSelected.bind(this), this._onRoomSelectorClosed.bind(this));
    };
    
    this._onRoomSelected = function(sRoomType){
        // Callback quando uma sala é selecionada
        s_oMain.setSelectedRoom(sRoomType);
        _oRoomSelector.hide();
        this.unload();
        s_oMain.gotoGame();
        
        $(s_oMain).trigger("start_session");
    };
    
    this._onRoomSelectorClosed = function(){
        // Callback quando o seletor é fechado sem seleção
        // Não faz nada, apenas fica no menu
    };

    this._onAudioToggle = function(){
        Howler.mute(s_bAudioActive);
        s_bAudioActive = !s_bAudioActive;
    };
    
    this.resetFullscreenBut = function(){
	if (_fRequestFullScreen && screenfull.isEnabled){
		_oButFullscreen.setActive(s_bFullscreen);
	}
    };

    this._onFullscreenRelease = function(){
	if(s_bFullscreen) { 
		_fCancelFullScreen.call(window.document);
	}else{
		_fRequestFullScreen.call(window.document.documentElement);
	}
	
	sizeHandler();
    };


    this._onCredits = function(){
        new CCreditsPanel();
    };
    
    s_oMenu = this;
    
    this._init();
}

var s_oMenu = null;