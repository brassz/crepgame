# 🚨 Solução para Erro "Unexpected token '<'"

## O Problema
Você está recebendo erros como:
```
jquery-3.2.1.min.js:1 Uncaught SyntaxError: Unexpected token '<'
```

**Causa**: Você está abrindo os arquivos HTML diretamente no navegador (protocolo `file://`), mas os JavaScript estão tentando carregar outros arquivos que não são encontrados.

## ✅ Soluções

### Solução 1: Servidor Python (Recomendado)

1. **Abra o terminal na pasta do projeto**
2. **Execute o servidor**:
   ```bash
   python3 start-server.py
   ```
   ou
   ```bash
   python start-server.py
   ```

3. **Acesse no navegador**:
   - Teste: http://localhost:8000/test-auth.html
   - Login: http://localhost:8000/auth/login.html
   - Jogo: http://localhost:8000/game/index.html

### Solução 2: Servidor Node.js

Se você tem Node.js instalado:
```bash
npx http-server -p 8000 -c-1
```

### Solução 3: Servidor PHP

Se você tem PHP instalado:
```bash
php -S localhost:8000
```

### Solução 4: Live Server (VS Code)

1. Instale a extensão "Live Server" no VS Code
2. Clique com botão direito em `index.html`
3. Selecione "Open with Live Server"

## 🧪 Teste Rápido

1. **Execute o servidor Python**:
   ```bash
   python3 start-server.py
   ```

2. **Acesse a página de teste**:
   http://localhost:8000/test-auth.html

3. **Verifique se tudo está funcionando**:
   - ✅ jQuery carregado
   - ✅ Supabase SDK carregado  
   - ✅ Sistema de Auth carregado

## 🎯 Fluxo de Teste

1. **Página de teste** → Verificar se sistema funciona
2. **Login/Registro** → Testar autenticação
3. **Modo visitante** → Jogar sem conta
4. **Jogo principal** → Testar integração

## ⚠️ Notas Importantes

- **NÃO abra** arquivos HTML diretamente (file://)
- **SEMPRE use** servidor HTTP local
- **Para produção**, use servidor web real (Apache, Nginx, etc.)

## 🔧 Se ainda não funcionar

1. **Verifique o console** do navegador (F12)
2. **Teste a página**: http://localhost:8000/test-auth.html
3. **Veja se todos os arquivos** estão sendo carregados
4. **Verifique se não há** bloqueador de anúncios interferindo

## 📱 Teste no Mobile

O servidor também funciona no mobile:
1. **Descubra seu IP local**: `ipconfig` (Windows) ou `ifconfig` (Mac/Linux)
2. **Acesse no mobile**: http://SEU_IP:8000

---

**🎲 Depois que resolver isso, o sistema de autenticação funcionará perfeitamente!**