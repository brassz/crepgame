/**
 * Apostas da Mesa - Mostra todas as apostas de todos os jogadores da mesa
 * Substitui o painel de "últimas 5 jogadas"
 */
function CDiceHistory() {
    var _oContainer;
    var _oBackground;
    var _oTitle;
    var _oContentContainer;  // container dos textos de apostas (para limpar e redesenhar)
    var _oThis;

    this._init = function() {
        _oContainer = new createjs.Container();
        _oContainer.x = CANVAS_WIDTH / 2 - 400;
        _oContainer.y = CANVAS_HEIGHT - 200;
        s_oStage.addChild(_oContainer);

        var oGraphics = new createjs.Graphics()
            .beginFill("rgba(0, 0, 0, 0.8)")
            .drawRoundRect(0, 0, 800, 95, 10);
        _oBackground = new createjs.Shape(oGraphics);
        _oContainer.addChild(_oBackground);

        var oBorderGraphics = new createjs.Graphics()
            .setStrokeStyle(2)
            .beginStroke("#FFD700")
            .drawRoundRect(0, 0, 800, 95, 10);
        var oBorder = new createjs.Shape(oBorderGraphics);
        _oContainer.addChild(oBorder);

        _oTitle = new createjs.Text("APOSTAS DA MESA", "bold 14px Arial", "#FFD700");
        _oTitle.x = 400;
        _oTitle.y = 12;
        _oTitle.textAlign = "center";
        _oTitle.textBaseline = "middle";
        _oContainer.addChild(_oTitle);

        _oContentContainer = new createjs.Container();
        _oContentContainer.y = 28;
        _oContainer.addChild(_oContentContainer);

        console.log('✅ Apostas da Mesa panel initialized');
    };

    /**
     * Atualiza a lista de apostas de todos os jogadores.
     * @param {Array} players - Array de { username, userId?, currentBet?, pointBet?, sevenBet? }
     * @param {string} currentShooterId - userId do jogador com os dados (opcional, para marcar (DADOS))
     */
    this.updateBets = function(players, currentShooterId) {
        while (_oContentContainer.getNumChildren() > 0) {
            _oContentContainer.removeChildAt(0);
        }

        var list = players && players.length > 0 ? players : [];
        var isMultiplayer = window.GameClientSocketIO && window.GameClientSocketIO.isConnected && window.GameClientSocketIO.isAuthenticated;

        if (list.length === 0 && !isMultiplayer && window.s_oGame && window.s_oGame._oMySeat) {
            var myBet = window.s_oGame._oMySeat.getCurBet();
            list = [{ username: "Você", currentBet: myBet, userId: "local" }];
        }

        var y = 0;
        var lineHeight = 16;
        var maxWidth = 780;
        var maxLines = 5;

        for (var i = 0; i < list.length; i++) {
            if (i >= maxLines) {
                var oMore = new createjs.Text("+ " + (list.length - maxLines) + " jogador(es)", "10px Arial", "#aaa");
                oMore.x = 10;
                oMore.y = y;
                _oContentContainer.addChild(oMore);
                break;
            }
            var p = list[i];
            var name = p.username || ("Jogador " + (i + 1));
            var bet = p.currentBet || 0;
            var pointBet = p.pointBet || 0;
            var pointBetNumber = p.pointBetNumber;
            var sevenBet = p.sevenBet || 0;
            var isDados = currentShooterId && p.userId === currentShooterId;
            var line = name + (isDados ? " (DADOS)" : "") + " — R$ " + (bet || 0).toFixed(2);
            if (pointBet > 0) line += " | " + (pointBetNumber ? "Ponto " + pointBetNumber + ": R$ " : "Ponto: R$ ") + pointBet.toFixed(2);
            if (sevenBet > 0) line += " | 7: R$ " + sevenBet.toFixed(2);

            var oText = new createjs.Text(line, "11px Arial", "#ffffff");
            oText.x = 10;
            oText.y = y;
            oText.maxWidth = maxWidth;
            _oContentContainer.addChild(oText);
            y += lineHeight;
        }

        if (list.length === 0) {
            var oEmpty = new createjs.Text("Nenhuma aposta na mesa", "12px Arial", "#888");
            oEmpty.x = 10;
            oEmpty.y = 0;
            _oContentContainer.addChild(oEmpty);
        }
    };

    /**
     * Compatibilidade: chamado quando há nova jogada; não exibe mais jogadas (painel é de apostas).
     */
    this.addRoll = function(dice1, dice2, shooterName) {
        // Painel agora mostra apostas; ignorar novas jogadas
    };

    this.clear = function() {
        this.updateBets([], null);
    };

    this.show = function() {
        _oContainer.visible = true;
    };

    this.hide = function() {
        _oContainer.visible = false;
    };

    this.toggle = function() {
        _oContainer.visible = !_oContainer.visible;
    };

    this.isVisible = function() {
        return _oContainer.visible;
    };

    this.setPosition = function(x, y) {
        _oContainer.x = x;
        _oContainer.y = y;
    };

    this.unload = function() {
        this.clear();
        s_oStage.removeChild(_oContainer);
    };

    _oThis = this;
    this._init();
}
