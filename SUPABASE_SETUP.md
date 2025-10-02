# Configuração do Supabase para Jogo Multiplayer

Este guia explica como configurar o banco de dados Supabase para funcionar com o sistema multiplayer do jogo de dados.

## 📋 Pré-requisitos

1. **Conta no Supabase**: Crie uma conta em [supabase.com](https://supabase.com)
2. **Projeto Supabase**: Crie um novo projeto
3. **Credenciais**: Anote a URL do projeto e a chave anon (encontradas em Settings → API)

## 🚀 Passos de Configuração

### 1. Execute o Script de Configuração do Banco

1. Acesse seu projeto Supabase
2. Vá para **SQL Editor** no painel lateral
3. Cole todo o conteúdo do arquivo `database-setup.sql`
4. Clique em **Run** para executar o script

O script criará:
- ✅ Tabelas necessárias para o jogo multiplayer
- ✅ 15 salas (5 de cada tipo: Bronze, Prata, Ouro) com IDs únicos
- ✅ Funções para gerenciar salas e jogadores
- ✅ Políticas de segurança (RLS)
- ✅ Triggers para atualizações em tempo real

### 2. Configurar as Credenciais

Atualize o arquivo `game/js/auth-config.js` com suas credenciais:

```javascript
window.SUPABASE_URL = "SUA_URL_DO_SUPABASE"; 
window.SUPABASE_ANON_KEY = "SUA_CHAVE_ANON_DO_SUPABASE";
```

### 3. Verificar a Instalação

Após executar o script, execute esta consulta no SQL Editor para verificar:

```sql
SELECT 
    room_type,
    count(*) as total_salas,
    string_agg(room_name, ', ' ORDER BY room_name) as nomes_salas
FROM public.game_rooms 
GROUP BY room_type 
ORDER BY room_type;
```

Você deve ver algo como:
```
bronze | 5 | BRONZE-001, BRONZE-002, BRONZE-003, BRONZE-004, BRONZE-005
ouro   | 5 | OURO-001, OURO-002, OURO-003, OURO-004, OURO-005  
prata  | 5 | PRATA-001, PRATA-002, PRATA-003, PRATA-004, PRATA-005
```

## 🎮 Como Funcionam as Salas

### Sistema de Salas Únicas

Cada tipo de sala (Bronze, Prata, Ouro) possui múltiplas instâncias com IDs únicos:

- **BRONZE-001, BRONZE-002, etc.** - Limite: R$50 - R$1.000
- **PRATA-001, PRATA-002, etc.** - Limite: R$100 - R$3.000  
- **OURO-001, OURO-002, etc.** - Limite: R$200 - R$5.000

### Distribuição Automática

Quando um jogador escolhe entrar numa sala "Bronze", o sistema:
1. Procura a sala Bronze com menos jogadores
2. Atribui o jogador à sala encontrada
3. Retorna os dados da sala específica (ex: "BRONZE-003")

### Limite de Jogadores

- Máximo: 8 jogadores por sala
- Se uma sala estiver cheia, o jogador é direcionado para a próxima disponível
- Se todas estiverem cheias, retorna erro "Nenhuma sala disponível"

## 🔄 Funcionalidades em Tempo Real

### Eventos Sincronizados

- **Entrada/saída de jogadores** - Atualização imediata do contador
- **Apostas** - Todas as apostas são registradas e sincronizadas
- **Rolagem de dados** - Resultados compartilhados em tempo real
- **Mudanças de turno** - Sistema de turnos automático

### Dados Persistentes

- **Histórico completo** de jogadas por sessão
- **Apostas** com status (ativa, ganha, perdida)
- **Saldos** atualizados automaticamente
- **Estatísticas** de jogo por jogador

## 🛠 Funções Principais

### `join_room(room_type, socket_id)`
- Entra numa sala do tipo especificado
- Retorna informações da sala atribuída
- Configura sessão de jogo ativa

### `leave_room()`
- Sai da sala atual
- Atualiza contador de jogadores
- Limpa sessão ativa

### `place_bet(game_session_id, bet_type, bet_amount)`
- Registra uma aposta na sessão atual
- Valida saldo e limites da sala
- Deduz valor do saldo do jogador

### `record_dice_roll(game_session_id, die1, die2, phase, result)`
- Registra resultado dos dados
- Atualiza estado da sessão
- Gera evento em tempo real

## 🔒 Segurança

### Row Level Security (RLS)
- Jogadores só veem dados de suas salas ativas
- Apostas próprias podem ser gerenciadas
- Perfis são protegidos por usuário

### Validação de Dados
- Limites de apostas por tipo de sala
- Verificação de saldo antes das apostas
- Validação de dados dos dados (1-6)

## 🚦 Status do Sistema

Para verificar o status das salas em tempo real:

```sql
SELECT 
    room_name,
    room_type,
    current_players,
    max_players,
    (max_players - current_players) as vagas_livres,
    is_active
FROM public.game_rooms 
WHERE is_active = true
ORDER BY room_type, room_name;
```

## ⚡ Exemplo de Uso no Frontend

```javascript
// Inicializar sistema
await SupabaseMultiplayer.init();

// Entrar numa sala bronze
const result = await SupabaseMultiplayer.joinRoom('bronze');
console.log('Entrou na sala:', result.room.room_name); // Ex: "BRONZE-003"

// Fazer uma aposta
await SupabaseMultiplayer.placeBet('pass_line', 100);

// Registrar jogada de dados
await SupabaseMultiplayer.recordDiceRoll(3, 4, 'come_out', 'natural');

// Sair da sala
await SupabaseMultiplayer.leaveRoom();
```

## 📊 Monitoramento

### Estatísticas em Tempo Real

```javascript
// Obter estatísticas das salas
const stats = await SupabaseMultiplayer.getRoomStats();
console.log(stats);
// {
//   bronze: { total_rooms: 5, total_players: 12, available_spots: 28 },
//   prata: { total_rooms: 5, total_players: 8, available_spots: 32 },
//   ouro: { total_rooms: 5, total_players: 3, available_spots: 37 }
// }
```

## 🐛 Troubleshooting

### Problemas Comuns

1. **"Profile not found"** - Usuário não autenticado no Supabase
2. **"No available rooms"** - Todas as salas do tipo estão cheias
3. **"Not authorized"** - Tentativa de ação sem estar na sessão
4. **"Insufficient balance"** - Saldo insuficiente para aposta

### Logs de Debug

Os eventos são logados na tabela `game_events`:

```sql
SELECT * FROM public.game_events 
ORDER BY created_at DESC 
LIMIT 20;
```

## ✅ Checklist de Verificação

- [ ] Script `database-setup.sql` executado com sucesso
- [ ] 15 salas criadas (5 de cada tipo)
- [ ] Credenciais configuradas em `auth-config.js`
- [ ] Funções testadas no SQL Editor
- [ ] Real-time habilitado nas tabelas necessárias
- [ ] RLS configurado e funcionando

## 🚀 Executar o Jogo

Após a configuração, inicie o servidor e teste:

```bash
npm run dev
```

Acesse `http://localhost:3000` e entre numa sala para testar o sistema multiplayer!

---

**🎯 Resultado**: Sistema de salas totalmente funcional com IDs únicos, distribuição automática, e sincronização em tempo real através do Supabase!