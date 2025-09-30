# Deploy no Render

## Configuração para Multiplayer

### 1. Configurações no Render

1. **Conecte seu repositório** ao Render
2. **Configurações do serviço:**
   - **Type:** Web Service
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free (ou superior)

### 2. Variáveis de Ambiente

Configure estas variáveis no painel do Render:

```
NODE_ENV=production
```

### 3. Verificação de Funcionalidade

Após o deploy, verifique:

1. **Logs do servidor** - devem mostrar:
   ```
   Server listening on http://0.0.0.0:[PORT]
   Environment: production
   ```

2. **Console do navegador** - deve mostrar:
   ```
   Conectando ao Socket.IO... {hostname: "seu-app.onrender.com", isProduction: true}
   Socket.IO conectado com sucesso! ID: [socket-id]
   ```

3. **Teste multiplayer:**
   - Abra o jogo em duas abas/navegadores diferentes
   - Entre na mesma sala
   - Verifique se os jogadores aparecem em ambas as telas
   - Teste se os dados funcionam para ambos os jogadores

### 4. Solução de Problemas

**Problema:** Socket.IO não conecta
- Verifique se o Render não está bloqueando WebSockets
- Confirme se a variável NODE_ENV está configurada como "production"
- Verifique os logs do servidor no painel do Render

**Problema:** Multiplayer funciona localmente mas não em produção
- Confirme se o cliente está detectando corretamente o ambiente de produção
- Verifique se não há erros de CORS nos logs

**Problema:** Conexão instável
- O plano Free do Render pode ter limitações
- Considere upgrade para plano pago se necessário

### 5. Arquivos Importantes

- `server.js` - Servidor principal (configurado para Render)
- `game/js/realtime.js` - Cliente Socket.IO (com detecção de ambiente)
- `render.yaml` - Configuração opcional do Render