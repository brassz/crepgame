# Sistema Híbrido de Realtime: Supabase + Socket.IO

## Visão Geral

Este projeto agora implementa um sistema híbrido que combina **Supabase Realtime** para persistência de estado do jogo com **Socket.IO** para comunicação instantânea, chat e notificações. Esta abordagem oferece o melhor dos dois mundos:

- **Supabase Realtime**: Gerencia estado do jogo, dados persistentes, turnos e lançamentos de dados
- **Socket.IO**: Fornece chat em tempo real, notificações instantâneas e estatísticas de lobby

## Arquitetura do Sistema

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Cliente Web   │    │   Servidor       │    │   Supabase      │
│                 │    │   Node.js        │    │   PostgreSQL    │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ Hybrid Manager  │◄──►│ Socket.IO Server │    │ Realtime API    │
│ Socket.IO Client│    │ Express Server   │    │ Auth & Database │
│ Supabase Client │◄───┼──────────────────┼───►│ RLS Policies    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Responsabilidades dos Sistemas

### Supabase Realtime
- ✅ **Estado do Jogo**: Turnos, lançamentos de dados, apostas
- ✅ **Persistência**: Todos os dados salvos no PostgreSQL
- ✅ **Autenticação**: Login/logout de usuários
- ✅ **Sincronização**: Estado consistente entre todos os clientes
- ✅ **Recuperação**: Jogadores podem reconectar e ver estado atual

### Socket.IO
- ✅ **Chat em Tempo Real**: Mensagens instantâneas entre jogadores
- ✅ **Indicadores de Digitação**: Mostra quando alguém está digitando
- ✅ **Notificações**: Alertas sobre eventos do jogo
- ✅ **Estatísticas de Lobby**: Contadores de jogadores online
- ✅ **Presença**: Detecta quando jogadores entram/saem das salas
- ✅ **Reconexão Automática**: Mantém conexão estável

## Arquivos do Sistema

### Servidor (Node.js)
- **`server.js`**: Servidor híbrido com Express + Socket.IO
- **`package.json`**: Dependências atualizadas com Socket.IO

### Cliente (JavaScript)
- **`socketio-client.js`**: Cliente Socket.IO com reconexão automática
- **`hybrid-realtime-manager.js`**: Coordenador entre os dois sistemas
- **`realtime.js`**: Interface unificada (atualizada para híbrido)
- **`supabase-*.js`**: Módulos Supabase existentes (mantidos)

## Fluxo de Dados

### 1. Lançamento de Dados
```
Jogador clica "Roll" → Supabase RPC → PostgreSQL → Supabase Realtime → Todos os clientes
                                                 ↓
                    Socket.IO notification → Chat: "Dados rolando..."
```

### 2. Chat de Sala
```
Jogador digita → Socket.IO Client → Socket.IO Server → Broadcast → Todos na sala
```

### 3. Entrada na Sala
```
Jogador entra → Hybrid Manager → Supabase (estado) + Socket.IO (presença)
                              ↓                    ↓
                         Junta à sessão      Junta ao chat
```

## Interface do Usuário

### Chat Interface
- **Posição**: Canto inferior direito
- **Funcionalidades**:
  - Mensagens em tempo real
  - Histórico de mensagens (últimas 20)
  - Indicador de digitação
  - Botão de minimizar/expandir
  - Mensagens do sistema (entradas/saídas)

### Indicador de Status
- **Posição**: Canto superior direito
- **Mostra**:
  - Status Supabase (verde/vermelho/laranja)
  - Status Socket.IO (verde/vermelho/laranja)
  - Tooltips com detalhes de erro

### Estatísticas de Lobby
- **Jogadores online totais**
- **Jogadores por sala**
- **Atualização automática a cada 30 segundos**

## Eventos do Sistema

### Socket.IO Events (Cliente → Servidor)
```javascript
// Autenticação
socket.emit('authenticate', { userId, username, roomId });

// Chat
socket.emit('chat_message', { message });
socket.emit('typing_start');
socket.emit('typing_stop');

// Notificações
socket.emit('notify_room', { type, data });

// Lobby
socket.emit('join_lobby');
socket.emit('leave_lobby');
```

