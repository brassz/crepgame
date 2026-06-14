/**
 * Dados programados para o próximo lançamento (página /polegar).
 * O valor configurado é consumido uma vez na próxima rodada; o contador permanece em 0.
 */
(function () {
    'use strict';

    var LS_OVERRIDE = 'dice_override';
    var LS_PENDING = 'polegar_pending_dice';
    var BC_NAME = 'polegar_dice';

    function clampDie(n) {
        var v = parseInt(n, 10);
        if (isNaN(v) || v < 1) return null;
        if (v > 6) return 6;
        return v;
    }

    function notifyPendingChange() {
        try {
            var ch = new BroadcastChannel(BC_NAME);
            ch.postMessage({ type: 'pending_changed' });
        } catch (e) {}
    }

    function migrateLegacy() {
        if (localStorage.getItem(LS_PENDING)) return;
        var d1 = localStorage.getItem('dice1_val');
        var d2 = localStorage.getItem('dice2_val');
        if (d1 && d2) {
            var a = clampDie(d1);
            var b = clampDie(d2);
            if (a != null && b != null) {
                localStorage.setItem(LS_PENDING, JSON.stringify([a, b]));
            }
        }
    }

    migrateLegacy();

    window.PolegarDice = {
        isEnabled: function () {
            return localStorage.getItem(LS_OVERRIDE) === '1';
        },

        setEnabled: function (on) {
            localStorage.setItem(LS_OVERRIDE, on ? '1' : '0');
            notifyPendingChange();
        },

        setPending: function (d1, d2) {
            var a = clampDie(d1);
            var b = clampDie(d2);
            if (a != null && b != null) {
                localStorage.setItem(LS_PENDING, JSON.stringify([a, b]));
            } else {
                localStorage.removeItem(LS_PENDING);
            }
            notifyPendingChange();
        },

        clearPending: function () {
            localStorage.removeItem(LS_PENDING);
            notifyPendingChange();
        },

        getPending: function () {
            try {
                var raw = localStorage.getItem(LS_PENDING);
                if (!raw) return null;
                var arr = JSON.parse(raw);
                if (!arr || arr.length < 2) return null;
                var a = clampDie(arr[0]);
                var b = clampDie(arr[1]);
                if (a == null || b == null) return null;
                return [a, b];
            } catch (e) {
                return null;
            }
        },

        /** [d1, d2] ou null — consome o valor pendente no próximo lançamento */
        getDice: function () {
            if (!this.isEnabled()) return null;
            var pending = this.getPending();
            if (!pending) return null;
            localStorage.removeItem(LS_PENDING);
            notifyPendingChange();
            return pending;
        }
    };
})();
