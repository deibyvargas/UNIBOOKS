from pydantic import BaseModel
from typing import Optional

class LoginRequest(BaseModel):
    correo: str
    password: str

class RegistroRequest(BaseModel):
    nombre: str
    correo: str
    password: str
    carrera: Optional[str]
    semestre: Optional[str]

class CalificacionRequest(BaseModel):
    transaccion_id: int
    calificado_id: int
    calificador_id: int
    estrellas: int
    comentario: str
