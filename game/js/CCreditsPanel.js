function CCreditsPanel(){
    
    var _oBg;
    var _oButExit;
    var _oHitArea;
    var _oContainer;
    var _oListener;
    var _pStartPosExit;
    
    this._init = function(){
        
        _oContainer = new createjs.Container();
        s_oStage.addChild(_oContainer);
        
        _oHitArea = new createjs.Shape();
        _oHitArea.graphics.beginFill("#000000").drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        _oHitArea.alpha = 0.75;
        var oParent = this;
        _oListener = _oHitArea.on("click", function(){ oParent.unload(); });
        _oContainer.addChild(_oHitArea);

        var oSprite = s_oSpriteLibrary.getSprite('msg_box');
        _oBg = createBitmap(oSprite);
        _oBg.x = CANVAS_WIDTH/2;
        _oBg.y = CANVAS_HEIGHT/2;
        _oBg.regX = oSprite.width/2;
        _oBg.regY = oSprite.height/2;
        _oBg.scaleX = 1.35;
        _oBg.scaleY = 1.45;
        _oContainer.addChild(_oBg);
        
        new CTLText(_oContainer,
                    CANVAS_WIDTH/2 - 340, 72, 680, 44,
                    28, "center", "#ffd700", FONT1, 1,
                    0, 0,
                    TEXT_GAME_RULES_TITLE,
                    true, true, true,
                    false );

        new CTLText(_oContainer,
                    CANVAS_WIDTH/2 - 340, 130, 680, 520,
                    18, "left", "#ffffff", FONT1, 1.15,
                    0, 0,
                    TEXT_GAME_RULES,
                    true, true, true,
                    false );
                
        oSprite = s_oSpriteLibrary.getSprite('but_exit');
        _pStartPosExit = {x: CANVAS_WIDTH/2 + 310, y: 88};
        _oButExit = new CGfxButton(_pStartPosExit.x, _pStartPosExit.y, oSprite, _oContainer);
        _oButExit.addEventListener(ON_MOUSE_UP, this.unload, this);
    };
    
    this.unload = function(){
        _oHitArea.off("click", _oListener);
        
        _oButExit.unload(); 
        _oButExit = null;

        s_oStage.removeChild(_oContainer);
    };
    
    this._init();
};

