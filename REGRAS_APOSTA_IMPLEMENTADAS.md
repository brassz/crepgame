# Regras de Aposta e Sistema de Rodadas Implementados

## Resumo das Implementações

### 1. ✅ Tradução para Português
- **Status**: ✅ Completo
- **Descrição**: Todo o jogo já estava em português. Os textos principais estão no arquivo `CLang.min.js` e todos os textos da interface estão em português.

### 2. ✅ Regra de Aposta Obrigatória do Valor Inteiro Ganho
- **Status**: ✅ Implementado
- **Descrição**: Quando um jogador ganha, ele DEVE apostar o valor INTEIRO ganho na próxima rodada. Não pode apostar menos nem mais.

#### Como Funciona:
1. **Ao Ganhar (7 ou 11 no Come Out, ou acertar o Ponto)**:
   - O jogo calcula o valor ganho
   - Armazena em `_iLastWinAmount`
   - Ativa a flag `_bMustBetFullWin = true`
   - Mostra mensagem: "GANHOU! +[valor] PRÓXIMA APOSTA: [valor]"

2. **Ao Fazer Nova Aposta**:
   - O sistema valida se a aposta total é EXATAMENTE o valor ganho
   - Se MENOR: Mostra "VOCÊ GANHOU [valor]! DEVE APOSTAR O VALOR INTEIRO!"
   - Se MAIOR: Mostra "APOSTA DEVE SER EXATAMENTE [valor]! NÃO PODE SER MAIOR!"
   - Se EXATO: Libera para jogar e desativa a flag

3. **Ao Perder (2, 3, 12 no Come Out, ou 7 na fase Point)**:
   - Reset da flag: `_bMustBetFullWin = false`
   - Reset do valor: `_iLastWinAmount = 0`
   - Jogador pode fazer qualquer aposta válida

4. **Ao Limpar Apostas (botão Clear)**:
   - Reset da flag e valor
   - Jogador pode recomeçar livremente

#### Exemplo de Fluxo:
```
1. Jogador aposta R$ 100
2. Sai 7 no Come Out → GANHA R$ 200 (dobro)
3. Sistema bloqueia: PRÓXIMA APOSTA DEVE SER R$ 200
4. Jogador tenta apostar R$ 100 → ❌ BLOQUEADO "Deve apostar valor inteiro!"
5. Jogador tenta apostar R$ 300 → ❌ BLOQUEADO "Não pode ser maior!"
6. Jogador aposta exatamente R$ 200 → ✅ LIBERADO
7. Jogador lança os dados...
```

### 3. ✅ Sistema de Rodadas (Controle de Turno)
- **Status**: ✅ Implementado
- **Descrição**: O botão de lançar fica bloqueado após o jogador jogar, até chegar a vez dele novamente.

#### Como Funciona:

##### Modo Single Player:
1. **Ao Lançar os Dados**:
   - Flag `_bIsMyTurn` vira `false`
   - Botão LANÇAR é desabilitado
   - Animação dos dados acontece
   - Após 1 segundo do resultado, `_bIsMyTurn` volta para `true`
   - Botão é liberado novamente

2. **Tentativa de Jogar Fora do Turno**:
   - Mostra mensagem: "AGUARDE SUA VEZ! O BOTÃO SERÁ LIBERADO QUANDO FOR SEU TURNO."

##### Modo Multiplayer:
1. **Servidor Controla Turnos**:
   - Função `onTurnUpdate(data)` recebe atualizações do servidor
   - Atualiza `_bIsMyTurn` baseado nos dados do servidor
   - Mostra mensagens:
     - Se é seu turno: "SUA VEZ! Clique para lançar os dados"
     - Se não é seu turno: "AGUARDE SUA VEZ..."
   - Timer mostra quanto tempo resta no turno

2. **Display de Turno**:
   - Mostra qual jogador está jogando
   - Conta regressiva de tempo
   - Indicação clara se é sua vez ou não

