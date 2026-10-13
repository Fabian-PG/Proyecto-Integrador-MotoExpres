import subprocess
import sys
import time
import os

def get_venv_python():
    """Retorna el path al Python del .venv del proyecto, sin importar cuál Python corre este script."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    # El .venv está un nivel arriba del proyecto (en proyecto_final/)
    venv_python = os.path.join(base_dir, "..", ".venv", "Scripts", "python.exe")
    venv_python = os.path.normpath(venv_python)
    if os.path.exists(venv_python):
        return venv_python
    # Fallback: usar el Python actual
    print(f"ADVERTENCIA: No se encontró .venv en {venv_python}, usando Python del sistema.")
    return sys.executable

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(base_dir, "backend")
    frontend_dir = os.path.join(base_dir, "frontend")
    python_exe = get_venv_python()

    print("==================================================")
    print("  Iniciando Plataforma de Inteligencia de Negocios  ")
    print("==================================================")
    print(f"  Python: {python_exe}")
    print("==================================================")

    # 1. Start Backend FastAPI
    print("[1/2] Iniciando Servidor Backend Python (FastAPI en http://localhost:8000)...")
    backend_cmd = [python_exe, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
    backend_process = subprocess.Popen(backend_cmd, cwd=backend_dir)

    time.sleep(5)  # Dar tiempo suficiente al backend para iniciar antes que el frontend

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
        backend_process.terminate()
        frontend_process.terminate()
        print("Servidores detenidos.")

if __name__ == "__main__":
    main()
