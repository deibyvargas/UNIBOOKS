import os
import shutil
from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from .database import engine, Base, SessionLocal
from .models import Libro, Usuario
from pydantic import BaseModel

# Crear tablas automáticamente
Base.metadata.create_all(bind=engine)

app = FastAPI()

# ✅ CONFIGURACIÓN PARA SUBIR IMÁGENES
if not os.path.exists("uploads"):
    os.makedirs("uploads")

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ✅ CONFIGURACIÓN DE CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LoginRequest(BaseModel):
    correo: str
    password: str

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "API de UNIBOOKS conectada con éxito"}

# --- RUTAS DE LIBROS ---

@app.get("/libros")
def obtener_libros(db: Session = Depends(get_db)):
    return db.query(Libro).all()

# 🚀 CREAR LIBRO (POST)
@app.post("/libros")
async def crear_libro(
    titulo: str = Form(...),
    autor: str = Form(...),
    precio: float = Form(...),
    descripcion: str = Form(None), 
    imagen: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    ruta_imagen = None
    if imagen:
        nombre_archivo = f"{titulo.replace(' ', '_')}_{imagen.filename}"
        ruta_imagen = f"uploads/{nombre_archivo}"
        with open(ruta_imagen, "wb") as buffer:
            shutil.copyfileobj(imagen.file, buffer)
    
   
    nuevo_libro = Libro(
        titulo=titulo, 
        autor=autor, 
        precio=precio, 
        descripcion=descripcion,
        imagen_url=ruta_imagen, 
        estado="Disponible"
    )
    db.add(nuevo_libro)
    db.commit()
    db.refresh(nuevo_libro)
    return {"message": "Libro guardado con éxito", "id": nuevo_libro.id}

# 🚀 EDITAR LIBRO (PUT)
@app.put("/libros/{libro_id}")
async def editar_libro(
    libro_id: int,
    titulo: str = Form(...),
    autor: str = Form(...),
    precio: float = Form(...),
    descripcion: str = Form(None),
    imagen: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    libro = db.query(Libro).filter(Libro.id == libro_id).first()
    if not libro:
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    
    libro.titulo = titulo
    libro.autor = autor
    libro.precio = precio
    if descripcion:
        libro.descripcion = descripcion
    
    if imagen:
        nombre_archivo = f"upd_{libro_id}_{imagen.filename.replace(' ', '_')}"
        ruta_imagen = f"uploads/{nombre_archivo}"
        with open(ruta_imagen, "wb") as buffer:
            shutil.copyfileobj(imagen.file, buffer)
        libro.imagen_url = ruta_imagen

    db.commit()
    return {"message": "Libro actualizado con éxito"}

@app.delete("/libros/{libro_id}")
def borrar_libro(libro_id: int, db: Session = Depends(get_db)):
    libro = db.query(Libro).filter(Libro.id == libro_id).first()
    if not libro:
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    
    if libro.imagen_url and os.path.exists(libro.imagen_url):
        os.remove(libro.imagen_url)
        
    db.delete(libro)
    db.commit()
    return {"message": "Eliminado"}

# --- RUTAS DE USUARIOS ---

@app.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.correo == request.correo).first()
    if not usuario or usuario.password != request.password:
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    return {"message": "Bienvenido", "usuario": usuario.nombre}

@app.post("/usuarios")
def crear_usuario(nombre: str, correo: str, password: str, db: Session = Depends(get_db)):
    nuevo = Usuario(nombre=nombre, correo=correo, password=password)
    db.add(nuevo)
    db.commit()
    return {"status": "Usuario creado"}