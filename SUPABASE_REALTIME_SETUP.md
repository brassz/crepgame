# Supabase Realtime Setup para Animações de Dados

Este documento explica como configurar e usar o sistema Supabase Realtime para substituir o Socket.IO no jogo de dados.

## Estrutura das Tabelas

### 1. Tabela `game_moves`
Armazena todos os lançamentos de dados e controla as animações:

```sql
- id: BIGSERIAL (chave primária)
- room_id: TEXT (identificador da sala)
- player_id: UUID (ID do jogador que lançou)
- dice_1: INTEGER (resultado do primeiro dado, 1-6)
- dice_2: INTEGER (resultado do segundo dado, 1-6)
- total: INTEGER (soma automática dos dados)
- phase: TEXT (fase do jogo: 'come_out' ou 'point')
- result: TEXT (resultado: 'win', 'lose', 'continue', etc.)
- animation_started: BOOLEAN (se a animação começou)
- animation_completed: BOOLEAN (se a animação terminou)
- created_at: TIMESTAMP (quando foi criado)
- updated_at: TIMESTAMP (última atualização)
```

### 2. Tabela `current_turn`
Gerencia o estado atual dos turnos em cada sala:

```sql
- room_id: TEXT (chave primária, identificador da sala)
- current_player_id: UUID (jogador atual)
- player_index: INTEGER (índice do jogador, base 1)
- total_players: INTEGER (total de jogadores na sala)
- turn_starts_at: TIMESTAMP (quando o turno começou)
- turn_ends_at: TIMESTAMP (quando o turno expira)
- is_active: BOOLEAN (se o turno está ativo)
- last_roll_id: BIGINT (referência ao último lançamento)
- created_at: TIMESTAMP (quando foi criado)
- updated_at: TIMESTAMP (última atualização)
```

## Funções Supabase

### 1. `handle_dice_roll()`
Processa um lançamento de dados e avança para o próximo jogador:

```javascript
window.sb.rpc('handle_dice_roll', {
    p_room_id: 'bronze',
    p_dice_1: 3,
    p_dice_2: 4,
    p_phase: 'come_out',
    p_result: 'continue'
});
```

### 2. `join_room_turn_cycle()`
Inicia ou entra no ciclo de turnos de uma sala:

```javascript
window.sb.rpc('join_room_turn_cycle', {
    p_room_id: 'bronze'
});
```

### 3. `complete_dice_animation()`
Marca uma animação como completa:

```javascript
window.sb.rpc('complete_dice_animation', {
    p_move_id: 123
});
```

## Como Usar no Cliente

### 1. Inicialização
```javascript
// O sistema é inicializado automaticamente quando a página carrega
// Mas você pode inicializar manualmente se necessário
window.Realtime.init().then(function() {
    console.log('Realtime initialized');
});
```

### 2. Entrar em uma Sala
```javascript
window.Realtime.join('bronze').then(function(result) {
    console.log('Joined room successfully:', result);
}).catch(function(error) {
    console.error('Failed to join room:', error);
});
```

### 3. Solicitar Lançamento de Dados
```javascript
// Só funciona se for sua vez
window.Realtime.requestRoll().then(function(result) {
    console.log('Dice rolled:', result);
}).catch(function(error) {
    console.error('Failed to roll dice:', error);
});
```

### 4. Sair da Sala
```javascript
window.Realtime.leave().then(function() {
    console.log('Left room successfully');
});
```

## Eventos em Tempo Real

O sistema escuta automaticamente os seguintes eventos:

### 1. Novos Lançamentos (`game_moves` INSERT)
Quando um jogador lança os dados, todos os outros jogadores recebem:
- Início da animação via `onDiceRollStart()`
- Resultado após 1.5s via `onServerRoll()`

### 2. Mudanças de Turno (`current_turn` UPDATE)
Quando o turno muda, todos os jogadores recebem:
- Atualização via `onTurnUpdate()`
- Timer de contagem regressiva

### 3. Presença de Jogadores
Via Supabase Presence:
- Quando jogadores entram/saem da sala
- Atualização do contador de jogadores

## Configuração das Salas

As salas mantêm a mesma configuração do sistema anterior:

```javascript
const ROOM_CONFIGS = {
    bronze: { name: 'BRONZE', min_bet: 50, max_bet: 1000, max_players: 8, banker: true },
    prata: { name: 'PRATA', min_bet: 100, max_bet: 3000, max_players: 8, banker: true },
    ouro: { name: 'OURO', min_bet: 200, max_bet: 5000, max_players: 8, banker: true }
};
```

## Fluxo de Animação

1. **Jogador solicita lançamento**: `requestRoll()`
2. **Servidor processa**: Função `handle_dice_roll()`
3. **Banco insere movimento**: Tabela `game_moves`
4. **Realtime notifica**: Todos os clientes recebem INSERT
5. **Animação inicia**: `onDiceRollStart()` chamado
6. **Resultado enviado**: Após 1.5s, `onServerRoll()` chamado
7. **Turno avança**: Tabela `current_turn` atualizada
8. **Próximo jogador**: `onTurnUpdate()` chamado

## Vantagens sobre Socket.IO

1. **Persistência**: Todos os lançamentos ficam salvos no banco
2. **Escalabilidade**: Supabase gerencia as conexões automaticamente
3. **Sincronização**: Estado sempre consistente entre clientes
4. **Recuperação**: Jogadores que entram tarde veem o estado atual
5. **Simplicidade**: Menos código de servidor para manter

## Instalação

1. Execute o SQL em `supabase-realtime-setup.sql` no seu projeto Supabase
2. Configure as políticas RLS conforme necessário
3. Certifique-se de que o Realtime está habilitado para as tabelas
4. O cliente já está configurado nos arquivos JavaScript

## Troubleshooting

### Erro "Not your turn"
- Verifique se é realmente sua vez na tabela `current_turn`
- Confirme se o usuário está autenticado

### Animações não sincronizadas
- Verifique se o Realtime está habilitado para `game_moves`
- Confirme se as políticas RLS permitem SELECT para todos os jogadores da sala

### Timer não funcionando
- Verifique se `current_turn` tem Realtime habilitado
- Confirme se `turn_ends_at` está sendo definido corretamente