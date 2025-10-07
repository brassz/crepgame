# Demonstração: Sistema de Apostas dos Jogadores

## Funcionalidades Implementadas

### 1. Painel de Jogadores
- **Localização**: Canto superior esquerdo da tela
- **Dimensões**: 280x200 pixels
- **Estilo**: Fundo preto semi-transparente com borda dourada

### 2. Informações Exibidas
Para cada jogador, o painel mostra:
- **Nome do jogador**: Ex: "Jogador 1", "Maria Silva", "Você"
- **Valor apostado**: Ex: "100.00€", "250.00€"
- **Destaque visual**: O jogador atual aparece em azul claro

### 3. Exemplos de Apostas
O sistema já inclui jogadores de exemplo:
- **Jogador 1**: 100€
- **Jogador 2**: 250€ 
- **Maria Silva**: 150€
- **João Santos**: 75€
- **Você**: Valor da sua aposta atual

### 4. Atualizações Dinâmicas
- As apostas são atualizadas em tempo real
- Quando você faz uma aposta, o painel é atualizado automaticamente
- Simulação de outros jogadores fazendo apostas a cada 5 segundos
- Quando você limpa suas apostas, o painel reflete a mudança

### 5. Integração com o Sistema Multiplayer
O código está preparado para receber dados reais de outros jogadores através de:
- `onPlayerBetUpdate(data)`: Recebe apostas de outros jogadores
- `onPlayerJoined(data)`: Adiciona novo jogador ao painel
- `onPlayerLeft(data)`: Remove jogador do painel

## Como Testar

1. **Inicie o jogo**: Acesse o jogo normalmente
2. **Observe o painel**: No canto superior esquerdo, você verá o painel com os jogadores
3. **Faça uma aposta**: Clique em "APOSTE AQUI" e veja sua aposta ser atualizada
4. **Aguarde**: A cada 5 segundos, as apostas dos outros jogadores podem mudar automaticamente
5. **Limpe apostas**: Use o botão "Clear" e veja o painel ser atualizado

## Estrutura do Código

### Arquivo Principal: `CPlayersPanel.js`
- Classe responsável por gerenciar o painel visual
- Métodos para adicionar, remover e atualizar jogadores
- Interface visual com CreateJS

### Integração no `CGame.js`
- Funções para gerenciar apostas dos jogadores
- Conexão com eventos do sistema multiplayer
- Atualização automática do painel

### Estilo Visual
- Fundo: Preto semi-transparente (rgba(0,0,0,0.8))
- Borda: Dourada (#FFD700)
- Texto: Branco para jogadores normais, azul claro para o jogador atual
- Fonte: Consistente com o resto do jogo

## Funcionalidades Futuras
- Integração completa com Supabase para dados reais
- Histórico de apostas por jogador
- Filtros por tipo de aposta
- Estatísticas de ganhos/perdas por jogador