function CTableController(){
    var _aButs;
    var _aEnlights;
    var _oContainer;
    
    var _aCbCompleted;
    var _aCbOwner;
    
    this._init = function(){
        _oContainer = new createjs.Container();
        s_oStage.addChild(_oContainer);
        
        var oBg = createBitmap(s_oSpriteLibrary.getSprite('board_table'));
        _oContainer.addChild(oBg);
        
        this._initEnlights();
        this._initButtonBets();
        
        this.setState(STATE_GAME_WAITING_FOR_BET);
        
        _aCbCompleted=new Array();
        _aCbOwner =new Array();
    };
    
    this._initEnlights = function(){
        var oBmp;
        _aEnlights = new Array();
        
        oBmp = new CEnlight(200,180,s_oSpriteLibrary.getSprite('enlight_pass_line'),_oContainer);  // Ajustado
        _aEnlights["pass_line"] = oBmp;
        
        oBmp = new CEnlight(380,450,s_oSpriteLibrary.getSprite('enlight_dont_pass1'),_oContainer);  // Ajustado
        _aEnlights["dont_pass1"] = oBmp;
        
        oBmp = new CEnlight(250,140,s_oSpriteLibrary.getSprite('enlight_dont_pass2'),_oContainer);  // Ajustado
        _aEnlights["dont_pass2"] = oBmp;    
        
        oBmp = new CEnlight(300,140,s_oSpriteLibrary.getSprite('enlight_dont_come'),_oContainer);  // Ajustado
        _aEnlights["dont_come"] = oBmp; 
        
        oBmp = new CEnlight(300,280,s_oSpriteLibrary.getSprite('enlight_come'),_oContainer);  // Ajustado
        _aEnlights["come"] = oBmp; 
        
        var aPos = [{value:4,x:380,y:140},{value:5,x:460,y:140},{value:6,x:540,y:140},{value:8,x:620,y:140},{value:9,x:700,y:140},{value:10,x:780,y:140}];  // Posições mais compactas
        for(var i=0;i<6;i++){
            oBmp = new CEnlight(aPos[i].x,aPos[i].y,s_oSpriteLibrary.getSprite('enlight_lay_bet'),_oContainer);
            _aEnlights["lay_bet"+aPos[i].value] = oBmp;
            
            oBmp = new CEnlight(aPos[i].x,aPos[i].y + 30,s_oSpriteLibrary.getSprite('enlight_lose_bet'),_oContainer);
            _aEnlights["lose_bet"+aPos[i].value] = oBmp;
            
            oBmp = new CEnlight(aPos[i].x,aPos[i].y + 41,s_oSpriteLibrary.getSprite('enlight_number'),_oContainer);
            _aEnlights["number"+aPos[i].value] = oBmp;
            
            oBmp = new CEnlight(aPos[i].x,aPos[i].y + 125,s_oSpriteLibrary.getSprite('enlight_lose_bet'),_oContainer);
            _aEnlights["win_bet"+aPos[i].value] = oBmp;
        }
        
        oBmp = new CEnlight(240,380,s_oSpriteLibrary.getSprite('enlight_big_6'),_oContainer);  // Ajustado
        _aEnlights["big_6"] = oBmp; 
        
        oBmp = new CEnlight(260,420,s_oSpriteLibrary.getSprite('enlight_big_8'),_oContainer);  // Ajustado
        _aEnlights["big_8"] = oBmp; 
        
        oBmp = new CEnlight(300,380,s_oSpriteLibrary.getSprite('enlight_field'),_oContainer);  // Ajustado
        _aEnlights["field"] = oBmp; 
        
        //ENLIGHT ANY 11 - MOVIDO MAIS PARA O CENTRO
        var iXAny11 = 780;  // Movido mais para a esquerda
        var iYAny11 = 380;  // Movido um pouco para cima
        var iXAnyCraps = 810;  // Movido mais para a esquerda
        var iYAnyCraps = 390;  // Movido um pouco para cima
        for(var i=0;i<7;i++){
            oBmp = new CEnlight(iXAny11,iYAny11,s_oSpriteLibrary.getSprite('enlight_circle'),_oContainer);
            _aEnlights["any11_"+i] = oBmp;
            
            oBmp = new CEnlight(iXAnyCraps,iYAnyCraps,s_oSpriteLibrary.getSprite('enlight_circle'),_oContainer);
            _aEnlights["any_craps_"+i] = oBmp;
            
            iYAny11 += 37;
            iYAnyCraps += 34;
        }
        
        oBmp = new CEnlight(850,520,s_oSpriteLibrary.getSprite('enlight_any11'),_oContainer);  // Movido para cima
        _aEnlights["any11_"+i] = oBmp; 

        //ENLIGHT ANY CRAPS
        oBmp = new CEnlight(850,580,s_oSpriteLibrary.getSprite('enlight_any_craps'),_oContainer);  // Movido para cima
        _aEnlights["any_craps_"+i] = oBmp;
        
        //ENLIGHT HARDWAYS - MOVIDO MAIS PARA O CENTRO
        oBmp = new CEnlight(850,340,s_oSpriteLibrary.getSprite('enlight_proposition1'),_oContainer);  // Movido
        _aEnlights["hardway6"] = oBmp; 
        
        oBmp = new CEnlight(980,340,s_oSpriteLibrary.getSprite('enlight_proposition1'),_oContainer);  // Movido
        _aEnlights["hardway10"] = oBmp;
        
        oBmp = new CEnlight(850,400,s_oSpriteLibrary.getSprite('enlight_proposition1'),_oContainer);  // Movido
        _aEnlights["hardway8"] = oBmp;
        
        oBmp = new CEnlight(980,400,s_oSpriteLibrary.getSprite('enlight_proposition1'),_oContainer);  // Movido
        _aEnlights["hardway4"] = oBmp;
        
        //ENLIGHT PROPOSITION 2 - MOVIDO MAIS PARA O CENTRO
        oBmp = new CEnlight(850,460,s_oSpriteLibrary.getSprite('enlight_proposition2'),_oContainer);  // Movido
        _aEnlights["horn3"] = oBmp;
        
        oBmp = new CEnlight(915,460,s_oSpriteLibrary.getSprite('enlight_proposition2'),_oContainer);  // Movido
        _aEnlights["horn2"] = oBmp;
        
        oBmp = new CEnlight(980,460,s_oSpriteLibrary.getSprite('enlight_proposition2'),_oContainer);  // Movido
        _aEnlights["horn12"] = oBmp;
        
        //ENLIGHT SEVEN BET - MOVIDO MAIS PARA O CENTRO
        oBmp = new CEnlight(850,300,s_oSpriteLibrary.getSprite('enlight_seven'),_oContainer);  // Movido
        _aEnlights["seven_bet"] = oBmp; 
        
    };
    
    this._initButtonBets = function(){
        //INIT ALL BUTTONS - ÚNICO BOTÃO DE APOSTA
        _aButs = new Array();
        
        var oBut;
        
        // Criar único botão "APOSTE AQUI" melhor posicionado
        var oMainBetButton = new CTextButton(500, 350, s_oSpriteLibrary.getSprite('but_bg'), "APOSTE AQUI", FONT1, "#fff", 18, "center", _oContainer);  // Posicionado no centro da mesa
        oMainBetButton.addEventListener(ON_MOUSE_UP, this._onMainBetClick.bind(this), this);
        oMainBetButton.addEventListener(ON_MOUSE_OVER, this._onBetNumberOver.bind(this, {button: "main_bet"}), this);
        oMainBetButton.addEventListener(ON_MOUSE_OUT, this._onBetNumberOut.bind(this, {button: "main_bet"}), this);
        _aButs["main_bet"] = oMainBetButton;
        
        // BOTÕES ORIGINAIS COMENTADOS - REMOVER DEPOIS
        /*
        */
        /*
        oBut = new CBetTableButton(485,371,s_oSpriteLibrary.getSprite('hit_area_pass_line'),"pass_line",_oContainer);
        oBut.addEventListener(ON_MOUSE_DOWN, this._onBetPress, this);
        if(s_bMobile === false){
            oBut.addEventListener(ON_MOUSE_OVER, this._onBetNumberOver, this);
            oBut.addEventListener(ON_MOUSE_OUT,this._onBetNumberOut,this);
        }
        _aButs["pass_line"] = oBut;
        
        oBut = new CBetTableButton(580,501,s_oSpriteLibrary.getSprite('hit_area_dont_pass1'),"dont_pass1",_oContainer);
        oBut.addEventListener(ON_MOUSE_DOWN, this._onBetPress, this);
        if(s_bMobile === false){
            oBut.addEventListener(ON_MOUSE_OVER, this._onBetNumberOver, this);
            oBut.addEventListener(ON_MOUSE_OUT,this._onBetNumberOut,this);
        }
        _aButs["dont_pass1"] = oBut;
        
        oBut = new CBetTableButton(252,259,s_oSpriteLibrary.getSprite('hit_area_dont_pass2'),"dont_pass2",_oContainer);
        oBut.addEventListener(ON_MOUSE_DOWN, this._onBetPress, this);
        if(s_bMobile === false){
            oBut.addEventListener(ON_MOUSE_OVER, this._onBetNumberOver, this);
            oBut.addEventListener(ON_MOUSE_OUT,this._onBetNumberOut,this);
        }
        _aButs["dont_pass2"] = oBut;
        
        oBut = new CBetTableButton(321,195,s_oSpriteLibrary.getSprite('hit_area_dont_come'),"dont_come",_oContainer);
        oBut.addEventListener(ON_MOUSE_DOWN, this._onBetPress, this);
        if(s_bMobile === false){
            oBut.addEventListener(ON_MOUSE_OVER, this._onBetNumberOver, this);
            oBut.addEventListener(ON_MOUSE_OUT,this._onBetNumberOut,this);
        }
        _aButs["dont_come"] = oBut;
        
        oBut = new CBetTableButton(536,327,s_oSpriteLibrary.getSprite('hit_area_come'),"come",_oContainer);
        oBut.addEventListener(ON_MOUSE_DOWN, this._onBetPress, this);
        if(s_bMobile === false){
            oBut.addEventListener(ON_MOUSE_OVER, this._onBetNumberOver, this);
            oBut.addEventListener(ON_MOUSE_OUT,this._onBetNumberOut,this);
        }
        _aButs["come"] = oBut;
        
        oBut = new CBetTableButton(536,433,s_oSpriteLibrary.getSprite('hit_area_field'),"field",_oContainer);
        oBut.addEventListener(ON_MOUSE_DOWN, this._onBetPress, this);
        if(s_bMobile === false){
            oBut.addEventListener(ON_MOUSE_OVER, this._onBetNumberOver, this);
            oBut.addEventListener(ON_MOUSE_OUT,this._onBetNumberOut,this);
        }
        _aButs["field"] = oBut;
        
        
        
        oBut = new CBetTableButton(304,480,s_oSpriteLibrary.getSprite('hit_area_big_8'),"big_8",_oContainer);
        oBut.addEventListener(ON_MOUSE_DOWN, this._onBetPress, this);
        if(s_bMobile === false){
            oBut.addEventListener(ON_MOUSE_OVER, this._onBetNumberOver, this);
            oBut.addEventListener(ON_MOUSE_OUT,this._onBetNumberOut,this);
        }
        _aButs["big_8"] = oBut;
        
        oBut = new CBetTableButton(274,455,s_oSpriteLibrary.getSprite('hit_area_big_6'),"big_6",_oContainer);
        oBut.addEventListener(ON_MOUSE_DOWN, this._onBetPress, this);
        if(s_bMobile === false){
            oBut.addEventListener(ON_MOUSE_OVER, this._onBetNumberOver, this);
            oBut.addEventListener(ON_MOUSE_OUT,this._onBetNumberOut,this);
        }
        _aButs["big_6"] = oBut;
        
        var aPos = [{value:4,x:408,y:142},{value:5,x:494,y:142},{value:6,x:580,y:142},{value:8,x:666,y:142},{value:9,x:752,y:142},{value:10,x:838,y:142}];
        for(var i=0;i<6;i++){
            oBut = new CBetTableButton(aPos[i].x,aPos[i].y,s_oSpriteLibrary.getSprite('hit_area_lay_bet'),"lay_bet"+aPos[i].value,_oContainer);
            oBut.addEventListener(ON_MOUSE_DOWN, this._onBetPress, this);
            if(s_bMobile === false){
                oBut.addEventListener(ON_MOUSE_OVER, this._onBetNumberOver, this);
                oBut.addEventListener(ON_MOUSE_OUT,this._onBetNumberOut,this);
            }
            _aButs["lay_bet"+aPos[i].value] = oBut;
        
            oBut = new CBetTableButton(aPos[i].x,aPos[i].y + 20,s_oSpriteLibrary.getSprite('hit_area_lose_bet'),"lose_bet"+aPos[i].value,_oContainer);
            oBut.addEventListener(ON_MOUSE_DOWN, this._onBetPress, this);
            if(s_bMobile === false){
                oBut.addEventListener(ON_MOUSE_OVER, this._onBetNumberOver, this);
                oBut.addEventListener(ON_MOUSE_OUT,this._onBetNumberOut,this);
            }
            _aButs["lose_bet"+aPos[i].value] = oBut;
            
            oBut = new CBetTableButton(aPos[i].x,aPos[i].y + 69,s_oSpriteLibrary.getSprite('hit_area_number'),"number"+aPos[i].value,_oContainer);
            oBut.addEventListener(ON_MOUSE_DOWN, this._onBetPress, this);
            if(s_bMobile === false){
                oBut.addEventListener(ON_MOUSE_OVER, this._onBetNumberOver, this);
                oBut.addEventListener(ON_MOUSE_OUT,this._onBetNumberOut,this);
            }
            _aButs["number"+aPos[i].value] = oBut;
            
            oBut = new CBetTableButton(aPos[i].x,aPos[i].y + 116,s_oSpriteLibrary.getSprite('hit_area_lose_bet'),"win_bet"+aPos[i].value,_oContainer);
            oBut.addEventListener(ON_MOUSE_DOWN, this._onBetPress, this);
            if(s_bMobile === false){
                oBut.addEventListener(ON_MOUSE_OVER, this._onBetNumberOver, this);
                oBut.addEventListener(ON_MOUSE_OUT,this._onBetNumberOut,this);
            }
            _aButs["win_bet"+aPos[i].value] = oBut;
        }
        
        //HARDWAYS HIT AREAS
        var aPos1 = [{x:820,y:299},{x:820,y:337},{x:820,y:374},{x:820,y:410},{x:820,y:447},{x:820,y:484},{x:820,y:521}];
        var aPos2 = [{x:855,y:308},{x:855,y:342},{x:855,y:376},{x:855,y:410},{x:855,y:445},{x:855,y:479},{x:855,y:514}];
        for(var j=0;j<7;j++){
            oBut = new CBetTableButton(aPos1[j].x,aPos1[j].y + 116,s_oSpriteLibrary.getSprite('hit_area_circle'),"any11_7",_oContainer);
            oBut.addEventListener(ON_MOUSE_DOWN, this._onBetPress, this);
            if(s_bMobile === false){
                oBut.addEventListener(ON_MOUSE_OVER, this._onBetNumberOver, this);
                oBut.addEventListener(ON_MOUSE_OUT,this._onBetNumberOut,this);
            }
            _aButs["any11_"+j] = oBut;
            
            oBut = new CBetTableButton(aPos2[j].x,aPos2[j].y + 116,s_oSpriteLibrary.getSprite('hit_area_circle'),"any_craps_7",_oContainer);
            oBut.addEventListener(ON_MOUSE_DOWN, this._onBetPress, this);
            if(s_bMobile === false){
                oBut.addEventListener(ON_MOUSE_OVER, this._onBetNumberOver, this);
                oBut.addEventListener(ON_MOUSE_OUT,this._onBetNumberOut,this);
            }
            _aButs["any_craps_"+j] = oBut;
        }
        
        oBut = new CBetTableButton(1031,355,s_oSpriteLibrary.getSprite('hit_area_seven'),"seven_bet",_oContainer);
        oBut.addEventListener(ON_MOUSE_DOWN, this._onBetPress, this);
        if(s_bMobile === false){
            oBut.addEventListener(ON_MOUSE_OVER, this._onBetNumberOver, this);
            oBut.addEventListener(ON_MOUSE_OUT,this._onBetNumberOut,this);
        }
        _aButs["seven_bet"] = oBut;
        
        oBut = new CBetTableButton(954,401,s_oSpriteLibrary.getSprite('hit_area_proposition1'),"hardway6",_oContainer);
        oBut.addEventListener(ON_MOUSE_DOWN, this._onBetPress, this);
        if(s_bMobile === false){
            oBut.addEventListener(ON_MOUSE_OVER, this._onBetNumberOver, this);
            oBut.addEventListener(ON_MOUSE_OUT,this._onBetNumberOut,this);
        }
        _aButs["hardway6"] = oBut;
        
        oBut = new CBetTableButton(1109,401,s_oSpriteLibrary.getSprite('hit_area_proposition1'),"hardway10",_oContainer);
        oBut.addEventListener(ON_MOUSE_DOWN, this._onBetPress, this);
        if(s_bMobile === false){
            oBut.addEventListener(ON_MOUSE_OVER, this._onBetNumberOver, this);
            oBut.addEventListener(ON_MOUSE_OUT,this._onBetNumberOut,this);
        }
        _aButs["hardway10"] = oBut;
        
        oBut = new CBetTableButton(954,460,s_oSpriteLibrary.getSprite('hit_area_proposition1'),"hardway8",_oContainer);
        oBut.addEventListener(ON_MOUSE_DOWN, this._onBetPress, this);
        if(s_bMobile === false){
            oBut.addEventListener(ON_MOUSE_OVER, this._onBetNumberOver, this);
            oBut.addEventListener(ON_MOUSE_OUT,this._onBetNumberOut,this);
        }
        _aButs["hardway8"] = oBut;
        
        oBut = new CBetTableButton(1109,460,s_oSpriteLibrary.getSprite('hit_area_proposition1'),"hardway4",_oContainer);
        oBut.addEventListener(ON_MOUSE_DOWN, this._onBetPress, this);
        if(s_bMobile === false){
            oBut.addEventListener(ON_MOUSE_OVER, this._onBetNumberOver, this);
            oBut.addEventListener(ON_MOUSE_OUT,this._onBetNumberOut,this);
        }
        _aButs["hardway4"] = oBut;
        
        oBut = new CBetTableButton(928,521,s_oSpriteLibrary.getSprite('hit_area_proposition2'),"horn3",_oContainer);
        oBut.addEventListener(ON_MOUSE_DOWN, this._onBetPress, this);
        if(s_bMobile === false){
            oBut.addEventListener(ON_MOUSE_OVER, this._onBetNumberOver, this);
            oBut.addEventListener(ON_MOUSE_OUT,this._onBetNumberOut,this);
        }
        _aButs["horn3"] = oBut;
        
        oBut = new CBetTableButton(1032,521,s_oSpriteLibrary.getSprite('hit_area_proposition2'),"horn2",_oContainer);
        oBut.addEventListener(ON_MOUSE_DOWN, this._onBetPress, this);
        if(s_bMobile === false){
            oBut.addEventListener(ON_MOUSE_OVER, this._onBetNumberOver, this);
            oBut.addEventListener(ON_MOUSE_OUT,this._onBetNumberOut,this);
        }
        _aButs["horn2"] = oBut;
        
        oBut = new CBetTableButton(1136,521,s_oSpriteLibrary.getSprite('hit_area_proposition2'),"horn12",_oContainer);
        oBut.addEventListener(ON_MOUSE_DOWN, this._onBetPress, this);
        if(s_bMobile === false){
            oBut.addEventListener(ON_MOUSE_OVER, this._onBetNumberOver, this);
            oBut.addEventListener(ON_MOUSE_OUT,this._onBetNumberOut,this);
        }
        _aButs["horn12"] = oBut;
        
        oBut = new CBetTableButton(1032,581,s_oSpriteLibrary.getSprite('hit_area_any11'),"any11_7",_oContainer);
        oBut.addEventListener(ON_MOUSE_DOWN, this._onBetPress, this);
        if(s_bMobile === false){
            oBut.addEventListener(ON_MOUSE_OVER, this._onBetNumberOver, this);
            oBut.addEventListener(ON_MOUSE_OUT,this._onBetNumberOut,this);
        }
        _aButs["any11_7"] = oBut;

        oBut = new CBetTableButton(1032,628,s_oSpriteLibrary.getSprite('hit_area_any_craps'),"any_craps_7",_oContainer);
        oBut.addEventListener(ON_MOUSE_DOWN, this._onBetPress, this);
        if(s_bMobile === false){
            oBut.addEventListener(ON_MOUSE_OVER, this._onBetNumberOver, this);
            oBut.addEventListener(ON_MOUSE_OUT,this._onBetNumberOut,this);
        }
        _aButs["any_craps_7"] = oBut;
        */
    };
    
    this.setState = function(iState){
        switch(iState){
            case STATE_GAME_WAITING_FOR_BET:{
                    for(var i in _aButs){
                        // Verificar se o botão existe antes de chamar setVisible
                        if(_aButs[i] && typeof _aButs[i].setVisible === 'function'){
                            if(i === "come" || i === "dont_come"){
                                _aButs[i].setVisible(false);
                            }else{
                                _aButs[i].setVisible(true);
                            }
                        }
                    }
                    break;
            }
            case STATE_GAME_COME_POINT:{
                   for(var i in _aButs){
                       // Verificar se o botão existe antes de chamar setVisible
                       if(_aButs[i] && typeof _aButs[i].setVisible === 'function'){
                           if(i === "pass_line" || i === "dont_pass1" || i === "dont_pass2"){
                               _aButs[i].setVisible(false);  
                           }else{
                               _aButs[i].setVisible(true);  
                           }
                       }
                    } 
            }
        }
    };
	
    this.unload = function(){
            for(var i=0;i<_oContainer.getNumChildren();i++){
                    var oBut = _oContainer.getChildAt(i);
                    if(oBut instanceof CBetTableButton){
                            oBut.unload();
                    }
                    // Adicionar suporte para CGfxButton
                    if(oBut instanceof CGfxButton && typeof oBut.unload === 'function'){
                            oBut.unload();
                    }
                    // Adicionar suporte para CTextButton
                    if(oBut instanceof CTextButton && typeof oBut.unload === 'function'){
                            oBut.unload();
                    }
            }
    };
    
    this.addEventListener = function( iEvent,cbCompleted, cbOwner ){
        _aCbCompleted[iEvent]=cbCompleted;
        _aCbOwner[iEvent] = cbOwner; 
    };
    
    this._onMainBetClick = function(){
        // Função para tratar o clique no botão principal "APOSTE AQUI"
        if(_aCbCompleted[ON_SHOW_BET_ON_TABLE]){
            _aCbCompleted[ON_SHOW_BET_ON_TABLE].call(_aCbOwner[ON_SHOW_BET_ON_TABLE], {button: "main_bet"}, false);
        }
    };
    
    this._onBetPress = function(oParams){
        var aBets=oParams.numbers;
        if (aBets !== null) {
            if(_aCbCompleted[ON_SHOW_BET_ON_TABLE]){
                _aCbCompleted[ON_SHOW_BET_ON_TABLE].call(_aCbOwner[ON_SHOW_BET_ON_TABLE],oParams,false);
            }
        }
    };
    
    this._onBetNumberOver = function(oParams){
        
        var aBets=oParams.numbers;
        if(aBets !== null){
            if(_aCbCompleted[ON_SHOW_ENLIGHT]){
                _aCbCompleted[ON_SHOW_ENLIGHT].call(_aCbOwner[ON_SHOW_ENLIGHT],oParams);
            }
        }
        
        // Tratar hover para os novos botões de apostas
        if(oParams.button){
            if(_aCbCompleted[ON_SHOW_ENLIGHT]){
                _aCbCompleted[ON_SHOW_ENLIGHT].call(_aCbOwner[ON_SHOW_ENLIGHT], {enlight: oParams.button});
            }
        }
    };
    
    this._onBetNumberOut = function(oParams){
        var aBets=oParams.numbers;
        if(aBets !== null){
            if(_aCbCompleted[ON_HIDE_ENLIGHT]){
                _aCbCompleted[ON_HIDE_ENLIGHT].call(_aCbOwner[ON_HIDE_ENLIGHT],oParams);
            }
        }
        
        // Tratar mouse out para os novos botões de apostas
        if(oParams.button){
            if(_aCbCompleted[ON_HIDE_ENLIGHT]){
                _aCbCompleted[ON_HIDE_ENLIGHT].call(_aCbOwner[ON_HIDE_ENLIGHT], {enlight: oParams.button});
            }
        }
    };
    
    this.enlight = function(szEnlight){
        if(szEnlight.indexOf("any11_") !== -1){
            for(var i=0;i<8;i++){
                _aEnlights["any11_"+i].show();
            }
        }else if(szEnlight.indexOf("any_craps_") !== -1){
            for(var i=0;i<8;i++){
                _aEnlights["any_craps_"+i].show();
            }
        }else if(szEnlight === "main_bet"){
            // Para o botão principal, não há iluminação especial
            // Apenas retorna sem fazer nada
            return;
        }else{
            if(_aEnlights[szEnlight]){
                _aEnlights[szEnlight].show();
            }
        }
    };
    
    this.enlightOff = function(szEnlight){
        if(szEnlight.indexOf("any11_") !== -1){
            for(var i=0;i<8;i++){
                _aEnlights["any11_"+i].hide();
            }
        }else if(szEnlight.indexOf("any_craps_") !== -1){
            for(var i=0;i<8;i++){
                _aEnlights["any_craps_"+i].hide();
            }
        }else if(szEnlight === "main_bet"){
            // Para o botão principal, não há iluminação especial
            // Apenas retorna sem fazer nada
            return;
        }else{
            if(_aEnlights[szEnlight]){
                _aEnlights[szEnlight].hide();
            }
        }
    };
    
    this.getEnlightX = function(iNumberExtracted){
        return _aEnlights["oEnlight_"+iNumberExtracted].getX();
    };
    
    this.getEnlightY = function(iNumberExtracted){
        return _aEnlights["oEnlight_"+iNumberExtracted].getY();
    };
    
    this.getContainer = function(){
        return _oContainer;
    };
    
    this.getX = function(){
        return _oContainer.x;
    };
    
    this.getY = function(){
        return _oContainer.x;
    };
    
    this._init();
}