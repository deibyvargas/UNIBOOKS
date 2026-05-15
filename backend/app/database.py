import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Cargamos variables de entorno desde un archivo .env si existe
load_dotenv()

# --- LÓGICA DE CONEXIÓN DINÁMICA ---
# Si defines DATABASE_URL en producción o pruebas, se usa esa conexión.
# De lo contrario, por defecto se usa SQLite local en 'backend/DeibyVargas.DB'.
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./DeibyVargas.DB")

# Corrección de protocolo para SQLAlchemy (Heroku usa postgres:// pero se requiere postgresql://)
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Configuramos el motor según la base de datos
if "sqlite" in SQLALCHEMY_DATABASE_URL:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, 
        connect_args={"check_same_thread": False} # Solo para SQLite
    )
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def inicializar_base_de_datos():
    """
    Sincroniza los modelos con la base de datos (Local o Heroku).
    """
    try:
        from app import models
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
        return True
    except Exception as e:
        print(f"❌ Error al conectar la base de datos: {e}")