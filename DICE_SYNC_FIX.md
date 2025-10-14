# 🎲 CORREÇÃO: Sincronização de Dados Entre Jogadores

## 🐛 Problema Identificado

O erro que estava ocorrendo era:
```
Error: Could not find the function public.handle_dice_roll_simple(p_dice_1, p_dice_2, p_room_id) in the schema cache
```

## ✅ Solução Implementada

### 1. Função Criada
Foi adicionada a função `handle_dice_roll_simple` que estava faltando no banco de dados. Esta função:

- ✅ Valida se é o turno do jogador
- ✅ Registra a jogada na tabela `game_moves`
- ✅ Atualiza o turno para o próximo jogador
- ✅ Retorna os dados da jogada para sincronização

### 2. Arquivos Modificados

#### `complete-database-setup.sql`
- ➕ Adicionada função `handle_dice_roll_simple`
- ➕ Adicionada permissão `GRANT EXECUTE` para a nova função

## 🚀 Como Aplicar a Correção

### Opção 1: Executar Função Específica (Recomendado)
Execute apenas esta função no SQL Editor do Supabase:

```sql
-- Função simplificada para lançamento de dados (usada pelo supabase-realtime-dice.js)
CREATE OR REPLACE FUNCTION public.handle_dice_roll_simple(
    p_room_id TEXT,
    p_dice_1 INTEGER,
    p_dice_2 INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_player_id UUID;
    v_move_id BIGINT;
    v_current_turn RECORD;
    v_next_player_id UUID;
    v_player_count INTEGER;
    v_next_index INTEGER;
BEGIN
    -- Obter usuário atual
    v_player_id := auth.uid();
    IF v_player_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Verificar se é o turno do jogador
    SELECT * INTO v_current_turn 
    FROM public.current_turn 
    WHERE room_id = p_room_id AND current_player_id = v_player_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Not your turn or invalid room';
    END IF;

    -- Verificar se o turno não expirou
    IF NOW() > v_current_turn.turn_ends_at THEN
        RAISE EXCEPTION 'Turn has expired';
    END IF;

    -- Inserir a jogada dos dados (versão simplificada)
    INSERT INTO public.game_moves (room_id, player_id, dice_1, dice_2, phase, result, animation_started)
    VALUES (p_room_id, v_player_id, p_dice_1, p_dice_2, 'come_out', NULL, true)
    RETURNING id INTO v_move_id;

    -- Obter total de jogadores na sala
    SELECT COUNT(DISTINCT user_id) INTO v_player_count
    FROM public.room_sessions 
    WHERE room_id = p_room_id AND is_active = true;

    -- Calcular próximo jogador
    v_next_index := (v_current_turn.player_index % v_player_count) + 1;
    
    -- Obter ID do próximo jogador
    SELECT user_id INTO v_next_player_id
    FROM (
        SELECT user_id, ROW_NUMBER() OVER (ORDER BY joined_at) as rn
        FROM public.room_sessions 
        WHERE room_id = p_room_id AND is_active = true
    ) ranked_players
    WHERE rn = v_next_index;

    -- Atualizar turno atual para o próximo jogador
    UPDATE public.current_turn 
    SET 
        current_player_id = v_next_player_id,
        player_index = v_next_index,
        total_players = v_player_count,
        turn_starts_at = NOW(),
        turn_ends_at = NOW() + INTERVAL '25 seconds',
        last_roll_id = v_move_id,
        updated_at = NOW()
    WHERE room_id = p_room_id;

    RETURN jsonb_build_object(
        'success', true,
        'move_id', v_move_id,
        'next_player_id', v_next_player_id,
        'next_player_index', v_next_index,
        'total_players', v_player_count,
        'dice_1', p_dice_1,
        'dice_2', p_dice_2,
        'total', p_dice_1 + p_dice_2
    );
END;
$$;

-- Conceder permissão para executar a função
GRANT EXECUTE ON FUNCTION public.handle_dice_roll_simple TO authenticated;
```

### Opção 2: Executar Setup Completo
Se preferir, execute todo o arquivo `complete-database-setup.sql` atualizado.

## 🔍 Como Verificar se Funcionou

### 1. Teste a Função
Execute no SQL Editor:
```sql
SELECT 'handle_dice_roll_simple' as function_name, 
       proname as exists 
FROM pg_proc 
WHERE proname = 'handle_dice_roll_simple';
```

### 2. Teste no Jogo
1. Abra duas abas do navegador
2. Faça login com usuários diferentes
3. Entre na mesma sala
4. Um jogador lança os dados
5. Verifique se o outro jogador vê a animação

## 🎯 Como Funciona a Sincronização

### Fluxo da Sincronização:
1. **Jogador A** clica no botão de dados
2. **Frontend** chama `SupabaseRealtimeDice.requestRoll()`
3. **Função** `handle_dice_roll_simple` é executada
4. **Dados** são inseridos na tabela `game_moves`
5. **Trigger** do Supabase notifica todos os clientes via Realtime
6. **Todos os jogadores** recebem o evento e veem a animação

### Eventos Realtime:
- `postgres_changes` na tabela `game_moves` (INSERT)
- `postgres_changes` na tabela `current_turn` (UPDATE)

## 🐛 Troubleshooting

### Se ainda não funcionar:
1. Verifique se o Realtime está habilitado para as tabelas
2. Confirme que as políticas RLS estão corretas
3. Verifique se os usuários estão na mesma sala
4. Olhe o console do navegador para erros

### Comandos de Verificação:
```sql
-- Verificar se as tabelas têm Realtime habilitado
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- Verificar jogadores ativos em uma sala
SELECT room_id, user_id, is_active, joined_at 
FROM public.room_sessions 
WHERE room_id = 'bronze' AND is_active = true;

-- Verificar últimas jogadas
SELECT * FROM public.game_moves 
ORDER BY created_at DESC 
LIMIT 5;
```

## ✅ Resultado Esperado

Após aplicar esta correção:
- ✅ Não haverá mais erro 404 da função
- ✅ Quando um jogador lança os dados, todos os outros na sala verão
- ✅ A animação será sincronizada entre todos os jogadores
- ✅ O sistema de turnos funcionará corretamente

## 📝 Notas Técnicas

- A função `handle_dice_roll_simple` é uma versão simplificada da `handle_dice_roll`
- Ela foi criada especificamente para o arquivo `supabase-realtime-dice.js`
- Mantém compatibilidade com o sistema existente
- Inclui validação de turnos e segurança RLS