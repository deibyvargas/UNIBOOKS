from sqlalchemy import Column, Integer, String, Float
from .database import Base

class Libro(Base):
    __tablename__ = "libros"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(100), nullable=False)
    autor = Column(String(100), nullable=False)
    precio = Column(Float, nullable=False)
    estado = Column(String(50))
    descripcion = Column(String(255))
    
    imagen_url = Column(String(255), nullable=True) 

class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    correo = Column(String(100), unique=True, nullable=False)
    password = Column(String(100), nullable=False)