function CRoomSelectionMenu(){
    var _oBg;
    var _oTitleText;
    var _oRoomButtons = [];
    var _oBackButton;
    var _oFade;
    
    this._init = function(){
        console.log("=== Iniciando CRoomSelectionMenu ===");
        
        try {
            // Criar background
            _oBg = createBitmap(s_oSpriteLibrary.getSprite('bg_menu'));
            s_oStage.addChild(_oBg);
            console.log("Background criado");
            
            // Título usando createjs.Text simples
            var oTitle = new createjs.Text("ESCOLHA SUA SALA", "50px " + FONT1, "#ffffff");
            oTitle.x = CANVAS_WIDTH/2;
            oTitle.y = 80;
            oTitle.textAlign = "center";
            s_oStage.addChild(oTitle);
            _oTitleText = oTitle;
            console.log("Título criado");
            
            // Criar botões das salas
            this._createSimpleButtons();
            console.log("Botões criados");
            
            // Botão voltar
            var oBackSprite = s_oSpriteLibrary.getSprite('but_exit');
            _oBackButton = new CGfxButton(80, 80, oBackSprite, s_oStage);
            _oBackButton.addEventListener(ON_MOUSE_UP, this._onBackButtonRelease, this);
            console.log("Botão voltar criado");
            
            // Fade inicial
            _oFade = new createjs.Shape();
            _oFade.graphics.beginFill("black").drawRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
            s_oStage.addChild(_oFade);
            createjs.Tween.get(_oFade).to({alpha:0}, 400).call(function(){_oFade.visible = false;});
            console.log("Fade criado");
            
            console.log("=== CRoomSelectionMenu inicializado com sucesso! ===");
            
        } catch(error) {
            console.error("Erro na inicialização:", error);
            console.error("Stack:", error.stack);
        }
    };
    
    this._createSimpleButtons = function(){
        console.log("Criando botões simples...");
        
        var aRooms = [
            {id: "bronze", name: "SALA BRONZE", info: "R$ 50 - 1.000"},
            {id: "prata", name: "SALA PRATA", info: "R$ 100 - 3.000"},
            {id: "ouro", name: "SALA OURO", info: "R$ 200 - 5.000"}
        ];
        
        var iStartY = 200;
        var iSpacing = 120;
        
        for(var i = 0; i < aRooms.length; i++){
            var oRoom = aRooms[i];
            var iY = iStartY + (i * iSpacing);
            
            console.log("Criando botão:", oRoom.name);
            
            // Usar sprite do botão play como base
            var oBtnSprite = s_oSpriteLibrary.getSprite('but_play');
            var oRoomBtn = new CGfxButton(CANVAS_WIDTH/2, iY, oBtnSprite, s_oStage);
            
            // Adicionar texto no botão
            var oButtonText = new createjs.Text(oRoom.name, "24px " + FONT1, "#ffffff");
            oButtonText.x = CANVAS_WIDTH/2;
            oButtonText.y = iY - 10;
            oButtonText.textAlign = "center";
            s_oStage.addChild(oButtonText);
            
            // Adicionar informações
            var oInfoText = new createjs.Text(oRoom.info, "18px " + FONT1, "#ffff99");
            oInfoText.x = CANVAS_WIDTH/2;
            oInfoText.y = iY + 20;
            oInfoText.textAlign = "center";
            s_oStage.addChild(oInfoText);
            
            // Configurar evento de clique
            var that = this;
            (function(roomId) {
                oRoomBtn.addEventListener(ON_MOUSE_UP, function() {
                    console.log("Clique na sala:", roomId);
                    that._onRoomSelected(roomId);
                }, that);
            })(oRoom.id);
            
            _oRoomButtons.push(oRoomBtn);
            _oRoomButtons.push(oButtonText);
            _oRoomButtons.push(oInfoText);
        }
        
        console.log("Botões simples criados com sucesso!");
    };
    
    this._onRoomSelected = function(sRoomId){
        console.log("Sala selecionada:", sRoomId);
        
        // Armazenar sala selecionada
        if(typeof s_sSelectedRoom === 'undefined') {
            window.s_sSelectedRoom = sRoomId;
        } else {
            s_sSelectedRoom = sRoomId;
        }
        
        console.log("Sala armazenada, indo para o jogo...");
        
        // Ir para o jogo
        this.unload();
        s_oMain.gotoGame();
        
        $(s_oMain).trigger("start_session");
    };
    
    this._onBackButtonRelease = function(){
        console.log("Voltando ao menu principal...");
        this.unload();
        s_oMain.gotoMenu();
    };
    
    this.refreshButtonPos = function(iNewX, iNewY) {
        // Implementação vazia por enquanto
        if(_oBackButton) {
            _oBackButton.setPosition(80 + iNewX, 80 + iNewY);
        }
    };
    
    this.unload = function(){
        console.log("=== Descarregando CRoomSelectionMenu ===");
        
        try {
            // Remover todos os elementos dos botões
            for(var i = 0; i < _oRoomButtons.length; i++){
                if(_oRoomButtons[i]) {
                    if(_oRoomButtons[i].unload) {
                        _oRoomButtons[i].unload();
                    } else if(_oRoomButtons[i].parent) {
                        _oRoomButtons[i].parent.removeChild(_oRoomButtons[i]);
                    }
                }
            }
            _oRoomButtons = [];
            
            // Remover botão voltar
            if(_oBackButton) {
                _oBackButton.unload();
                _oBackButton = null;
            }
            
            // Remover título
            if(_oTitleText && _oTitleText.parent) {
                _oTitleText.parent.removeChild(_oTitleText);
                _oTitleText = null;
            }
            
            // Remover background
            if(_oBg && _oBg.parent) {
                _oBg.parent.removeChild(_oBg);
                _oBg = null;
            }
            
            // Remover fade
            if(_oFade && _oFade.parent){
                _oFade.parent.removeChild(_oFade);
                _oFade = null;
            }
            
            s_oRoomSelectionMenu = null;
            
            console.log("=== CRoomSelectionMenu descarregado com sucesso ===");
            
        } catch(error) {
            console.error("Erro ao descarregar:", error);
        }
    };
    
    // Inicializar
    s_oRoomSelectionMenu = this;
    this._init();
}

var s_oRoomSelectionMenu = null;
var s_sSelectedRoom = "bronze"; // Sala padrão