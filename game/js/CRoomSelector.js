function CRoomSelector(){
    var _oBg;
    var _oFade;
    var _oContainerRooms;
    var _aRoomButtons;
    var _oButBack;
    var _oTitle;
    var _oPlayerInfo;
    var _pStartPosBack;
    var _pStartPosAudio;
    var _pStartPosFullscreen;
    var _oAudioToggle;
    var _oButFullscreen;
    var _fRequestFullScreen = null;
    var _fCancelFullScreen = null;
    
    this._init = function(){
        _oBg = createBitmap(s_oSpriteLibrary.getSprite('bg_menu'));
        s_oStage.addChild(_oBg);
        
        // Container para as salas
        _oContainerRooms = new createjs.Container();
        s_oStage.addChild(_oContainerRooms);
        
        // Título
        var oTitleBg = new createjs.Shape();
        oTitleBg.graphics.beginFill("rgba(0,0,0,0.7)").drawRoundRect(CANVAS_WIDTH/2 - 300, 50, 600, 80, 10);
        s_oStage.addChild(oTitleBg);
        
        _oTitle = new CCTLText(s_oStage, 
                            CANVAS_WIDTH/2 - 290, 60, 580, 60,
                            40, "center", "#ffffff", FONT_GAME, 1,
                            10, 10,
                            TEXT_SELECT_ROOM,
                            true, true, false,
                            false);
        
        // Informações do jogador
        var iPlayerLevel = localStorage.getItem('player_level') || 1;
        var iPlayerCredits = TOTAL_MONEY;
        
        var oPlayerBg = new createjs.Shape();
        oPlayerBg.graphics.beginFill("rgba(0,0,0,0.5)").drawRoundRect(20, 150, 250, 80, 10);
        s_oStage.addChild(oPlayerBg);
        
        _oPlayerInfo = new CCTLText(s_oStage, 
                            30, 160, 230, 60,
                            18, "left", "#ffffff", FONT_GAME, 1,
                            10, 10,
                            TEXT_LEVEL + ": " + iPlayerLevel + "\n" + TEXT_CREDITS + ": $" + iPlayerCredits,
                            true, true, true,
                            false);
        
        // Criar botões das salas
        this._createRoomButtons();
        
        // Botão voltar
        var oSprite = s_oSpriteLibrary.getSprite('but_exit');
        _pStartPosBack = {x: CANVAS_WIDTH - (oSprite.width/2) - 10, y: CANVAS_HEIGHT - (oSprite.height/2) - 10};
        _oButBack = new CGfxButton(_pStartPosBack.x, _pStartPosBack.y, oSprite, s_oStage);
        _oButBack.addEventListener(ON_MOUSE_UP, this._onBack, this);
        
        // Audio toggle
        if(DISABLE_SOUND_MOBILE === false || s_bMobile === false){
            var oSprite = s_oSpriteLibrary.getSprite('audio_icon');
            _pStartPosAudio = {x: CANVAS_WIDTH - (oSprite.width/2) - 10, y: (oSprite.height/2) + 10};
            _oAudioToggle = new CToggle(_pStartPosAudio.x,_pStartPosAudio.y,oSprite,s_bAudioActive,s_oStage);
            _oAudioToggle.addEventListener(ON_MOUSE_UP, this._onAudioToggle, this);
        }
        
        // Fullscreen
        var doc = window.document;
        var docEl = doc.documentElement;
        _fRequestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
        _fCancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;
        
        if(ENABLE_FULLSCREEN === false){
            _fRequestFullScreen = false;
        }
        
        if (_fRequestFullScreen && screenfull.isEnabled){
            var oSprite = s_oSpriteLibrary.getSprite('but_fullscreen');
            _pStartPosFullscreen = {x:10 + oSprite.width/4,y:(oSprite.height/2) + 10};
            _oButFullscreen = new CToggle(_pStartPosFullscreen.x,_pStartPosFullscreen.y,oSprite,s_bFullscreen,s_oStage);
            _oButFullscreen.addEventListener(ON_MOUSE_UP, this._onFullscreenRelease, this);
        }
        
        // Fade in
        _oFade = new createjs.Shape();
        _oFade.graphics.beginFill("black").drawRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
        s_oStage.addChild(_oFade);
        
        createjs.Tween.get(_oFade).to({alpha:0}, 400).call(function(){_oFade.visible = false;});
        
        this.refreshButtonPos(s_iOffsetX, s_iOffsetY);
    };
    
    this._createRoomButtons = function(){
        _aRoomButtons = [];
        var aRooms = s_oRoomConfig.getAllRooms();
        var aRoomKeys = ["bronze", "prata", "ouro"];
        var iPlayerLevel = parseInt(localStorage.getItem('player_level')) || 1;
        var iPlayerCredits = TOTAL_MONEY;
        
        var iStartY = 250;
        var iSpacingY = 150;
        
        for(var i = 0; i < aRoomKeys.length; i++){
            var sRoomKey = aRoomKeys[i];
            var oRoom = aRooms[sRoomKey];
            
            // Container para cada sala
            var oRoomContainer = new createjs.Container();
            oRoomContainer.x = CANVAS_WIDTH/2;
            oRoomContainer.y = iStartY + (i * iSpacingY);
            _oContainerRooms.addChild(oRoomContainer);
            
            // Fundo do botão
            var oButtonBg = new createjs.Shape();
            var bCanAccess = s_oRoomConfig.canPlayerAccessRoom(sRoomKey, iPlayerLevel) && iPlayerCredits >= oRoom.min_bet;
            
            if(bCanAccess){
                oButtonBg.graphics.beginLinearGradientFill(
                    [oRoom.color, shadeColor(oRoom.color, -30)], 
                    [0, 1], 0, 0, 0, 100
                );
                oButtonBg.cursor = "pointer";
            } else {
                oButtonBg.graphics.beginFill("rgba(100,100,100,0.8)");
            }
            
            oButtonBg.graphics.drawRoundRect(-300, -40, 600, 80, 15);
            oRoomContainer.addChild(oButtonBg);
            
            // Borda decorativa
            var oBorder = new createjs.Shape();
            oBorder.graphics.setStrokeStyle(3);
            if(bCanAccess){
                oBorder.graphics.beginStroke(oRoom.color);
            } else {
                oBorder.graphics.beginStroke("#666666");
            }
            oBorder.graphics.drawRoundRect(-300, -40, 600, 80, 15);
            oRoomContainer.addChild(oBorder);
            
            // Ícone da mesa (simulado com forma)
            var oIcon = new createjs.Shape();
            if(sRoomKey === "bronze"){
                oIcon.graphics.beginFill("#CD7F32").drawCircle(0, 0, 25);
            } else if(sRoomKey === "prata"){
                oIcon.graphics.beginFill("#C0C0C0").drawCircle(0, 0, 25);
            } else {
                oIcon.graphics.beginFill("#FFD700").drawCircle(0, 0, 25);
            }
            oIcon.x = -250;
            oRoomContainer.addChild(oIcon);
            
            // Nome da sala
            var oNameText = new createjs.Text(oRoom.name, "bold 28px " + FONT_GAME, bCanAccess ? "#ffffff" : "#999999");
            oNameText.x = -180;
            oNameText.y = -25;
            oRoomContainer.addChild(oNameText);
            
            // Descrição da sala
            var oDescText = new createjs.Text(oRoom.description, "18px " + FONT_GAME, bCanAccess ? "#eeeeee" : "#888888");
            oDescText.x = -180;
            oDescText.y = 5;
            oRoomContainer.addChild(oDescText);
            
            // Nível requerido
            var sLevelText = TEXT_LEVEL + " " + oRoom.level_required;
            var oLevelText = new createjs.Text(sLevelText, "16px " + FONT_GAME, bCanAccess ? "#00ff00" : "#ff0000");
            oLevelText.x = 150;
            oLevelText.y = -10;
            oLevelText.textAlign = "center";
            oRoomContainer.addChild(oLevelText);
            
            // Se pode acessar, adicionar interatividade
            if(bCanAccess){
                oRoomContainer.cursor = "pointer";
                
                // Adicionar eventos
                oRoomContainer.on("click", this._onSelectRoom, this, false, {room: sRoomKey});
                oRoomContainer.on("mouseover", function(evt){
                    createjs.Tween.get(evt.currentTarget, {override:true})
                        .to({scaleX:1.05, scaleY:1.05}, 200, createjs.Ease.quadOut);
                });
                oRoomContainer.on("mouseout", function(evt){
                    createjs.Tween.get(evt.currentTarget, {override:true})
                        .to({scaleX:1, scaleY:1}, 200, createjs.Ease.quadOut);
                });
            } else {
                // Adicionar ícone de bloqueado
                var oLockIcon = new createjs.Text("🔒", "30px Arial", "#ff0000");
                oLockIcon.x = 250;
                oLockIcon.y = -15;
                oLockIcon.textAlign = "center";
                oRoomContainer.addChild(oLockIcon);
                
                // Mensagem de requisito
                var sReqText = "";
                if(iPlayerLevel < oRoom.level_required){
                    sReqText = TEXT_NEED_LEVEL + " " + oRoom.level_required;
                } else if(iPlayerCredits < oRoom.min_bet){
                    sReqText = TEXT_NEED_MONEY + " $" + oRoom.min_bet;
                }
                
                var oReqText = new createjs.Text(sReqText, "14px " + FONT_GAME, "#ff6666");
                oReqText.x = 0;
                oReqText.y = 45;
                oReqText.textAlign = "center";
                oRoomContainer.addChild(oReqText);
            }
            
            _aRoomButtons.push(oRoomContainer);
        }
    };
    
    this._onSelectRoom = function(evt, data){
        playSound("click", 1, false);
        
        // Define a sala selecionada
        s_oRoomConfig.setCurrentRoom(data.room);
        
        // Vai para o jogo
        this.unload();
        s_oMain.gotoGame();
        
        $(s_oMain).trigger("start_session");
    };
    
    this._onBack = function(){
        playSound("click", 1, false);
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
    
    this.refreshButtonPos = function(iNewX, iNewY){
        _oButBack.setPosition(_pStartPosBack.x - iNewX, _pStartPosBack.y - iNewY);
        
        if(DISABLE_SOUND_MOBILE === false || s_bMobile === false){
            _oAudioToggle.setPosition(_pStartPosAudio.x - iNewX, iNewY + _pStartPosAudio.y);
        }
        
        if (_fRequestFullScreen && screenfull.isEnabled){
            _oButFullscreen.setPosition(_pStartPosFullscreen.x + iNewX,_pStartPosFullscreen.y + iNewY);
        }
    };
    
    this.unload = function(){
        _oButBack.unload();
        _oButBack = null;
        
        if(DISABLE_SOUND_MOBILE === false || s_bMobile === false){
            _oAudioToggle.unload();
            _oAudioToggle = null;
        }
        
        if (_fRequestFullScreen && screenfull.isEnabled){
            _oButFullscreen.unload();
        }
        
        s_oStage.removeAllChildren();
        s_oRoomSelector = null;
    };
    
    s_oRoomSelector = this;
    
    this._init();
}

// Função auxiliar para escurecer cores
function shadeColor(color, percent) {
    var num = parseInt(color.replace("#",""), 16),
        amt = Math.round(2.55 * percent),
        R = (num >> 16) + amt,
        G = (num >> 8 & 0x00FF) + amt,
        B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
}

var s_oRoomSelector = null;