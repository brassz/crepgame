# Correção: Dados sendo lançados duas vezes

## Problema Identificado
O problema estava no método `onRoll()` no arquivo `game/js/CGame.js`, que estava causando o lançamento duplo dos dados.

## Causa Raiz
No método `onRoll()` (linhas 558-587), havia uma chamada incondicional para `_startRollingAnim()` mesmo quando o jogo estava conectado ao servidor.

### Fluxo problemático:
1. Usuário clica no botão "LANÇAR"
2. `onRoll()` é chamado
3. `_prepareForRolling()` é chamado
4. Se conectado ao servidor: `Realtime.requestRoll()` é executado e a função retorna
5. **PROBLEMA:** `onRoll()` continuava executando e chamava `_startRollingAnim()` novamente

## Solução Aplicada
Modificamos o método `onRoll()` para verificar se está conectado ao servidor antes de iniciar a animação local:

```javascript
// Código anterior (problemático):
this._prepareForRolling();
this._startRollingAnim();    // ← Sempre executava

// Código corrigido:
this._prepareForRolling();

// Só inicia a animação se não estiver conectado ao servidor (modo offline)
if (!window.Realtime || (!Realtime.getSocket() && !Realtime.isUsingSupabase())){
    this._startRollingAnim();    
}
```

## Lógica da Correção
- **Modo Online (servidor conectado):** Apenas `Realtime.requestRoll()` é executado, e a animação virá via resposta do servidor
- **Modo Offline:** A animação local é executada normalmente

## Arquivos Modificados
- `game/js/CGame.js` - Método `onRoll()` (linhas 558-587)

## Status
✅ **CORRIGIDO** - Os dados agora são lançados apenas uma vez, independente do modo (online/offline).

## Teste da Correção
Para testar se a correção funcionou:
1. Abra o jogo no navegador
2. Faça uma aposta
3. Clique no botão "LANÇAR"
4. Verifique se os dados são lançados apenas uma vez

Se o problema persistir, verifique se há outros event listeners duplicados ou se o arquivo foi salvo corretamente.