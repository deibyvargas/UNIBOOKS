from app.models import models
from sqlalchemy.orm import Session

def crear_calificacion(db: Session, data):
    # evitar duplicados
    existe = db.query(models.Calificacion).filter(
        models.Calificacion.transaccion_id == data.transaccion_id,
        models.Calificacion.calificador_id == data.calificador_id
    ).first()

    if existe:
        return {"error": "Ya calificaste esta transacción"}

    # validar rango
    if data.estrellas < 1 or data.estrellas > 5:
        return {"error": "Calificación inválida"}

    nueva = models.Calificacion(**data.dict())
    db.add(nueva)

    # recalcular reputación
    calificaciones = db.query(models.Calificacion).filter(
        models.Calificacion.calificado_id == data.calificado_id
    ).all()

    promedio = (sum(c.estrellas for c in calificaciones) + data.estrellas) / (len(calificaciones) + 1)

    usuario = db.query(models.Usuario).filter(
        models.Usuario.id == data.calificado_id
    ).first()

    usuario.reputacion = promedio

    db.commit()

    return {"mensaje": "Calificación guardada", "reputacion": promedio}
