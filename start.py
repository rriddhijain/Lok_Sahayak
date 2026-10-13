"""Start both local services from any working directory."""
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time

root = Path(__file__).resolve().parent
npm = shutil.which('npm.cmd' if os.name == 'nt' else 'npm')
if not npm:
    sys.exit('Node.js/npm is missing. Install Node.js 20 or newer first.')
if not (root / 'frontend/node_modules').exists():
    sys.exit('Run npm ci inside frontend/ before starting.')
processes = []
try:
    processes.append(subprocess.Popen([sys.executable, '-m', 'uvicorn', 'backend.main:app', '--host', '127.0.0.1', '--port', '8000'], cwd=root))
    processes.append(subprocess.Popen([npm, 'run', 'dev'], cwd=root / 'frontend'))
    print('Lok Sahayak: http://localhost:3000 | API: http://localhost:8000/docs', flush=True)
    while all(p.poll() is None for p in processes):
        time.sleep(.5)
    sys.exit('A service stopped. Check the error above and the setup instructions in README.md.')
except KeyboardInterrupt:
    print('\nStopping services…')
finally:
    for process in processes:
        if process.poll() is None:
            process.terminate()
    for process in processes:
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
