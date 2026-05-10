from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.schemas.user_schema import RegistroRequest, LoginRequest, CalificacionRequest
from app.services import user_service

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ✅ REGISTRO DE USUARIO
@router.post("/registro")
def registrar_usuario(usuario: RegistroRequest, db: Session = Depends(get_db)):
    return user_service.crear_usuario(db, usuario)


# ✅ LOGIN
@router.post("/login")
def login(usuario: LoginRequest, db: Session = Depends(get_db)):
    return user_service.login(db, usuario)


# ✅ CALIFICACIONES
@router.post("/calificaciones")
def crear_calificacion(request: CalificacionRequest, db: Session = Depends(get_db)):
    return user_service.crear_calificacion(db, request)