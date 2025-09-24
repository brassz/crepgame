# Sistema de Salas Multi-Tier

## Visão Geral

O sistema de salas permite que os jogadores escolham entre diferentes níveis de apostas, cada um com limites específicos e configurações únicas. O sistema oferece três salas principais: Bronze, Prata e Ouro.

## Configuração das Salas

### Sala Bronze (`bronze`)
- **Aposta mínima:** 50 reais
- **Aposta máxima:** 1.000 reais
- **Máximo de jogadores:** 8
- **Descrição:** Sala para apostas de 50 a 1.000 reais
- **Cor temática:** Bronze (#CD7F32)

### Sala Prata (`prata`)
- **Aposta mínima:** 100 reais
- **Aposta máxima:** 3.000 reais
- **Máximo de jogadores:** 6
- **Descrição:** Sala para apostas de 100 a 3.000 reais
- **Cor temática:** Prata (#C0C0C0)

### Sala Ouro (`ouro`)
- **Aposta mínima:** 200 reais
- **Aposta máxima:** 5.000 reais
- **Máximo de jogadores:** 4
- **Descrição:** Sala VIP para apostas de 200 a 5.000 reais
- **Cor temática:** Ouro (#FFD700)

## Fluxo do Usuário

### 1. Seleção de Sala
Quando o jogador clica em "JOGAR" no menu principal, é direcionado para a **tela de seleção de salas** onde pode escolher entre:
- Sala Bronze (50-1.000)
- Sala Prata (100-3.000)
- Sala Ouro (200-5.000)

### 2. Ingresso na Sala
Após selecionar uma sala, o jogador entra diretamente no jogo com os limites configurados para aquela sala.

### 3. Validação de Apostas
O sistema valida automaticamente todas as apostas baseadas nos limites da sala:
- **Aposta mínima:** Verificada ao tentar lançar os dados
- **Aposta máxima:** Verificada ao tentar adicionar fichas

## API do Sistema

### Usar uma Sala Específica

```javascript
// Configurar sala Bronze
s_oGame.changeRoom("bronze");

// Configurar sala Prata
s_oGame.changeRoom("prata");

// Configurar sala Ouro
s_oGame.changeRoom("ouro");
```

### Obter Configuração de Sala

```javascript
// Obter configuração completa
var oRoomConfig = s_oRoomConfig.getRoomConfig("bronze");
console.log(oRoomConfig.name); // "Sala Bronze"
console.log(oRoomConfig.min_bet); // 50
console.log(oRoomConfig.max_bet); // 1000

// Obter valores específicos
var iMinBet = s_oRoomConfig.getRoomMinBet("prata"); // 100
var iMaxBet = s_oRoomConfig.getRoomMaxBet("ouro"); // 5000
var sRoomName = s_oRoomConfig.getRoomName("bronze"); // "Sala Bronze"
var sRoomColor = s_oRoomConfig.getRoomColor("ouro"); // "#FFD700"

// Validar aposta
var bIsValid = s_oRoomConfig.isValidBet("prata", 2500); // true
var bIsInvalid = s_oRoomConfig.isValidBet("bronze", 2000); // false (acima de 1000)

// Obter todas as salas disponíveis
var aRooms = s_oRoomConfig.getAvailableRooms();
```

## Arquivos do Sistema

### Novos Arquivos Criados
- **`game/js/CRoomConfig.js`** - Configuração centralizada de todas as salas
- **`game/js/CRoomSelectionMenu.js`** - Interface de seleção de salas
- **`SISTEMA_SALAS.md`** - Documentação completa do sistema

### Arquivos Modificados
- **`game/index.html`** - Adicionado script CRoomSelectionMenu.js
- **`game/js/settings.js`** - Adicionado STATE_ROOM_SELECTION
- **`game/js/CMain.js`** - Adicionado gotoRoomSelection() e variável _oRoomSelectionMenu
- **`game/js/CMenu.js`** - Menu principal agora direciona para seleção de salas
- **`game/js/CGame.js`** - Validação de apostas baseada em salas + changeRoom() atualizado
- **`game/js/CInterface.js`** - Display dinâmico dos limites de apostas

## Interface do Sistema

### Tela de Seleção de Salas
- **Localização:** Entre menu principal e jogo
- **Elementos:** Três botões temáticos (Bronze, Prata, Ouro)
- **Informações por sala:** Nome, limites de aposta, descrição
- **Cores temáticas:** Cada sala tem cor própria para identificação visual

### Display In-Game
- **Informações da sala:** Canto superior da mesa (x=450, y=50)
- **Limites de aposta:** Display dinâmico no painel de interface
- **Validação em tempo real:** Mensagens de erro específicas por sala

### Validação de Apostas
- **Aposta mínima:** Verificada ao tentar lançar os dados
- **Aposta máxima:** Verificada ao adicionar fichas
- **Mensagens personalizadas:** Incluem nome da sala e limites específicos

## Características Técnicas

### Sistema Flexível
- **Configuração centralizada** em CRoomConfig.js
- **Fácil adição** de novas salas
- **Validação automática** de apostas
- **Compatibilidade** mantida com sistema anterior

### Interface Responsiva
- **Atualização dinâmica** de limites
- **Feedback visual** com cores temáticas
- **Mensagens contextuais** de validação
- **Navegação intuitiva** entre salas

### Benefícios do Sistema
1. **Segmentação de jogadores** por nível de aposta
2. **Experiência personalizada** por sala
3. **Gestão de risco** com limites claros
4. **Escalabilidade** para novas salas
5. **Interface moderna** e profissional