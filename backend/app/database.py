from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Si en XAMPP tienes contraseña, ponla después de 'root:'
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:@localhost:3306/unibooks_db"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()