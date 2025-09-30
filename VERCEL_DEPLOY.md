# 🚀 Deploy no Vercel - Dados da Sorte Multiplayer

## 📋 Pré-requisitos

1. **Conta no Vercel**: [vercel.com](https://vercel.com)
2. **Vercel CLI** (opcional): `npm i -g vercel`
3. **Git** (para deploy automático)

## 🎯 Métodos de Deploy

### Método 1: Deploy via Dashboard (Recomendado)

1. **Acesse o Vercel Dashboard**:
   - Vá para [vercel.com/dashboard](https://vercel.com/dashboard)
   - Faça login com GitHub/GitLab/Bitbucket

2. **Conecte o Repositório**:
   - Clique em "New Project"
   - Conecte seu repositório Git
   - Selecione este projeto

3. **Configurações Automáticas**:
   - O Vercel detectará automaticamente as configurações
   - O arquivo `vercel.json` já está configurado
   - Deploy será feito automaticamente

### Método 2: Deploy via CLI

1. **Instalar Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login no Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy do Projeto**:
   ```bash
   cd /workspace
   vercel --prod
   ```

### Método 3: Deploy Manual (ZIP Upload)

1. **Criar arquivo ZIP**:
   - Compacte todos os arquivos do projeto
   - Inclua: `multiplayer-demo.html`, pasta `game/`, `vercel.json`

2. **Upload no Vercel**:
   - Vá para [vercel.com/new](https://vercel.com/new)
   - Selecione "Upload Files"
   - Faça upload do ZIP

## 🌐 URLs Disponíveis

Após o deploy, seu domínio Vercel terá estas rotas:

### 🏠 Página Principal
- `https://seu-dominio.vercel.app/` → Página de demonstração

### 🎮 Acesso Direto às Salas
- `https://seu-dominio.vercel.app/bronze` → Sala Bronze
- `https://seu-dominio.vercel.app/prata` → Sala Prata  
- `https://seu-dominio.vercel.app/ouro` → Sala Ouro

### 🎲 Jogo Completo
- `https://seu-dominio.vercel.app/game` → Jogo completo

## ⚙️ Configurações do Vercel

### Arquivo `vercel.json` Configurado:

```json
{
  "version": 2,
  "rewrites": [
    {
      "source": "/",
      "destination": "/multiplayer-demo.html"
    },
    {
      "source": "/bronze",
      "destination": "/game/index.html?room=bronze"
    },
    {
      "source": "/prata", 
      "destination": "/game/index.html?room=prata"
    },
    {
      "source": "/ouro",
      "destination": "/game/index.html?room=ouro"
    }
  ]
}
```

### Headers de Segurança:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

### Cache Otimizado:
- **JS/CSS**: 1 dia de cache
- **Assets**: 1 ano de cache (imutáveis)

## 🎮 Como Testar o Multiplayer no Vercel

1. **Acesse seu domínio Vercel**:
   ```
   https://seu-dominio.vercel.app
   ```

2. **Escolha uma sala** (Bronze, Prata ou Ouro)

3. **Abra múltiplas abas**:
   - Clique com botão direito na sala
   - "Abrir link em nova aba"
   - Repita para criar vários jogadores

4. **Jogue em turnos**:
   - Cada aba representa um jogador
   - Sistema de turnos automático
   - Sincronização em tempo real

## 🔧 Variáveis de Ambiente (Opcional)

Se precisar de configurações específicas:

```bash
# No dashboard do Vercel, vá em Settings > Environment Variables
GAME_TITLE=Dados da Sorte
MULTIPLAYER_MODE=offline
MAX_PLAYERS_PER_ROOM=8
```

## 📊 Monitoramento

### Analytics do Vercel:
- Acesse "Analytics" no dashboard
- Veja visitantes, performance, etc.

### Logs em Tempo Real:
```bash
vercel logs seu-dominio.vercel.app
```

## 🚨 Troubleshooting

### Problema: localStorage não funciona
**Solução**: Certifique-se de que está acessando via HTTPS (Vercel usa HTTPS por padrão)

### Problema: Arquivos não carregam
**Solução**: Verifique se todos os arquivos estão na raiz do projeto

### Problema: Redirecionamentos não funcionam
**Solução**: Confirme se o `vercel.json` está na raiz do projeto

## 🎉 Recursos do Deploy

### ✅ **Funcionalidades Ativas:**
- Sistema multiplayer offline completo
- 3 salas com diferentes limites
- Sistema de turnos automático
- Sincronização entre abas
- Interface responsiva
- URLs amigáveis

### 🌟 **Vantagens do Vercel:**
- Deploy automático via Git
- HTTPS gratuito
- CDN global
- Analytics integrado
- Domínio personalizado
- Zero configuração

## 📱 Compartilhamento

### Links Diretos para Compartilhar:
```
🥉 Sala Bronze: https://seu-dominio.vercel.app/bronze
🥈 Sala Prata:  https://seu-dominio.vercel.app/prata  
🥇 Sala Ouro:   https://seu-dominio.vercel.app/ouro
```

### QR Code:
- Use ferramentas online para gerar QR codes
- Facilita acesso via mobile

---

**🎲 Seu jogo multiplayer está pronto para o mundo!**

Compartilhe o link e divirta-se jogando Dados da Sorte com amigos em tempo real! 🚀