from sqlalchemy import Column, Integer, String, Float, Text
from .database import Base

class Libro(Base):
    __tablename__ = "libros"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(150), nullable=False) # Aumentado a 150 por títulos largos
    autor = Column(String(100), nullable=False)
    precio = Column(Float, nullable=False)
    estado = Column(String(50), default="Disponible") # Valor por defecto
    
    # Cambiado a Text para que puedas escribir una reseña larga sin errores
    descripcion = Column(Text, nullable=True) 
    
    # URL de la imagen guardada en la carpeta /uploads
    imagen_url = Column(String(255), nullable=True) 

class Usuario(Base):
    __tablename__ = "usuarios"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    # unique=True es vital para que no se registren dos personas con el mismo correo
    correo = Column(String(100), unique=True, nullable=False, index=True)
    password = Column(String(100), nullable=False)