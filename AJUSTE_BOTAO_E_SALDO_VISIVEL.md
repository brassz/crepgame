# Ajuste: Botão "PASSAR" e Saldo Sempre Visível

## 🎯 Mudanças Implementadas

### 1. Botão "PASSAR" Reposicionado ao Lado do Botão "REFAZER"

**Antes**:
```
Posição: X: 1080, Y: 240 (canto superior direito, abaixo do timer)
```

**Agora**:
```
Posição: X: 620, Y: 513 (ao lado do botão REFAZER)
```

**Layout Visual**:
```
┌────────────────────────────────────────┐
│                                        │
│  [DINHEIRO]  [APOSTA ATUAL]  [LIMITES] │
│   1000.00      200.00       Min: 50    │
│                                        │
│              [PASSAR] [REFAZER] ←─── Mesma linha!
│                                        │
│              Mesa de Apostas           │
│                                        │
└────────────────────────────────────────┘
```

**Vantagens**:
- ✅ Botões de ação agrupados (passar e refazer)
- ✅ Mais espaço no canto superior direito
- ✅ Interface mais organizada
- ✅ Fácil acesso aos controles de jogo

### 2. Saldo Ganho SEMPRE Visível na "APOSTA ATUAL"

**Comportamento Anterior**:
```
1. Ganhou 200  → APOSTA ATUAL: 200
2. Passou dado → APOSTA ATUAL: 0 ❌ (sumia)
```

**Comportamento Novo**:
```
1. Ganhou 200  → APOSTA ATUAL: 200
2. Passou dado → APOSTA ATUAL: 200 ✅ (continua visível!)
```

## 📊 Fluxo Completo

### Cenário: Jogador Ganha e Passa o Dado

```
1. Jogador aposta 100
   DINHEIRO: 1000.00
   APOSTA ATUAL: 100.00

2. Jogador lança e ganha (resultado 7)
   DINHEIRO: 1000.00        ← Não aumenta ainda
   APOSTA ATUAL: 200.00     ← Mostra valor ganho

3. Jogador clica "PASSAR"
   DINHEIRO: 1200.00        ← Saldo liberado! (+200)
   APOSTA ATUAL: 200.00     ← CONTINUA VISÍVEL! ✅
   
   Mensagem: "SALDO LIBERADO! +200"

4. Próximo jogador recebe o dado
   APOSTA ATUAL: 200.00     ← Ainda mostra o último valor
```

**Importante**: O valor só zera quando:
- Jogador perde (2, 3, 12 ou 7 no ponto)
- Nova aposta é feita

## 🎨 Detalhes Visuais

### Botão "PASSAR"

**Especificações**:
```javascript
Posição: (620, 513)
Sprite: 'but_bg'
Texto: "PASSAR"
Fonte: FONT1, 16px
Cor: Branco (#fff)
Alinhamento: Centro
```

**Relação com Botão "REFAZER"**:
```
PASSAR:  X = 620,  Y = 513
REFAZER: X = 764,  Y = 513  (144px à direita)
```

### Caixa "APOSTA ATUAL"

**Comportamento**:
- Mostra apostas ativas ANTES de lançar
- Mostra valor ganho (travado) DEPOIS de ganhar
- MANTÉM valor ganho visível DEPOIS de passar
- Zera apenas ao perder ou fazer nova aposta

## 🔧 Implementação Técnica

### Arquivo: `game/js/CInterface.js`

#### 1. Reposicionamento do Botão

```javascript
// ANTES (linha 156)
_oPassDiceBut = new CTextButton(1080, 240, ...);

// DEPOIS
_oPassDiceBut = new CTextButton(620, 513, ...);
```

**Ordem de Criação**:
```javascript
1. Botão REFAZER (764, 513)
2. Botão PASSAR (620, 513) ← Logo após, à esquerda
```

#### 2. Função `setLockedBalance()`

```javascript
// ANTES
this.setLockedBalance = function(iLockedBalance){
    if(iLockedBalance > 0){  // Só mostra se > 0
        _oBetAmountText.refreshText(...);
    }
};

// DEPOIS
this.setLockedBalance = function(iLockedBalance){
    // SEMPRE mostra, mesmo se 0
    _oBetAmountText.refreshText(iLockedBalance.toFixed(2) + TEXT_CURRENCY);
};
```

### Arquivo: `game/js/CGame.js`

#### 1. Ao Ganhar - Mostra Valor

```javascript
// Vitória com 7 ou 11
_iLockedBalance = iAutoWin;
_oInterface.setCurBet(_iLockedBalance);  // Mostra valor ganho

// Remove as fichas mas não zera o display
_oMySeat.clearAllBetsVisualOnly();
_aBetHistory = {};
// NÃO chama: _oInterface.setCurBet(0)
```

#### 2. Ao Passar o Dado - Mantém Valor Visível

