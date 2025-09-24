# 🎲 Guia do Jogo Multiplayer - Dados da Sorte

## 🎯 Visão Geral

O jogo Dados da Sorte é um **jogo exclusivamente multiplayer** em tempo real usando Socket.IO! Os jogadores devem se conectar a salas online, fazer apostas juntos e jogar de forma sincronizada com outros jogadores.

## 🚀 Como Iniciar o Servidor

1. **Instalar dependências:**
```bash
npm install
```

2. **Iniciar o servidor:**
```bash
npm start
# ou 
node server.js
```

3. **Acessar o jogo:**
- Abra o navegador em: `http://localhost:3000`
- O jogo será carregado automaticamente

## 🏠 Sistema de Salas

### Salas Disponíveis

| 🏠 Sala | 💰 Aposta Min | 💰 Aposta Max | 👥 Max Jogadores | 📝 Descrição |
|---------|---------------|---------------|------------------|---------------|
| 🟢 **Mesa Principal** | R$ 50 | Sem limite | 8 jogadores | Mesa padrão do jogo |
| 🟤 **Mesa VIP** | R$ 500 | Sem limite | 6 jogadores | Para apostas altas |
| 🟣 **Mesa Iniciante** | R$ 10 | R$ 1.000 | 10 jogadores | Para iniciantes |

### Como Entrar em uma Sala

1. **Conecte-se ao jogo** - O seletor de salas aparecerá automaticamente
2. **Escolha uma sala** - Clique na sala desejada
3. **Aguarde confirmação** - Você será conectado se houver espaço
4. **Comece a jogar!** - Faça suas apostas e divirta-se

## 🎮 Como Jogar Multiplayer

### 🎲 Sistema de Dealer

- **O primeiro jogador** a entrar na sala se torna o **DEALER**
- **Apenas o DEALER** pode rolar os dados
- Se o dealer sair, outro jogador assume automaticamente
- O dealer atual é indicado na interface com 🎲

### 💰 Fazendo Apostas

1. **Selecione uma ficha** (valor da aposta)
2. **Clique em "APOSTE AQUI"** na mesa
3. **Sua aposta é sincronizada** com todos os jogadores
4. **Outros jogadores veem** sua aposta em tempo real

### 🎯 Lançando os Dados

1. **Se você é o DEALER:**
   - Clique no botão "ROLAR DADOS"
   - Os dados são lançados para todos simultaneamente
   
2. **Se você não é o DEALER:**
   - Aguarde o dealer rolar os dados
   - Você verá o resultado em tempo real

### 🧹 Limpando Apostas

- Clique em "LIMPAR APOSTAS" para remover suas apostas
- Suas apostas são devolvidas ao seu saldo
- Outros jogadores são notificados da ação

## 📱 Interface Multiplayer

### 🎪 Elementos Visuais

- **👥 Indicadores de Jogadores:** Círculos dourados mostram outros jogadores
- **🎲 Status do Dealer:** Indicação clara de quem é o dealer
- **💬 Mensagens em Tempo Real:** Notificações de ações de outros jogadores
- **📊 Informações da Sala:** Dados atualizados em tempo real

### 🎨 Indicadores Visuais

- **🟡 Círculo Dourado:** Outro jogador na mesa
- **🎲 Ícone de Dados:** Você é o dealer
- **💫 Animações:** Fichas voando quando alguém aposta
- **🏆 Textos Coloridos:** Resultados e notificações

## 🔧 Recursos Técnicos

### 🌐 Tecnologias Utilizadas

- **Socket.IO 4.7.5:** Comunicação em tempo real
- **Express.js 4.18.2:** Servidor web
- **Node.js:** Backend do servidor
- **CreateJS:** Interface do jogo no frontend

### 📡 Eventos Sincronizados

- ✅ **Entrada/Saída de Jogadores**
- ✅ **Apostas de Jogadores**
- ✅ **Lançamento de Dados**
- ✅ **Resultados do Jogo**
- ✅ **Mudanças de Estado**
- ✅ **Atualização de Saldos**

