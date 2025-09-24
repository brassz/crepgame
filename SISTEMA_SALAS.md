# Sistema de Criação de Mesas Online

## Visão Geral

O sistema de criação de mesas online permite aos jogadores escolher entre diferentes tipos de mesas com valores de aposta específicos. O sistema simula mesas online com jogadores reais e atualização em tempo real.

## Tipos de Mesas Disponíveis

### Mesa Bronze (`bronze`)
- **Aposta mínima:** R$ 50
- **Aposta máxima:** R$ 1.000
- **Máximo de jogadores:** 8
- **Descrição:** Mesa para iniciantes
- **Cor temática:** Bronze (#CD7F32)

### Mesa Prata (`prata`)
- **Aposta mínima:** R$ 100
- **Aposta máxima:** R$ 3.000
- **Máximo de jogadores:** 6
- **Descrição:** Mesa intermediária
- **Cor temática:** Prata (#C0C0C0)

### Mesa Ouro (`ouro`)
- **Aposta mínima:** R$ 200
- **Aposta máxima:** R$ 5.000
- **Máximo de jogadores:** 4
- **Descrição:** Mesa premium
- **Cor temática:** Ouro (#FFD700)

## Funcionalidades do Sistema

### 1. Seletor de Mesas Online
- Interface visual para escolher mesas
- Exibição de informações em tempo real de cada mesa:
  - Nome da mesa
  - Faixa de apostas (mín/máx)
  - Jogadores atuais/máximo
  - Status (Disponível/Cheia)
- Animações e efeitos visuais
- Botão "Entrar" para ingressar na mesa

### 2. Simulação Online
- Simulação automática de jogadores entrando/saindo das mesas
- Atualização em tempo real do número de jogadores
- Gerenciamento inteligente da ocupação das mesas
- Estatísticas de jogadores ativos por mesa

### 3. Interface do Jogo Atualizada
- Informações da mesa atual no espaço verde da mesa
- Display com nome da sala, jogadores e limites de aposta
- Integração com o sistema de apostas para validação dos limites

## Como Usar

### Entrar em uma Mesa

1. Ao clicar em "JOGAR" no menu principal, o seletor de mesas é exibido
2. Escolha uma das três mesas disponíveis:
   - **Bronze**: Para iniciantes (R$ 50-1000)
   - **Prata**: Intermediária (R$ 100-3000)  
   - **Ouro**: Premium (R$ 200-5000)
3. Clique em "ENTRAR" para ingressar na mesa selecionada
4. O jogo carregará com as configurações da mesa escolhida

### Código de Implementação

```javascript
// Trocar de sala programaticamente
s_oGame.changeRoom("bronze"); // ou "prata", "ouro"

// Obter configuração de uma sala
var oRoomConfig = s_oRoomConfig.getRoomConfig("prata");
console.log(oRoomConfig.name); // "Mesa Prata"
console.log(oRoomConfig.min_bet); // 100
console.log(oRoomConfig.max_bet); // 3000

// Obter informações específicas
var iMinBet = s_oRoomConfig.getRoomMinBet("ouro"); // 200
var iMaxBet = s_oRoomConfig.getRoomMaxBet("ouro"); // 5000
var sRoomName = s_oRoomConfig.getRoomName("bronze"); // "Mesa Bronze"
var iCurrentPlayers = s_oRoomConfig.getCurrentPlayers("prata"); // Número atual
```

## Arquivos do Sistema

### Novos Arquivos Criados
- **`game/js/CRoomConfig.js`** - Configurações e gerenciamento das mesas
- **`game/js/CTableSelector.js`** - Interface de seleção de mesas
- **`game/js/COnlineTableManager.js`** - Simulação de atividade online
- **`live_demo/js/CRoomConfig.js`** - Configurações para demo
- **`live_demo/js/CTableSelector.js`** - Seletor para demo

### Arquivos Modificados
- **`game/index.html`** - Adicionados scripts do sistema de mesas
- **`live_demo/index.html`** - Adicionados scripts para demo
- **`game/js/CMenu.js`** - Integração com seletor de mesas
- **`game/js/CGame.js`** - Suporte a diferentes tipos de mesa
- **`game/js/CInterface.js`** - Display de informações da mesa
- **`SISTEMA_SALAS.md`** - Documentação atualizada

## Interface Atualizada

### Seletor de Mesas
- **Overlay com fundo escuro** para foco na seleção
- **Painel principal centralizado** com bordas arredondadas
- **Título destacado**: "ESCOLHA SUA MESA"
- **Cards para cada mesa** com:
  - Nome da mesa com cor temática
  - Faixa de apostas (mín-máx)
  - Contador de jogadores em tempo real
  - Indicador de status (Disponível/Cheia)
  - Botão "Entrar" para mesas disponíveis
- **Animações suaves** de hover e entrada
- **Botão de fechar** no canto superior direito

### Display da Mesa no Jogo
As informações da mesa são exibidas no **espaço verde da mesa** (posição x=450, y=50) mostrando:
- Nome da sala atual
- Número de jogadores online/máximo
- Limites de aposta (mínima e máxima)
- Atualização automática em tempo real

## Benefícios do Sistema

1. **Escolha Personalizada**: Jogadores podem escolher mesa baseada em seu orçamento
2. **Experiência Online**: Simulação realista de mesas com outros jogadores
3. **Interface Intuitiva**: Seleção visual clara e informativa
4. **Limites Apropriados**: Diferentes faixas de apostas para diferentes perfis
5. **Gestão Inteligente**: Sistema automático de ocupação das mesas
6. **Feedback Visual**: Status em tempo real de cada mesa
7. **Escalabilidade**: Sistema preparado para adicionar novas mesas

## Especificações Técnicas

### Tipos de Mesa e Limites
- **Bronze**: R$ 50-1000 (8 jogadores) - Cor bronze (#CD7F32)
- **Prata**: R$ 100-3000 (6 jogadores) - Cor prata (#C0C0C0)
- **Ouro**: R$ 200-5000 (4 jogadores) - Cor ouro (#FFD700)

### Simulação Online
- **Ocupação inicial**: 20-60% da capacidade de cada mesa
- **Atividade simulada**: Jogadores entrando/saindo a cada 5-10 segundos
- **Atualizações automáticas**: Interface atualizada a cada 3 segundos
- **Gestão inteligente**: Controle de capacidade máxima