import os
import shutil
import uuid
from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from .database import engine, Base, SessionLocal
from .models import Libro, Usuario
from pydantic import BaseModel

# Crear tablas automáticamente en DeibyVargas.DB
Base.metadata.create_all(bind=engine)

app = FastAPI()

# ✅ CONFIGURACIÓN PARA SUBIR IMÁGENES
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ✅ CONFIGURACIÓN DE CORS (Esencial para que React Native conecte)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ESQUEMAS DE PYDANTIC ---
class LoginRequest(BaseModel):
    correo: str
    password: str

class RegistroRequest(BaseModel):
    nombre: str
    correo: str
    password: str

# --- DEPENDENCIA DE BD ---
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
    # Retorna todos los libros ordenados por ID descendente (los más nuevos primero)
    return db.query(Libro).order_by(Libro.id.desc()).all()

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
        # Generamos un nombre único usando UUID para evitar sobrescribir archivos
        extension = imagen.filename.split('.')[-1]
        nombre_unico = f"{uuid.uuid4()}.{extension}"
        ruta_imagen = f"{UPLOAD_DIR}/{nombre_unico}"
        
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
        # Si ya tenía una imagen anterior, la borramos para no llenar el disco
        if libro.imagen_url and os.path.exists(libro.imagen_url):
            os.remove(libro.imagen_url)
            
        extension = imagen.filename.split('.')[-1]
        nombre_unico = f"upd_{libro_id}_{uuid.uuid4().hex[:8]}.{extension}"
        ruta_imagen = f"{UPLOAD_DIR}/{nombre_unico}"
        
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
    
    # Borrar archivo físico
    if libro.imagen_url and os.path.exists(libro.imagen_url):
        try:
            os.remove(libro.imagen_url)
        except Exception:
            pass # Si falla al borrar el archivo, seguimos con la BD
        
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

@app.post("/registro")
def registrar_usuario(request: RegistroRequest, db: Session = Depends(get_db)):
    # 1. Verificar si el correo ya existe
    existe = db.query(Usuario).filter(Usuario.correo == request.correo).first()
    if existe:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")
    
    # 2. Crear el nuevo usuario
    nuevo_usuario = Usuario(
        nombre=request.nombre,
        correo=request.correo,
        password=request.password 
    )
    
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    return {"message": "Usuario creado con éxito", "usuario": nuevo_usuario.nombre}