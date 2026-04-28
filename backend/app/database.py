from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Mantenemos DeibyVargas.DB para persistencia
SQLALCHEMY_DATABASE_URL = "sqlite:///./DeibyVargas.DB"

# Creamos el motor de conexión
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}
)

# Configuramos la fábrica de sesiones
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para los modelos
Base = declarative_base()

def inicializar_base_de_datos():
    """
    Sincroniza los modelos con el archivo DeibyVargas.DB.
    """
    try:
        from . import models 
        
        # Crea las tablas si no existen
        Base.metadata.create_all(bind=engine)
        
        print("--- REPORTE DE SISTEMA UNIBOOKS ---")
        print("✅ Base de datos 'DeibyVargas.DB' sincronizada.")
        print("✅ Nuevas tablas: Chats, Calificaciones, Notificaciones")
        print("✅ Tablas existentes: Usuarios, Libros, Transacciones, Mensajes")
        print("------------------------------------")
        
    except Exception as e:
        print(f"❌ Error crítico al inicializar la base de datos: {e}")