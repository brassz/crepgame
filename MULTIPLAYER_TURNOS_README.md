# Sistema de Turnos Multiplayer - Jogo de Craps

## Funcionalidades Implementadas

### 🎮 **Sistema de Turnos**
- **Turnos automáticos**: Os jogadores jogam em sequência, um por vez
- **Timer de turno**: Cada jogador tem 25 segundos para jogar
- **Auto-pular turno**: Se o tempo acabar, os dados são jogados automaticamente

### 🔔 **Notificações em Tempo Real**

#### **Para o Jogador Ativo**
- **"AGORA É SUA VEZ!"**: Mensagem destacada usando CMsgBox quando for sua vez
- **Contador visual**: ">>> AGORA É SUA VEZ! <<<" no timer de turno
- **Botão habilitado**: Só pode clicar em "LANÇAR" quando for sua vez

#### **Para Outros Jogadores**
- **Visualização das jogadas**: Veem em tempo real quando outro jogador joga
- **Resultados detalhados**: "Jogador X jogou: 3 + 4 = 7"  
- **Status de espera**: "Aguardando outro jogador..."

### 👥 **Sincronização Multiplayer**

#### **Eventos de Sala**
- **Entrada de jogadores**: "Jogador 2 entrou na sala (2/8)"
- **Saída de jogadores**: "Jogador 3 saiu da sala (1 jogadores)"
- **Contadores atualizados**: Número de jogadores em tempo real

#### **Estados de Jogo**
- **Jogador jogando**: "Jogador X está jogando os dados..."
- **Resultados sincronizados**: Todos veem o mesmo resultado simultaneamente
- **Turnos automáticos**: Próximo jogador automaticamente após cada jogada

### 🏠 **Sistema de Salas**
- **Múltiplas salas**: Bronze, Prata e Ouro
- **Limites diferentes**: Cada sala tem min/max de aposta próprios
- **Troca de sala**: Pode trocar entre salas e manter o estado

### 💬 **Interface Visual**

#### **Mensagens de Status**
- **Área de ajuda**: Mostra status atual do jogo
- **Timer de turno**: "TURNO: 15s" (contador regressivo)
- **Mensagens temporárias**: Auto-removidas após alguns segundos

#### **Feedback Visual**
- **CMsgBox**: Mensagens importantes em destaque
- **Estados de botão**: Habilitado/desabilitado conforme o turno
- **Informações da sala**: Nome, jogadores, limites de aposta

## 🔧 **Arquivos Modificados**

### Backend (`server.js`)
- **`emitTurnUpdate()`**: Envia notificação especial para jogador ativo
- **`performRoll()`**: Inclui informações do jogador que jogou
- **Eventos de sala**: `player_joined`, `player_left`, `player_rolling`, `player_rolled`
- **Timer automático**: Gerencia turnos e timeouts

### Frontend 

#### **`realtime.js`**
- **Novos eventos**: `your_turn`, `player_rolling`, `player_rolled`, `player_joined`, `player_left`
- **Conexão aprimorada**: Melhor handling de eventos multiplayer

#### **`CInterface.js`**
- **`showYourTurnMessage()`**: Exibe "AGORA É SUA VEZ!" usando CMsgBox
- **`showPlayerRolling()`**: Mostra quando outro jogador está jogando
- **`showPlayerRolled()`**: Exibe resultado de outros jogadores  
- **`showPlayerJoined/Left()`**: Notificações de entrada/saída
- **`updateTurnTimer()`**: Timer visual do turno

#### **`CGame.js`**
- **`onTurnUpdate()`**: Gerencia estado do turno (minha vez vs aguardando)
- **`onServerRoll()`**: Processa resultados com informação do jogador
- **`showMsgBox()`**: Interface para mensagens destacadas
- **`changeRoom()`**: Troca de sala com reconexão automática

## 🚀 **Como Funciona**

1. **Jogador entra numa sala** → Recebe posição na fila de turnos
2. **Sistema inicia turnos** → Primeiro jogador recebe "AGORA É SUA VEZ!"
3. **Jogador ativo joga** → Todos veem "Jogador X está jogando..."
4. **Dados são lançados** → Todos veem o resultado: "Jogador X jogou: 2 + 5 = 7"
5. **Próximo turno** → Sistema avança para próximo jogador automaticamente
6. **Timer de 25s** → Se não jogar, sistema joga automaticamente

## ⚡ **Principais Benefícios**

- ✅ **Sincronização perfeita**: Todos veem as mesmas jogadas simultaneamente
- ✅ **Notificações claras**: Sempre sabem quando é sua vez
- ✅ **Feedback visual**: Interface indica claramente o estado atual
- ✅ **Sistema robusto**: Handle automático de timeouts e desconexões
- ✅ **Multiplayer real**: Até 8 jogadores por sala
- ✅ **Troca de salas**: Sistema flexível para diferentes níveis

## 🎯 **Experiência do Usuário**

- **Quando for sua vez**: Mensagem destacada + botão habilitado + timer visível
- **Quando não for sua vez**: Vê as jogadas dos outros + mensagens de status
- **Sempre informado**: Sabe quantos jogadores há, quem entrou/saiu, etc.
- **Sem confusão**: Interface clara sobre quem pode jogar quando