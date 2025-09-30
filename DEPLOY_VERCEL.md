# Guia de Deploy para Vercel - Jogo de Dados Multiplayer

## Problemas Identificados e Soluções

### 1. Problema: Socket.IO não funcionava no Vercel
**Causa**: Vercel não suporta servidores WebSocket persistentes como o Express tradicional.

**Solução**: Migração para Serverless Functions do Vercel com Socket.IO.

### 2. Mudanças Realizadas

#### A. Configuração do Vercel (`vercel.json`)
- Configurado para usar Serverless Functions
- Roteamento correto para Socket.IO
- Servir arquivos estáticos da pasta `game/`

#### B. Serverless Function (`api/socket.js`)
- Criada função serverless para gerenciar conexões Socket.IO
- Mantém toda a lógica de salas e turnos
- Compatível com a arquitetura do Vercel

#### C. Cliente (`game/js/realtime.js` e `game/index.html`)
- Atualizado para usar CDN do Socket.IO
- Configurado path correto para conectar à função serverless
- Mantém compatibilidade com o código existente

## Como Fazer o Deploy

### 1. Pré-requisitos
```bash
npm install -g vercel
```

### 2. Deploy
```bash
# Na pasta raiz do projeto
vercel --prod
```

### 3. Configurações Importantes
- Node.js 18+ (configurado no package.json)
- Socket.IO 4.7.5 (via CDN)
- Transports: websocket e polling (fallback)

## Testando o Multiplayer

### 1. Após o Deploy
1. Acesse sua URL do Vercel
2. Faça login em duas abas/navegadores diferentes
3. Entre na mesma sala (Bronze, Prata ou Ouro)
4. Teste a funcionalidade de turnos

### 2. Verificações
- ✅ Conexão Socket.IO estabelecida
- ✅ Contagem de jogadores atualizada
- ✅ Sistema de turnos funcionando
- ✅ Dados sincronizados entre jogadores
- ✅ Timers de turno funcionando

## Estrutura de Arquivos Atualizada

```
/
├── api/
│   └── socket.js          # Serverless function para Socket.IO
├── game/                  # Arquivos estáticos do jogo
│   ├── index.html        # Atualizado com CDN Socket.IO
│   └── js/
│       └── realtime.js   # Atualizado para Vercel
├── vercel.json           # Configuração do Vercel
└── package.json          # Dependências atualizadas
```

## Troubleshooting

### Se o multiplayer ainda não funcionar:

1. **Verifique o Console do Navegador**
   - Procure por erros de conexão Socket.IO
   - Verifique se o path `/api/socket` está sendo usado

2. **Teste a Função Serverless**
   - Acesse `https://seu-dominio.vercel.app/api/socket`
   - Deve retornar sem erro (resposta vazia é normal)

3. **Verifique os Logs do Vercel**
   ```bash
   vercel logs
   ```

### Comandos Úteis

```bash
# Deploy de desenvolvimento
vercel

# Deploy de produção
vercel --prod

# Ver logs
vercel logs

# Ver informações do projeto
vercel ls
```

## Notas Importantes

- O Vercel pode ter limitações de tempo para conexões WebSocket (função serverless)
- Para jogos com muitos jogadores simultâneos, considere usar um serviço dedicado de WebSocket
- O estado do jogo é mantido em memória da função serverless (pode ser perdido em reinicializações)

## Próximos Passos (Opcional)

Para melhorar a escalabilidade:
1. Implementar Redis para persistir estado das salas
2. Usar um serviço dedicado de WebSocket (como Socket.IO com Redis adapter)
3. Implementar reconexão automática mais robusta