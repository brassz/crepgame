# Sistema de Passar o Dado

## 📋 Descrição

O sistema "Passar o Dado" permite que o jogador que está com o dado passe sua vez para o próximo jogador na sala, sem precisar lançar os dados.

## 🎮 Como Funciona

### Para o Jogador que Tem o Dado

1. **Botão "PASSAR" Disponível**: Quando é sua vez, você verá o botão "PASSAR" habilitado abaixo do botão "LANÇAR"
2. **Clique para Passar**: Ao clicar no botão "PASSAR", você passa o dado para o próximo jogador
3. **Botões Desabilitados**: Após passar, seus botões de "LANÇAR" e "PASSAR" ficam desabilitados
4. **Aguarde sua Vez**: Você verá a mensagem "AGUARDE SUA VEZ..." até que o dado volte para você

### Para os Outros Jogadores

1. **Notificação Visual**: Todos os jogadores veem a mensagem "[Nome do Jogador] passou o dado!"
2. **Próximo Jogador Habilitado**: O próximo jogador na sequência recebe o dado automaticamente
3. **Botões Habilitados**: O novo jogador com o dado tem os botões "LANÇAR" e "PASSAR" habilitados

## 🔧 Implementação Técnica

### Arquivos Modificados

1. **game/js/CInterface.js**
   - Adicionado botão "PASSAR" (`_oPassDiceBut`)
   - Nova função `enablePassDice()` para controlar o botão
   - Handler `_onPassDice()` para processar o clique

2. **game/js/CGame.js**
   - Nova função `onPassDice()` que emite o evento para o servidor
   - Atualização em `onTurnUpdate()` para habilitar/desabilitar botão de passar
   - Atualização em `onTurnChange()` para controlar o botão

3. **server.js**
   - Novo evento `pass_dice` que processa a solicitação
   - Validação de que é realmente o turno do jogador
   - Chama `passShooter()` para passar para o próximo jogador
   - Emite evento `player_passed_dice` para notificar todos os jogadores

4. **game/js/game-socketio-integration.js**
   - Handler para evento `player_passed_dice` que mostra notificação
   - Atualização em `onShooterChanged` para habilitar botão de passar

## 📊 Fluxo de Eventos

```
1. Jogador A clica no botão "PASSAR"
   ↓
2. Cliente emite evento 'pass_dice' para o servidor
   ↓
3. Servidor valida:
   - Jogador está autenticado?
   - É realmente o turno do jogador?
   - Sala de jogo existe?
   ↓
4. Servidor emite 'player_passed_dice' para todos na sala
   ↓
5. Servidor chama passShooter() para mudar o atirador
   ↓
6. Servidor emite 'shooter_changed' com novo atirador
   ↓
7. Todos os clientes recebem os eventos:
   - Veem mensagem "[Jogador A] passou o dado!"
   - Botões são atualizados conforme o turno
   - Próximo jogador pode lançar ou passar
```

## ✅ Validações de Segurança

1. **Autenticação**: Verifica se o jogador está conectado ao Socket.IO
2. **Turno Válido**: Só permite passar se for realmente o turno do jogador
3. **Estado do Jogo**: Verifica se a sala de jogo existe
4. **UI Bloqueada**: Desabilita botões localmente imediatamente para evitar duplo clique

## 🎯 Regras do Botão

### Quando o Botão "PASSAR" está Habilitado:
- ✅ É o turno do jogador
- ✅ Jogador está conectado ao servidor
- ✅ Jogador é o atirador atual

### Quando o Botão "PASSAR" está Desabilitado:
- ❌ Não é o turno do jogador
- ❌ Jogador não está conectado ao servidor
- ❌ Outro jogador está com o dado

## 🧪 Como Testar

