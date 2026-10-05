import subprocess
import sys
import time
import os

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(base_dir, "backend")
    frontend_dir = os.path.join(base_dir, "frontend")

    print("==================================================")
    print("  Iniciando Plataforma de Inteligencia de Negocios  ")
    print("==================================================")

    # 1. Start Backend FastAPI
    print("[1/2] Iniciando Servidor Backend Python (FastAPI en http://localhost:8000)...")
    backend_cmd = [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
    backend_process = subprocess.Popen(backend_cmd, cwd=backend_dir)

    time.sleep(2)

    # 2. Start Frontend Vite
    print("[2/2] Iniciando Servidor Frontend React (Vite en http://localhost:3000)...")
    frontend_cmd = ["npm.cmd" if os.name == 'nt' else "npm", "run", "dev"]
    frontend_process = subprocess.Popen(frontend_cmd, cwd=frontend_dir)

    print("\n✓ Plataforma iniciada con éxito!")
    print("👉 Abre tu navegador en: http://localhost:3000")
    print("👉 Documentación API Swagger: http://localhost:8000/docs")
    print("\nPresiona Ctrl+C para detener ambos servidores.\n")

    try:
        backend_process.wait()
        frontend_process.wait()
    except KeyboardInterrupt:
        print("\nDeteniendo servidores...")
        for p in [backend_process, frontend_process]:
            try:
                if p and p.poll() is None:
                    p.terminate()
                    p.wait(timeout=2)
            except Exception:
                try:
                    p.kill()
                except Exception:
                    pass
        print("Servidores detenidos.")

if __name__ == "__main__":
    main()
