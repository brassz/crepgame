# 🎲 Jogo de Craps Online

Um jogo de craps completo desenvolvido em JavaScript com interface moderna.

## 🎮 Como Jogar

1. **Aposte**: Clique no botão "APOSTE AQUI" para fazer sua aposta
2. **Escolha fichas**: Selecione o valor da ficha no lado esquerdo
3. **Lance os dados**: Clique em "ROLL" para lançar os dados
4. **Resultado**: 
   - **7 ou 11**: Ganha o dobro da aposta
   - **2, 3 ou 12**: Perde tudo
   - **Outros números**: Pergunta se quer continuar apostando contra o 7

## 🎯 Regras da Mesa

- **Aposta mínima**: 50 reais
- **Aposta máxima**: Sem limite
- **Máximo de jogadores**: 8

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
├── game/
│   ├── index.html          # Página principal
│   ├── js/                 # Arquivos JavaScript
│   ├── assets/             # Sprites e sons
│   └── css/                # Estilos
├── vercel.json             # Configuração do Vercel
└── package.json            # Dependências
```

## 🛠️ Tecnologias

- **JavaScript**: Lógica do jogo
- **CreateJS**: Engine de animação
- **HTML5**: Estrutura
- **CSS3**: Estilos

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

## 📄 Licença

MIT License - Use livremente para projetos pessoais e comerciais.