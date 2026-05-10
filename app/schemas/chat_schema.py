from pydantic import BaseModel

class MensajeRequest(BaseModel):
    emisor_id: int
    emisor_nombre: str
    mensaje: str
