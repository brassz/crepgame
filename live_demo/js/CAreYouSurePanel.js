function CAreYouSurePanel(oParentContainer) {
    var _oListener;
    var _oMsg;
    var _oButYes;
    var _oButNo;
    var _oBg;
    var _oContainer;
    var _oParentContainer;
    var _szCustomMessage;
    var _cbYesCallback;
    var _cbNoCallback;

    this._init = function () {
        _oContainer = new createjs.Container();
        _oContainer.visible = false;
        _oParentContainer.addChild(_oContainer);

        var oMsgBox = s_oSpriteLibrary.getSprite('msg_box');
        _oBg = createBitmap(oMsgBox);
        _oBg.x = CANVAS_WIDTH/2;
        _oBg.y = CANVAS_HEIGHT/2;
        _oBg.regX = oMsgBox.width * 0.5;
        _oBg.regY = oMsgBox.height * 0.5;
        _oContainer.addChild(_oBg);

        _oListener = _oBg.on("click", function () {});

        _oMsg = new CTLText(_oContainer, 
                    CANVAS_WIDTH / 2-240, CANVAS_HEIGHT * 0.5-100, 480, 120, 
                    60, "center", "#fff", FONT1, 1,
                    0, 0,
                    TEXT_ARE_SURE,
                    true, true, true,
                    false );

        _oButYes = new CGfxButton(CANVAS_WIDTH / 2 + 186, _oMsg.getY() + 200, s_oSpriteLibrary.getSprite('but_yes'), _oContainer);
        _oButYes.addEventListener(ON_MOUSE_UP, this._onButYes, this);

        _oButNo = new CGfxButton(CANVAS_WIDTH / 2 - 186, _oMsg.getY() + 200, s_oSpriteLibrary.getSprite('but_not'), _oContainer);
        _oButNo.addEventListener(ON_MOUSE_UP, this._onButNo, this);
    };


    this.show = function () {
        _oContainer.visible = true;
    };
    
    this.showCustom = function(szMessage, cbYesCallback, cbNoCallback) {
        console.log("showCustom chamado com mensagem:", szMessage);
        _szCustomMessage = szMessage;
        _cbYesCallback = cbYesCallback;
        _cbNoCallback = cbNoCallback;
        
        // Atualiza o texto da mensagem
        _oMsg.refreshText(szMessage);
        _oContainer.visible = true;
        console.log("Container visível:", _oContainer.visible);
    };

    this.unload = function () {
        _oButNo.unload();
        _oButYes.unload();
        _oBg.off("click", _oListener);
    };

    this._onButYes = function () {
        playSound("click", 1, false);
        
        if(_cbYesCallback) {
            _cbYesCallback();
        } else {
            // Comportamento padrão para sair do jogo
            this.unload();
            s_oGame.onConfirmExit();
        }
        
        _oContainer.visible = false;
    };

    this._onButNo = function () {
        playSound("click", 1, false);
        
        if(_cbNoCallback) {
            _cbNoCallback();
        }
        
        _oContainer.visible = false;
    };

    _oParentContainer = oParentContainer;

    this._init();
}