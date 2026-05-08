from pydantic import BaseModel
from typing import Optional

class CrearLibro(BaseModel):
    titulo: str
    autor: str
    precio: float
    categoria: str
    estado: str
    tipo: str
    usuario_id: int
    descripcion: Optional[str] = ""