-- Correção das políticas RLS para permitir que todos os jogadores vejam os lançamentos de dados
-- Este arquivo corrige o problema onde o lançamento de dados do jogador 1 não aparece para outros jogadores

-- 1. Verificar políticas atuais
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('game_moves', 'current_turn');

-- 2. Recriar política para game_moves - permitir que todos os jogadores da sala vejam todos os movimentos
DROP POLICY IF EXISTS "Users can view moves in their room" ON public.game_moves;

CREATE POLICY "Users can view moves in their room" ON public.game_moves
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.room_sessions rs 
            WHERE rs.user_id = auth.uid() 
            AND rs.room_id = game_moves.room_id 
            AND rs.is_active = true
        )
    );

-- 3. Garantir que a política de inserção está correta
DROP POLICY IF EXISTS "Users can insert their own moves" ON public.game_moves;

CREATE POLICY "Users can insert their own moves" ON public.game_moves
    FOR INSERT WITH CHECK (
        auth.uid() = player_id AND
        EXISTS (
            SELECT 1 FROM public.room_sessions rs 
            WHERE rs.user_id = auth.uid() 
            AND rs.room_id = game_moves.room_id 
            AND rs.is_active = true
        )
    );

-- 4. Verificar se o realtime está habilitado para a tabela game_moves
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'game_moves';

-- 5. Se não estiver habilitado, habilitar o realtime
-- (Execute apenas se a query acima não retornar resultado)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.game_moves;

-- 6. Verificar se as colunas necessárias existem na tabela game_moves
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'game_moves' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7. Testar a política com uma query de exemplo
-- (Substitua 'bronze' pela sala que está testando)
SELECT id, room_id, player_id, dice_1, dice_2, created_at
FROM public.game_moves 
WHERE room_id = 'bronze'
ORDER BY created_at DESC 
LIMIT 5;

-- 8. Verificar se há jogadores ativos na sala
SELECT room_id, user_id, is_active, joined_at 
FROM public.room_sessions 
WHERE room_id = 'bronze' 
AND is_active = true;

-- 9. Verificar se a função handle_dice_roll_simple existe
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'handle_dice_roll_simple';

-- 10. Verificar permissões da função
SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args, proacl
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname = 'handle_dice_roll_simple';