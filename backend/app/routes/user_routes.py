from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.schemas.user_schema import CalificacionRequest
from app.services import user_service

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/calificaciones")
def crear_calificacion(request: CalificacionRequest, db: Session = Depends(get_db)):
    return user_service.crear_calificacion(db, request)
