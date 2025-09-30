# 🎲 Jogo de Craps Online Multiplayer

Um jogo de craps completo desenvolvido em JavaScript com interface moderna e funcionalidade multiplayer em tempo real.

## 🎮 Como Jogar

1. **Aposte**: Clique no botão "APOSTE AQUI" para fazer sua aposta
2. **Escolha fichas**: Selecione o valor da ficha no lado esquerdo
3. **Lance os dados**: Clique em "ROLL" para lançar os dados
4. **Resultado**: 
   - **7 ou 11**: Ganha o dobro da aposta
   - **2, 3 ou 12**: Perde tudo
   - **Outros números**: Pergunta se quer continuar apostando contra o 7

## 🎯 Regras da Mesa

### Salas Disponíveis
- **Bronze**: Aposta mín. 50, máx. 1.000 - 8 jogadores
- **Prata**: Aposta mín. 100, máx. 3.000 - 8 jogadores  
- **Ouro**: Aposta mín. 200, máx. 5.000 - 8 jogadores

### Multiplayer
- Turnos alternados entre jogadores
- Timer de 25 segundos por turno
- Sincronização em tempo real via polling

## 🚀 Deploy no Vercel

Este projeto está configurado para deploy automático no Vercel.

### Deploy Manual
```bash
# Instalar Vercel CLI
npm i -g vercel

# Fazer deploy
vercel

# Deploy de produção
vercel --prod
```

### Deploy Automático
- Conecte o repositório GitHub ao Vercel
- O deploy acontece automaticamente a cada push

## 📁 Estrutura do Projeto

```
├── api/
│   └── game-state.js       # Vercel Function para multiplayer
├── game/
│   ├── index.html          # Página principal
│   ├── js/
│   │   ├── realtime-polling.js  # Cliente multiplayer
│   │   └── ...             # Outros arquivos JS
│   ├── assets/             # Sprites e sons
│   └── css/                # Estilos
├── vercel.json             # Configuração do Vercel
└── package.json            # Dependências
```

## 🛠️ Tecnologias

- **JavaScript**: Lógica do jogo
- **CreateJS**: Engine de animação  
- **Vercel Functions**: Backend serverless para multiplayer
- **Polling**: Comunicação em tempo real
- **HTML5**: Estrutura
- **CSS3**: Estilos

## 🌐 Sistema Multiplayer

### Arquitetura
- **Vercel Functions**: API serverless em `/api/game-state`
- **Polling**: Cliente consulta estado a cada 1 segundo
- **Estado em memória**: Simples e eficaz para jogos casuais
- **Turnos sincronizados**: Timer compartilhado entre jogadores

### Funcionalidades
- ✅ Salas com múltiplos jogadores (até 8 por sala)
- ✅ Turnos alternados automáticos
- ✅ Timer visual de 25 segundos por turno
- ✅ Sincronização de dados dos dados entre jogadores
- ✅ Entrada/saída dinâmica de jogadores
- ✅ Compatível com Vercel (sem WebSockets)

### Limitações
- Estado reinicia a cada deploy (normal em serverless)
- Polling de 1s (não instantâneo como WebSockets)
- Adequado para jogos casuais, não competitivos

## 📱 Responsivo

O jogo funciona em:
- Desktop
- Tablet
- Mobile

## 🔧 Configurações

Todas as configurações estão em `game/index.html`:
- Dinheiro inicial
- Aposta mínima/máxima
- Configurações de áudio
- Configurações de tela cheia

## 🔐 Autenticação (Supabase)

1) Criar projeto no Supabase
- Acesse `https://supabase.com` e crie um projeto
- Em Project Settings → API, copie:
  - `Project URL`
  - `anon public` key

2) Configurar chaves no frontend
- Abra `game/js/auth-config.js` e preencha:
  - `window.SUPABASE_URL = "https://SEU-PROJ.supabase.co"`
  - `window.SUPABASE_ANON_KEY = "SUA_CHAVE_ANON"`

3) Provedores
- O projeto está configurado para email/senha apenas. Não é necessário ativar OAuth.

4) Fluxo de uso
- Acesse `game/register.html` para criar conta (email/senha ou Google/Facebook)
- Depois de logado, você será redirecionado para `game/index.html`
- A página `game/index.html` exige sessão ativa e tem botão "Sair"

Observações
- Nunca exponha a `service_role key` no frontend
- Certifique-se de incluir o script do Supabase no HTML (já incluso nas páginas)

## 📄 Licença

MIT License - Use livremente para projetos pessoais e comerciais.