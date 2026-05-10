import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Detectar si está en Azure
if os.name == "nt":  # Windows (tu PC)
    DATABASE_PATH = "sqlite:///./DeibyVargas.DB"
else:  # Linux (Azure)
    os.makedirs("/home/site/wwwroot", exist_ok=True)
    DATABASE_PATH = "sqlite:///home/site/wwwroot/DeibyVargas.DB"

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", DATABASE_PATH)

# Corrección para postgres
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace(
        "postgres://", "postgresql://", 1
    )

# Engine
if "sqlite" in SQLALCHEMY_DATABASE_URL:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def inicializar_base_de_datos():
    try:
        import app.models.models  # ✅ IMPORT CORRECTO

        Base.metadata.create_all(bind=engine)

        print("--- SISTEMA UNIBOOKS ---")
        print(f"✅ Base de datos conectada: {SQLALCHEMY_DATABASE_URL}")
        print("✅ Tablas creadas correctamente ✅")
        print("-------------------------")

    except Exception as e:
        print(f"❌ Error al conectar la base de datos: {e}")