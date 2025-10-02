# Sistema de Sincronização de Animação de Dados

## Visão Geral

Este sistema permite que quando um jogador rola os dados em uma sala multiplayer, a mesma animação seja exibida simultaneamente nas telas de todos os outros jogadores na sala. A implementação utiliza Supabase Realtime para sincronização em tempo real.

## Como Funciona

### 1. Estrutura do Banco de Dados

Foi criada uma nova tabela `game_rolls` especificamente para sincronização de animações:

```sql
CREATE TABLE public.game_rolls (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id UUID REFERENCES public.game_rooms(id) ON DELETE CASCADE,
    game_session_id UUID REFERENCES public.game_sessions(id) ON DELETE CASCADE,
    player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    die1 INTEGER NOT NULL CHECK (die1 >= 1 AND die1 <= 6),
    die2 INTEGER NOT NULL CHECK (die2 >= 1 AND die2 <= 6),
    total INTEGER GENERATED ALWAYS AS (die1 + die2) STORED,
    animation_synced BOOLEAN DEFAULT false,
    rolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Fluxo de Funcionamento

1. **Jogador Rola os Dados**: Quando um jogador clica em "LANÇAR"
2. **Geração dos Valores**: O sistema gera os valores dos dados localmente
3. **Registro Sincronizado**: Os valores são enviados para a tabela `game_rolls` via função `record_synchronized_roll()`
4. **Notificação Realtime**: O Supabase Realtime notifica todos os jogadores da sala
5. **Animação Simultânea**: Todos os jogadores executam a mesma animação com os mesmos valores

### 3. Arquivos Modificados

#### `database-setup.sql`
- Adicionada tabela `game_rolls` para sincronização
- Criada função `record_synchronized_roll()` 
- Configuradas policies de segurança
- Habilitado Realtime na nova tabela

#### `game/js/supabase-multiplayer.js`
- Adicionada função `recordSynchronizedRoll()`
- Criado handler `handleGameRoll()` para eventos realtime
- Configurado subscription para tabela `game_rolls`

#### `game/js/realtime.js` 
- Modificada função `requestRoll()` para usar sincronização
- Primeiro registra o roll sincronizado, depois o roll histórico

#### `game/js/CGame.js`
- Adicionado método `onSynchronizedRoll()` para processar animações sincronizadas
- Mantido `onServerRoll()` original para compatibilidade

### 4. API Utilizada

#### Função Principal
```javascript
// Registra uma rolagem para sincronização de animação
window.SupabaseMultiplayer.recordSynchronizedRoll(die1, die2)
```

#### Callback de Resposta
```javascript
// Método chamado quando uma rolagem sincronizada é recebida
window.s_oGame.onSynchronizedRoll({
    d1: 4,
    d2: 3, 
    total: 7,
    ts: 1633024800000,
    playerName: "João",
    playerId: "uuid-do-jogador"
})
```

## Vantagens

1. **Sincronização Perfeita**: Todos os jogadores veem exatamente a mesma animação
2. **Tempo Real**: Latência mínima usando Supabase Realtime
3. **Identificação do Jogador**: Sistema mostra quem rolou os dados
4. **Fallback Robusto**: Sistema funciona mesmo se alguma parte falhar
5. **Performance**: Dados leves (apenas 2 números + metadata)

## Testando o Sistema

### Pré-requisitos
1. Execute o script `database-setup.sql` no Supabase SQL Editor
2. Certifique-se que as tabelas têm Realtime habilitado
3. Configure as credenciais do Supabase em `auth-config.js`

### Teste Básico
1. Abra o jogo em duas abas/dispositivos diferentes
2. Faça login em ambos
3. Entre na mesma sala (ex: Bronze)  
4. Em uma das abas, faça uma aposta e role os dados
5. Observe que a animação aparece simultaneamente nas duas telas

### Verificação no Console
O sistema registra logs detalhados no console:
```
Synchronized dice roll recorded successfully: {roll: {...}}
Synchronized game roll event: {new: {...}}
Synchronized dice animation triggered: {d1: 4, d2: 3, ...}
```

## Troubleshooting

### Animação não aparece em outros jogadores
- Verifique se todos estão na mesma sala
- Confirme que o Realtime está habilitado nas tabelas
- Verifique os logs do console para erros

### Múltiplas animações
- Se estiver vendo animações duplicadas, pode ser que tanto o sistema antigo quanto o novo estejam ativos
- Desabilite temporariamente o `handleDiceRoll` se necessário

### Problemas de Permissão  
- Verifique se as RLS policies estão configuradas corretamente
- Certifique-se que o usuário está autenticado

## Próximos Passos

1. **Teste com Mais Jogadores**: Verificar performance com 6-8 jogadores
2. **Otimização**: Adicionar debounce para evitar clicks duplos
3. **Indicador Visual**: Mostrar qual jogador está rolando
4. **Histórico Visual**: Manter últimas rolagens visíveis na tela

## Arquitetura Técnica

```
[Jogador A] -> [Clique LANÇAR] -> [Gera Dados] 
                                      ↓
[recordSynchronizedRoll()] -> [Supabase game_rolls] -> [Realtime Broadcast]
                                      ↓
[Jogador B] <- [onSynchronizedRoll()] <- [handleGameRoll()] <- [Realtime Event]
     ↓
[Animação CDicesAnim com mesmos valores]
```

O sistema garante que todos vejam exatamente a mesma sequência de animação com os mesmos resultados, criando uma experiência verdadeiramente sincronizada.