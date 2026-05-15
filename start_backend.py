import sys
sys.path.append('backend')

import os
# En desarrollo local usamos sqlite en backend/DeibyVargas.DB.

import uvicorn
from app.main import app

if __name__ == "__main__":
    print("🚀 Iniciando servidor UNIBOOKS local...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)