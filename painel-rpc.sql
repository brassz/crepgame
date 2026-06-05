-- ============================================
-- PAINEL /painel – RPCs e histórico de saldo
-- Execute no Supabase SQL Editor após custom-users-table.sql e admin-database-setup.sql
-- ============================================

CREATE TABLE IF NOT EXISTS public.balance_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
    amount NUMERIC(12,2) NOT NULL,
    balance_before NUMERIC(12,2) NOT NULL,
    balance_after NUMERIC(12,2) NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN (
        'admin_add', 'admin_remove', 'deposit', 'deposit_approved', 'game_win', 'game_loss'
    )),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_balance_tx_user ON public.balance_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_balance_tx_admin ON public.balance_transactions(admin_id);

ALTER TABLE public.balance_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all balance_transactions" ON public.balance_transactions;
CREATE POLICY "Allow all balance_transactions" ON public.balance_transactions FOR ALL USING (true);

-- Verifica se admin existe e está ativo
CREATE OR REPLACE FUNCTION painel_verify_admin(p_admin_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE id = p_admin_id AND is_active = true
    );
END;
$$;

-- Lista todos os jogadores com saldos e totais
CREATE OR REPLACE FUNCTION painel_list_players(p_admin_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_players JSONB;
BEGIN
    IF NOT painel_verify_admin(p_admin_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Admin não autorizado');
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', u.id,
            'email', u.email,
            'username', u.username,
            'full_name', u.full_name,
            'cpf', u.cpf,
            'balance', u.balance,
            'total_winnings', u.total_winnings,
            'total_losses', u.total_losses,
            'games_played', u.games_played,
            'is_active', u.is_active,
            'created_at', u.created_at,
            'last_login', u.last_login
        ) ORDER BY u.username
    ), '[]'::jsonb)
    INTO v_players
    FROM public.users u;

    RETURN jsonb_build_object('success', true, 'players', v_players);
END;
$$;

-- Adiciona ou remove saldo (p_operation: 'add' | 'remove')
CREATE OR REPLACE FUNCTION painel_adjust_balance(
    p_admin_id UUID,
    p_user_id UUID,
    p_amount NUMERIC,
    p_operation TEXT,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user RECORD;
    v_delta NUMERIC(12,2);
    v_balance_before NUMERIC(12,2);
    v_balance_after NUMERIC(12,2);
    v_tx_type TEXT;
    v_admin_name TEXT;
BEGIN
    IF NOT painel_verify_admin(p_admin_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Admin não autorizado');
    END IF;

    IF p_amount IS NULL OR p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Valor deve ser maior que zero');
    END IF;

    IF p_operation NOT IN ('add', 'remove') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Operação inválida');
    END IF;

    SELECT id, username, balance INTO v_user
    FROM public.users
    WHERE id = p_user_id AND is_active = true
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Jogador não encontrado');
    END IF;

    v_balance_before := v_user.balance;

    IF p_operation = 'add' THEN
        v_delta := ABS(p_amount);
        v_tx_type := 'admin_add';
    ELSE
        v_delta := -ABS(p_amount);
        v_tx_type := 'admin_remove';
    END IF;

    v_balance_after := v_balance_before + v_delta;

    IF v_balance_after < 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Saldo insuficiente. Saldo atual: ' || v_balance_before
        );
    END IF;

    UPDATE public.users
    SET balance = v_balance_after, updated_at = NOW()
    WHERE id = p_user_id;

    INSERT INTO public.balance_transactions (
        user_id, admin_id, amount, balance_before, balance_after, transaction_type, reason
    ) VALUES (
        p_user_id, p_admin_id, v_delta, v_balance_before, v_balance_after, v_tx_type, p_reason
    );

    SELECT full_name INTO v_admin_name FROM public.admin_users WHERE id = p_admin_id;

    INSERT INTO public.admin_logs (admin_id, action_type, description, target_user_id, metadata)
    VALUES (
        p_admin_id,
        v_tx_type,
        COALESCE(p_reason, CASE WHEN p_operation = 'add' THEN 'Adição de saldo' ELSE 'Remoção de saldo' END),
        p_user_id,
        jsonb_build_object(
            'amount', v_delta,
            'balance_before', v_balance_before,
            'balance_after', v_balance_after,
            'admin_name', v_admin_name,
            'username', v_user.username
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'username', v_user.username,
        'balance_before', v_balance_before,
        'balance_after', v_balance_after,
        'amount', v_delta
    );
END;
$$;

-- Histórico de movimentações de saldo do jogador
CREATE OR REPLACE FUNCTION painel_get_balance_history(
    p_admin_id UUID,
    p_user_id UUID,
    p_limit INTEGER DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user RECORD;
    v_history JSONB;
BEGIN
    IF NOT painel_verify_admin(p_admin_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Admin não autorizado');
    END IF;

    SELECT id, username, email, full_name, balance, total_winnings, total_losses
    INTO v_user
    FROM public.users
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Jogador não encontrado');
    END IF;

    SELECT COALESCE(jsonb_agg(row_data ORDER BY sort_at DESC), '[]'::jsonb)
    INTO v_history
    FROM (
        SELECT
            jsonb_build_object(
                'id', bt.id,
                'amount', bt.amount,
                'balance_before', bt.balance_before,
                'balance_after', bt.balance_after,
                'transaction_type', bt.transaction_type,
                'reason', bt.reason,
                'created_at', bt.created_at,
                'admin_name', au.full_name,
                'admin_email', au.email
            ) AS row_data,
            bt.created_at AS sort_at
        FROM public.balance_transactions bt
        LEFT JOIN public.admin_users au ON au.id = bt.admin_id
        WHERE bt.user_id = p_user_id
        ORDER BY bt.created_at DESC
        LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 100), 500))
    ) rows;

    RETURN jsonb_build_object(
        'success', true,
        'user', jsonb_build_object(
            'id', v_user.id,
            'username', v_user.username,
            'email', v_user.email,
            'full_name', v_user.full_name,
            'balance', v_user.balance,
            'total_winnings', v_user.total_winnings,
            'total_losses', v_user.total_losses
        ),
        'history', v_history
    );
END;
$$;

GRANT EXECUTE ON FUNCTION painel_list_players(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION painel_adjust_balance(UUID, UUID, NUMERIC, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION painel_get_balance_history(UUID, UUID, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION painel_verify_admin(UUID) TO anon, authenticated;
