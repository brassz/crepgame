(function () {
    'use strict';

    var SUPABASE_URL = window.SUPABASE_URL;
    var SUPABASE_KEY = window.SUPABASE_ANON_KEY;
    var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    var adminUser = null;
    var players = [];
    var selectedPlayer = null;
    var adjustOperation = 'add';
    var selectedIds = new Set();

    var els = {};

    function $(id) {
        return document.getElementById(id);
    }

    function formatMoney(value) {
        var n = parseFloat(value) || 0;
        return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function formatDate(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleString('pt-BR');
    }

    async function notifyDisconnectPlayers(userIds) {
        try {
            await fetch('/api/disconnect-players', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adminId: adminUser.id,
                    userIds: userIds
                })
            });
        } catch (e) {
            console.warn('Falha ao desconectar jogadores online:', e.message);
        }
    }

    async function notifyGameBalanceSync(userId, balanceAfter) {
        try {
            var res = await fetch('/api/sync-balance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adminId: adminUser.id,
                    userId: userId,
                    balanceAfter: balanceAfter
                })
            });
            var data = await res.json();
            if (!res.ok || !data.success) {
                console.warn('Sync saldo no jogo:', data.error || res.statusText);
            } else if (data.notified > 0) {
                console.log('Saldo sincronizado no jogo para', data.notified, 'cliente(s) online');
            }
        } catch (e) {
            console.warn('Falha ao sincronizar saldo no jogo:', e.message);
        }
    }

    function txTypeLabel(type) {
        var map = {
            admin_add: 'Adição (admin)',
            admin_remove: 'Remoção (admin)',
            deposit: 'Depósito',
            deposit_approved: 'Depósito aprovado',
            game_win: 'Ganho no jogo',
            game_loss: 'Perda no jogo'
        };
        return map[type] || type;
    }

    function showToast(msg, type) {
        var el = els.toast;
        el.textContent = msg;
        el.className = 'toast toast-' + (type || 'info');
        el.style.display = 'block';
        clearTimeout(el._timer);
        el._timer = setTimeout(function () {
            el.style.display = 'none';
        }, 4000);
    }

    function loadAdminSession() {
        try {
            var raw = localStorage.getItem('admin_user');
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    }

    function showLogin() {
        $('loginScreen').style.display = 'flex';
        $('panelScreen').style.display = 'none';
    }

    function showPanel() {
        $('loginScreen').style.display = 'none';
        $('panelScreen').style.display = 'block';
        $('adminName').textContent = adminUser.full_name || adminUser.email;
        loadPlayers();
    }

    async function handleLogin(e) {
        e.preventDefault();
        var email = $('loginEmail').value.trim();
        var password = $('loginPassword').value;
        var btn = $('loginBtn');

        if (!email || !password) {
            showToast('Preencha email e senha', 'error');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Entrando...';

        try {
            var res = await supabase.rpc('login_admin', {
                p_email: email,
                p_password: password
            });

            if (res.error) throw new Error(res.error.message);

            var data = res.data;
            if (!data || !data.success) {
                showToast((data && data.error) || 'Email ou senha incorretos', 'error');
                return;
            }

            adminUser = data.user;
            localStorage.setItem('admin_user', JSON.stringify(adminUser));
            showPanel();
            showToast('Login realizado com sucesso', 'success');
        } catch (err) {
            showToast('Erro: ' + err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Entrar';
        }
    }

    function logout() {
        localStorage.removeItem('admin_user');
        adminUser = null;
        players = [];
        selectedIds.clear();
        showLogin();
    }

    function updateDeleteButton() {
        var n = selectedIds.size;
        els.deleteSelectedBtn.disabled = n === 0;
        els.deleteSelectedBtn.textContent = n > 0
            ? 'Excluir selecionados (' + n + ')'
            : 'Excluir selecionados';
    }

    function syncSelectAllCheckbox() {
        var list = getFilteredPlayers();
        var allSelected = list.length > 0 && list.every(function (p) {
            return selectedIds.has(p.id);
        });
        els.selectAllPlayers.checked = allSelected;
        els.selectAllPlayers.indeterminate = !allSelected && list.some(function (p) {
            return selectedIds.has(p.id);
        });
    }

    function onPlayerCheckboxChange(e) {
        var id = e.target.getAttribute('data-id');
        if (!id) return;
        if (e.target.checked) {
            selectedIds.add(id);
        } else {
            selectedIds.delete(id);
        }
        var tr = e.target.closest('tr');
        if (tr) tr.classList.toggle('row-selected', e.target.checked);
        updateDeleteButton();
        syncSelectAllCheckbox();
    }

    function onSelectAllChange(e) {
        var checked = e.target.checked;
        getFilteredPlayers().forEach(function (p) {
            if (checked) {
                selectedIds.add(p.id);
            } else {
                selectedIds.delete(p.id);
            }
        });
        renderPlayers();
    }

    async function loadPlayers() {
        els.playersLoading.style.display = 'block';
        els.playersTableWrap.style.display = 'none';
        els.playersEmpty.style.display = 'none';

        try {
            var res = await supabase.rpc('painel_list_players', {
                p_admin_id: adminUser.id
            });

            if (res.error) throw new Error(res.error.message);

            var data = res.data;
            if (!data || !data.success) {
                throw new Error((data && data.error) || 'Falha ao carregar jogadores');
            }

            players = data.players || [];
            var validIds = new Set(players.map(function (p) { return p.id; }));
            selectedIds.forEach(function (id) {
                if (!validIds.has(id)) selectedIds.delete(id);
            });
            renderPlayers();
            updateSummary();
        } catch (err) {
            showToast('Erro ao carregar jogadores: ' + err.message, 'error');
            players = [];
            renderPlayers();
        } finally {
            els.playersLoading.style.display = 'none';
        }
    }

    function getFilteredPlayers() {
        var q = (els.searchInput.value || '').trim().toLowerCase();
        if (!q) return players;
        return players.filter(function (p) {
            return (p.username || '').toLowerCase().indexOf(q) !== -1 ||
                (p.email || '').toLowerCase().indexOf(q) !== -1 ||
                (p.full_name || '').toLowerCase().indexOf(q) !== -1 ||
                (p.cpf || '').indexOf(q) !== -1;
        });
    }

    function updateSummary() {
        var totalBalance = 0;
        var totalWins = 0;
        var totalLosses = 0;
        players.forEach(function (p) {
            totalBalance += parseFloat(p.balance) || 0;
            totalWins += parseFloat(p.total_winnings) || 0;
            totalLosses += parseFloat(p.total_losses) || 0;
        });
        els.statPlayers.textContent = players.length;
        els.statBalance.textContent = formatMoney(totalBalance);
        els.statWins.textContent = formatMoney(totalWins);
        els.statLosses.textContent = formatMoney(totalLosses);
    }

    function renderPlayers() {
        var list = getFilteredPlayers();
        els.playersTbody.innerHTML = '';

        if (!list.length) {
            els.playersTableWrap.style.display = 'none';
            els.playersEmpty.style.display = 'block';
            return;
        }

        els.playersTableWrap.style.display = 'block';
        els.playersEmpty.style.display = 'none';

        list.forEach(function (p) {
            var tr = document.createElement('tr');
            var rowClass = !p.is_active ? 'row-inactive' : '';
            if (selectedIds.has(p.id)) {
                rowClass = (rowClass ? rowClass + ' ' : '') + 'row-selected';
            }
            if (rowClass) tr.className = rowClass;

            var checked = selectedIds.has(p.id) ? ' checked' : '';

            tr.innerHTML =
                '<td class="col-check"><input type="checkbox" class="player-check" data-id="' + p.id + '"' + checked + '></td>' +
                '<td><strong>' + escapeHtml(p.username) + '</strong>' +
                (p.full_name ? '<br><span class="muted">' + escapeHtml(p.full_name) + '</span>' : '') + '</td>' +
                '<td>' + escapeHtml(p.email) + '</td>' +
                '<td class="num">' + formatMoney(p.balance) + '</td>' +
                '<td class="num win">' + formatMoney(p.total_winnings) + '</td>' +
                '<td class="num loss">' + formatMoney(p.total_losses) + '</td>' +
                '<td class="num">' + (p.games_played || 0) + '</td>' +
                '<td class="actions">' +
                '<button class="btn btn-sm btn-add" data-action="add" data-id="' + p.id + '">+ Saldo</button> ' +
                '<button class="btn btn-sm btn-remove" data-action="remove" data-id="' + p.id + '">− Saldo</button> ' +
                '<button class="btn btn-sm btn-history" data-action="history" data-id="' + p.id + '">Histórico</button>' +
                '</td>';

            els.playersTbody.appendChild(tr);
        });

        els.playersTbody.querySelectorAll('button[data-action]').forEach(function (btn) {
            btn.addEventListener('click', onPlayerAction);
        });
        els.playersTbody.querySelectorAll('.player-check').forEach(function (cb) {
            cb.addEventListener('change', onPlayerCheckboxChange);
        });
        updateDeleteButton();
        syncSelectAllCheckbox();
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function findPlayer(id) {
        for (var i = 0; i < players.length; i++) {
            if (players[i].id === id) return players[i];
        }
        return null;
    }

    function onPlayerAction(e) {
        var btn = e.currentTarget;
        var id = btn.getAttribute('data-id');
        var action = btn.getAttribute('data-action');
        var player = findPlayer(id);
        if (!player) return;

        if (action === 'history') {
            openHistoryModal(player);
        } else {
            openAdjustModal(player, action);
        }
    }

    function openAdjustModal(player, operation) {
        selectedPlayer = player;
        adjustOperation = operation;
        $('adjustPlayerName').textContent = player.username + (player.full_name ? ' (' + player.full_name + ')' : '');
        $('adjustCurrentBalance').textContent = formatMoney(player.balance);
        $('adjustAmount').value = '';
        $('adjustReason').value = '';
        $('adjustTitle').textContent = operation === 'add' ? 'Adicionar saldo' : 'Remover saldo';
        $('adjustSubmit').textContent = operation === 'add' ? 'Adicionar' : 'Remover';
        $('adjustSubmit').className = 'btn ' + (operation === 'add' ? 'btn-add-full' : 'btn-remove-full');
        els.adjustModal.style.display = 'flex';
        $('adjustAmount').focus();
    }

    function closeAdjustModal() {
        els.adjustModal.style.display = 'none';
        selectedPlayer = null;
    }

    async function submitAdjust(e) {
        e.preventDefault();
        if (!selectedPlayer) return;

        var amount = parseFloat($('adjustAmount').value);
        var reason = $('adjustReason').value.trim();

        if (!amount || amount <= 0) {
            showToast('Informe um valor válido', 'error');
            return;
        }

        var btn = $('adjustSubmit');
        btn.disabled = true;

        try {
            var res = await supabase.rpc('painel_adjust_balance', {
                p_admin_id: adminUser.id,
                p_user_id: selectedPlayer.id,
                p_amount: amount,
                p_operation: adjustOperation,
                p_reason: reason || null
            });

            if (res.error) throw new Error(res.error.message);

            var data = res.data;
            if (!data || !data.success) {
                throw new Error((data && data.error) || 'Operação falhou');
            }

            showToast(
                (adjustOperation === 'add' ? 'Saldo adicionado' : 'Saldo removido') +
                '. Novo saldo: ' + formatMoney(data.balance_after),
                'success'
            );
            await notifyGameBalanceSync(selectedPlayer.id, data.balance_after);
            closeAdjustModal();
            await loadPlayers();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            btn.disabled = false;
        }
    }

    function openHistoryModal(player) {
        selectedPlayer = player;
        $('historyPlayerName').textContent = player.username;
        $('historyPlayerMeta').textContent =
            (player.email || '') + ' · Saldo: ' + formatMoney(player.balance) +
            ' · Ganhos: ' + formatMoney(player.total_winnings) +
            ' · Perdas: ' + formatMoney(player.total_losses);
        els.historyTbody.innerHTML = '<tr><td colspan="6" class="loading-cell">Carregando...</td></tr>';
        els.historyModal.style.display = 'flex';
        loadHistory(player.id);
    }

    function closeHistoryModal() {
        els.historyModal.style.display = 'none';
        selectedPlayer = null;
    }

    async function loadHistory(userId) {
        try {
            var res = await supabase.rpc('painel_get_balance_history', {
                p_admin_id: adminUser.id,
                p_user_id: userId,
                p_limit: 100
            });

            if (res.error) throw new Error(res.error.message);

            var data = res.data;
            if (!data || !data.success) {
                throw new Error((data && data.error) || 'Falha ao carregar histórico');
            }

            if (data.user) {
                $('historyPlayerMeta').textContent =
                    (data.user.email || '') + ' · Saldo: ' + formatMoney(data.user.balance) +
                    ' · Ganhos: ' + formatMoney(data.user.total_winnings) +
                    ' · Perdas: ' + formatMoney(data.user.total_losses);
            }

            var history = data.history || [];
            els.historyTbody.innerHTML = '';

            if (!history.length) {
                els.historyTbody.innerHTML = '<tr><td colspan="6" class="empty-cell">Nenhuma movimentação registrada</td></tr>';
                return;
            }

            history.forEach(function (h) {
                var tr = document.createElement('tr');
                var amt = parseFloat(h.amount) || 0;
                var amtClass = amt >= 0 ? 'win' : 'loss';
                var amtSign = amt >= 0 ? '+' : '';
                tr.innerHTML =
                    '<td>' + formatDate(h.created_at) + '</td>' +
                    '<td>' + escapeHtml(txTypeLabel(h.transaction_type)) + '</td>' +
                    '<td class="num ' + amtClass + '">' + amtSign + formatMoney(Math.abs(amt)) + '</td>' +
                    '<td class="num">' + formatMoney(h.balance_before) + '</td>' +
                    '<td class="num">' + formatMoney(h.balance_after) + '</td>' +
                    '<td>' + escapeHtml(h.reason || h.admin_name || '—') + '</td>';
                els.historyTbody.appendChild(tr);
            });
        } catch (err) {
            els.historyTbody.innerHTML = '<tr><td colspan="6" class="empty-cell">' + escapeHtml(err.message) + '</td></tr>';
        }
    }

    function openDeleteModal() {
        if (selectedIds.size === 0) return;
        var list = players.filter(function (p) { return selectedIds.has(p.id); });
        els.deletePlayerList.innerHTML = '';
        list.forEach(function (p) {
            var li = document.createElement('li');
            li.textContent = (p.username || '—') + ' · ' + (p.email || '—');
            els.deletePlayerList.appendChild(li);
        });
        $('deleteReason').value = '';
        els.deleteModal.style.display = 'flex';
    }

    function closeDeleteModal() {
        els.deleteModal.style.display = 'none';
    }

    async function confirmDeletePlayers() {
        if (selectedIds.size === 0) return;

        var ids = Array.from(selectedIds);
        var reason = $('deleteReason').value.trim();
        var btn = $('deleteConfirm');
        btn.disabled = true;
        btn.textContent = 'Excluindo...';

        try {
            var res = await supabase.rpc('painel_delete_players', {
                p_admin_id: adminUser.id,
                p_user_ids: ids,
                p_reason: reason || null
            });

            if (res.error) throw new Error(res.error.message);

            var data = res.data;
            if (!data || !data.success) {
                throw new Error((data && data.error) || 'Falha ao excluir jogadores');
            }

            await notifyDisconnectPlayers(ids);

            var count = data.deleted_count || ids.length;
            selectedIds.clear();
            closeDeleteModal();
            showToast(count + ' jogador(es) excluído(s) com sucesso', 'success');
            await loadPlayers();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Excluir permanentemente';
        }
    }

    function bindElements() {
        els.toast = $('toast');
        els.searchInput = $('searchInput');
        els.playersLoading = $('playersLoading');
        els.playersTableWrap = $('playersTableWrap');
        els.playersEmpty = $('playersEmpty');
        els.playersTbody = $('playersTbody');
        els.statPlayers = $('statPlayers');
        els.statBalance = $('statBalance');
        els.statWins = $('statWins');
        els.statLosses = $('statLosses');
        els.adjustModal = $('adjustModal');
        els.historyModal = $('historyModal');
        els.historyTbody = $('historyTbody');
        els.deleteSelectedBtn = $('deleteSelectedBtn');
        els.selectAllPlayers = $('selectAllPlayers');
        els.deleteModal = $('deleteModal');
        els.deletePlayerList = $('deletePlayerList');
    }

    function init() {
        bindElements();

        $('loginForm').addEventListener('submit', handleLogin);
        $('logoutBtn').addEventListener('click', logout);
        $('refreshBtn').addEventListener('click', loadPlayers);
        $('adjustForm').addEventListener('submit', submitAdjust);
        $('adjustCancel').addEventListener('click', closeAdjustModal);
        $('historyClose').addEventListener('click', closeHistoryModal);
        els.deleteSelectedBtn.addEventListener('click', openDeleteModal);
        $('deleteCancel').addEventListener('click', closeDeleteModal);
        $('deleteConfirm').addEventListener('click', confirmDeletePlayers);
        els.selectAllPlayers.addEventListener('change', onSelectAllChange);

        els.searchInput.addEventListener('input', renderPlayers);

        els.adjustModal.addEventListener('click', function (e) {
            if (e.target === els.adjustModal) closeAdjustModal();
        });
        els.historyModal.addEventListener('click', function (e) {
            if (e.target === els.historyModal) closeHistoryModal();
        });
        els.deleteModal.addEventListener('click', function (e) {
            if (e.target === els.deleteModal) closeDeleteModal();
        });

        adminUser = loadAdminSession();
        if (adminUser && adminUser.id) {
            showPanel();
        } else {
            showLogin();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
