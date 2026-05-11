import os
import urllib
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 1. Intentar obtener la cadena de conexión de las variables de entorno de Azure
# Para Azure SQL, la URL suele venir como: mssql+pyodbc://usuario:password@servidor.database.windows.net/nombre_bd?driver=ODBC+Driver+18+for+SQL+Server
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Si no hay variable de entorno, usamos SQLite para pruebas locales
    DATABASE_URL = "sqlite:///./DeibyVargas.DB"

# 2. Configuración del Engine
if "sqlite" in DATABASE_URL:
    engine = create_engine(
        DATABASE_URL, 
        connect_args={"check_same_thread": False}
    )
else:
    # Para Azure SQL Database
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=3600
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def inicializar_base_de_datos():
    try:
        import app.models.models
        Base.metadata.create_all(bind=engine)
        print("--- SISTEMA UNIBOOKS ---")
        print(f"✅ Conectado a: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else 'SQLite Local'}")
        print("✅ Estructura sincronizada correctamente ✅")
        print("-------------------------")
    except Exception as e:
        print(f"❌ Error en la base de datos: {e}")