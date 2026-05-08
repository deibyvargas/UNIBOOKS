from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.services import libro_service

router = APIRouter(prefix="/libros", tags=["Libros"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/")
def obtener_libros(db: Session = Depends(get_db)):
    libros = libro_service.obtener_libros(db)
    return libros