from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.services import chat_service
from app.schemas.chat_schema import MensajeRequest

router = APIRouter(prefix="/chats", tags=["Chat"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/")
def crear_chat(libro_id: int, usuario1_id: int, usuario2_id: int, db: Session = Depends(get_db)):
    return chat_service.crear_chat(db, libro_id, usuario1_id, usuario2_id)


@router.get("/{usuario_id}")
def obtener_chats(usuario_id: int, db: Session = Depends(get_db)):
    return chat_service.obtener_chats_usuario(db, usuario_id)


@router.get("/{chat_id}/mensajes")
def obtener_mensajes(chat_id: int, db: Session = Depends(get_db)):
    return chat_service.obtener_mensajes(db, chat_id)


@router.post("/{chat_id}/mensajes")
def enviar_mensaje(chat_id: int, data: MensajeRequest, db: Session = Depends(get_db)):
    return chat_service.enviar_mensaje(db, chat_id, data)