### Socket.IO Events (Servidor → Cliente)
```javascript
// Autenticação
socket.on('authenticated', callback);

// Chat
socket.on('chat_message', callback);
socket.on('chat_history', callback);
socket.on('user_typing', callback);
socket.on('user_stopped_typing', callback);

// Usuários
socket.on('user_joined', callback);
socket.on('user_left', callback);
socket.on('room_users', callback);

// Lobby
socket.on('lobby_stats', callback);

// Notificações
socket.on('room_notification', callback);
```

## Configuração e Instalação

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar Supabase
- Certifique-se de que as tabelas estão criadas (`supabase-realtime-setup.sql`)
- Habilite Realtime para as tabelas necessárias
- Configure as políticas RLS

### 3. Iniciar Servidor
```bash
npm start
# ou
npm run dev
```

### 4. Verificar Funcionamento
- Acesse `/health` para ver status dos sistemas
- Abra múltiplas abas para testar chat
- Verifique logs do console para debug

## Vantagens do Sistema Híbrido

### 1. **Confiabilidade**
- Se um sistema falha, o outro continua funcionando
- Supabase garante persistência mesmo com Socket.IO offline
- Socket.IO oferece comunicação mesmo com Supabase lento

### 2. **Performance**
- Socket.IO: Latência ultra-baixa para chat (~50ms)
- Supabase: Consistência garantida para estado do jogo
- Cada sistema otimizado para sua função específica

### 3. **Escalabilidade**
- Socket.IO: Milhares de conexões simultâneas
- Supabase: Escala automaticamente com demanda
- Balanceamento natural de carga

### 4. **Experiência do Usuário**
- Chat instantâneo melhora engajamento
- Notificações em tempo real mantêm jogadores informados
- Reconexão automática reduz frustrações
- Interface rica com indicadores visuais

## Monitoramento e Debug

### Logs do Servidor
```bash
# Socket.IO connections
Socket connected: abc123
User authenticated: João (user-id) in room bronze

# Chat messages
Chat message in room bronze: João: Boa sorte pessoal!

# Disconnections
Socket disconnected: abc123 (transport close)
```

### Console do Cliente
```javascript
// Verificar status
console.log('Supabase:', window.SupabaseRealtimeDice.isConnected());
console.log('Socket.IO:', window.SocketIOClient.isConnected);

// Testar chat
window.SocketIOClient.sendChatMessage('Teste de mensagem');

// Verificar usuários na sala
console.log('Current room:', window.HybridRealtimeManager.currentRoom);
```

### Endpoints de Debug
- **`GET /health`**: Status geral dos sistemas
- **Console do navegador**: Logs detalhados de conexão
- **Supabase Dashboard**: Logs de Realtime e RPC calls

## Troubleshooting

### Chat não funciona
1. Verificar se Socket.IO está conectado (indicador verde)
2. Confirmar autenticação: `window.SocketIOClient.currentUserId`
3. Verificar logs do servidor para erros de conexão

### Supabase não sincroniza
1. Verificar políticas RLS no dashboard
2. Confirmar que Realtime está habilitado nas tabelas
3. Verificar autenticação: `window.sb.auth.getUser()`

### Reconexão não funciona
1. Verificar configuração de CORS no servidor
2. Confirmar que `reconnection: true` no Socket.IO
3. Verificar logs de rede no DevTools

## Próximos Passos

### Funcionalidades Futuras
- [ ] **Salas Privadas**: Criação de salas com senha
- [ ] **Chat de Voz**: Integração com WebRTC
- [ ] **Emojis e Reações**: Sistema de reações rápidas
- [ ] **Moderação**: Sistema de kick/ban para administradores
- [ ] **Histórico Persistente**: Salvar chat no banco de dados
- [ ] **Push Notifications**: Notificações no navegador
- [ ] **Mobile App**: Versão nativa com Socket.IO

### Otimizações
- [ ] **Redis**: Cache para sessões Socket.IO
- [ ] **Clustering**: Múltiplas instâncias do servidor
- [ ] **CDN**: Servir arquivos estáticos via CDN
- [ ] **Compression**: Gzip para Socket.IO messages
- [ ] **Rate Limiting**: Prevenção de spam no chat

O sistema híbrido está agora implementado e pronto para uso em produção! 🚀