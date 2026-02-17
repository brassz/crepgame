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
        
        // Desabilitar fichas se saldo for zero ou negativo
        if(iMoney <= 0){
            this.disableBetFiches();
            console.log("🔒 Fichas desabilitadas - saldo zero ou negativo:", iMoney);
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
        
        // Texto de título
        var oTitleText = new CTLText(_oPointBettingContainer, 
                    -200, -35, 400, 30, 
                    22, "center", "#ffde00", FONT2, 1,
                    0, 0,
                    "APOSTE NO PONTO OU NO 7!",
                    true, true, false,
                    false );
        
        // Botão para apostar no PONTO (esquerda) - usando but_bg
        _oButBetOnPoint = new CTextButton(-120, 15, s_oSpriteLibrary.getSprite('but_bg'), "PONTO: 4", FONT1, "#fff", 24, "center", _oPointBettingContainer);
        _oButBetOnPoint.addEventListener(ON_MOUSE_UP, this._onBetOnPoint, this);
        
        // Botão para apostar no 7 (direita) - usando but_bg
        _oButBetOnSeven = new CTextButton(120, 15, s_oSpriteLibrary.getSprite('but_bg'), "7", FONT1, "#fff", 24, "center", _oPointBettingContainer);
        _oButBetOnSeven.addEventListener(ON_MOUSE_UP, this._onBetOnSeven, this);
        
        console.log("✅ Botões de aposta no ponto e no 7 inicializados com sucesso!");
    };
    
    this.showPointBettingButtons = function(iPointNumber){
        console.log("🎮 showPointBettingButtons chamado com ponto:", iPointNumber);
        
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
            
            // Garantir que todos os elementos filhos estão visíveis
            var iNumContainerChildren = _oPointBettingContainer.getNumChildren();
            console.log("🔍 Container tem", iNumContainerChildren, "elementos filhos");
            for(var i = 0; i < iNumContainerChildren; i++){
                var oChild = _oPointBettingContainer.getChildAt(i);
                if(oChild){
                    oChild.visible = true;
                    oChild.alpha = 1.0;
                    console.log("   ✅ Elemento", i, "visível:", oChild.visible, "alpha:", oChild.alpha);
                }
            }
            
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
            
            // Atualizar texto do botão com o número do ponto
            if(_oButBetOnPoint){
                _oButBetOnPoint.changeText("PONTO: " + iPointNumber);
                _oButBetOnPoint.setVisible(true); // Garantir que o botão está visível
                console.log("✅ Texto do botão atualizado para: PONTO:", iPointNumber);
            }
            
            // Resetar contador de paradas quando mostrar botões
            _iParadasCount = 0;
            
            // Garantir que o botão do 7 também está visível
            if(_oButBetOnSeven){
                _oButBetOnSeven.setVisible(true); // Garantir que o botão está visível
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
        console.log("🔴 hidePointBettingButtons chamado");
        console.log("   Timestamp:", Date.now());
        console.log("   Force:", force);
        console.log("   Stack trace:", new Error().stack);
        console.log("   window.s_oGame existe:", !!window.s_oGame);
        console.log("   Timer local existe:", !!_iLocalPointBettingTimer);
        if(window.s_oGame){
            console.log("   _bPointBettingOpen:", window.s_oGame._bPointBettingOpen);
            console.log("   _bPointBettingOpen type:", typeof window.s_oGame._bPointBettingOpen);
            console.log("   _bIAmShooter:", window.s_oGame._bIAmShooter);
            console.log("   _iNumberPoint:", window.s_oGame._iNumberPoint);
            console.log("   _iPointBettingTimer existe:", !!window.s_oGame._iPointBettingTimer);
        } else {
            console.log("   _bPointBettingOpen: N/A (window.s_oGame não existe)");
            console.log("   _bIAmShooter: N/A");
        }
        
        // CRITICAL: Verificar timer local primeiro
        // Se o timer local ainda está ativo, NÃO fechar o modal (a menos que force seja true)
        // MAS: Se o período de apostas foi fechado (_bPointBettingOpen = false), permitir fechar
        if(_iLocalPointBettingTimer && !force){
            // Verificar se o período de apostas foi fechado (timer principal expirou)
            var bPeriodoFechado = window.s_oGame && window.s_oGame._bPointBettingOpen === false;
            
            if(bPeriodoFechado){
                // Período foi fechado - timer principal expirou, permitir fechar mesmo com timer local ativo
                console.log("✅ Timer principal expirou (_bPointBettingOpen = false) - permitindo fechar modal mesmo com timer local ativo");
            } else {
                console.warn("⚠️⚠️⚠️ BLOQUEADO: Timer local ainda está ativo - modal deve permanecer aberto!");
                console.warn("   Timer local foi criado há menos de 10 segundos");
                console.warn("   Use force=true para forçar esconder (apenas quando rodada terminar)");
                console.warn("   Stack trace da tentativa de fechar:", new Error().stack);
                // NÃO esconder - retornar imediatamente
                // Além disso, FORÇAR mostrar novamente para garantir
                if(window.s_oGame && window.s_oGame._iNumberPoint > 0 && !window.s_oGame._bIAmShooter){
                    console.log("🔄 Forçando mostrar botões novamente após tentativa de esconder");
                    this.showPointBettingButtons(window.s_oGame._iNumberPoint);
                }
                return;
            }
        }
        
        // CRITICAL: Verificar também o timer principal em CGame.js
        // IMPORTANTE: Verificar o estado do período (_bPointBettingOpen) em vez de apenas o timer
        // Se o período está fechado, significa que o timer expirou e devemos permitir fechar
        var bTimerPrincipalAtivo = window.s_oGame && window.s_oGame._iPointBettingTimer !== null;
        var bPeriodoAindaAberto = window.s_oGame && window.s_oGame._bPointBettingOpen === true;
        
        // Se o período está fechado, permitir fechar mesmo que o timer ainda esteja ativo
        // (o timer pode ainda estar ativo durante a execução do callback)
        if(bTimerPrincipalAtivo && !force && bPeriodoAindaAberto){
            console.warn("⚠️⚠️⚠️ BLOQUEADO: Timer principal ainda está ativo E período ainda está aberto - modal deve permanecer aberto!");
            console.warn("   Timer principal foi criado há menos de 10 segundos");
            console.warn("   Use force=true para forçar esconder (apenas quando rodada terminar)");
            // NÃO esconder - retornar imediatamente
            // Além disso, FORÇAR mostrar novamente para garantir
            if(window.s_oGame._iNumberPoint > 0 && !window.s_oGame._bIAmShooter){
                console.log("🔄 Forçando mostrar botões novamente após tentativa de esconder (timer principal ativo)");
                this.showPointBettingButtons(window.s_oGame._iNumberPoint);
            }
            return;
        }
        
        // Se force=true, verificar se o período foi fechado ou se a rodada terminou
        // Se o período está fechado (_bPointBettingOpen = false), significa que o timer expirou
        // e devemos permitir fechar o modal
        if(force && bPeriodoAindaAberto){
            // Período ainda está aberto mas force=true - verificar se rodada terminou
            console.warn("⚠️⚠️⚠️ ATENÇÃO: Tentativa de fechar modal com force=true mas período ainda está aberto!");
            console.warn("   Verificando se rodada terminou...");
            // Verificar se o ponto foi acertado ou 7 foi tirado (rodada terminou)
            // Se não terminou, não fechar ainda
            var bRodadaTerminou = false;
            if(window.s_oGame && window.s_oGame._iNumberPoint === -1){
                // Ponto foi resetado - rodada terminou
                bRodadaTerminou = true;
            }
            if(!bRodadaTerminou){
                console.warn("   Rodada NÃO terminou e período ainda está aberto - bloqueando fechamento do modal");
                // NÃO fechar - retornar imediatamente
                if(window.s_oGame._iNumberPoint > 0 && !window.s_oGame._bIAmShooter){
                    console.log("🔄 Forçando mostrar botões novamente (rodada não terminou)");
                    this.showPointBettingButtons(window.s_oGame._iNumberPoint);
                }
                return;
            } else {
                console.log("✅ Rodada terminou - permitindo fechar modal mesmo com período aberto");
            }
        } else if(force && !bPeriodoAindaAberto){
            // Período foi fechado - timer expirou, permitir fechar
            console.log("✅ Timer expirou (_bPointBettingOpen = false) - permitindo fechar modal");
        }
        
        // CRITICAL: Verificar se estamos no período de apostas (10 segundos após estabelecer ponto)
        // Só esconder se FORCE for true OU se não estiver mais no período de apostas
        // IMPORTANTE: Verificar se window.s_oGame existe e se _bPointBettingOpen existe
        // Se _bPointBettingOpen for undefined, tratar como false (período não está aberto)
        // MAS: Se force for false e _bPointBettingOpen for undefined, não fechar ainda
        // (pode estar em uma transição de estado)
        var bPointBettingOpen = false;
        if(window.s_oGame && window.s_oGame._bPointBettingOpen !== undefined){
            bPointBettingOpen = window.s_oGame._bPointBettingOpen;
        } else if(window.s_oGame && window.s_oGame._bPointBettingOpen === undefined && !force){
            // Se for undefined e force for false, não fechar ainda (pode estar em transição)
            console.log("⚠️ _bPointBettingOpen é undefined e force=false - não fechando modal ainda");
            return;
        }
        
        // Se force=true, sempre permitir fechar (timer expirou ou rodada terminou)
        // Se force=false e período está aberto, bloquear
        if(bPointBettingOpen && !force){
            console.warn("⚠️ BLOQUEADO: Tentativa de esconder botões durante período de apostas ativo!");
            console.warn("   Os botões devem permanecer visíveis por 10 segundos completos");
            console.warn("   Use force=true para forçar esconder (apenas quando rodada terminar ou timer expirar)");
            // NÃO esconder - retornar imediatamente
            // Além disso, FORÇAR mostrar novamente para garantir
            if(window.s_oGame && window.s_oGame._iNumberPoint > 0 && !window.s_oGame._bIAmShooter){
                console.log("🔄 Forçando mostrar botões novamente após tentativa de esconder");
                this.showPointBettingButtons(window.s_oGame._iNumberPoint);
            }
            return;
        }
        
        // Limpar timer local quando fechar o modal
        if(_iLocalPointBettingTimer){
            console.log("🧹 Limpando timer local ao fechar modal");
            clearTimeout(_iLocalPointBettingTimer);
            _iLocalPointBettingTimer = null;
        }
        
        if(_oPointBettingContainer){
            _oPointBettingContainer.visible = false;
            console.log("✅ Container de botões agora está oculto");
            
            // Forçar atualização do stage
            if(s_oStage && s_oStage.update){
                s_oStage.update();
            }
        }
    };
    
    // Função para garantir que os botões permaneçam visíveis (chamada periodicamente)
    this.ensurePointBettingButtonsVisible = function(){
        if(!window.s_oGame){
            return; // Se o jogo não existe, não fazer nada
        }
        
        // Verificar se as propriedades existem antes de acessá-las
        var bPointBettingOpen = window.s_oGame._bPointBettingOpen !== undefined ? window.s_oGame._bPointBettingOpen : false;
        var bIAmShooter = window.s_oGame._bIAmShooter !== undefined ? window.s_oGame._bIAmShooter : false;
        var iPointNumber = window.s_oGame._iNumberPoint || 0;
        
        // CRÍTICO: Se período de apostas NÃO está mais aberto, NÃO restaurar botões
        // IMPORTANTE: Não fechar o modal aqui - apenas não restaurar
        // O timer ou outras funções específicas devem fechar o modal
        if(!bPointBettingOpen){
            // Período fechou - apenas não restaurar, mas não forçar fechar
            // (o timer já vai fechar quando necessário)
            return; // Sair imediatamente - não restaurar
        }
        
        // Só garantir visibilidade se período de apostas está aberto e não é o shooter
        if(bPointBettingOpen && !bIAmShooter && iPointNumber > 0){
            // Verificar se container existe e está no stage
            if(!_oPointBettingContainer){
                console.warn("⚠️ Container de botões não existe - criando novamente");
                this.showPointBettingButtons(iPointNumber);
                return;
            }
            
            // Verificar se container está no stage
            if(!s_oStage.contains(_oPointBettingContainer)){
                console.warn("⚠️ Container foi removido do stage - adicionando novamente");
                s_oStage.addChild(_oPointBettingContainer);
            }
            
            // Verificar visibilidade
            if(!_oPointBettingContainer.visible){
                console.warn("⚠️ Botões de aposta foram escondidos prematuramente - restaurando visibilidade");
                this.showPointBettingButtons(iPointNumber);
                return;
            }
            
            // Garantir que está no topo do stage (z-index mais alto)
            if(s_oStage && _oPointBettingContainer){
                var iNumChildren = s_oStage.getNumChildren();
                if(iNumChildren > 0){
                    var iCurrentIndex = s_oStage.getChildIndex(_oPointBettingContainer);
                    // Se não está no topo, mover para o topo
                    if(iCurrentIndex < iNumChildren - 1){
                        console.log("🔄 Movendo container para o topo do stage (índice:", iNumChildren - 1, ")");
                        s_oStage.setChildIndex(_oPointBettingContainer, iNumChildren - 1);
                    }
                }
            }
            
            // Garantir que alpha está em 1.0
            if(_oPointBettingContainer.alpha < 1.0){
                _oPointBettingContainer.alpha = 1.0;
            }
            
            // Garantir que todos os filhos estão visíveis
            var iNumChildren = _oPointBettingContainer.getNumChildren();
            for(var i = 0; i < iNumChildren; i++){
                var oChild = _oPointBettingContainer.getChildAt(i);
                if(oChild){
                    if(!oChild.visible){
                        oChild.visible = true;
                        console.log("🔄 Filho", i, "foi tornado visível");
                    }
                    if(oChild.alpha < 1.0){
                        oChild.alpha = 1.0;
                    }
                }
            }
            
            // Forçar atualização do stage para garantir que mudanças sejam renderizadas
            if(s_oStage && s_oStage.update){
                s_oStage.update();
            }
        } else {
            // Container não existe e período de apostas está aberto - criar imediatamente
            console.error("❌❌❌ Container não existe durante período de apostas! Criando agora...");
            this._initPointBettingButtons();
            if(_oPointBettingContainer && iPointNumber > 0){
                this.showPointBettingButtons(iPointNumber);
            }
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
            console.log("✅ Texto do botão atualizado: PONTO " + iPointNumber + " com " + iParadasCount + " paradas");
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
        
        // Obter informações de apostas do servidor/estado do jogo
        var gameBets = {};
        if(window.s_oGame && window.s_oGame._aPointBets){
            gameBets = window.s_oGame._aPointBets;
        }
        
        for(var i = 0; i < players.length; i++){
            var player = players[i];
            var isShooter = player.userId === currentShooter;
            var playerBet = player.currentBet || 0;
            
            // Verificar se apostou no ponto
            var pointBet = gameBets[player.userId] || 0;
            var sevenBet = (window.s_oGame && window.s_oGame._aSevenBets && window.s_oGame._aSevenBets[player.userId]) || 0;
            
            // Montar texto do jogador
            var playerText = "• " + (player.username || "Jogador " + i);
            
            // Adicionar indicador de shooter
            if(isShooter){
                playerText += " 🎲 [SHOOTER]";
            }
            
            // Adicionar informações de apostas
            if(playerBet > 0){
                playerText += " | Aposta: R$ " + playerBet.toFixed(2);
            }
            
            if(pointBet > 0 && pointValue){
                playerText += " | Ponto " + pointValue + ": R$ " + pointBet.toFixed(2);
            }
            
            if(sevenBet > 0){
                playerText += " | 7: R$ " + sevenBet.toFixed(2);
            }
            
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