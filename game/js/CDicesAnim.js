function CDicesAnim(iX,iY){
    var _bUpdate;
    var _iCurDiceIndex;
    var _iFrameCont;
    var _iCurBallIndex;
    var _aDiceResult;
    var _aDicesAnimSprites;
    var _oListener;
    
    var _oDiceASprite;
    var _oDiceBSprite;
    var _oCurLaunchDiceSprite;
    var _oDiceTopDownView;
    var _oContainer;
    var _oBgDiceLaunch;
    var _oFade;
    var _oThis;
    
    this._init= function(iX,iY){
        _iCurDiceIndex= 0;
        _iFrameCont = 0;
        
        _oContainer = new createjs.Container();
        _oContainer.visible = false;
        _oContainer.x = iX;
        _oContainer.y = iY;
        s_oStage.addChild(_oContainer);
        
        var oGraphics = new createjs.Graphics().beginFill("rgba(0,0,0,0.6)").drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        _oFade = new createjs.Shape(oGraphics);
        _oFade.x = -iX;
        _oFade.y = -iY;
        _oContainer.addChild(_oFade);
        _oListener = _oFade.on("click", function () {});
        
        _oBgDiceLaunch = createBitmap(s_oSpriteLibrary.getSprite("dices_screen_bg"));
        _oContainer.addChild(_oBgDiceLaunch);
        
        _aDicesAnimSprites = new Array();
        for(var i=0;i<NUM_DICE_ROLLING_FRAMES;i++){
            var oImage = createBitmap(s_oSpriteLibrary.getSprite('launch_dices_'+i)); 
            oImage.x = 162;
            oImage.y = 150;
            oImage.visible = false;
            _oContainer.addChild(oImage);
            _aDicesAnimSprites.push(oImage);
        }
        
        _oCurLaunchDiceSprite = _aDicesAnimSprites[0];
        _oCurLaunchDiceSprite.visible = true;

        var oData = {   
                        images: [s_oSpriteLibrary.getSprite("dice_a")], 
                        // width, height & registration point of each sprite
                        frames: {width: 80, height: 34}, 
                        animations: {anim_1:[0,9,"stop_anim_1"],anim_2:[10,19,"stop_anim_2"],anim_3:[20,29,"stop_anim_3"],
                                     anim_4:[30,39,"stop_anim_4"],anim_5:[40,49,"stop_anim_5"],anim_6:[50,59,"stop_anim_6"],
                                     stop_anim_1:9,stop_anim_2:19,stop_anim_3:29,stop_anim_4:39,stop_anim_5:49,stop_anim_6:59}
                    };
                   
        var oSpriteSheet = new createjs.SpriteSheet(oData);
        
        _oDiceASprite = createSprite(oSpriteSheet,"anim_1",80,34);
        _oDiceASprite.stop();
        _oDiceASprite.visible = false;
        _oDiceASprite.x = 332;
        _oDiceASprite.y = 206;
        _oContainer.addChild(_oDiceASprite);
        
        var oData = {   
                        images: [s_oSpriteLibrary.getSprite("dice_b")], 
                        // width, height & registration point of each sprite
                        frames: {width: 102, height: 65}, 
                        animations: {anim_1:[0,14,"stop_anim_1"],anim_2:[15,29,"stop_anim_2"],anim_3:[30,44,"stop_anim_3"],
                                     anim_4:[45,59,"stop_anim_4"],anim_5:[60,74,"stop_anim_5"],anim_6:[75,89,"stop_anim_6"],
                                     stop_anim_1:14,stop_anim_2:29,stop_anim_3:44,stop_anim_4:59,stop_anim_5:74,stop_anim_6:89}
                    };
                   
        var oSpriteSheet = new createjs.SpriteSheet(oData);
        
        _oDiceBSprite = createSprite(oSpriteSheet,"anim_1",102,65);
        _oDiceBSprite.stop();
        _oDiceBSprite.visible = false;
        _oDiceBSprite.x = 239;
        _oDiceBSprite.y = 240;
        _oContainer.addChild(_oDiceBSprite);
        _oDiceBSprite.addEventListener("animationend", _oThis._onDiceBAnimEnded);
        
        _oDiceTopDownView = new CDicesTopDownView(584,20,_oContainer);
    };
    
    this.unload =  function(){
        _oFade.off("click",_oListener);
    };
    
    this.hide = function(){
        _oDiceTopDownView.hide();
        _oContainer.visible = false;
        _iCurBallIndex = 0;
        
        _oDiceASprite.visible = false;
        _oDiceBSprite.visible = false;
        
        for(var i=0;i<_aDicesAnimSprites.length;i++){
            _aDicesAnimSprites[i].visible = false;
        }
        
        // Verificar se o jogo está disponível antes de chamar dicesAnimEnded
        if (s_oGame && typeof s_oGame.dicesAnimEnded === 'function') {
            s_oGame.dicesAnimEnded();
        } else {
            console.error("Game object not available or dicesAnimEnded method not found");
        }
    };
    
    this.startRolling = function(aDicesResult){
        // Validar se o resultado dos dados foi fornecido corretamente
        if (!aDicesResult || aDicesResult.length < 2 || 
            aDicesResult[0] === undefined || aDicesResult[1] === undefined) {
            console.error("Invalid dice result provided to startRolling:", aDicesResult);
            // Usar valores padrão para evitar crash
            _aDiceResult = [1, 1];
        } else {
            _aDiceResult = aDicesResult;
        }
        
        // Reset animation state
        _iFrameCont = 0;
        _bUpdate = false; // Temporarily disable update
        
        // Hide dice sprites from previous animation
        _oDiceASprite.visible = false;
        _oDiceBSprite.visible = false;
        _oDiceTopDownView.hide();
        
        this.playToFrame(0);

        _oContainer.visible = true;
        _bUpdate = true; // Enable update after proper initialization
        
        playSound("dice_rolling", 1, false);
    };
    
    this.setShowNumberInfo = function(){
        // Verificar se _aDiceResult está definido antes de usar
        if (!_aDiceResult || _aDiceResult.length < 2) {
            console.error("Cannot show dice info - dice result not properly defined:", _aDiceResult);
            return;
        }
        _oDiceTopDownView.setDiceResult(_aDiceResult[0],_aDiceResult[1]);
    };
    
    this.playToFrame = function(iFrame){
        _oCurLaunchDiceSprite.visible = false;
        
        // Verificar se o frame está dentro dos limites
        if (iFrame < 0 || iFrame >= _aDicesAnimSprites.length) {
            console.error("Invalid frame index:", iFrame, "max:", _aDicesAnimSprites.length - 1);
            iFrame = Math.max(0, Math.min(iFrame, _aDicesAnimSprites.length - 1));
        }
        
        _iCurDiceIndex = iFrame;
        _aDicesAnimSprites[_iCurDiceIndex].visible= true;
        _oCurLaunchDiceSprite = _aDicesAnimSprites[_iCurDiceIndex];
    };
    
    this.nextFrame = function(){
        _oCurLaunchDiceSprite.visible = false;
        _iCurDiceIndex++;
        
        // Verificar se o índice está dentro dos limites do array
        if (_iCurDiceIndex >= _aDicesAnimSprites.length) {
            console.error("Dice animation index out of bounds:", _iCurDiceIndex, "max:", _aDicesAnimSprites.length - 1);
            _iCurDiceIndex = _aDicesAnimSprites.length - 1;
            _bUpdate = false; // Parar a animação para evitar loop infinito
            this._setAnimForDiceResult();
            return;
        }
        
        _aDicesAnimSprites[_iCurDiceIndex].visible= true;
        _oCurLaunchDiceSprite = _aDicesAnimSprites[_iCurDiceIndex];
    };
    
    this._setAnimForDiceResult = function(){
        // Verificar se _aDiceResult está definido e tem os valores necessários
        if (!_aDiceResult || _aDiceResult.length < 2 || 
            _aDiceResult[0] === undefined || _aDiceResult[1] === undefined) {
            console.error("Dice result is not properly defined:", _aDiceResult);
            // Usar valores padrão para evitar crash
            _aDiceResult = [1, 1];
        }
        
        _aDicesAnimSprites[_iCurDiceIndex].visible = false;
        
        _oDiceASprite.visible = true;
        _oDiceBSprite.visible = true;
        _oDiceASprite.gotoAndPlay("anim_"+_aDiceResult[0]);
        _oDiceBSprite.gotoAndPlay("anim_"+_aDiceResult[1]);
    };
    
    this._onDiceBAnimEnded = function(evt){
        if(evt.currentTarget.currentAnimation.indexOf("stop_anim") !== -1){
            // Verificar se temos um resultado válido antes de mostrar
            if (_aDiceResult && _aDiceResult.length >= 2 && 
                _aDiceResult[0] !== undefined && _aDiceResult[1] !== undefined) {
                _oThis.setShowNumberInfo();
                setTimeout(function(){_oThis.hide();},TIME_SHOW_DICES_RESULT);
            } else {
                console.error("Cannot show dice info - invalid dice result:", _aDiceResult);
                // Hide immediately if we don't have valid results
                setTimeout(function(){_oThis.hide();}, 100);
            }
        }
        
    };
    
    this.isVisible = function(){
        return _oContainer.visible;
    };
    
    this.update = function(){
        if(_bUpdate === false){
            return;
        }
        
        // Verificação de segurança para evitar loops infinitos
        if (!_aDicesAnimSprites || _aDicesAnimSprites.length === 0) {
            console.error("Dice animation sprites not properly initialized");
            _bUpdate = false;
            return;
        }
        
        _iFrameCont++;
        
        if(_iFrameCont === 1){
            _iFrameCont = 0;
            if (_iCurDiceIndex >= (NUM_DICE_ROLLING_FRAMES-1)) {
                //PLACE DICE A AND DICE B FOR RESULT
                _bUpdate = false;
                this._setAnimForDiceResult();
            }else{
                this.nextFrame();
            }
            
        }
        
    };
    
    _oThis = this;
    this._init(iX,iY);
}