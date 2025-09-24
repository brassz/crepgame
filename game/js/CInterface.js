function CInterface(){
    var _iIndexFicheSelected;
    var _szLastMsgHelp;
    var _aFiches;
    var _pStartPosAudio;
    var _pStartPosExit;
    var _pStartPosFullscreen;
    
    var _oButExit;
    var _oAudioToggle;
    var _oMoneyAmountText;
    var _oBetAmountText;
    var _oMsgTitle;
    var _oHelpText;
    var _oRoomInfoText;
    var _oDisplayBg;
    var _oRollBut;
    var _oClearAllBet;
    var _oRollingText;
    var _oButFullscreen;
    var _fRequestFullScreen = null;
    var _fCancelFullScreen = null;
    
    var _oBlock;
    
    this._init = function(){
        
        var oMoneyBg = createBitmap(s_oSpriteLibrary.getSprite('but_bg'));
        oMoneyBg.x = 251;
        oMoneyBg.y = 603;
        s_oStage.addChild(oMoneyBg);
        
        var oMoneyText = new CTLText(s_oStage, 
                    260, 616, 140, 16, 
                    16, "center", "#fff", FONT1, 1,
                    0, 0,
                    TEXT_MONEY,
                    true, true, false,
                    false );
                    

        
        _oMoneyAmountText = new CTLText(s_oStage, 
                    260, 636, 140, 16, 
                    16, "center", "#fff", FONT1, 1,
                    0, 0,
                    " ",
                    true, true, false,
                    false );

        
        var oCurBetBg = createBitmap(s_oSpriteLibrary.getSprite('but_bg'));
        oCurBetBg.x = 410;
        oCurBetBg.y = 603;
        s_oStage.addChild(oCurBetBg);
        
        var oCurBetText = new CTLText(s_oStage, 
                    419, 616, 140, 16, 
                    16, "center", "#fff", FONT1, 1,
                    0, 0,
                    TEXT_CUR_BET,
                    true, true, false,
                    false );
                    
        
        _oBetAmountText = new CTLText(s_oStage, 
                    419, 636, 140, 16, 
                    16, "center", "#fff", FONT1, 1,
                    0, 0,
                    " ",
                    true, true, false,
                    false );
                    

        
        _oDisplayBg = createBitmap(s_oSpriteLibrary.getSprite('but_bets'));
        _oDisplayBg.x = 575;
        _oDisplayBg.y = 610;
        s_oStage.addChild(_oDisplayBg);

        _oMsgTitle = new CTLText(s_oStage, 
                    _oDisplayBg.x+4, _oDisplayBg.y +4, 140, 40, 
                    16, "center", "#fff", FONT1, 1.2,
                    0, 0,
                    TEXT_MIN_BET+": "+MIN_BET+"\n"+TEXT_MAX_BET+": "+MAX_BET,
                    true, true, true,
                    false );

        
        // INFORMAÇÕES DA SALA - MOVIDO PARA O ESPAÇO VERDE DA MESA
        var oRoomInfoBg = createBitmap(s_oSpriteLibrary.getSprite('display_bg'));
        oRoomInfoBg.x = 450; // Posição no espaço verde da mesa
        oRoomInfoBg.y = 50;  // Parte superior da mesa
        s_oStage.addChild(oRoomInfoBg);
        
        _oRoomInfoText = new CTLText(s_oStage, 
                    oRoomInfoBg.x+114, oRoomInfoBg.y + 13, 130, 80, 
                    16, "center", "#fff", FONT1, 1,
                    0, 0,
                    "SALA: " + s_oRoomConfig.getRoomName("principal") + "\nJOGADORES: 1/" + s_oRoomConfig.getRoomMaxPlayers("principal") + "\nAPOSTA MIN: " + s_oRoomConfig.getRoomMinBet("principal") + "\nAPOSTA MAX: Sem limite",
                    true, true, true,
                    false );

        // HELP TEXT - MANTIDO NO CANTO DIREITO MAS AJUSTADO
        var oHelpBg = createBitmap(s_oSpriteLibrary.getSprite('display_bg'));
        oHelpBg.x = 880;
        oHelpBg.y = 210;
        s_oStage.addChild(oHelpBg);
        
        _oHelpText =  new CTLText(s_oStage, 
                    oHelpBg.x+114, oHelpBg.y + 13, 130, 80, 
                    20, "center", "#ffde00", FONT2, 1,
                    0, 0,
                    TEXT_WAITING_BET,
                    true, true, true,
                    false );

        
        _szLastMsgHelp = TEXT_WAITING_BET;

        _oRollBut = new CTextButton(1030,162,s_oSpriteLibrary.getSprite('roll_but'),"  "+TEXT_ROLL,FONT1,"#fff",22,"right",s_oStage);
        _oRollBut.disable();
        _oRollBut.addEventListener(ON_MOUSE_UP, this._onRoll, this);
      
        _oClearAllBet = new CGfxButton(764,636,s_oSpriteLibrary.getSprite('but_clear_all'),s_oStage);
        _oClearAllBet.addEventListener(ON_MOUSE_UP, this._onClearAllBet, this);
       
        this._initFichesBut();

        _iIndexFicheSelected=0;
        _aFiches[_iIndexFicheSelected].select();
        
        var oGraphics = new createjs.Graphics().beginFill("rgba(0,0,0,0.01)").drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        _oBlock = new createjs.Shape(oGraphics);
        _oBlock.on("click",function(){});
        _oBlock.visible= false;
        s_oStage.addChild(_oBlock);

        var oSprite = s_oSpriteLibrary.getSprite('but_exit');
        _pStartPosExit = {x:CANVAS_WIDTH - (oSprite.width/2) - 10,y:(oSprite.height/2) + 10};
        _oButExit = new CGfxButton(_pStartPosExit.x,_pStartPosExit.y,oSprite,s_oStage);
        _oButExit.addEventListener(ON_MOUSE_UP, this._onExit, this);
        
        if(DISABLE_SOUND_MOBILE === false || s_bMobile === false){
            oSprite = s_oSpriteLibrary.getSprite('audio_icon');
            _pStartPosAudio = {x: _pStartPosExit.x - oSprite.width/2 - 10, y: (oSprite.height/2) + 10};
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
        
        this.refreshButtonPos(s_iOffsetX, s_iOffsetY);
    };
    
    this.unload = function(){
        _oButExit.unload();
	if(DISABLE_SOUND_MOBILE === false || s_bMobile === false){
            _oAudioToggle.unload();
        }
        if (_fRequestFullScreen && screenfull.isEnabled){
            _oButFullscreen.unload();
        }
        _oRollBut.unload();
        _oClearAllBet.unload();
        s_oInterface = null;
    };
    
    this.refreshButtonPos = function (iNewX, iNewY) {
        if(DISABLE_SOUND_MOBILE === false || s_bMobile === false){
            _oAudioToggle.setPosition(_pStartPosAudio.x - iNewX,_pStartPosAudio.y + iNewY);
        }
        if (_fRequestFullScreen && screenfull.isEnabled){
            _oButFullscreen.setPosition(_pStartPosFullscreen.x + iNewX,_pStartPosFullscreen.y + iNewY);
        }
        _oButExit.setPosition(_pStartPosExit.x - iNewX,_pStartPosExit.y + iNewY);
    };
    
    this.hideBlock = function(){
        _oBlock.visible = false;
    };
    
    this.showBlock = function(){
        _oBlock.visible = true;
    };
    
    this.enableBetFiches = function(){
        for(var i=0;i<NUM_FICHES;i++){
            _aFiches[i].enable();
        }
    };
    
    this.enableClearButton = function(){
        _oClearAllBet.enable();
    };
    
    this.disableBetFiches = function(){
        for(var i=0;i<NUM_FICHES;i++){
            _aFiches[i].disable();
        }
    };
    
    this.disableClearButton = function(){
        _oClearAllBet.disable();
    };

    this.deselectAllFiches = function(){
         for(var i=0;i<NUM_FICHES;i++){
             _aFiches[i].deselect();
         }
    };
    
    this.enableRoll = function(bEnable){
        if(bEnable){
            _oRollBut.enable();
        }else{
            _oRollBut.disable();
        }
        
    };
    
    this._initFichesBut = function(){
        var oFicheBg = createBitmap(s_oSpriteLibrary.getSprite('chip_box'));
        oFicheBg.x = 50;  // Movido mais para a esquerda para dar espaço
        oFicheBg.y = 120; // Movido um pouco para baixo
        s_oStage.addChild(oFicheBg);
        
        //SET FICHES BUTTON
        var iCurX = 92;   // Ajustado conforme nova posição
        var iCurY = 170;  // Ajustado conforme nova posição
        _aFiches = new Array();
        for(var i=0;i<NUM_FICHES;i++){
            var oSprite = s_oSpriteLibrary.getSprite('fiche_'+i);
            _aFiches[i] = new CFicheBut(iCurX,iCurY,oSprite);
            _aFiches[i].addEventListenerWithParams(ON_MOUSE_UP, this._onFicheSelected, this,[i]);
            
            iCurY += oSprite.height + 25;
        }
    };
    
    this.setMoney = function(iMoney){
        _oMoneyAmountText.refreshText(iMoney.toFixed(2)+TEXT_CURRENCY);
    };

    this.refreshMoney = function(iStartMoney, iMoney){
        _oRollingText = new CRollingTextController(_oMoneyAmountText.getText(), null, iStartMoney , parseFloat(iMoney), 4000, EASE_LINEAR,TEXT_CURRENCY);
    };
    
    this.setCurBet = function(iCurBet){
        _oBetAmountText.refreshText(iCurBet.toFixed(2) + TEXT_CURRENCY);
    };
    
    this.refreshMsgHelp = function(szText,bLastState){
        _oHelpText.refreshText(szText);
        if(bLastState){
            _szLastMsgHelp = szText;
        }
    };
    
    this.clearMsgHelp = function(){
        _oHelpText.refreshText(_szLastMsgHelp);
    };
    
    this.updateRoomInfo = function(sRoomType, iPlayers){
        if(_oRoomInfoText){
            var oRoomConfig = s_oRoomConfig.getRoomConfig(sRoomType);
            var sRoomInfo = "SALA: " + oRoomConfig.name + "\n";
            sRoomInfo += "JOGADORES: " + iPlayers + "/" + oRoomConfig.max_players + "\n";
            sRoomInfo += "APOSTA MIN: " + oRoomConfig.min_bet + "\n";
            sRoomInfo += "APOSTA MAX: " + (oRoomConfig.max_bet ? oRoomConfig.max_bet : "Sem limite");
            _oRoomInfoText.refreshText(sRoomInfo);
        }
    };
    
    // Métodos para sistema multiplayer
    this.updateMultiplayerInfo = function(oRoomInfo, bIsDealer){
        if(_oRoomInfoText && oRoomInfo){
            var sRoomInfo = "SALA: " + oRoomInfo.config.name + "\n";
            sRoomInfo += "JOGADORES: " + oRoomInfo.playerCount + "/" + oRoomInfo.config.max_players + "\n";
            sRoomInfo += "APOSTA MIN: R$" + oRoomInfo.config.min_bet + "\n";
            sRoomInfo += "APOSTA MAX: " + (oRoomInfo.config.max_bet ? "R$" + oRoomInfo.config.max_bet : "Sem limite");
            
            if(bIsDealer){
                sRoomInfo += "\n🎲 VOCÊ É O DEALER";
            }
            
            _oRoomInfoText.refreshText(sRoomInfo);
        }
    };
    
    this.updateDealerStatus = function(bIsDealer){
        if(bIsDealer){
            this.refreshMsgHelp("🎲 VOCÊ É O DEALER - Pode rolar os dados quando houver apostas", true);
            // Habilitar botão de rolar se há apostas
            if(s_oGame && s_oGame.getCurrentBet() > 0){
                this.enableRoll(true);
            }
        } else {
            this.refreshMsgHelp("👥 MODO MULTIPLAYER - Aguardando o dealer rolar os dados", true);
            // Desabilitar botão de rolar se não é dealer
            this.enableRoll(false);
        }
    };
    
    this.showMultiplayerMessage = function(sMessage, sColor){
        if(_oHelpText){
            var sPrevColor = _oHelpText.color;
            if(sColor){
                _oHelpText.color = sColor;
            }
            _oHelpText.refreshText(sMessage);
            
            // Voltar à cor original após 3 segundos
            setTimeout(function(){
                if(_oHelpText){
                    _oHelpText.color = sPrevColor;
                    _oHelpText.refreshText(_szLastMsgHelp);
                }
            }, 3000);
        }
    };
    
    this.addOtherPlayerIndicator = function(sPlayerId, sPlayerName, iX, iY){
        // Adicionar indicador visual de outro jogador na mesa
        var oPlayerIndicator = new createjs.Container();
        
        // Círculo de fundo
        var oCircle = new createjs.Shape();
        oCircle.graphics.beginFill("#FFD700").drawCircle(0, 0, 20);
        oPlayerIndicator.addChild(oCircle);
        
        // Iniciais do jogador
        var sInitials = sPlayerName.substring(0, 2).toUpperCase();
        var oPlayerText = new createjs.Text(sInitials, "bold 12px " + FONT1, "#000000");
        oPlayerText.textAlign = "center";
        oPlayerText.textBaseline = "middle";
        oPlayerIndicator.addChild(oPlayerText);
        
        // Nome do jogador (tooltip)
        var oNameText = new createjs.Text(sPlayerName, "10px " + FONT1, "#FFFFFF");
        oNameText.x = -sPlayerName.length * 3;
        oNameText.y = 25;
        oNameText.visible = false;
        oPlayerIndicator.addChild(oNameText);
        
        // Posicionamento
        oPlayerIndicator.x = iX;
        oPlayerIndicator.y = iY;
        oPlayerIndicator.name = "player_" + sPlayerId;
        
        // Eventos de mouse
        oPlayerIndicator.cursor = "pointer";
        oPlayerIndicator.addEventListener("mouseover", function(){
            oNameText.visible = true;
        });
        oPlayerIndicator.addEventListener("mouseout", function(){
            oNameText.visible = false;
        });
        
        s_oStage.addChild(oPlayerIndicator);
        return oPlayerIndicator;
    };
    
    this.removeOtherPlayerIndicator = function(sPlayerId){
        var oIndicator = s_oStage.getChildByName("player_" + sPlayerId);
        if(oIndicator){
            s_oStage.removeChild(oIndicator);
        }
    };
    
    this.showOtherPlayerBet = function(sPlayerId, sPlayerName, iAmount){
        // Mostrar animação de aposta de outro jogador
        var oIndicator = s_oStage.getChildByName("player_" + sPlayerId);
        if(oIndicator){
            // Animação de ficha voando
            var oFiche = createBitmap(s_oSpriteLibrary.getSprite('fiche_0'));
            oFiche.x = oIndicator.x;
            oFiche.y = oIndicator.y;
            oFiche.scaleX = oFiche.scaleY = 0.5;
            s_oStage.addChild(oFiche);
            
            // Animar para o centro da mesa
            createjs.Tween.get(oFiche)
                .to({x: CANVAS_WIDTH/2, y: CANVAS_HEIGHT/2, scaleX: 1, scaleY: 1}, 1000, createjs.Ease.quadOut)
                .call(function(){
                    s_oStage.removeChild(oFiche);
                });
            
            // Mostrar texto de aposta
            new CScoreText(sPlayerName + " apostou R$" + iAmount, oIndicator.x, oIndicator.y - 30, "#FFD700");
        }
    };
    
    this.updatePlayersDisplay = function(aPlayers){
        // Limpar indicadores existentes
        for(var i = 0; i < aPlayers.length; i++){
            this.removeOtherPlayerIndicator(aPlayers[i].id);
        }
        
        // Adicionar novos indicadores
        var iStartX = 200;
        var iStartY = 50;
        var iSpacing = 60;
        
        for(var i = 0; i < aPlayers.length; i++){
            var player = aPlayers[i];
            var iX = iStartX + (i * iSpacing);
            this.addOtherPlayerIndicator(player.id, player.name, iX, iStartY);
        }
    };
    
    this._onBetRelease = function(oParams){
        var aBets=oParams.numbers;

        if(aBets !== null){
            s_oGame._onShowBetOnTable({button:oParams.name},false);
        }
    };
    
    this._onFicheSelected = function(aParams){
        playSound("fiche_collect", 1, false);
        
        this.deselectAllFiches();
        
        var iFicheIndex=aParams[0];
        for(var i=0;i<NUM_FICHES;i++){
            if(i === iFicheIndex){
               _iIndexFicheSelected = i;
            }
        }
    };
    
    this._onRoll = function(){
            this.disableBetFiches();
            this.enableRoll(false);
            s_oGame.onRoll();    
    };
    
    this._onClearAllBet = function(){
        s_oGame.onClearAllBets();
    };

    this._onExit = function(){
        s_oGame.onExit(false);  
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
    
    this.getCurFicheSelected = function(){
        return _iIndexFicheSelected;
    };
    
    this.isBlockVisible = function(){
        return _oBlock.visible;
    };
    
    s_oInterface = this;
    
    this._init();
    
    return this;
}

var s_oInterface = null;;