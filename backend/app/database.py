import os
import urllib.parse  # <--- ESTA ES LA LÍNEA QUE FALTA
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Cargamos variables de entorno desde un archivo .env si existe
load_dotenv()

# --- LÓGICA DE CONEXIÓN DINÁMICA ---
# 1. Azure nos dará la URL en la variable de entorno 'DATABASE_URL'. 
# 2. Si no existe, usará SQLite local para pruebas rápidas.
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./DeibyVargas.DB")
db_type = "Azure SQL (Cloud)" if "unibooks.database.windows.net" in SQLALCHEMY_DATABASE_URL else "SQLite (Local)"

engine_kwargs = {
    "connect_args": {},
    "pool_pre_ping": True,  # Verifica la conexión antes de usarla (vital para Azure)
    "pool_recycle": 1800,   # Recicla conexiones cada 30 min
    "pool_size": 10,        # Conexiones simultáneas permitidas
    "max_overflow": 20      # Conexiones extra en picos de tráfico
}

if "sqlite" in SQLALCHEMY_DATABASE_URL:
    engine_kwargs["connect_args"]["check_same_thread"] = False
    
engine = create_engine(SQLALCHEMY_DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def inicializar_base_de_datos():
    """
    Sincroniza los modelos con la base de datos (Local o Azure SQL).
    """
    try:
        from . import models 
        Base.metadata.create_all(bind=engine)

        # Extraer el host para confirmación visual
        if "@" in SQLALCHEMY_DATABASE_URL:
            host = SQLALCHEMY_DATABASE_URL.split('@')[-1].split('/')[0]
        else:
            host = "Localhost"

        print("--- SISTEMA UNIBOOKS ---")
        print(f"✅ Base de datos conectada: {SQLALCHEMY_DATABASE_URL.split(':')[0]}")
        print(f"📡 Servidor: {host}")

        print("-------------------------")
    except Exception as e:
        print(f"❌ Error al inicializar las tablas: {e}")