# 🎲 Sistema Multiplayer Offline - Dados da Sorte

## ✨ Características

- **100% Offline**: Funciona sem servidor Node.js
- **Multiplayer Local**: Sincronização entre abas do mesmo navegador
- **Sistema de Turnos**: Cada jogador tem 25 segundos para jogar
- **3 Salas Disponíveis**: Bronze, Prata e Ouro com diferentes limites de aposta
- **Auto-roll**: Se o tempo acabar, os dados são jogados automaticamente

## 🚀 Como Usar

### Método 1: Servidor HTTP Simples (Recomendado)

1. **Iniciar servidor HTTP**:
   ```bash
   cd /workspace
   python3 -m http.server 8000
   ```

2. **Abrir no navegador**:
   - Acesse: `http://localhost:8000/multiplayer-demo.html`
   - Clique em uma das salas (Bronze, Prata ou Ouro)

3. **Testar Multiplayer**:
   - Abra múltiplas abas do jogo
   - Selecione a mesma sala em todas as abas
   - Jogue em turnos - cada jogador tem sua vez!

### Método 2: Direto no Navegador

1. **Abrir arquivo diretamente**:
   - Abra `game/index.html` no navegador
   - Adicione `?room=bronze` (ou `prata`/`ouro`) na URL

2. **Para testar multiplayer**:
   - Abra várias abas com a mesma sala
   - Exemplo: `file:///caminho/para/game/index.html?room=bronze`

## 🎮 Salas Disponíveis

### 🥉 Sala BRONZE
- **Aposta Mínima**: R$ 50
- **Aposta Máxima**: R$ 1.000
- **Máximo de Jogadores**: 8
- **URL**: `?room=bronze`

### 🥈 Sala PRATA
- **Aposta Mínima**: R$ 100
- **Aposta Máxima**: R$ 3.000
- **Máximo de Jogadores**: 8
- **URL**: `?room=prata`

### 🥇 Sala OURO
- **Aposta Mínima**: R$ 200
- **Aposta Máxima**: R$ 5.000
- **Máximo de Jogadores**: 8
- **URL**: `?room=ouro`

## ⚙️ Como Funciona

### Sistema de Sincronização
- Usa `localStorage` para sincronizar dados entre abas
- Cada jogador recebe um ID único
- Eventos são compartilhados em tempo real entre abas

### Sistema de Turnos
- Jogadores jogam em ordem de entrada na sala
- Cada turno dura 25 segundos
- Auto-roll se o tempo esgotar
- Turnos são reorganizados quando jogadores saem

### Dados Sincronizados
- Contagem de jogadores por sala
- Resultado dos dados
- Vez de cada jogador
- Timer de turnos

## 🔧 Arquivos Modificados

### `game/js/realtime.js`
- Sistema multiplayer local completo
- Gerenciamento de salas e turnos
- Sincronização via localStorage

### `game/js/CGame.js`
- Detecção automática de sala via URL
- Integração com sistema offline

### `game/index.html`
- Removida dependência do Socket.IO
- Sistema funciona completamente offline

## 🎯 Testando o Multiplayer

1. **Abra a página de demonstração**:
   ```
   http://localhost:8000/multiplayer-demo.html
   ```

2. **Clique em uma sala** (ex: Bronze)

3. **Abra mais abas**:
   - Clique com botão direito na mesma sala
   - Selecione "Abrir link em nova aba"

4. **Observe a sincronização**:
   - Contador de jogadores atualiza automaticamente
   - Turnos alternam entre as abas
   - Resultados dos dados são compartilhados

## ⚠️ Limitações

- **Mesmo Navegador**: Funciona apenas entre abas do mesmo navegador
- **localStorage**: Dados são perdidos ao limpar cache do navegador
- **Sem Persistência**: Jogadores saem ao fechar a aba

## 🎉 Vantagens

- **Sem Servidor**: Não precisa de infraestrutura
- **Rápido**: Sincronização instantânea
- **Simples**: Fácil de usar e testar
- **Confiável**: Funciona offline completamente

---

**🎲 Divirta-se jogando Dados da Sorte em modo multiplayer offline!**