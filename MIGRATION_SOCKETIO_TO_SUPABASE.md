# Migração de Socket.IO para Supabase Realtime

## Resumo das Mudanças

Este documento descreve a migração completa do sistema de Socket.IO para Supabase Realtime para as animações em tempo real do lançamento de dados.

## Arquivos Modificados

### 1. **package.json**
- ❌ Removido: `"socket.io": "^4.7.5"`
- ✅ Mantido: Apenas Express para servir arquivos estáticos

### 2. **server.js**
- ❌ Removido: Todo código Socket.IO (conexões, salas, turnos)
- ✅ Simplificado: Apenas servidor Express básico
- ✅ Adicionado: Endpoint `/health` para verificação

### 3. **game/index.html**
- ❌ Removido: `<script src="/socket.io/socket.io.js"></script>`
- ✅ Adicionado: `<script src="js/supabase-realtime-dice.js"></script>`

### 4. **game/js/realtime.js**
- ❌ Removido: Toda lógica Socket.IO
- ✅ Refatorado: Usar apenas Supabase Realtime
- ✅ Mantido: Mesma interface pública para compatibilidade

### 5. **game/js/CGame.js**
- ❌ Removido: `Realtime.getSocket()`
- ✅ Atualizado: `Realtime.isConnected()`
- ✅ Melhorado: Tratamento de erros com Promises

## Novos Arquivos

### 1. **supabase-realtime-setup.sql**
- Estrutura completa das tabelas `game_moves` e `current_turn`
- Funções PL/pgSQL para gerenciar lançamentos e turnos
- Políticas RLS para segurança
- Triggers para timestamps automáticos

### 2. **game/js/supabase-realtime-dice.js**
- Gerenciador principal do Supabase Realtime
- Controle de canais e subscriptions
- Lógica de turnos e animações
- Sistema de presença para contagem de jogadores

### 3. **SUPABASE_REALTIME_SETUP.md**
- Documentação completa do novo sistema
- Exemplos de uso das funções
- Guia de troubleshooting

### 4. **MIGRATION_SOCKETIO_TO_SUPABASE.md**
- Este arquivo de migração

## Fluxo de Dados Antes vs Depois

### Antes (Socket.IO)
```
Cliente → Socket.IO → Servidor Node.js → Memória → Broadcast → Clientes
```

### Depois (Supabase Realtime)
```
Cliente → Supabase RPC → PostgreSQL → Realtime → Todos os Clientes
```

## Vantagens da Migração

### 1. **Persistência**
- Todos os lançamentos ficam salvos no banco de dados
- Histórico completo de partidas
- Recuperação de estado após desconexões

### 2. **Escalabilidade**
- Supabase gerencia conexões automaticamente
- Não há limite de salas simultâneas
- Balanceamento automático de carga

### 3. **Confiabilidade**
- Estado sempre consistente entre todos os clientes
- Recuperação automática de falhas
- Transações ACID no PostgreSQL

### 4. **Simplicidade**
- Menos código de servidor para manter
- Lógica de negócio no banco (PL/pgSQL)
- Autenticação integrada

### 5. **Observabilidade**
- Logs automáticos no Supabase Dashboard
- Métricas de performance incluídas
- Monitoramento de conexões em tempo real

## Passos para Deploy

### 1. **Configurar Banco de Dados**
```sql
-- Execute o arquivo supabase-realtime-setup.sql no seu projeto Supabase
\i supabase-realtime-setup.sql
```

### 2. **Habilitar Realtime**
No Supabase Dashboard:
- Vá para Settings → API
- Habilite Realtime para as tabelas `game_moves` e `current_turn`

### 3. **Instalar Dependências**
```bash
npm install  # Apenas Express agora
```

### 4. **Testar Localmente**
```bash
npm run dev
# Acesse http://localhost:3000
```

### 5. **Deploy**
- O servidor agora é apenas arquivos estáticos + Express
- Pode ser deployado em qualquer plataforma (Vercel, Netlify, etc.)
- Não precisa de servidor Node.js complexo

## Compatibilidade

### Interface Pública Mantida
O arquivo `realtime.js` mantém a mesma interface:
```javascript
// Estas funções continuam funcionando igual
Realtime.init()
Realtime.join(room)
Realtime.requestRoll()
Realtime.leave()
```

### Mudanças Internas
- `getSocket()` → `isConnected()`
- Callbacks síncronos → Promises assíncronas
- IDs de socket → UUIDs de usuário

## Rollback (se necessário)

Para voltar ao Socket.IO:
1. Restaurar `package.json` anterior
2. Restaurar `server.js` anterior  
3. Restaurar `game/index.html` anterior
4. Restaurar `game/js/realtime.js` anterior
5. `npm install` para reinstalar Socket.IO

## Testes Recomendados

### 1. **Funcionalidade Básica**
- [ ] Login de usuário
- [ ] Entrada em salas
- [ ] Lançamento de dados
- [ ] Animações sincronizadas
- [ ] Mudança de turnos

### 2. **Cenários de Stress**
- [ ] Múltiplos jogadores simultâneos
- [ ] Desconexões/reconexões
- [ ] Salas cheias
- [ ] Lançamentos rápidos consecutivos

### 3. **Edge Cases**
- [ ] Usuário sai durante sua vez
- [ ] Timeout de turno
- [ ] Múltiplas abas do mesmo usuário
- [ ] Conexão instável

## Monitoramento

### Métricas Importantes
- Latência de lançamentos (< 500ms)
- Taxa de sucesso de animações (> 99%)
- Tempo de sincronização entre clientes (< 200ms)
- Erros de RPC (< 1%)

### Logs para Acompanhar
- Erros de autenticação
- Falhas de RPC
- Desconexões de Realtime
- Timeouts de turno

## Suporte

Para problemas:
1. Verificar logs no Supabase Dashboard
2. Confirmar configuração de Realtime
3. Testar políticas RLS
4. Verificar autenticação de usuários

A migração está completa e o sistema agora usa exclusivamente Supabase Realtime para todas as funcionalidades multiplayer em tempo real.