### 🛡️ Segurança e Validação

- **Validação Server-side:** Todas as ações são validadas no servidor
- **Prevenção de Trapaça:** Dados gerados apenas no servidor
- **Limites de Aposta:** Respeitados automaticamente por sala
- **Sincronização:** Estado do jogo sempre consistente

## 🎪 Fluxo do Jogo Multiplayer

### 1️⃣ **Conexão Inicial**
```
Jogador conecta → Seletor de Salas → Escolhe Sala → Entra na Mesa
```

### 2️⃣ **Fase de Apostas**
```
Jogadores fazem apostas → Apostas sincronizadas → Dealer pode rolar dados
```

### 3️⃣ **Lançamento dos Dados**
```
Dealer rola dados → Animação sincronizada → Resultado processado
```

### 4️⃣ **Processamento de Resultados**
```
Servidor calcula ganhos/perdas → Saldos atualizados → Nova rodada
```

## 🆘 Solução de Problemas

### 🔌 Problemas de Conexão

**Sintoma:** Não consegue conectar ao servidor
```bash
# Verificar se o servidor está rodando
curl http://localhost:3000/api/rooms

# Se não funcionar, reinicie o servidor
npm start
```

**Sintoma:** Desconectado durante o jogo
- **IMPORTANTE:** O jogo não funciona offline - é necessária conexão com o servidor
- O jogo tentará reconectar automaticamente
- Recarregue a página se necessário
- Certifique-se de que o servidor está rodando

### 🎮 Problemas de Jogabilidade

**Sintoma:** Não consegue rolar os dados
- ✅ Verifique se você é o dealer (ícone 🎲)
- ✅ Certifique-se de que há apostas ativas
- ✅ Aguarde outros jogadores terminarem apostas

**Sintoma:** Apostas não aparecem
- ✅ Verifique sua conexão com o servidor
- ✅ Certifique-se de ter saldo suficiente
- ✅ Respeite os limites da sala

### 🏠 Problemas de Sala

**Sintoma:** Não consegue entrar na sala
- ✅ Sala pode estar cheia (veja o limite de jogadores)
- ✅ Verifique se tem saldo mínimo para a sala
- ✅ Tente outra sala disponível

## 📊 API de Monitoramento

### 🔍 Verificar Status das Salas
```bash
curl http://localhost:3000/api/rooms
```

Retorna informações em tempo real sobre todas as salas:
- Número de jogadores ativos
- Estado do jogo em cada sala
- Configurações das salas

## 🎉 Recursos Avançados

### 🎪 Personalização de Salas

O sistema está preparado para facilmente adicionar:
- ✨ Novas salas com diferentes regras
- 🎨 Temas visuais personalizados
- 🏆 Torneios e rankings
- 💎 Salas premium com benefícios especiais

### 🔮 Futuras Melhorias

- 💬 **Chat entre jogadores**
- 🏆 **Sistema de ranking**
- 🎁 **Recompensas diárias**
- 📱 **Otimização mobile**
- 🎵 **Efeitos sonoros sincronizados**
- 🔐 **Salas privadas com senha**
- 🏟️ **Torneios programados**

## 🎯 Começar a Jogar

1. **Execute o servidor:** `npm start`
2. **Abra o navegador:** `http://localhost:3000`  
3. **Escolha uma sala:** Mesa Principal, VIP ou Iniciante
4. **Faça login:** Use suas credenciais existentes
5. **Comece a apostar:** Clique nas fichas e aposte!
6. **Divirta-se:** Jogue com amigos em tempo real!

---

## 🤝 Suporte

Para problemas técnicos ou sugestões:
- 📧 Verifique os logs do console do navegador
- 🔧 Reinicie o servidor se necessário  
- 🎮 Recarregue a página em caso de desconexão

**🎲 Boa sorte e divirta-se jogando Dados da Sorte Multiplayer! 🎲**