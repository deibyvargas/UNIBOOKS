from fastapi import APIRouter

router = APIRouter(prefix="/transacciones", tags=["Transacciones"])

@router.get("/")
def prueba():
    return {"mensaje": "transacciones funcionando"}
