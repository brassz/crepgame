(function () {
    'use strict';

    var adminData = localStorage.getItem('admin_user');
    if (!adminData) {
        window.location.href = '/painel/login';
        return;
    }

    var currentAdmin = JSON.parse(adminData);
    var sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    var allPlayers = [];
    var selectedPlayerId = null;
    var activeTab = 'add';

    var fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    var fmtDate = new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short'
    });

    function $(id) { return document.getElementById(id); }

    function showBanner(text, type) {
        var el = $('tableMessage');
        el.textContent = text;
        el.className = 'banner ' + type;
        el.hidden = false;
        setTimeout(function () { el.hidden = true; }, 5000);
    }

    function sumField(list, field) {
        return list.reduce(function (acc, p) { return acc + (parseFloat(p[field]) || 0); }, 0);
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function renderStats(players) {
        $('statUsers').textContent = String(players.length);
        $('statBalance').textContent = fmt.format(sumField(players, 'balance'));
        $('statWinnings').textContent = fmt.format(sumField(players, 'total_winnings'));
        $('statLosses').textContent = fmt.format(sumField(players, 'total_losses'));
    }

    function renderTable(players) {
        var tbody = $('playersBody');
        if (!players.length) {
            tbody.innerHTML = '<tr><td colspan="8" class="loading">Nenhum jogador encontrado.</td></tr>';
            return;
        }

        tbody.innerHTML = players.map(function (p) {
            var name = p.full_name || p.username || '—';
            var statusClass = p.is_active !== false ? 'badge-active' : 'badge-inactive';
            var statusLabel = p.is_active !== false ? 'Ativo' : 'Inativo';
            return (
                '<tr data-id="' + p.id + '">' +
                '<td class="player-cell"><strong>' + escapeHtml(name) + '</strong><small>@' + escapeHtml(p.username || '') + '</small></td>' +
                '<td>' + escapeHtml(p.email || '—') + '</td>' +
                '<td class="money positive">' + fmt.format(parseFloat(p.balance) || 0) + '</td>' +
                '<td class="money positive">' + fmt.format(parseFloat(p.total_winnings) || 0) + '</td>' +
                '<td class="money negative">' + fmt.format(parseFloat(p.total_losses) || 0) + '</td>' +
                '<td>' + (p.games_played || 0) + '</td>' +
                '<td><span class="badge ' + statusClass + '">' + statusLabel + '</span></td>' +
                '<td><div class="action-btns">' +
                '<button type="button" class="btn btn-primary btn-sm btn-manage" data-id="' + p.id + '">Saldo</button>' +
                '</div></td>' +
                '</tr>'
            );
        }).join('');

        tbody.querySelectorAll('.btn-manage').forEach(function (btn) {
            btn.addEventListener('click', function () {
                openModal(btn.getAttribute('data-id'));
            });
        });
    }

    function filterPlayers(query) {
        var q = query.trim().toLowerCase();
        if (!q) return allPlayers.slice();
        return allPlayers.filter(function (p) {
            return (
                (p.username && p.username.toLowerCase().indexOf(q) !== -1) ||
                (p.email && p.email.toLowerCase().indexOf(q) !== -1) ||
                (p.full_name && p.full_name.toLowerCase().indexOf(q) !== -1)
            );
        });
    }

    async function loadPlayers() {
        var tbody = $('playersBody');
        tbody.innerHTML = '<tr><td colspan="8" class="loading">Carregando jogadores…</td></tr>';

        try {
            var rpcResult = await sb.rpc('get_all_players');
            if (!rpcResult.error && rpcResult.data && rpcResult.data.success) {
                allPlayers = rpcResult.data.players || [];
            } else {
                var direct = await sb
                    .from('users')
                    .select('id, email, username, full_name, balance, total_winnings, total_losses, games_played, is_active, created_at, last_login')
                    .order('created_at', { ascending: false });

                if (direct.error) throw new Error(direct.error.message);
                allPlayers = direct.data || [];
            }

            var filtered = filterPlayers($('searchInput').value);
            renderStats(allPlayers);
            renderTable(filtered);
        } catch (err) {
            tbody.innerHTML = '<tr><td colspan="8" class="loading">Erro: ' + escapeHtml(err.message) + '</td></tr>';
        }
    }

    function setActiveTab(tab) {
        activeTab = tab;
        document.querySelectorAll('.modal-tab').forEach(function (el) {
            el.classList.toggle('active', el.getAttribute('data-tab') === tab);
        });
        $('panelAdd').classList.toggle('active', tab === 'add');
        $('panelRemove').classList.toggle('active', tab === 'remove');

        var btn = $('btnConfirmAdjust');
        btn.textContent = tab === 'add' ? 'Adicionar saldo' : 'Remover saldo';
        btn.className = tab === 'add' ? 'btn btn-primary' : 'btn btn-danger';
    }

    function renderHistory(rows) {
        var tbody = $('historyBody');
        if (!rows || !rows.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="loading">Nenhum ajuste registrado ainda.</td></tr>';
            return;
        }

        tbody.innerHTML = rows.map(function (row) {
            var isAdd = row.operation === 'add';
            var opLabel = isAdd ? 'Adição' : 'Remoção';
            var opClass = isAdd ? 'op-add' : 'op-remove';
            var sign = isAdd ? '+' : '−';
            var dateStr = row.created_at ? fmtDate.format(new Date(row.created_at)) : '—';
            return (
                '<tr>' +
                '<td>' + escapeHtml(dateStr) + '</td>' +
                '<td class="' + opClass + '">' + opLabel + '</td>' +
                '<td class="' + opClass + '">' + sign + ' ' + fmt.format(parseFloat(row.amount) || 0) + '</td>' +
                '<td>' + fmt.format(parseFloat(row.balance_after) || 0) + '</td>' +
                '<td>' + escapeHtml(row.admin_name || '—') + '</td>' +
                '<td>' + escapeHtml(row.notes || '—') + '</td>' +
                '</tr>'
            );
        }).join('');
    }

    async function loadHistory(userId) {
        var tbody = $('historyBody');
        tbody.innerHTML = '<tr><td colspan="6" class="loading">Carregando histórico…</td></tr>';

        try {
            var rpc = await sb.rpc('get_player_balance_history', { p_user_id: userId });
            if (!rpc.error && rpc.data && rpc.data.success) {
                renderHistory(rpc.data.history || []);
                return;
            }

            var direct = await sb
                .from('balance_adjustments')
                .select('id, operation, amount, balance_after, notes, created_at, admin_id')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (direct.error) {
                if (direct.error.message.indexOf('balance_adjustments') !== -1) {
                    tbody.innerHTML = '<tr><td colspan="6" class="loading">Execute painel-rpc.sql no Supabase para ver o histórico.</td></tr>';
                    return;
                }
                throw new Error(direct.error.message);
            }

            var rows = (direct.data || []).map(function (r) {
                return {
                    operation: r.operation,
                    amount: r.amount,
                    balance_after: r.balance_after,
                    notes: r.notes,
                    created_at: r.created_at,
                    admin_name: '—'
                };
            });
            renderHistory(rows);
        } catch (err) {
            tbody.innerHTML = '<tr><td colspan="6" class="loading">Erro: ' + escapeHtml(err.message) + '</td></tr>';
        }
    }

    function openModal(userId) {
        var player = allPlayers.find(function (p) { return p.id === userId; });
        if (!player) return;

        selectedPlayerId = userId;
        $('modalUserLabel').textContent = (player.full_name || player.username) + ' — saldo atual: ' + fmt.format(parseFloat(player.balance) || 0);
        $('addAmount').value = '';
        $('removeAmount').value = '';
        $('adjustNotes').value = '';
        setActiveTab('add');
        $('balanceModal').hidden = false;
        $('addAmount').focus();
        loadHistory(userId);
    }

    function closeModal() {
        $('balanceModal').hidden = true;
        selectedPlayerId = null;
    }

    async function adjustBalanceFallback(operation, amount, notes) {
        var player = allPlayers.find(function (p) { return p.id === selectedPlayerId; });
        var currentBalance = parseFloat(player && player.balance) || 0;
        var newBalance = operation === 'add'
            ? Math.round((currentBalance + amount) * 100) / 100
            : Math.round((currentBalance - amount) * 100) / 100;

        if (newBalance < 0) {
            throw new Error('Saldo insuficiente para remover ' + fmt.format(amount));
        }

        var update = await sb.rpc('update_user_balance', {
            p_user_id: selectedPlayerId,
            p_new_balance: newBalance
        });

        if (update.error) throw new Error(update.error.message);
        if (update.data && update.data.success === false) {
            throw new Error(update.data.error || 'Falha ao atualizar saldo');
        }

        try {
            await sb.from('balance_adjustments').insert({
                user_id: selectedPlayerId,
                admin_id: currentAdmin.id || null,
                operation: operation,
                amount: amount,
                balance_before: currentBalance,
                balance_after: newBalance,
                notes: notes || null
            });
        } catch (e) { /* tabela pode não existir ainda */ }
    }

    async function confirmAdjust() {
        if (!selectedPlayerId) return;

        var amountInput = activeTab === 'add' ? $('addAmount') : $('removeAmount');
        var amount = parseFloat(amountInput.value);
        if (!amount || amount <= 0) {
            showBanner('Informe um valor maior que zero.', 'error');
            return;
        }

        var notes = $('adjustNotes').value.trim();
        var btn = $('btnConfirmAdjust');
        var rpcName = activeTab === 'add' ? 'admin_add_user_balance' : 'admin_remove_user_balance';
        var successMsg = activeTab === 'add'
            ? 'Saldo adicionado: ' + fmt.format(amount)
            : 'Saldo removido: ' + fmt.format(amount);

        btn.disabled = true;
        btn.textContent = 'Salvando…';

        try {
            var rpc = await sb.rpc(rpcName, {
                p_user_id: selectedPlayerId,
                p_amount: amount,
                p_admin_id: currentAdmin.id || null,
                p_notes: notes || null
            });

            if (!rpc.error && rpc.data && rpc.data.success) {
                showBanner(successMsg, 'success');
                await loadPlayers();
                await loadHistory(selectedPlayerId);
                var updated = allPlayers.find(function (p) { return p.id === selectedPlayerId; });
                if (updated) {
                    $('modalUserLabel').textContent = (updated.full_name || updated.username) + ' — saldo atual: ' + fmt.format(parseFloat(updated.balance) || 0);
                }
                amountInput.value = '';
                $('adjustNotes').value = '';
                return;
            }

            if (rpc.data && rpc.data.error) {
                throw new Error(rpc.data.error);
            }

            await adjustBalanceFallback(activeTab, amount, notes);
            showBanner(successMsg + ' (sem RPC completa — execute painel-rpc.sql)', 'success');
            await loadPlayers();
            await loadHistory(selectedPlayerId);
            amountInput.value = '';
            $('adjustNotes').value = '';
        } catch (err) {
            showBanner(err.message || 'Erro ao ajustar saldo', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = activeTab === 'add' ? 'Adicionar saldo' : 'Remover saldo';
        }
    }

    $('adminName').textContent = currentAdmin.full_name || currentAdmin.email || 'Admin';
    $('btnLogout').addEventListener('click', function () {
        localStorage.removeItem('admin_user');
        window.location.href = '/painel/login';
    });
    $('btnRefresh').addEventListener('click', loadPlayers);
    $('searchInput').addEventListener('input', function () {
        renderTable(filterPlayers($('searchInput').value));
    });
    $('btnConfirmAdjust').addEventListener('click', confirmAdjust);

    document.querySelectorAll('.modal-tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
            setActiveTab(tab.getAttribute('data-tab'));
        });
    });

    document.querySelectorAll('[data-close]').forEach(function (el) {
        el.addEventListener('click', closeModal);
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeModal();
    });

    loadPlayers();
})();
