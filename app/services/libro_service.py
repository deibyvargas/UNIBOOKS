from app import models
from sqlalchemy.orm import Session

def obtener_libros(db: Session):
    return db.query(models.Libro).order_by(models.Libro.id.desc()).all()

def crear_libro(db: Session, data: dict):
    nuevo = models.Libro(**data)
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo