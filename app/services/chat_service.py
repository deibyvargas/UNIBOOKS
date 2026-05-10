from app.models import models
from sqlalchemy.orm import Session
import datetime

def crear_chat(db: Session, libro_id: int, usuario1_id: int, usuario2_id: int):
    # evitar duplicados
    existente = db.query(models.Chat).filter(
        models.Chat.libro_id == libro_id,
        ((models.Chat.usuario1_id == usuario1_id) & (models.Chat.usuario2_id == usuario2_id)) |
        ((models.Chat.usuario1_id == usuario2_id) & (models.Chat.usuario2_id == usuario1_id))
    ).first()

    if existente:
        return existente

    chat = models.Chat(
        libro_id=libro_id,
        usuario1_id=usuario1_id,
        usuario2_id=usuario2_id,
        ultimo_mensaje="Chat iniciado",
        ultima_fecha=datetime.datetime.utcnow()
    )

    db.add(chat)
    db.commit()
    db.refresh(chat)
    return chat


def enviar_mensaje(db: Session, chat_id: int, data):
    nuevo = models.Mensaje(
        chat_id=chat_id,
        emisor_id=data.emisor_id,
        emisor_nombre=data.emisor_nombre,
        mensaje=data.mensaje,
        leido=False
    )

    db.add(nuevo)

    chat = db.query(models.Chat).filter(models.Chat.id == chat_id).first()
    if chat:
        chat.ultimo_mensaje = data.mensaje[:100]
        chat.ultima_fecha = datetime.datetime.utcnow()

    db.commit()
    return nuevo


def obtener_mensajes(db: Session, chat_id: int):
    mensajes = db.query(models.Mensaje).filter(
        models.Mensaje.chat_id == chat_id
    ).order_by(models.Mensaje.fecha.asc()).all()

    return [{
        "id": m.id,
        "mensaje": m.mensaje,
        "emisor_id": m.emisor_id,
        "fecha": m.fecha.isoformat(),
        "leido": m.leido
    } for m in mensajes]


def obtener_chats_usuario(db: Session, usuario_id: int):
    chats = db.query(models.Chat).filter(
        (models.Chat.usuario1_id == usuario_id) |
        (models.Chat.usuario2_id == usuario_id)
    ).order_by(models.Chat.ultima_fecha.desc()).all()

    return chats
