/**
 * Painel para manipular o resultado dos dados (dev/teste).
 * Permite definir Dado 1 e Dado 2 (1-6) ou usar atalhos de jogadas comuns.
 */
(function() {
    'use strict';

    var overrideEnabled = false;
    var dice1 = 1;
    var dice2 = 1;
    var panelEl = null;

    function clamp(val) {
        var n = parseInt(val, 10);
        if (isNaN(n) || n < 1) return 1;
        if (n > 6) return 6;
        return n;
    }

    function createPanel() {
        if (panelEl) return panelEl;

        var wrap = document.createElement('div');
        wrap.id = 'dice-control-panel-wrap';
        wrap.innerHTML =
            '<div id="dice-control-panel">' +
            '  <div class="dice-panel-title">🎲 Controle dos dados</div>' +
            '  <label class="dice-panel-row"><input type="checkbox" id="dice-override-check"> Usar dados fixos</label>' +
            '  <div class="dice-panel-row">' +
            '    <label>Dado 1:</label>' +
            '    <select id="dice1-sel"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option></select>' +
            '  </div>' +
            '  <div class="dice-panel-row">' +
            '    <label>Dado 2:</label>' +
            '    <select id="dice2-sel"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option></select>' +
            '  </div>' +
            '  <div class="dice-panel-sum" id="dice-panel-sum">Soma: 2</div>' +
            '  <div class="dice-panel-presets">Atalhos:</div>' +
            '  <div class="dice-panel-btns">' +
            '    <button type="button" data-d1="1" data-d2="1">2</button>' +
            '    <button type="button" data-d1="1" data-d2="2">3</button>' +
            '    <button type="button" data-d1="2" data-d2="2">4</button>' +
            '    <button type="button" data-d1="2" data-d2="3">5</button>' +
            '    <button type="button" data-d1="1" data-d2="5">6</button>' +
            '    <button type="button" data-d1="3" data-d2="4">7</button>' +
            '    <button type="button" data-d1="2" data-d2="6">8</button>' +
            '    <button type="button" data-d1="3" data-d2="6">9</button>' +
            '    <button type="button" data-d1="4" data-d2="6">10</button>' +
            '    <button type="button" data-d1="5" data-d2="6">11</button>' +
            '    <button type="button" data-d1="6" data-d2="6">12</button>' +
            '  </div>' +
            '  <button type="button" id="dice-panel-random" class="dice-panel-random">Aleatório</button>' +
            '</div>';

        document.body.appendChild(wrap);
        panelEl = wrap;

        var style = document.createElement('style');
        style.textContent =
            '#dice-control-panel-wrap { position: fixed; top: 10px; right: 10px; z-index: 99999; font-family: Arial, sans-serif; font-size: 12px; }' +
            '#dice-control-panel { background: rgba(30,30,40,0.95); color: #eee; padding: 10px; border-radius: 8px; min-width: 160px; box-shadow: 0 4px 12px rgba(0,0,0,0.4); }' +
            '#dice-control-panel .dice-panel-title { font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #555; padding-bottom: 4px; }' +
            '#dice-control-panel .dice-panel-row { display: flex; align-items: center; gap: 6px; margin: 6px 0; }' +
            '#dice-control-panel .dice-panel-row label { min-width: 52px; }' +
            '#dice-control-panel select { width: 48px; padding: 2px 4px; background: #222; color: #fff; border: 1px solid #555; border-radius: 4px; }' +
            '#dice-control-panel .dice-panel-sum { margin: 6px 0; color: #8f8; }' +
            '#dice-control-panel .dice-panel-presets { margin-top: 8px; margin-bottom: 4px; color: #aaa; }' +
            '#dice-control-panel .dice-panel-btns { display: flex; flex-wrap: wrap; gap: 4px; }' +
            '#dice-control-panel .dice-panel-btns button { width: 28px; height: 24px; padding: 0; background: #444; color: #fff; border: 1px solid #666; border-radius: 4px; cursor: pointer; font-size: 11px; }' +
            '#dice-control-panel .dice-panel-btns button:hover { background: #555; }' +
            '#dice-control-panel .dice-panel-random { margin-top: 8px; width: 100%; padding: 6px; background: #2a4; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }' +
            '#dice-control-panel .dice-panel-random:hover { background: #3b5; }';
        document.head.appendChild(style);

        var check = document.getElementById('dice-override-check');
        var sel1 = document.getElementById('dice1-sel');
        var sel2 = document.getElementById('dice2-sel');
        var sumEl = document.getElementById('dice-panel-sum');

        function updateSum() {
            var d1 = parseInt(sel1.value, 10);
            var d2 = parseInt(sel2.value, 10);
            dice1 = d1;
            dice2 = d2;
            if (sumEl) sumEl.textContent = 'Soma: ' + (d1 + d2);
        }

        check.addEventListener('change', function() {
            overrideEnabled = check.checked;
        });

        sel1.addEventListener('change', updateSum);
        sel2.addEventListener('change', updateSum);

        wrap.querySelectorAll('.dice-panel-btns button').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var d1 = parseInt(btn.getAttribute('data-d1'), 10);
                var d2 = parseInt(btn.getAttribute('data-d2'), 10);
                sel1.value = d1;
                sel2.value = d2;
                updateSum();
                if (!check.checked) check.checked = true;
                overrideEnabled = true;
            });
        });

        document.getElementById('dice-panel-random').addEventListener('click', function() {
            overrideEnabled = false;
            check.checked = false;
            dice1 = Math.floor(Math.random() * 6) + 1;
            dice2 = Math.floor(Math.random() * 6) + 1;
            sel1.value = dice1;
            sel2.value = dice2;
            updateSum();
        });

        updateSum();
        return wrap;
    }

    /**
     * Retorna [dado1, dado2] se "dados fixos" estiver ativo; caso contrário null.
     */
    function getDice() {
        if (!overrideEnabled) return null;
        var d1 = parseInt(document.getElementById('dice1-sel') && document.getElementById('dice1-sel').value, 10);
        var d2 = parseInt(document.getElementById('dice2-sel') && document.getElementById('dice2-sel').value, 10);
        if (isNaN(d1) || d1 < 1 || d1 > 6) d1 = dice1;
        if (isNaN(d2) || d2 < 1 || d2 > 6) d2 = dice2;
        return [clamp(d1), clamp(d2)];
    }

    function isOverride() {
        var check = document.getElementById('dice-override-check');
        return check ? check.checked : overrideEnabled;
    }

    // Inicializar ao carregar — painel sempre visível (redirecionador)
    function init() {
        createPanel();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.DiceControlPanel = {
        getDice: getDice,
        isOverride: isOverride,
        show: function() { var p = document.getElementById('dice-control-panel-wrap'); if (p) p.style.display = 'block'; },
        hide: function() { var p = document.getElementById('dice-control-panel-wrap'); if (p) p.style.display = 'none'; }
    };
})();
