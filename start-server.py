#!/usr/bin/env python3
"""
Simple HTTP Server for testing the Craps Game locally
Run this script and access http://localhost:8000
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8000

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        # Handle preflight requests
        self.send_response(200)
        self.end_headers()

    def log_message(self, format, *args):
        # Custom logging
        print(f"[{self.log_date_time_string()}] {format % args}")

def main():
    # Change to the script's directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    print("🎲 Craps Game - Servidor de Desenvolvimento")
    print("=" * 50)
    print(f"Porta: {PORT}")
    print(f"Diretório: {os.getcwd()}")
    print("=" * 50)
    
    try:
        with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
            print(f"✅ Servidor iniciado em http://localhost:{PORT}")
            print("\n📄 Páginas disponíveis:")
            print(f"   • Página inicial: http://localhost:{PORT}/")
            print(f"   • Teste de auth:  http://localhost:{PORT}/test-auth.html")
            print(f"   • Login:          http://localhost:{PORT}/auth/login.html")
            print(f"   • Registro:       http://localhost:{PORT}/auth/register.html")
            print(f"   • Jogo:           http://localhost:{PORT}/game/index.html")
            print("\n🔧 Para parar o servidor, pressione Ctrl+C")
            print("=" * 50)
            
            # Try to open browser automatically
            try:
                webbrowser.open(f'http://localhost:{PORT}/test-auth.html')
                print("🌐 Abrindo navegador automaticamente...")
            except:
                print("⚠️  Não foi possível abrir o navegador automaticamente")
            
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n\n🛑 Servidor parado pelo usuário")
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ Erro: Porta {PORT} já está em uso")
            print("   Tente usar uma porta diferente ou pare o processo que está usando a porta")
        else:
            print(f"❌ Erro ao iniciar servidor: {e}")
    except Exception as e:
        print(f"❌ Erro inesperado: {e}")

if __name__ == "__main__":
    main()