# Fix Multiplayer no Vercel - Guia de Deploy

## Problemas Corrigidos

### 1. Configuração do Socket.IO para Serverless
- ✅ Convertido de ES6 imports para CommonJS (require)
- ✅ Usado `global` para persistir estado entre invocações
- ✅ Evitado re-inicialização desnecessária do Socket.IO
- ✅ Melhorada configuração CORS

### 2. Configuração do Vercel
- ✅ Adicionado `maxDuration: 30` para funções serverless
- ✅ Melhorado roteamento para `/api/socket` e `/socket.io/*`
- ✅ Adicionados headers CORS apropriados

### 3. Cliente Socket.IO
- ✅ Configurado para usar `polling` primeiro (melhor para serverless)
- ✅ Adicionado retry logic e timeouts apropriados
- ✅ Logs de debug para diagnóstico

## Como Fazer o Deploy

### 1. Instalar Vercel CLI (se ainda não tiver)
```bash
npm install -g vercel
```

### 2. Fazer Login no Vercel
```bash
vercel login
```

### 3. Deploy do Projeto
```bash
# Na pasta raiz do projeto
vercel --prod
```

### 4. Configurar Domínio (opcional)
```bash
vercel domains add seu-dominio.com
vercel alias seu-projeto.vercel.app seu-dominio.com
```

## Verificação do Funcionamento

### 1. Abrir Console do Navegador
Após o deploy, acesse o jogo e abra o console (F12). Você deve ver:
```
Socket.IO connected successfully! [socket-id]
```

### 2. Testar Multiplayer
1. Abra o jogo em duas abas/navegadores diferentes
2. Entre na mesma sala (Bronze, Prata ou Ouro)
3. Verifique se o contador de jogadores atualiza
4. Teste se os turnos funcionam corretamente

### 3. Logs do Servidor
No painel do Vercel, vá em "Functions" > "api/socket.js" > "View Function Logs" para ver:
```
Initializing Socket.IO server...
Setting up Socket.IO event listeners...
Client connected: [socket-id]
Join room request: bronze from [socket-id]
```

## Possíveis Problemas e Soluções

### 1. Socket.IO não conecta
**Sintoma**: Console mostra "Socket.IO connection error"
**Solução**: 
- Verificar se a função `/api/socket.js` está sendo executada
- Verificar logs no painel do Vercel
- Tentar forçar polling: adicionar `?transport=polling` na URL

### 2. Estado não persiste
**Sintoma**: Jogadores somem ao recarregar a página
**Solução**: 
- Verificar se `global.roomState` está sendo usado
- Considerar usar Redis ou banco de dados para estado persistente

### 3. Timeouts frequentes
**Sintoma**: Conexões caem constantemente
**Solução**:
- Aumentar `maxDuration` no vercel.json
- Considerar usar WebSockets dedicados (não serverless)

## Limitações do Vercel Serverless

⚠️ **Importante**: Funções serverless do Vercel têm limitações:
- Máximo 30 segundos de execução
- Estado não persiste entre invocações frias
- WebSockets podem ser instáveis

Para alta performance, considere:
- Railway.app ou Render.com para servidor dedicado
- Redis para estado compartilhado
- WebSocket dedicado (não serverless)

## Comandos Úteis

```bash
# Ver logs em tempo real
vercel logs [deployment-url]

# Redeploy forçado
vercel --force

# Ver informações do projeto
vercel inspect [deployment-url]
```

## Próximos Passos

1. ✅ Deploy com as correções
2. 🔄 Testar multiplayer em produção
3. 📊 Monitorar logs e performance
4. 🚀 Considerar migração para servidor dedicado se necessário