```javascript
if(_iLockedBalance > 0){
    var valorLiberado = _iLockedBalance;  // Salva valor
    
    _oMySeat.showWin(_iLockedBalance);    // Adiciona ao saldo
    _oInterface.setMoney(...);            // Atualiza dinheiro
    
    _iLockedBalance = 0;                  // Zera internamente
    _oInterface.setCurBet(valorLiberado); // MAS mantém visível! ✅
}
```

#### 3. Ao Perder - Zera Tudo

```javascript
// Perde com 2, 3, 12 ou 7
_iLockedBalance = 0;
_oInterface.setCurBet(0);  // Zera display
```

## 🧪 Como Testar

### Teste 1: Botão ao Lado do Refazer

1. **Inicie o jogo**: `http://localhost:3000`
2. **Procure os botões na parte inferior**
3. **Verifique**:
   - ✅ Botão "PASSAR" à esquerda
   - ✅ Botão "REFAZER" (ícone X) à direita
   - ✅ Mesma altura (Y = 513)
   - ✅ Bem espaçados (144px de distância)

### Teste 2: Valor Continua Visível Após Passar

1. **Aposte 100**:
   ```
   APOSTA ATUAL: 100.00
   ```

2. **Lance e ganhe (7)**:
   ```
   APOSTA ATUAL: 200.00
   ```

3. **Clique "PASSAR"**:
   ```
   DINHEIRO: 1200.00      ← Aumentou +200
   APOSTA ATUAL: 200.00   ← AINDA VISÍVEL! ✅
   ```

4. **Verifique**:
   - ✅ Mensagem "SALDO LIBERADO! +200"
   - ✅ Dinheiro aumentou
   - ✅ Aposta atual CONTINUA mostrando 200
   - ✅ Dado passa para próximo jogador

### Teste 3: Valor Zera ao Perder

1. **Com valor visível (200)**
2. **Faça nova aposta e perca**
3. **Verifique**:
   ```
   APOSTA ATUAL: 0.00  ← Zerou
   ```

### Teste 4: Múltiplas Vitórias

1. **Ganhe 200** (travado)
2. **Aposte novamente e ganhe mais 100**
3. **Verifique**:
   ```
   APOSTA ATUAL: 300.00  ← Acumulou
   ```
4. **Passe o dado**
5. **Verifique**:
   ```
   DINHEIRO: +300
   APOSTA ATUAL: 300.00  ← Continua visível
   ```

## 📈 Vantagens das Mudanças

### 1. Agrupamento Lógico

**Antes**: 
- Botões espalhados pela tela
- "PASSAR" no canto superior direito
- "REFAZER" na parte inferior

**Agora**:
- Ambos os botões de controle juntos
- Fácil de encontrar
- Interface mais organizada

### 2. Histórico Visual

**Antes**:
```
Ganhou 200 → Passou → APOSTA ATUAL: 0 (não lembra quanto foi)
```

**Agora**:
```
Ganhou 200 → Passou → APOSTA ATUAL: 200 (lembra o valor!)
```

**Benefícios**:
- ✅ Jogador vê quanto ganhou na última rodada
- ✅ Histórico visual imediato
- ✅ Melhor feedback sobre desempenho
- ✅ Mais transparência

### 3. Interface Mais Limpa

**Espaço liberado no topo direito**:
- Antes ocupado pelo botão "PASSAR"
- Agora livre para outras informações
- Timer mais visível

## 🎯 Resumo das Posições

| Elemento | X | Y | Descrição |
|----------|---|---|-----------|
| Botão LANÇAR | 1080 | 120 | Canto superior direito |
| Timer | 1080 | 180 | Abaixo do lançar |
| Botão PASSAR | 620 | 513 | Centro-inferior |
| Botão REFAZER | 764 | 513 | Centro-inferior direita |
| Caixa DINHEIRO | 251 | 480 | Esquerda inferior |
| Caixa APOSTA ATUAL | 410 | 480 | Centro inferior |

## 📝 Comportamento do "APOSTA ATUAL"

| Situação | Valor Mostrado | Observação |
|----------|----------------|------------|
| Sem aposta | 0.00 | Padrão |
| Após apostar 100 | 100.00 | Valor apostado |
| Após ganhar (200) | 200.00 | Valor travado |
| Após passar dado | 200.00 | Continua visível ✅ |
| Após perder | 0.00 | Zera |
| Nova aposta | [valor] | Novo ciclo |

## 🚀 Resultado Final

Interface mais intuitiva e informativa:
- ✅ Botões agrupados logicamente
- ✅ Valor ganho sempre visível (histórico)
- ✅ Layout mais limpo e organizado
- ✅ Melhor feedback visual para o jogador
- ✅ Mais fácil acompanhar o progresso

O jogador agora tem **total visibilidade** do quanto ganhou, mesmo após passar o dado! 💰✨

