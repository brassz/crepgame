function CPlayersPanel(){
    var _oContainer;
    var _oBackground;
    var _oTitleText;
    var _aPlayerTexts;
    var _aPlayerData;
    var _bVisible;
    
    this._init = function(){
        _aPlayerTexts = [];
        _aPlayerData = [];
        _bVisible = true;
        
        // Criar container principal
        _oContainer = new createjs.Container();
        _oContainer.x = 20;
        _oContainer.y = 200;
        s_oStage.addChild(_oContainer);
        
        // Criar fundo do painel
        _oBackground = new createjs.Shape();
        _oBackground.graphics.beginFill("rgba(0,0,0,0.8)")
                            .drawRoundRect(0, 0, 280, 200, 10);
        _oBackground.graphics.beginStroke("#FFD700")
                            .setStrokeStyle(2)
                            .drawRoundRect(0, 0, 280, 200, 10);
        _oContainer.addChild(_oBackground);
        
        // Título do painel
        _oTitleText = new CTLText(_oContainer, 
                    10, 10, 260, 30, 
                    18, "center", "#FFD700", FONT1, 1,
                    0, 0,
                    "APOSTAS DOS JOGADORES",
                    true, true, false,
                    false );
        
        // Inicializar com dados de exemplo
        this.updatePlayersList([]);
    };
    
    this.updatePlayersList = function(aPlayers){
        // Limpar textos existentes
        for(var i = 0; i < _aPlayerTexts.length; i++){
            if(_aPlayerTexts[i] && _aPlayerTexts[i].unload){
                _aPlayerTexts[i].unload();
            }
        }
        _aPlayerTexts = [];
        _aPlayerData = aPlayers;
        
        // Se não há jogadores, mostrar mensagem padrão
        if(aPlayers.length === 0){
            var oEmptyText = new CTLText(_oContainer, 
                        10, 50, 260, 30, 
                        14, "center", "#FFFFFF", FONT1, 1,
                        0, 0,
                        "Aguardando jogadores...",
                        true, true, false,
                        false );
            _aPlayerTexts.push(oEmptyText);
            return;
        }
        
        // Criar texto para cada jogador
        var iStartY = 50;
        var iLineHeight = 25;
        
        for(var i = 0; i < aPlayers.length && i < 6; i++){ // Máximo 6 jogadores visíveis
            var oPlayer = aPlayers[i];
            var szPlayerInfo = (oPlayer.name || "Jogador " + (i+1)) + ": " + 
                              (oPlayer.bet || 0).toFixed(2) + TEXT_CURRENCY;
            
            var oPlayerText = new CTLText(_oContainer, 
                        15, iStartY + (i * iLineHeight), 250, 20, 
                        14, "left", "#FFFFFF", FONT1, 1,
                        0, 0,
                        szPlayerInfo,
                        true, true, false,
                        false );
            
            // Destacar o jogador atual
            if(oPlayer.isCurrentPlayer){
                oPlayerText.setColor("#87CEEB"); // Azul claro para jogador atual
            }
            
            _aPlayerTexts.push(oPlayerText);
        }
        
        // Se há mais de 6 jogadores, mostrar contador
        if(aPlayers.length > 6){
            var oMoreText = new CTLText(_oContainer, 
                        15, iStartY + (6 * iLineHeight), 250, 20, 
                        12, "left", "#888888", FONT1, 1,
                        0, 0,
                        "... e mais " + (aPlayers.length - 6) + " jogador(es)",
                        true, true, false,
                        false );
            _aPlayerTexts.push(oMoreText);
        }
    };
    
    this.addPlayerBet = function(sPlayerName, iBetAmount, bIsCurrentPlayer){
        // Encontrar jogador existente ou adicionar novo
        var oExistingPlayer = null;
        for(var i = 0; i < _aPlayerData.length; i++){
            if(_aPlayerData[i].name === sPlayerName){
                oExistingPlayer = _aPlayerData[i];
                break;
            }
        }
        
        if(oExistingPlayer){
            // Atualizar aposta existente
            oExistingPlayer.bet = iBetAmount;
            oExistingPlayer.isCurrentPlayer = bIsCurrentPlayer;
        } else {
            // Adicionar novo jogador
            _aPlayerData.push({
                name: sPlayerName,
                bet: iBetAmount,
                isCurrentPlayer: bIsCurrentPlayer || false
            });
        }
        
        // Atualizar display
        this.updatePlayersList(_aPlayerData);
    };
    
    this.removePlayer = function(sPlayerName){
        // Remover jogador da lista
        for(var i = _aPlayerData.length - 1; i >= 0; i--){
            if(_aPlayerData[i].name === sPlayerName){
                _aPlayerData.splice(i, 1);
                break;
            }
        }
        
        // Atualizar display
        this.updatePlayersList(_aPlayerData);
    };
    
    this.clearAllBets = function(){
        // Zerar todas as apostas mas manter os jogadores
        for(var i = 0; i < _aPlayerData.length; i++){
            _aPlayerData[i].bet = 0;
        }
        
        // Atualizar display
        this.updatePlayersList(_aPlayerData);
    };
    
    this.setCurrentPlayer = function(sPlayerName){
        // Marcar jogador atual
        for(var i = 0; i < _aPlayerData.length; i++){
            _aPlayerData[i].isCurrentPlayer = (_aPlayerData[i].name === sPlayerName);
        }
        
        // Atualizar display
        this.updatePlayersList(_aPlayerData);
    };
    
    this.setVisible = function(bVisible){
        _bVisible = bVisible;
        _oContainer.visible = bVisible;
    };
    
    this.isVisible = function(){
        return _bVisible;
    };
    
    this.setPosition = function(iX, iY){
        _oContainer.x = iX;
        _oContainer.y = iY;
    };
    
    this.getContainer = function(){
        return _oContainer;
    };
    
    this.unload = function(){
        // Limpar textos
        for(var i = 0; i < _aPlayerTexts.length; i++){
            if(_aPlayerTexts[i] && _aPlayerTexts[i].unload){
                _aPlayerTexts[i].unload();
            }
        }
        
        if(_oTitleText && _oTitleText.unload){
            _oTitleText.unload();
        }
        
        // Remover container do stage
        if(_oContainer && _oContainer.parent){
            _oContainer.parent.removeChild(_oContainer);
        }
    };
    
    this._init();
}