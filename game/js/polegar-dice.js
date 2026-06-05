/**
 * Dados fixos definidos na página /polegar (sem contador de rodadas).
 */
(function () {
    'use strict';

    var LS_OVERRIDE = 'dice_override';
    var LS_D1 = 'dice1_val';
    var LS_D2 = 'dice2_val';

    function clampDie(n) {
        var v = parseInt(n, 10);
        if (isNaN(v) || v < 1) return null;
        if (v > 6) return 6;
        return v;
    }

    window.PolegarDice = {
        isEnabled: function () {
            return localStorage.getItem(LS_OVERRIDE) === '1';
        },

        setEnabled: function (on) {
            localStorage.setItem(LS_OVERRIDE, on ? '1' : '0');
        },

        setValues: function (d1, d2) {
            var a = clampDie(d1);
            var b = clampDie(d2);
            if (a != null) localStorage.setItem(LS_D1, String(a));
            if (b != null) localStorage.setItem(LS_D2, String(b));
        },

        getValues: function () {
            return {
                d1: clampDie(localStorage.getItem(LS_D1)),
                d2: clampDie(localStorage.getItem(LS_D2))
            };
        },

        /** [d1, d2] ou null se desligado / inválido */
        getDice: function () {
            if (!this.isEnabled()) return null;
            var v = this.getValues();
            if (v.d1 == null || v.d2 == null) return null;
            return [v.d1, v.d2];
        }
    };
})();
