function CRoomSelector(){
    var _oContainer;
    var _oBg;
    var _aRoomButtons;
    var _oTitleText;
    var _oCloseButton;
    var _sSelectedRoom;
    
    this._init = function(){
        _oContainer = new createjs.Container();
        s_oStage.addChild(_oContainer);
        
        // Background semi-transparente
        _oBg = new createjs.Shape();
        _oBg.graphics.beginFill("rgba(0,0,0,0.8)").drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        _oContainer.addChild(_oBg);
        
        // Painel principal
        var oPanelBg = new createjs.Shape();
        oPanelBg.graphics.beginFill("#2c3e50").drawRoundRect(
            CANVAS_WIDTH/2 - 300, 
            CANVAS_HEIGHT/2 - 200, 
            600, 
            400, 
            20
        );
        _oContainer.addChild(oPanelBg);
        
        // Título
        _oTitleText = new createjs.Text("SELECIONE UMA MESA", "bold 28px Arial", "#fff");
        _oTitleText.textAlign = "center";
        _oTitleText.x = CANVAS_WIDTH/2;
        _oTitleText.y = CANVAS_HEIGHT/2 - 160;
        _oContainer.addChild(_oTitleText);
        
        // Botão fechar
        var oCloseSprite = s_oSpriteLibrary.getSprite('but_exit');
        _oCloseButton = new CGfxButton(
            CANVAS_WIDTH/2 + 260, 
            CANVAS_HEIGHT/2 - 180, 
            oCloseSprite, 
            _oContainer
        );
        _oCloseButton.addEventListener(ON_MOUSE_UP, this._onClose, this);
        
        this._createRoomButtons();
        
        // Animação de entrada
        _oContainer.alpha = 0;
        _oContainer.scaleX = _oContainer.scaleY = 0.8;
        createjs.Tween.get(_oContainer).to({alpha: 1, scaleX: 1, scaleY: 1}, 300, createjs.Ease.backOut);
    };
    
    this._createRoomButtons = function(){
        _aRoomButtons = [];
        var aRoomTypes = s_oRoomConfig.getRoomTypes();
        var iStartY = CANVAS_HEIGHT/2 - 80;
        var iSpacing = 100;
        
        for(var i = 0; i < aRoomTypes.length; i++){
            var sRoomType = aRoomTypes[i];
            var oRoomConfig = s_oRoomConfig.getRoomConfig(sRoomType);
            
            // Container para o botão da sala
            var oRoomContainer = new createjs.Container();
            oRoomContainer.x = CANVAS_WIDTH/2 - 250 + (i * 200);
            oRoomContainer.y = iStartY;
            _oContainer.addChild(oRoomContainer);
            
            // Background do botão
            var oButtonBg = new createjs.Shape();
            oButtonBg.graphics.beginFill(oRoomConfig.color).drawRoundRect(0, 0, 180, 120, 10);
            oRoomContainer.addChild(oButtonBg);
            
            // Border
            var oBorder = new createjs.Shape();
            oBorder.graphics.beginStroke("#fff").setStrokeStyle(2).drawRoundRect(2, 2, 176, 116, 8);
            oRoomContainer.addChild(oBorder);
            
            // Nome da mesa
            var oRoomName = new createjs.Text(oRoomConfig.name, "bold 16px Arial", "#fff");
            oRoomName.textAlign = "center";
            oRoomName.x = 90;
            oRoomName.y = 15;
            oRoomContainer.addChild(oRoomName);
            
            // Limites de aposta
            var sBetText = "R$ " + oRoomConfig.min_bet + " - R$ " + oRoomConfig.max_bet;
            var oBetText = new createjs.Text(sBetText, "14px Arial", "#fff");
            oBetText.textAlign = "center";
            oBetText.x = 90;
            oBetText.y = 40;
            oRoomContainer.addChild(oBetText);
            
            // Jogadores online/máximo
            var iOnlinePlayers = s_oMultiplayerManager ? s_oMultiplayerManager.getRoomPlayersCount(sRoomType) : 0;
            var sPlayersText = "Jogadores: " + iOnlinePlayers + "/" + oRoomConfig.max_players;
            var oPlayersText = new createjs.Text(sPlayersText, "12px Arial", "#fff");
            oPlayersText.textAlign = "center";
            oPlayersText.x = 90;
            oPlayersText.y = 65;
            oRoomContainer.addChild(oPlayersText);
            
            // Descrição
            var oDescText = new createjs.Text(oRoomConfig.description, "10px Arial", "#fff");
            oDescText.textAlign = "center";
            oDescText.x = 90;
            oDescText.y = 85;
            oRoomContainer.addChild(oDescText);
            
            // Adicionar interatividade
            oRoomContainer.cursor = "pointer";
            oRoomContainer.addEventListener("click", this._createRoomClickHandler(sRoomType));
            oRoomContainer.addEventListener("mouseover", this._onRoomHover);
            oRoomContainer.addEventListener("mouseout", this._onRoomOut);
            
            // Salvar referência
            _aRoomButtons.push({
                container: oRoomContainer,
                roomType: sRoomType,
                bg: oButtonBg,
                border: oBorder,
                playersText: oPlayersText
            });
        }
    };
    
    this._createRoomClickHandler = function(sRoomType){
        return function(){
            s_oRoomSelector._onRoomSelected(sRoomType);
        };
    };
    
    this._onRoomHover = function(event){
        event.currentTarget.scaleX = event.currentTarget.scaleY = 1.05;
        createjs.Tween.get(event.currentTarget).to({scaleX: 1.05, scaleY: 1.05}, 100);
    };
    
    this._onRoomOut = function(event){
        createjs.Tween.get(event.currentTarget).to({scaleX: 1, scaleY: 1}, 100);
    };
    
    this._onRoomSelected = function(sRoomType){
        _sSelectedRoom = sRoomType;
        
        // Feedback visual
        for(var i = 0; i < _aRoomButtons.length; i++){
            var oButton = _aRoomButtons[i];
            if(oButton.roomType === sRoomType){
                oButton.border.graphics.clear().beginStroke("#00ff00").setStrokeStyle(4)
                    .drawRoundRect(2, 2, 176, 116, 8);
            } else {
                oButton.border.graphics.clear().beginStroke("#fff").setStrokeStyle(2)
                    .drawRoundRect(2, 2, 176, 116, 8);
            }
        }
        
        // Delay para mostrar seleção e depois iniciar jogo
        setTimeout(function(){
            s_oRoomSelector._startGame();
        }, 500);
    };
    
    this.updatePlayersCount = function(){
        for(var i = 0; i < _aRoomButtons.length; i++){
            var oButton = _aRoomButtons[i];
            var iOnlinePlayers = s_oMultiplayerManager.getRoomPlayersCount(oButton.roomType);
            var iMaxPlayers = s_oRoomConfig.getRoomMaxPlayers(oButton.roomType);
            oButton.playersText.text = "Jogadores: " + iOnlinePlayers + "/" + iMaxPlayers;
        }
    };
    
    this._startGame = function(){
        // Definir sala selecionada globalmente
        s_sSelectedRoom = _sSelectedRoom;
        
        // Entrar na sala multiplayer
        if(s_oMultiplayerManager){
            s_oMultiplayerManager.joinRoom(_sSelectedRoom);
        }
        
        // Fechar seletor e iniciar jogo
        this.unload();
        s_oMain.gotoGame();
        
        $(s_oMain).trigger("start_session");
    };
    
    this._onClose = function(){
        this.unload();
    };
    
    this.unload = function(){
        if(_oCloseButton){
            _oCloseButton.unload();
        }
        
        createjs.Tween.get(_oContainer).to({alpha: 0, scaleX: 0.8, scaleY: 0.8}, 200)
        .call(function(){
            if(_oContainer && _oContainer.parent){
                s_oStage.removeChild(_oContainer);
            }
            s_oRoomSelector = null;
        });
    };
    
    s_oRoomSelector = this;
    this._init();
}

var s_oRoomSelector = null;
var s_sSelectedRoom = "bronze"; // Mesa padrão