# 📊 POSIÇÕES COMPLETAS DA INTERFACE DO JOGO - CRAPS

## 💰 PAINEL DE DINHEIRO E APOSTAS

### **Dinheiro Atual (Money/Saldo)**
- **Posição do Background:** X: 251, Y: 603
- **Posição do Título "MONEY":** X: 260, Y: 616
- **Posição do Valor:** X: 260, Y: 636
- **Largura:** 140px
- **Altura:** 16px
- **Alinhamento:** Centro
- **Cor:** Branco (#fff)
- **Fonte:** arialbold, tamanho 16

### **Aposta Atual (Current Bet)**
- **Posição do Background:** X: 410, Y: 603
- **Posição do Título "CUR BET":** X: 419, Y: 616
- **Posição do Valor:** X: 419, Y: 636
- **Largura:** 140px
- **Altura:** 16px
- **Alinhamento:** Centro
- **Cor:** Branco (#fff)
- **Fonte:** arialbold, tamanho 16

---

## 🎰 APOSTAS MÍNIMAS E MÁXIMAS

### **Display de Limites de Apostas**
- **Posição do Background:** X: 575, Y: 610
- **Posição do Texto:** X: 579, Y: 614
- **Largura:** 140px
- **Altura:** 40px
- **Conteúdo:** "MIN BET: [valor]\nMAX BET: [valor]"
- **Alinhamento:** Centro
- **Cor:** Branco (#fff)
- **Fonte:** arialbold, tamanho 16

### **Valores por Sala:**

#### 🥉 **SALA BRONZE**
- **Aposta Mínima:** R$ 50
- **Aposta Máxima:** R$ 1.000
- **Máximo de Jogadores:** 8
- **Banca:** Sim

#### 🥈 **SALA PRATA**
- **Aposta Mínima:** R$ 100
- **Aposta Máxima:** R$ 3.000
- **Máximo de Jogadores:** 8
- **Banca:** Sim

#### 🥇 **SALA OURO**
- **Aposta Mínima:** R$ 200
- **Aposta Máxima:** R$ 5.000
- **Máximo de Jogadores:** 8
- **Banca:** Sim

---

## 🏠 INFORMAÇÕES DAS SALAS

### **Painel de Informações da Sala**
- **Posição do Background:** X: 450, Y: 50
- **Posição do Texto:** X: 564, Y: 63
- **Largura:** 130px
- **Altura:** 80px
- **Alinhamento:** Centro
- **Cor:** Branco (#fff)
- **Fonte:** arialbold, tamanho 16

**Conteúdo Exibido:**
```
SALA: [Nome da Sala]
JOGADORES: [atual]/[máximo]
APOSTA MIN: [valor]
APOSTA MAX: [valor]
```

### **Botões de Seleção de Sala**

#### **Botão BRONZE**
- **Posição Desktop:** X: 220, Y: 40
- **Posição Mobile:** X: 200, Y: 40
- **Texto:** "BRONZE"
- **Cor:** Branco (#fff)
- **Fonte:** arialbold, tamanho 16

#### **Botão PRATA**
- **Posição Desktop:** X: 220, Y: 85
- **Posição Mobile:** X: 200, Y: 85
- **Texto:** "PRATA"
- **Cor:** Branco (#fff)
- **Fonte:** arialbold, tamanho 16

#### **Botão OURO**
- **Posição Desktop:** X: 220, Y: 130
- **Posição Mobile:** X: 200, Y: 130
- **Texto:** "OURO"
- **Cor:** Branco (#fff)
- **Fonte:** arialbold, tamanho 16

---

## 🎲 FICHAS (CHIPS)

### **Painel de Fichas**
- **Posição do Background:** X: 50, Y: 120
- **Dimensões:** 100px (largura aproximada)

### **Posições das Fichas Individuais**
- **Posição Inicial X:** 92
- **Posição Inicial Y:** 170
- **Espaçamento Vertical:** 25px + altura da ficha

### **Valores das Fichas:**
1. **Ficha 0:** Valor = R$ 1
2. **Ficha 1:** Valor = R$ 5
3. **Ficha 2:** Valor = R$ 10
4. **Ficha 3:** Valor = R$ 25
5. **Ficha 4:** Valor = R$ 50
6. **Ficha 5:** Valor = R$ 100

### **Layout das Fichas:**
```
Y: 170  → Ficha de R$ 1
Y: 195  → Ficha de R$ 5
Y: 220  → Ficha de R$ 10
Y: 245  → Ficha de R$ 25
Y: 270  → Ficha de R$ 50
Y: 295  → Ficha de R$ 100
```

### **Posições onde as Fichas Aparecem na Mesa:**

| Tipo de Aposta | X | Y |
|---------------|---|---|
| **pass_line** | 360 | 555 |
| **dont_pass1** | 730 | 503 |
| **dont_pass2** | 254 | 320 |
| **dont_come** | 322 | 238 |
| **come** | 740 | 330 |
| **field** | 570 | 420 |
| **big_6** | 260 | 440 |
| **big_8** | 316 | 490 |
| **any11_7** | 1032 | 582 |
| **any_craps_7** | 1032 | 631 |
| **seven_bet** | 1032 | 356 |
| **hardway6** | 955 | 400 |
| **hardway10** | 1112 | 400 |
| **hardway8** | 955 | 460 |
| **hardway4** | 1112 | 460 |
| **horn3** | 930 | 520 |
| **horn2** | 1032 | 520 |
| **horn12** | 1134 | 520 |

#### **Posições de Fichas para Números (4, 5, 6, 8, 9, 10):**

| Número | Tipo | X | Y |
|--------|------|---|---|
| **4** | lay_bet | 428 | 142 |
| **4** | lose_bet | 388 | 162 |
| **4** | number | 408 | 211 |
| **4** | win_bet | 408 | 258 |
| **5** | lay_bet | 514 | 142 |
| **5** | lose_bet | 474 | 162 |
| **5** | number | 494 | 211 |
| **5** | win_bet | 494 | 258 |
| **6** | lay_bet | 600 | 142 |
| **6** | lose_bet | 560 | 162 |
| **6** | number | 580 | 211 |
| **6** | win_bet | 580 | 258 |
| **8** | lay_bet | 686 | 142 |
| **8** | lose_bet | 646 | 162 |
| **8** | number | 666 | 211 |
| **8** | win_bet | 666 | 258 |
| **9** | lay_bet | 772 | 142 |
| **9** | lose_bet | 732 | 162 |
| **9** | number | 752 | 211 |
| **9** | win_bet | 752 | 258 |
| **10** | lay_bet | 858 | 142 |
| **10** | lose_bet | 818 | 162 |
| **10** | number | 838 | 211 |
| **10** | win_bet | 838 | 258 |

---

## 🎯 BOTÕES PRINCIPAIS

### **Botão de Lançar Dados (Roll)**
- **Posição:** X: 1030, Y: 162
- **Texto:** "  ROLL"
- **Cor:** Branco (#fff)
- **Fonte:** arialbold, tamanho 22
- **Alinhamento:** Direita

### **Botão Limpar Apostas (Clear All)**
- **Posição:** X: 764, Y: 636
- **Sprite:** 'but_clear_all'

### **Botão Sair (Exit)**
- **Posição:** X: CANVAS_WIDTH - (largura/2) - 10
- **Posição Y:** (altura/2) + 10
- **Aproximadamente:** X: 1255, Y: 25

### **Botão Áudio (Audio Toggle)**
- **Posição:** X: _pStartPosExit.x - largura/2 - 10
- **Posição Y:** (altura/2) + 10
- **Aproximadamente:** X: 1200, Y: 25

### **Botão Fullscreen**
- **Posição:** X: 10 + largura/4
- **Posição Y:** (altura/2) + 10
- **Aproximadamente:** X: 15, Y: 25

---

## ⏱️ TIMER DE TURNO

### **Display do Timer**
- **Posição:** X: 1030, Y: 210
- **Largura:** 200px
- **Altura:** 30px
- **Alinhamento:** Direita
- **Cor:** Dourado (#ffde00)
- **Fonte:** Digital-7, tamanho 18

**Mensagens Exibidas:**
- Quando é o turno do jogador: "SEU TURNO - Sem pressa!" ou "SEU TURNO: Xs"
- Quando é turno de outro jogador: "JOGADOR X/Y: Zs"
- Quando o tempo acabou: "SEU TURNO - Clique quando quiser"

---

## 📜 HISTÓRICO DAS ÚLTIMAS 5 JOGADAS

### **Painel de Histórico**
- **Posição:** X: CANVAS_WIDTH/2 - 400, Y: CANVAS_HEIGHT - 100
- **Aproximadamente:** X: 240, Y: 668
- **Largura:** 800px
- **Altura:** 95px
- **Background:** Preto com 80% de opacidade (rgba(0, 0, 0, 0.8))
- **Borda:** Dourada (#FFD700), 2px

### **Título do Painel**
- **Texto:** "ÚLTIMAS 5 JOGADAS"
- **Posição:** X: 400 (relativo ao container), Y: 12
- **Alinhamento:** Centro
- **Cor:** Dourado (#FFD700)
- **Fonte:** Arial Bold, tamanho 14

### **Layout dos Itens de Histórico**
- **Quantidade Máxima:** 5 jogadas
- **Espaçamento entre itens:** 155px
- **Posição inicial X:** 15 (relativo ao container)
- **Posição Y:** 35 (relativo ao container)

### **Cada Item de Histórico Contém:**
1. **Background:** 145px x 58px, dourado translúcido
2. **Nome do Jogador:** Topo do item (Y: 3)
   - Fonte: Arial Bold, 9px
   - Cor: Dourado (#FFD700)
   - Largura máxima: 70px
3. **Dados (emojis):** X: 15, Y: 16 (com nome) ou Y: 10 (sem nome)
   - Fonte: Arial, 22px
   - Cor: Branco (#FFFFFF)
4. **Total:** X: 15, Y: 36 (com nome) ou Y: 32 (sem nome)
   - Formato: "= [número]"
   - Fonte: Arial Bold, 16px
   - Cor: Dourado (#FFD700)

### **Exemplo Visual:**
```
┌──────────────────────────────────────────────────────────────────────────┐
│                        ÚLTIMAS 5 JOGADAS                                  │
├──────────┬──────────┬──────────┬──────────┬──────────┐                   │
│ Jogador1 │ Jogador2 │ Jogador3 │ Jogador4 │ Jogador5 │                   │
│  ⚂ ⚃     │  ⚀ ⚅     │  ⚄ ⚄     │  ⚁ ⚂     │  ⚃ ⚅     │                   │
│  = 7     │  = 7     │  = 10    │  = 5     │  = 9     │                   │
└──────────┴──────────┴──────────┴──────────┴──────────┘                   │
```

---

## 🎯 BOTÃO DE APOSTA PRINCIPAL (ATUAL)

**Nota:** Atualmente, o código está simplificado com apenas um botão centralizado.

### **Botão "APOSTE AQUI"**
- **Posição:** X: 640, Y: 450
- **Texto:** "APOSTE AQUI"
- **Tipo:** CTextButton
- **Cor:** Branco (#fff)
- **Fonte:** arialbold, tamanho 18
- **Alinhamento:** Centro

---

## ⚠️ OBSERVAÇÕES IMPORTANTES

### **Sobre Botão de Repetir Apostas:**
❌ **Atualmente NÃO EXISTE um botão específico para refazer as apostas das últimas jogadas.**

O sistema atual possui:
- ✅ Histórico visual das últimas 5 jogadas (dados lançados)
- ✅ Botão "Clear All" para limpar apostas
- ❌ Não há botão "Repeat Last Bet" ou "Rebet"

### **Sistema de Apostas Atual:**
O jogo está configurado com um sistema simplificado onde:
1. Jogador seleciona uma ficha (R$ 1 a R$ 100)
2. Clica no botão "APOSTE AQUI" (posição centralizada)
3. As fichas aparecem visualmente na posição da aposta

### **Multiplicadores de Pagamento:**

| Tipo de Aposta | Multiplicador |
|---------------|---------------|
| Pass Line, Don't Pass, Come, Don't Come | 1x |
| Field | 1x (2x para 2 ou 12) |
| Big 6, Big 8 | 1x |
| Any 11 | 15x |
| Any Craps | 7x |
| Seven Bet | 4x |
| Hardway 6, 8 | 9x |
| Hardway 4, 10 | 7x |
| Horn 2, Horn 12 | 30x |
| Horn 3 | 15x |

---

## 📱 DIMENSÕES DO CANVAS

- **Largura Total:** 1280px
- **Altura Total:** 768px

---

## 🎨 CORES PRINCIPAIS

- **Texto Principal:** Branco (#fff)
- **Destaque/Timer:** Dourado (#ffde00, #FFD700)
- **Background dos Painéis:** Preto translúcido (rgba(0, 0, 0, 0.8))
- **Bordas:** Dourado (#FFD700)

---

## 🔤 FONTES UTILIZADAS

- **FONT1:** "arialbold" - Usada para textos gerais
- **FONT2:** "Digital-7" - Usada para displays digitais (timer)

---

**Documento Gerado em:** 30 de Dezembro de 2025
**Versão do Jogo:** Craps Multiplayer com Sistema de Salas