### Teste 1: Passar o Dado em Sequência
1. Abra duas janelas do jogo (duas abas do navegador)
2. Conecte ambos à mesma sala
3. O primeiro jogador a conectar terá o dado
4. Clique em "PASSAR" no primeiro jogador
5. Verifique que:
   - Mensagem aparece para ambos os jogadores
   - Botão "LANÇAR" do primeiro jogador fica desabilitado
   - Botão "LANÇAR" do segundo jogador fica habilitado
   - Botão "PASSAR" está habilitado apenas para quem tem o dado

### Teste 2: Passar sem Ser o Turno
1. Abra duas janelas do jogo
2. Tente clicar em "PASSAR" no jogador que NÃO tem o dado
3. Verifique que:
   - Botão está desabilitado
   - Nenhuma ação ocorre

### Teste 3: Passar e Lançar
1. Jogador A tem o dado
2. Jogador A passa para Jogador B
3. Jogador B lança os dados
4. Após o lançamento, o dado passa automaticamente para o próximo jogador
5. Verifique que:
   - Sistema funciona normalmente após passar manualmente
   - Turnos continuam em sequência correta

### Teste 4: Múltiplos Jogadores
1. Abra 3 ou mais janelas do jogo
2. Primeiro jogador passa o dado
3. Segundo jogador passa o dado
4. Terceiro jogador lança
5. Verifique que:
   - Dado passa em sequência circular
   - Todos veem as mensagens corretas
   - Botões são habilitados/desabilitados corretamente

## 🎨 UI/UX

### Posição do Botão
- **Localização**: Logo abaixo do botão "LANÇAR" (1080, 160)
- **Texto**: "PASSAR"
- **Cor**: Branco (#fff)
- **Fonte**: FONT1, tamanho 20

### Feedback Visual
- **Mensagem de Sucesso**: "Você passou o dado para o próximo jogador!"
- **Mensagem de Notificação**: "[Nome do Jogador] passou o dado!"
- **Mensagem de Erro**: "NÃO É SUA VEZ!" ou "VOCÊ PRECISA ESTAR CONECTADO PARA PASSAR O DADO!"

### Estados do Botão
- **Habilitado**: Botão com cor normal, clicável
- **Desabilitado**: Botão com opacidade reduzida, não clicável

## 📝 Notas de Implementação

1. **Socket.IO**: O sistema usa eventos Socket.IO em tempo real para sincronização
2. **Validação Dupla**: Validação tanto no cliente quanto no servidor para segurança
3. **Feedback Imediato**: UI atualiza imediatamente no cliente para melhor experiência
4. **Sincronização**: Todos os jogadores veem as mudanças ao mesmo tempo
5. **Estado Consistente**: Flag `_bIsMyTurn` mantém o estado do turno sincronizado

## 🚀 Próximas Melhorias Possíveis

1. **Timer de Turno**: Passar automaticamente após X segundos de inatividade
2. **Histórico**: Mostrar quem passou o dado no histórico do jogo
3. **Estatísticas**: Contar quantas vezes cada jogador passou o dado
4. **Animação**: Adicionar animação visual quando o dado é passado
5. **Som**: Adicionar efeito sonoro quando o dado é passado

## ⚙️ Configurações

Atualmente não há configurações específicas para o sistema de passar o dado. O comportamento é padrão para todos os jogadores e salas.

## 🐛 Solução de Problemas

### Problema: Botão não aparece
**Solução**: Verifique se o servidor está rodando e se você está conectado ao Socket.IO

### Problema: Botão não responde
**Solução**: Verifique se é realmente seu turno. O botão só funciona quando você tem o dado

### Problema: Mensagem de erro ao passar
**Solução**: Verifique sua conexão com o servidor. Recarregue a página se necessário

### Problema: Botão fica travado
**Solução**: Recarregue a página. O estado será resincronizado ao reconectar

## 📞 Suporte

Para problemas ou dúvidas sobre o sistema de passar o dado, verifique:
1. Console do navegador (F12) para mensagens de debug
2. Console do servidor para logs de eventos
3. Conexão de rede e Socket.IO

