import os
import urllib.parse  # <--- ESTA ES LA LÍNEA QUE FALTA
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# --- CONFIGURACIÓN DE CREDENCIALES (Azure) ---
connection_string = os.getenv('AZURE_SQL_CONNECTIONSTRING')
if connection_string:
    SQLALCHEMY_DATABASE_URL = f"mssql+pyodbc:///?odbc_connect={connection_string}"
    db_type = "Azure SQL (Cloud)"
else:
    # Fallback a SQLite si no hay connection string
    SQLALCHEMY_DATABASE_URL = "sqlite:///./DeibyVargas.DB"
    db_type = "SQLite (Local)"

try:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True
    )
    # Intento de conexión real para validar
    engine.connect()
    print(f"✅ Base de datos conectada: {db_type}")

except Exception as e:
    print(f"⚠️ Error conectando a {db_type}: {e}")
    # Si falla, usar SQLite como último recurso
    SQLALCHEMY_DATABASE_URL = "sqlite:///./DeibyVargas.DB"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
    db_type = "SQLite (Local - Fallback)"
    print(f"✅ Base de datos conectada: {db_type}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def inicializar_base_de_datos():
    """
    Sincroniza los modelos con la base de datos seleccionada.
    """
    try:
        from . import models 
        Base.metadata.create_all(bind=engine)
        
        print("--- SISTEMA UNIBOOKS ---")
        print(f"✅ Base de datos conectada: {db_type}")
        print("-------------------------")
    except Exception as e:
        print(f"❌ Error al inicializar las tablas: {e}")