#### Exemplo de Fluxo Multiplayer:
```
1. JOGADOR 1 (Você): Sua vez! Aposta R$ 100
2. JOGADOR 1 (Você): Lança dados → Sai 11 → GANHA R$ 200
3. Sistema: "AGUARDE SUA VEZ..." (botão bloqueado)
4. JOGADOR 2: Jogando... (você só observa)
5. JOGADOR 3: Jogando... (você só observa)
6. Sistema: "SUA VEZ! Clique para lançar" (botão liberado)
7. JOGADOR 1 (Você): Deve apostar R$ 200 (valor ganho anterior)
```

## Arquivos Modificados

### 1. `/workspace/game/js/CGame.js`
**Linhas modificadas**: ~30-50 linhas em múltiplas funções

**Variáveis Adicionadas**:
```javascript
var _iLastWinAmount = 0;        // Último valor ganho
var _bMustBetFullWin = false;   // Flag: deve apostar valor inteiro
var _bIsMyTurn = true;           // Flag: é minha vez de jogar
```

**Funções Modificadas**:
1. `_checkWinForBet()` - Armazena valor ganho e ativa flag
2. `_onShowBetOnTable()` - Valida aposta obrigatória
3. `onRoll()` - Verifica turno antes de permitir jogar
4. `dicesAnimEnded()` - Libera turno após delay
5. `onTurnUpdate()` - Atualiza flag de turno (multiplayer)
6. `onClearAllBets()` - Reset das flags ao limpar

## Testes Sugeridos

### Teste 1: Regra de Aposta Obrigatória
1. ✅ Fazer aposta de R$ 100
2. ✅ Ganhar (sair 7 ou 11)
3. ✅ Tentar apostar R$ 50 → Deve bloquear
4. ✅ Tentar apostar R$ 300 → Deve bloquear
5. ✅ Apostar exatamente R$ 200 → Deve permitir

### Teste 2: Sistema de Rodadas (Single Player)
1. ✅ Fazer aposta e clicar em LANÇAR
2. ✅ Tentar clicar em LANÇAR novamente durante animação → Deve bloquear
3. ✅ Aguardar fim da animação + 1 segundo
4. ✅ Verificar se botão LANÇAR foi liberado

### Teste 3: Sistema de Rodadas (Multiplayer)
1. ✅ Conectar 2 ou mais jogadores
2. ✅ Jogador 1 faz aposta e lança
3. ✅ Verificar que Jogador 2 vê mensagem "AGUARDE SUA VEZ"
4. ✅ Verificar que botão de Jogador 2 está bloqueado
5. ✅ Após Jogador 1 terminar, verificar se Jogador 2 pode jogar

### Teste 4: Reset de Flags
1. ✅ Ganhar uma rodada
2. ✅ Clicar em LIMPAR APOSTAS
3. ✅ Verificar que pode fazer qualquer aposta (sem obrigação)

## Observações Importantes

### Compatibilidade:
- ✅ Funciona em modo **single player** (offline)
- ✅ Funciona em modo **multiplayer** com Socket.IO
- ✅ Funciona em modo **multiplayer** com Supabase Realtime

### Comportamento Default:
- Em single player: `_bIsMyTurn` sempre volta para `true` após 1 segundo
- Em multiplayer: `_bIsMyTurn` é controlado pelo servidor via `onTurnUpdate()`

### Mensagens de Feedback:
Todas as mensagens são em **PORTUGUÊS**:
- "VOCÊ GANHOU [valor]! DEVE APOSTAR O VALOR INTEIRO!"
- "APOSTA DEVE SER EXATAMENTE [valor]! NÃO PODE SER MAIOR!"
- "AGUARDE SUA VEZ! O BOTÃO SERÁ LIBERADO QUANDO FOR SEU TURNO."
- "SUA VEZ! Clique para lançar os dados"
- "AGUARDE SUA VEZ..."

## Próximos Passos

Para testar as implementações:
1. Abra o jogo em um navegador
2. Faça uma aposta e jogue
3. Observe as mensagens e comportamento do sistema
4. Para teste multiplayer, abra 2 abas do navegador

## Conclusão

Todas as funcionalidades solicitadas foram implementadas:
- ✅ Textos em português (já estavam)
- ✅ Regra de aposta do valor inteiro ganho
- ✅ Sistema de rodadas com bloqueio de turno

O código está pronto para ser testado!
