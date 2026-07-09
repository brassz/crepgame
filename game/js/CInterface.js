function CInterface(){
    var _iIndexFicheSelected;
    var _szLastMsgHelp;
    var _aFiches;
    var _pStartPosAudio;
    var _pStartPosExit;
    var _pStartPosFullscreen;
    
    var _oButExit;
    var _oButLogout;
    var _pStartPosLogout;
    var _oAudioToggle;
    var _oMoneyAmountText;
    var _oBetAmountText;
    var _oLockedBalanceText;
    var _oMsgTitle;
    var _oHelpText;
    var _oRoomInfoText;
    var _oDisplayBg;
    var _oRollBut;
    var _oPassDiceBut;
    var _oClearAllBet;
    var _oRollingText;
    var _oButFullscreen;
    var _oButRoomBronze;
    var _oButRoomPrata;
    var _oButRoomOuro;
    var _oTurnTimerText;
    var _fRequestFullScreen = null;
    var _fCancelFullScreen = null;
    
    var _oBlock;
    
    // NOVOS BOTÕES PARA APOSTAS NO PONTO E NO 7
    var _oButBetOnPoint;
    var _oButBetOnSeven;
    var _oPointBettingContainer;
    var _oPointBettingTitle;
    var _iParadasCount = 0; // Contador de paradas feitas
    var _iLocalPointBettingTimer = null; // Timer local para garantir que modal permaneça aberto por 8 segundos
    
    // LISTA DE JOGADORES CONECTADOS
    var _oPlayersListContainer;
    var _aPlayerTexts = [];
    this._init = function(){
        
        var oMoneyBg = createBitmap(s_oSpriteLibrary.getSprite('but_bg'));
        oMoneyBg.x = 251;
        oMoneyBg.y = 480; // SUBIDO PARA CIMA (era 540)
        s_oStage.addChild(oMoneyBg);
        
        var oMoneyText = new CTLText(s_oStage, 
                    260, 493, 140, 16, 
                    16, "center", "#fff", FONT1, 1,
                    0, 0,
                    TEXT_MONEY,
                    true, true, false,
                    false );
                    

        
        _oMoneyAmountText = new CTLText(s_oStage, 
                    260, 513, 140, 16, 
                    16, "center", "#fff", FONT1, 1,
                    0, 0,
                    " ",
                    true, true, false,
                    false );

        
        var oCurBetBg = createBitmap(s_oSpriteLibrary.getSprite('but_bg'));
        oCurBetBg.x = 410;
        oCurBetBg.y = 480; // SUBIDO PARA CIMA (era 540)
        s_oStage.addChild(oCurBetBg);
        
        var oCurBetText = new CTLText(s_oStage, 
                    419, 493, 140, 16, 
                    16, "center", "#fff", FONT1, 1,
                    0, 0,
                    TEXT_CUR_BET,
                    true, true, false,
                    false );
                    
        
        _oBetAmountText = new CTLText(s_oStage, 
                    419, 513, 140, 16, 
                    16, "center", "#fff", FONT1, 1,
                    0, 0,
                    " ",
                    true, true, false,
                    false );
                    

        
        _oDisplayBg = createBitmap(s_oSpriteLibrary.getSprite('but_bets'));
        _oDisplayBg.x = 575;
        _oDisplayBg.y = 487; // SUBIDO PARA CIMA (era 547)
        s_oStage.addChild(_oDisplayBg);

        _oMsgTitle = new CTLText(s_oStage, 
                    _oDisplayBg.x+4, _oDisplayBg.y +4, 140, 40, 
                    16, "center", "#fff", FONT1, 1.2,
                    0, 0,
                    TEXT_MIN_BET+": "+MIN_BET+"\n"+TEXT_MAX_BET+": "+MAX_BET,
                    true, true, true,
                    false );

        
        // INFORMAÇÕES DA SALA - NO TOPO CENTRALIZADA E MAIOR
        var oRoomInfoBg = createBitmap(s_oSpriteLibrary.getSprite('display_bg'));
        oRoomInfoBg.x = 530; // Centralizado no topo
        oRoomInfoBg.y = 20;  // Bem no topo
        oRoomInfoBg.scaleX = 1.3; // Aumenta largura do fundo em 30%
        oRoomInfoBg.scaleY = 1.3; // Aumenta altura do fundo em 30%
        s_oStage.addChild(oRoomInfoBg);
        
        _oRoomInfoText = new CTLText(s_oStage, 
                    oRoomInfoBg.x+114, oRoomInfoBg.y + 13, 180, 110, 
                    22, "center", "#fff", FONT1, 1,
                    0, 0,
                    "SALA: " + s_oRoomConfig.getRoomName("bronze") + "\nJOGADORES: 1/" + s_oRoomConfig.getRoomMaxPlayers("bronze") + "\nAPOSTA MIN: " + s_oRoomConfig.getRoomMinBet("bronze") + "\nAPOSTA MAX: " + (s_oRoomConfig.getRoomMaxBet("bronze") ? s_oRoomConfig.getRoomMaxBet("bronze") : "Sem limite"),
                    true, true, true,
                    false );

        // Botões de seleção de sala - AO LADO DAS FICHAS
        var iRoomButtonX = 280; // Ao lado direito das fichas
        _oButRoomBronze = new CTextButton(iRoomButtonX, 150, s_oSpriteLibrary.getSprite('but_bg'), "BRONZE", FONT1, "#fff", 16, "center", s_oStage);
        _oButRoomBronze.addEventListener(ON_MOUSE_UP, function(){ s_oGame.changeRoom("bronze"); }, this);
        _oButRoomPrata = new CTextButton(iRoomButtonX, 210, s_oSpriteLibrary.getSprite('but_bg'), "PRATA", FONT1, "#fff", 16, "center", s_oStage);
        _oButRoomPrata.addEventListener(ON_MOUSE_UP, function(){ s_oGame.changeRoom("prata"); }, this);
        _oButRoomOuro = new CTextButton(iRoomButtonX, 270, s_oSpriteLibrary.getSprite('but_bg'), "OURO", FONT1, "#fff", 16, "center", s_oStage);
        _oButRoomOuro.addEventListener(ON_MOUSE_UP, function(){ s_oGame.changeRoom("ouro"); }, this);
        // garantir que fiquem acima: adicionar novamente ao stage após criação das fichas (feito abaixo)

        // HELP TEXT - AGUARDANDO SUA APOSTA - MAIOR
        var oHelpBg = createBitmap(s_oSpriteLibrary.getSprite('display_bg'));
        oHelpBg.x = 950; // Movido mais para a direita
        oHelpBg.y = 210;
        oHelpBg.scaleX = 1.3; // Aumenta largura do fundo em 30%
        oHelpBg.scaleY = 1.3; // Aumenta altura do fundo em 30%
        s_oStage.addChild(oHelpBg);
        
        _oHelpText =  new CTLText(s_oStage, 
                    oHelpBg.x+114, oHelpBg.y + 13, 180, 110, 
                    28, "center", "#ffde00", FONT2, 1,
                    0, 0,
                    TEXT_WAITING_BET,
                    true, true, true,
                    false );

        
        _szLastMsgHelp = TEXT_WAITING_BET;

        // BOTÃO DE LANÇAR DADOS - MAIOR E MAIS DESTACADO
        _oRollBut = new CTextButton(1080,120,s_oSpriteLibrary.getSprite('roll_but'),"  "+TEXT_ROLL,FONT1,"#fff",28,"right",s_oStage); // Fonte aumentada de 22 para 28
        _oRollBut.disable();
        _oRollBut.addEventListener(ON_MOUSE_UP, this._onRoll, this);

        // Timer de turno (topo direito, abaixo do botão lançar)
        _oTurnTimerText = new CTLText(s_oStage, 
                    1080, 180, 200, 30, 
                    18, "right", "#ffde00", FONT2, 1,
                    0, 0,
                    "",
                    true, true, false,
                    false );
      
        // BOTÃO REFAZER APOSTA - SUBIDO PARA CIMA
        _oClearAllBet = new CGfxButton(764,513,s_oSpriteLibrary.getSprite('but_clear_all'),s_oStage);
        _oClearAllBet.addEventListener(ON_MOUSE_UP, this._onClearAllBet, this);
        
        // BOTÃO PASSAR O DADO - Ao lado direito do botão de refazer
        _oPassDiceBut = new CTextButton(900, 513, s_oSpriteLibrary.getSprite('but_bg'), "PASSAR", FONT1, "#fff", 16, "center", s_oStage);
        _oPassDiceBut.disable();
        _oPassDiceBut.addEventListener(ON_MOUSE_UP, this._onPassDice, this);
        
        // Inicializar botões de aposta no ponto e no 7 (ocultos inicialmente)
        this._initPointBettingButtons();
       
        this._initFichesBut();
        
        // Inicializar lista de jogadores
        this._initPlayersList();
        // Trazer os botões de sala para frente, acima das fichas
        if (_oButRoomBronze) { s_oStage.addChild(_oButRoomBronze.getSprite()); }
        if (_oButRoomPrata) { s_oStage.addChild(_oButRoomPrata.getSprite()); }
        if (_oButRoomOuro) { s_oStage.addChild(_oButRoomOuro.getSprite()); }

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

        _pStartPosLogout = {x: 95, y: 42};
        var szLogoutLabel = (typeof TEXT_LOGOUT !== 'undefined') ? TEXT_LOGOUT : 'LOGOUT';
        _oButLogout = new CTextButton(_pStartPosLogout.x, _pStartPosLogout.y, s_oSpriteLibrary.getSprite('but_bg'), szLogoutLabel, FONT1, '#fff', 14, 'center', s_oStage);
        _oButLogout.addEventListener(ON_MOUSE_UP, this._onLogout, this);
        
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
        if (_oButLogout) { _oButLogout.unload(); }
	if(DISABLE_SOUND_MOBILE === false || s_bMobile === false){
            _oAudioToggle.unload();
        }
        if (_oButRoomBronze) { _oButRoomBronze.unload(); }
        if (_oButRoomPrata) { _oButRoomPrata.unload(); }
        if (_oButRoomOuro) { _oButRoomOuro.unload(); }
        if (_fRequestFullScreen && screenfull.isEnabled){
            _oButFullscreen.unload();
        }
        _oRollBut.unload();
        _oPassDiceBut.unload();
        _oClearAllBet.unload();
        
        // Limpar botões de aposta no ponto e no 7
        if(_oButBetOnPoint) { _oButBetOnPoint.unload(); }
        if(_oButBetOnSeven) { _oButBetOnSeven.unload(); }
        
        // Limpar timer local se existir
        if(_iLocalPointBettingTimer){
            clearTimeout(_iLocalPointBettingTimer);
            _iLocalPointBettingTimer = null;
        }
        if(_oPointBettingContainer) { s_oStage.removeChild(_oPointBettingContainer); }
        
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
        if (_oButLogout) {
            _oButLogout.setPosition(_pStartPosLogout.x + iNewX, _pStartPosLogout.y + iNewY);
        }
        
        // Botões de sala ao lado das fichas
        if(s_bMobile){
            // No mobile, ao lado das fichas
            if (_oButRoomBronze) { _oButRoomBronze.setPosition(280 + iNewX, 150 + iNewY); }
            if (_oButRoomPrata) { _oButRoomPrata.setPosition(280 + iNewX, 210 + iNewY); }
            if (_oButRoomOuro) { _oButRoomOuro.setPosition(280 + iNewX, 270 + iNewY); }
        } else {
            // No desktop, ao lado das fichas
            if (_oButRoomBronze) { _oButRoomBronze.setPosition(280 + iNewX, 150 + iNewY); }
            if (_oButRoomPrata) { _oButRoomPrata.setPosition(280 + iNewX, 210 + iNewY); }
            if (_oButRoomOuro) { _oButRoomOuro.setPosition(280 + iNewX, 270 + iNewY); }
        }
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
    
    this.setRollButtonLabel = function(szLabel){
        if(_oRollBut && _oRollBut.changeText){
            _oRollBut.changeText("  " + (szLabel || TEXT_ROLL));
        }
    };
    
    this.enablePassDice = function(bEnable){
        if(bEnable){
            _oPassDiceBut.enable();
        }else{
            _oPassDiceBut.disable();
        }
    };

    // Atualiza contador visual de turno (segundos restantes)
    this.updateTurnTimer = function(iSeconds, playerInfo){
        if (_oTurnTimerText){
            var s = "";
            if(iSeconds > 0){
                if(playerInfo && playerInfo.isMyTurn){
                    // Show encouraging message instead of pressure
                    if(iSeconds > 10){
                        s = "SEU TURNO - Sem pressa!";
                    } else {
                        s = "SEU TURNO: " + iSeconds + "s";
                    }
                } else if(playerInfo && playerInfo.playerIndex){
                    s = "JOGADOR " + playerInfo.playerIndex + "/" + playerInfo.totalPlayers + ": " + iSeconds + "s";
                } else {
                    s = "TURNO: " + iSeconds + "s";
                }
            } else {
                // When time expires, don't pressure the player
                if(playerInfo && playerInfo.isMyTurn){
                    s = "SEU TURNO - Clique quando quiser";
                } else {
                    s = "Aguardando jogador...";
                }
            }
            _oTurnTimerText.refreshText(s);
        }
    };
    
    this._initFichesBut = function(){
        var oFicheBg = createBitmap(s_oSpriteLibrary.getSprite('chip_box'));
        oFicheBg.x = 120;  // LADO ESQUERDO
        oFicheBg.y = 100;  // MOVIDO MAIS PARA CIMA (era 250)
        s_oStage.addChild(oFicheBg);
        
        //SET FICHES BUTTON - LADO ESQUERDO E MAIS ACIMA
        var iCurX = 162;   // Lado esquerdo
        var iCurY = 150;   // MAIS PARA CIMA (era 300)
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
        
        if(iMoney <= 0){
            this.disableBetFiches();
            console.log("🔒 Fichas desabilitadas - saldo zero ou negativo:", iMoney);
        } else if(window.s_oGame && window.s_oGame.syncBettingUI){
            window.s_oGame.syncBettingUI();
        }
    };

    this.refreshMoney = function(iStartMoney, iMoney){
        _oRollingText = new CRollingTextController(_oMoneyAmountText.getText(), null, iStartMoney , parseFloat(iMoney), 4000, EASE_LINEAR,TEXT_CURRENCY);
    };
    
    this.setCurBet = function(iCurBet){
        _oBetAmountText.refreshText(iCurBet.toFixed(2) + TEXT_CURRENCY);
    };
    
    this.setLockedBalance = function(iLockedBalance){
        // Sempre mostra o saldo travado na caixa de aposta atual
        _oBetAmountText.refreshText(iLockedBalance.toFixed(2) + TEXT_CURRENCY);
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

    this.updateBetLimits = function(iMin, iMax){
        if (_oMsgTitle){
            _oMsgTitle.refreshText(TEXT_MIN_BET+": "+iMin+"\n"+TEXT_MAX_BET+": "+(iMax ? iMax : "Sem limite"));
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
    
    this._onPassDice = function(){
        // Desabilita o botão de passar e o de lançar
        this.enablePassDice(false);
        this.enableRoll(false);
        
        // Chama função do jogo para passar o dado
        if(s_oGame && s_oGame.onPassDice){
            s_oGame.onPassDice();
        }
    };
    
    this._onClearAllBet = function(){
        s_oGame.onClearAllBets();
    };

    this._onExit = function(){
        s_oGame.onExit(false);  
    };

    this._onLogout = function(){
        s_oGame.onLogout();
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
    
    // Mostra mensagem temporária para os jogadores
    this.showMessage = function(szMessage){
        if(_oHelpText){
            _oHelpText.refreshText(szMessage);
        }
        
        // Criar um texto temporário se não houver help text
        if(!_oHelpText){
            var oTempMsg = new CTLText(s_oStage, 
                        CANVAS_WIDTH/2 - 150, CANVAS_HEIGHT/2 - 100, 300, 50, 
                        20, "center", "#ffff00", FONT1, 1,
                        2, 2,
                        szMessage,
                        true, true, true,
                        false );
            
            // Remove a mensagem após 2 segundos (reduzido)
            setTimeout(function(){
                if(oTempMsg && oTempMsg.unload){
                    oTempMsg.unload();
                }
            }, 2000);
        }
    };
    
    // Esconde mensagem atual
    this.hideMessage = function(){
        if(_oHelpText){
            _oHelpText.refreshText(_szLastMsgHelp || TEXT_WAITING_BET);
        }
    };
    
    // ==== SISTEMA DE APOSTAS NO PONTO E NO 7 ====
    
    this._initPointBettingButtons = function(){
        console.log("🔧 Inicializando botões de aposta no ponto e no 7...");
        
        // Container para os botões de aposta no ponto
        _oPointBettingContainer = new createjs.Container();
        _oPointBettingContainer.x = CANVAS_WIDTH / 2;
        _oPointBettingContainer.y = 180; // Posição mais baixa na tela
        _oPointBettingContainer.visible = false;
        s_oStage.addChild(_oPointBettingContainer);
        
        console.log("✅ Container criado em posição:", _oPointBettingContainer.x, _oPointBettingContainer.y);
        
        // Fundo semi-transparente
        var oBackground = new createjs.Graphics().beginFill("rgba(0,0,0,0.7)").drawRoundRect(-250, -50, 500, 120, 10);
        var oBgShape = new createjs.Shape(oBackground);
        _oPointBettingContainer.addChild(oBgShape);
        
        // Texto de título (atualizado conforme shooter / adversário)
        _oPointBettingTitle = new CTLText(_oPointBettingContainer, 
                    -200, -35, 400, 30, 
                    22, "center", "#ffde00", FONT2, 1,
                    0, 0,
                    "APOSTE NO PONTO OU NO 7!",
                    true, true, false,
                    false );
        
        // Botão paradas no PONTO — só o shooter (DADOS)
        _oButBetOnPoint = new CTextButton(-120, 15, s_oSpriteLibrary.getSprite('but_bg'), "PONTO: 4", FONT1, "#fff", 24, "center", _oPointBettingContainer);
        _oButBetOnPoint.addEventListener(ON_MOUSE_UP, this._onBetOnPoint, this);
        
        // Botão apostar no 7 — só adversários (sem os dados)
        _oButBetOnSeven = new CTextButton(120, 15, s_oSpriteLibrary.getSprite('but_bg'), "7", FONT1, "#fff", 24, "center", _oPointBettingContainer);
        _oButBetOnSeven.addEventListener(ON_MOUSE_UP, this._onBetOnSeven, this);
        
        console.log("✅ Botões de aposta no ponto e no 7 inicializados com sucesso!");
    };

    /** Shooter → paradas no ponto | Adversário → paradas no 7 (100x200) */
    this._applyPointBettingRoleUI = function(iPointNumber, bIsShooter){
        var szPonto = "100x200";
        if(iPointNumber === 5 || iPointNumber === 9) szPonto = "100x150";
        else if(iPointNumber === 6 || iPointNumber === 8) szPonto = "100x125";
        if(_oPointBettingTitle){
            _oPointBettingTitle.refreshText(bIsShooter
                ? "PARADAS PONTO " + iPointNumber + " (" + szPonto + ")"
                : "PARADAS NO 7 (100x200)");
        }
        if(_oButBetOnPoint){
            _oButBetOnPoint.changeText("PONTO: " + iPointNumber);
            _oButBetOnPoint.setVisible(!!bIsShooter);
            _oButBetOnPoint.setPosition(bIsShooter ? 0 : -120, 15);
        }
        if(_oButBetOnSeven){
            _oButBetOnSeven.setVisible(!bIsShooter);
            _oButBetOnSeven.setPosition(!bIsShooter ? 0 : 120, 15);
        }
    };
    
    this.showPointBettingButtons = function(iPointNumber, bIsShooter){
        // Não abrir modal se a rodada já acabou / período fechado
        if(window.s_oGame){
            if(window.s_oGame._bPointBettingOpen === false){
                return;
            }
            if(window.s_oGame._iNumberPoint != null && window.s_oGame._iNumberPoint <= 0){
                return;
            }
        }
        if(!iPointNumber || iPointNumber <= 0){
            return;
        }

        console.log("🎮 showPointBettingButtons chamado com ponto:", iPointNumber, "shooter:", !!bIsShooter);
        
        // Verificar se container existe, se não existir, criar
        if(!_oPointBettingContainer){
            console.warn("⚠️ Container não existe - criando agora");
            this._initPointBettingButtons();
        }
        
        if(_oPointBettingContainer){
            // IMPORTANTE: Garantir que o block está oculto para não bloquear os botões
            if(_oBlock){
                _oBlock.visible = false;
                console.log("✅ Block oculto para não bloquear os botões");
            }
            
            // Garantir que o container está visível
            _oPointBettingContainer.visible = true;
            _oPointBettingContainer.alpha = 1.0;
            _oPointBettingContainer.mouseEnabled = true;
            _oPointBettingContainer.mouseChildren = true;
            
            // CRITICAL: Garantir que container está no stage antes de mover
            if(!s_oStage.contains(_oPointBettingContainer)){
                console.warn("⚠️ Container não está no stage - adicionando agora");
                s_oStage.addChild(_oPointBettingContainer);
            }
            
            // CRITICAL: Mover o container para o TOPO do stage para garantir que apareça acima de todos os outros elementos
            // Fazer isso de forma mais robusta
            var iNumChildren = s_oStage.getNumChildren();
            if(iNumChildren > 0){
                try {
                    // Verificar índice atual
                    var iCurrentIndex = s_oStage.getChildIndex(_oPointBettingContainer);
                    var iTargetIndex = iNumChildren - 1;
                    
                    // Só mover se não estiver no topo
                    if(iCurrentIndex !== iTargetIndex){
                        s_oStage.setChildIndex(_oPointBettingContainer, iTargetIndex);
                        console.log("✅ Container movido para o topo do stage (de", iCurrentIndex, "para", iTargetIndex, ")");
                    }
                } catch(e) {
                    console.error("❌ Erro ao mover container para o topo:", e);
                    // Se falhar, tentar adicionar novamente
                    if(!s_oStage.contains(_oPointBettingContainer)){
                        console.warn("⚠️ Tentando adicionar container novamente ao stage");
                        s_oStage.addChild(_oPointBettingContainer);
                        // Tentar mover novamente após adicionar
                        try {
                            var iNumChildren2 = s_oStage.getNumChildren();
                            if(iNumChildren2 > 0){
                                s_oStage.setChildIndex(_oPointBettingContainer, iNumChildren2 - 1);
                            }
                        } catch(e2) {
                            console.error("❌ Erro ao mover container após adicionar:", e2);
                        }
                    }
                }
            }
            
            console.log("✅ Container de botões agora está visível");
            console.log("   Posição do container: x=", _oPointBettingContainer.x, "y=", _oPointBettingContainer.y);
            console.log("   Visible:", _oPointBettingContainer.visible);
            console.log("   Alpha:", _oPointBettingContainer.alpha);
            
            // Shooter: paradas no ponto | Adversário: só no 7
            if(_oPointBettingTitle){
                _oPointBettingTitle.refreshText(bIsShooter
                    ? "APOSTE PARADAS NO PONTO!"
                    : "APOSTE NO 7 CONTRA O SHOOTER!");
            }
            if(_oButBetOnPoint){
                _oButBetOnPoint.changeText("PONTO: " + iPointNumber);
                _oButBetOnPoint.setVisible(!!bIsShooter);
                if(bIsShooter){
                    _oButBetOnPoint.setPosition(-120, 15);
                }
            }
            if(_oButBetOnSeven){
                _oButBetOnSeven.setVisible(!bIsShooter);
                if(!bIsShooter){
                    _oButBetOnSeven.setPosition(0, 15);
                }
            }
            
            // Resetar contador de paradas quando mostrar botões
            _iParadasCount = 0;
            if(_oButBetOnSeven){
                _oButBetOnSeven.changeText("7");
            }
            
            // Forçar atualização do stage
            if(s_oStage && s_oStage.update){
                s_oStage.update();
            }
            
            // TIMER LOCAL: Garantir que o modal permaneça aberto por 10 segundos
            // Limpar timer anterior se existir
            if(_iLocalPointBettingTimer){
                console.log("⚠️ Limpando timer local anterior antes de criar novo");
                clearTimeout(_iLocalPointBettingTimer);
                _iLocalPointBettingTimer = null;
            }
            
            // Criar novo timer local de 10 segundos
            // Este timer garante que o modal não seja fechado antes dos 10 segundos
            _iLocalPointBettingTimer = setTimeout(function() {
                console.log("⏰⏰⏰ TIMER LOCAL DE 10 SEGUNDOS EXPIROU - Permitindo fechar modal");
                // Não fechar o modal aqui - apenas permitir que seja fechado
                // O timer principal em CGame.js vai fechar quando necessário
                _iLocalPointBettingTimer = null;
            }, 10000); // 10 segundos (aumentado de 8 para 10)
            
            console.log("✅ Timer local de 10 segundos criado para garantir que modal permaneça aberto");
        } else {
            console.error("❌ _oPointBettingContainer não existe!");
        }
    };
    
    this.hidePointBettingButtons = function(force){
        if(_iLocalPointBettingTimer){
            clearTimeout(_iLocalPointBettingTimer);
            _iLocalPointBettingTimer = null;
        }

        // Sempre esconder quando force=true OU quando período/rodada já acabou
        var bMustHide = !!force;
        if(!bMustHide && window.s_oGame){
            if(window.s_oGame._bPointBettingOpen !== true){
                bMustHide = true;
            }
            if(window.s_oGame._iNumberPoint == null || window.s_oGame._iNumberPoint <= 0){
                bMustHide = true;
            }
        }

        if(!bMustHide){
            var iPointNumber = window.s_oGame ? (window.s_oGame._iNumberPoint || 0) : 0;
            if(iPointNumber > 0){
                this.showPointBettingButtons(iPointNumber, window.s_oGame._bIAmShooter);
            }
            return;
        }

        if(_oPointBettingContainer){
            _oPointBettingContainer.visible = false;
            _oPointBettingContainer.alpha = 0;
            _oPointBettingContainer.mouseEnabled = false;
            _oPointBettingContainer.mouseChildren = false;
        }
        if(_oButBetOnPoint && _oButBetOnPoint.setVisible){
            _oButBetOnPoint.setVisible(false);
        }
        if(_oButBetOnSeven && _oButBetOnSeven.setVisible){
            _oButBetOnSeven.setVisible(false);
        }
        if(s_oStage && s_oStage.update){
            s_oStage.update();
        }
    };
    
    this.ensurePointBettingButtonsVisible = function(){
        if(!window.s_oGame){
            return;
        }
        
        var bPointBettingOpen = window.s_oGame._bPointBettingOpen === true;
        var bIAmShooter = !!window.s_oGame._bIAmShooter;
        var iPointNumber = window.s_oGame._iNumberPoint || 0;
        
        // Rodada acabou ou período fechou: não restaurar e garantir oculto
        if(!bPointBettingOpen || iPointNumber <= 0){
            if(_oPointBettingContainer && _oPointBettingContainer.visible){
                _oPointBettingContainer.visible = false;
            }
            return;
        }
        
        if(!_oPointBettingContainer){
            this.showPointBettingButtons(iPointNumber, bIAmShooter);
            return;
        }
        
        if(!s_oStage.contains(_oPointBettingContainer)){
            s_oStage.addChild(_oPointBettingContainer);
        }
        
        if(!_oPointBettingContainer.visible){
            this.showPointBettingButtons(iPointNumber, bIAmShooter);
            return;
        }
        
        this._applyPointBettingRoleUI(iPointNumber, bIAmShooter);
        
        if(s_oStage && s_oStage.update){
            s_oStage.update();
        }
    };
    
    this._onBetOnPoint = function(){
        // Jogador clicou para apostar no ponto
        if(s_oGame && s_oGame.onBetOnPoint){
            s_oGame.onBetOnPoint();
        }
    };
    
    this._onBetOnSeven = function(){
        // Jogador clicou para apostar no 7
        if(s_oGame && s_oGame.onBetOnSeven){
            s_oGame.onBetOnSeven();
        }
    };
    
    // Função para atualizar o texto do botão mostrando número de paradas
    this.updatePointButtonText = function(iPointNumber, iParadasCount){
        if(_oButBetOnPoint && iParadasCount > 0){
            _oButBetOnPoint.changeText("PONTO: " + iPointNumber + " (" + iParadasCount + "/10)");
        }
    };

    this.updateSevenButtonText = function(iParadasCount){
        if(_oButBetOnSeven && iParadasCount > 0){
            _oButBetOnSeven.changeText("7 (" + iParadasCount + "/10)");
        }
    };
    
    // ============================================
    // LISTA DE JOGADORES CONECTADOS
    // ============================================
    
    this._initPlayersList = function(){
        // Criar container para a lista de jogadores
        // Posicionar ao lado direito da tabela de últimas jogadas
        // A tabela está em: x = CANVAS_WIDTH / 2 - 400, largura = 800
        // Então termina em: CANVAS_WIDTH / 2 + 400
        // Posicionar 20px à direita da tabela
        _oPlayersListContainer = new createjs.Container();
        _oPlayersListContainer.x = CANVAS_WIDTH / 2 + 420; // Ao lado direito da tabela
        _oPlayersListContainer.y = CANVAS_HEIGHT - 200; // Mesma altura da tabela de últimas jogadas
        _oPlayersListContainer.visible = true;
        s_oStage.addChild(_oPlayersListContainer);
        
        // Fundo semi-transparente para melhor legibilidade
        var oBackground = new createjs.Graphics()
            .beginFill("rgba(0, 0, 0, 0.7)")
            .drawRoundRect(0, 0, 280, 95, 10);
        var oBgShape = new createjs.Shape(oBackground);
        _oPlayersListContainer.addChild(oBgShape);
        
        // Borda dourada (igual à tabela de últimas jogadas)
        var oBorderGraphics = new createjs.Graphics()
            .setStrokeStyle(2)
            .beginStroke("#FFD700")
            .drawRoundRect(0, 0, 280, 95, 10);
        var oBorder = new createjs.Shape(oBorderGraphics);
        _oPlayersListContainer.addChild(oBorder);
        
        // Título da lista
        var oTitle = new CTLText(_oPlayersListContainer, 
                    5, 5, 270, 18, 
                    12, "center", "#FFD700", FONT1, 1,
                    0, 0,
                    "👥 JOGADORES NA SALA",
                    true, true, false,
                    false);
        
        console.log("✅ Lista de jogadores inicializada ao lado direito da tabela");
    };
    
    this.updatePlayersList = function(players, currentShooter, gameState){
        console.log("📋 Atualizando lista de jogadores:", players);
        
        if(!_oPlayersListContainer){
            this._initPlayersList();
        }
        
        // Limpar textos anteriores
        for(var i = 0; i < _aPlayerTexts.length; i++){
            _oPlayersListContainer.removeChild(_aPlayerTexts[i]);
        }
        _aPlayerTexts = [];
        
        if(!players || players.length === 0){
            console.log("⚠️ Nenhum jogador encontrado");
            return;
        }
        
        var yOffset = 25; // Começar abaixo do título (espaço para título + espaçamento)
        var pointValue = gameState && gameState.point ? gameState.point : null;
        
        // Limitar largura e altura para caber ao lado da tabela
        var maxWidth = 270; // Largura disponível (280px - 10px de margem)
        var maxHeight = 65; // Altura disponível (95px - 25px do título - 5px de margem)
        
        // Obter apostas locais do jogador atual (paradas + mesa)
        var myUser = window.customAuth && window.customAuth.getCurrentUser ? window.customAuth.getCurrentUser() : null;
        var localBets = window.s_oGame && window.s_oGame.getLocalPlayerBetsForPanel
            ? window.s_oGame.getLocalPlayerBetsForPanel() : null;
        
        for(var i = 0; i < players.length; i++){
            var player = players[i];
            var isShooter = currentShooter != null && String(player.userId) === String(currentShooter);
            var isMe = myUser && String(player.userId) === String(myUser.id);
            var playerBet = player.currentBet || 0;
            var pointBet = player.pointBet || 0;
            var sevenBet = player.sevenBet || 0;
            var rowPoint = player.pointBetNumber != null ? player.pointBetNumber : pointValue;

            if(isMe && localBets){
                if(localBets.currentBet > 0) playerBet = localBets.currentBet;
                pointBet = localBets.pointBet;
                sevenBet = localBets.sevenBet;
                if(localBets.pointBetNumber) rowPoint = localBets.pointBetNumber;
            }
            
            // Montar texto do jogador
            var playerText = "• " + (player.username || "Jogador " + i);
            
            // Adicionar indicador de quem está com os dados
            if(isShooter){
                playerText += " (DADOS)";
            }
            
            // Adicionar informações de apostas
            if(playerBet > 0){
                playerText += " | Aposta: R$ " + playerBet.toFixed(2);
            }
            
            if(pointBet > 0 && rowPoint){
                playerText += " | Ponto " + rowPoint + ": R$ " + pointBet.toFixed(2);
            }
            
            if(sevenBet > 0){
                playerText += " | 7: R$ " + sevenBet.toFixed(2);
            }
            
            // Guardar valores mesclados para o painel inferior
            player._panelCurrentBet = playerBet;
            player._panelPointBet = pointBet;
            player._panelSevenBet = sevenBet;
            player._panelPointNumber = rowPoint;
            
            // Cor diferente para o shooter
            var textColor = isShooter ? "#ffff00" : "#ffffff";
            
            // Verificar se há espaço vertical disponível
            if(yOffset + 18 > maxHeight){
                console.log("⚠️ Lista de jogadores muito longa, truncando...");
                break; // Não adicionar mais jogadores se não houver espaço
            }
            
            // Criar texto do jogador (largura reduzida para caber ao lado da tabela)
            var oPlayerText = new CTLText(_oPlayersListContainer, 
                        5, yOffset, maxWidth, 16, 
                        11, "left", textColor, FONT1, 0.85,
                        0, 0,
                        playerText,
                        true, true, false,
                        false);
            
            _aPlayerTexts.push(oPlayerText);
            yOffset += 16; // Espaçamento reduzido
        }
        
        // Atualizar painel "Apostas da Mesa"
        var betsList = [];
        for(var j = 0; j < players.length; j++){
            var pl = players[j];
            betsList.push({
                username: pl.username || ("Jogador " + (j + 1)),
                userId: pl.userId,
                currentBet: pl._panelCurrentBet != null ? pl._panelCurrentBet : (pl.currentBet || 0),
                pointBet: pl._panelPointBet != null ? pl._panelPointBet : (pl.pointBet || 0),
                pointBetNumber: pl._panelPointNumber != null ? pl._panelPointNumber : pointValue,
                sevenBet: pl._panelSevenBet != null ? pl._panelSevenBet : (pl.sevenBet || 0)
            });
        }
        if(window.s_oGame && window.s_oGame._oDiceHistory && window.s_oGame._oDiceHistory.updateBets){
            window.s_oGame._oDiceHistory.updateBets(betsList, currentShooter);
        }
        
        // Garantir que o container está no topo
        var iNumChildren = s_oStage.getNumChildren();
        if(iNumChildren > 0){
            s_oStage.setChildIndex(_oPlayersListContainer, iNumChildren - 1);
        }
        
        // Forçar atualização
        if(s_oStage && s_oStage.update){
            s_oStage.update();
        }
        
        console.log("✅ Lista de jogadores atualizada com", players.length, "jogadores");
    };
    
    s_oInterface = this;
    
    this._init();
    
    return this;
}

var s_oInterface = null;;