import os
import shutil
import uuid
import datetime
from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

# Importamos la configuración de base de datos y modelos
from .database import SessionLocal, inicializar_base_de_datos
from . import models

# ✅ INICIALIZACIÓN
inicializar_base_de_datos()

app = FastAPI(title="UNIBOOKS API - Sistema Integral")

# ✅ CONFIGURACIÓN DE ARCHIVOS
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

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
    carrera: Optional[str] = None
    semestre: Optional[str] = None

class SolicitudRequest(BaseModel):
    libro_id: int
    solicitante_id: int
    propietario_id: int
    tipo: str

class ResponderSolicitudRequest(BaseModel):
    estado: str

class MensajeRequest(BaseModel):
    emisor_id: int
    emisor_nombre: str
    mensaje: str

class CalificacionRequest(BaseModel):
    transaccion_id: int
    calificado_id: int
    calificador_id: int
    estrellas: int
    comentario: str

# --- DEPENDENCIA DE BD ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==================== 📚 2. GESTIÓN DE LIBROS ====================

@app.get("/libros")
def obtener_todos(db: Session = Depends(get_db)):
    """Obtener todos los libros"""
    libros = db.query(models.Libro).order_by(models.Libro.id.desc()).all()
    return [{
        "id": l.id,
        "titulo": l.titulo,
        "autor": l.autor,
        "precio": l.precio,
        "categoria": l.categoria,
        "estado": l.estado,
        "tipo": l.tipo_publicacion,
        "imagen_url": l.imagen_url,
        "descripcion": l.descripcion or "",
        "destacado": l.destacado,
        "usuario_id": l.usuario_id
    } for l in libros]

@app.get("/libros/destacados")
def obtener_destacados(db: Session = Depends(get_db)):
    """Obtener libros destacados"""
    libros = db.query(models.Libro).filter(models.Libro.destacado == True).order_by(models.Libro.id.desc()).limit(10).all()
    return [{
        "id": l.id,
        "titulo": l.titulo,
        "autor": l.autor,
        "precio": l.precio,
        "imagen_url": l.imagen_url,
        "destacado": l.destacado
    } for l in libros]

@app.get("/libros/{libro_id}")
def obtener_libro(libro_id: int, db: Session = Depends(get_db)):
    """Obtener un libro por ID"""
    libro = db.query(models.Libro).filter(models.Libro.id == libro_id).first()
    if not libro:
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    
    return {
        "id": libro.id,
        "titulo": libro.titulo,
        "autor": libro.autor,
        "precio": libro.precio,
        "categoria": libro.categoria,
        "estado": libro.estado,
        "tipo": libro.tipo_publicacion,
        "imagen_url": libro.imagen_url,
        "descripcion": libro.descripcion or "",
        "destacado": libro.destacado,
        "usuario_id": libro.usuario_id
    }

@app.get("/libros/tipo/{tipo}")
def obtener_libros_por_tipo(tipo: str, db: Session = Depends(get_db)):
    """Obtener libros por tipo (venta/intercambio/ambos)"""
    libros = db.query(models.Libro).filter(models.Libro.tipo_publicacion == tipo).order_by(models.Libro.id.desc()).all()
    return [{
        "id": l.id,
        "titulo": l.titulo,
        "autor": l.autor,
        "precio": l.precio,
        "imagen_url": l.imagen_url
    } for l in libros]

@app.get("/usuarios/{usuario_id}/libros")
def obtener_libros_usuario(usuario_id: int, db: Session = Depends(get_db)):
    """Obtener libros de un usuario específico"""
    libros = db.query(models.Libro).filter(models.Libro.usuario_id == usuario_id).order_by(models.Libro.id.desc()).all()
    return [{
        "id": l.id,
        "titulo": l.titulo,
        "autor": l.autor,
        "precio": l.precio,
        "categoria": l.categoria,
        "estado": l.estado,
        "tipo": l.tipo_publicacion,
        "imagen_url": l.imagen_url,
        "descripcion": l.descripcion or ""
    } for l in libros]

@app.post("/libros")
async def crear_libro(
    titulo: str = Form(...),
    autor: str = Form(...),
    precio: str = Form(...),
    categoria: str = Form(...),
    estado: str = Form(...),
    tipo: str = Form(...),
    usuario_id: int = Form(...),
    descripcion: str = Form(""),
    destacado: str = Form("false"),
    imagen: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """Crear un nuevo libro"""
    try:
        precio_float = float(precio) if precio and precio.strip() else 0.0
        destacado_bool = destacado.lower() == 'true'
        
        # Guardar imagen
        ruta_img = "uploads/default.jpg"
        if imagen and imagen.filename:
            ext = imagen.filename.split('.')[-1]
            nombre = f"{uuid.uuid4()}.{ext}"
            ruta_img = f"{UPLOAD_DIR}/{nombre}"
            with open(ruta_img, "wb") as buffer:
                shutil.copyfileobj(imagen.file, buffer)
        
        nuevo = models.Libro(
            titulo=titulo,
            autor=autor,
            precio=precio_float,
            categoria=categoria,
            estado=estado,
            tipo_publicacion=tipo,
            usuario_id=usuario_id,
            descripcion=descripcion,
            destacado=destacado_bool,
            imagen_url=ruta_img,
            imagenes=ruta_img
        )
        
        db.add(nuevo)
        db.commit()
        db.refresh(nuevo)
        
        return {
            "status": "creado",
            "id": nuevo.id,
            "mensaje": "Libro publicado exitosamente",
            "imagen_url": ruta_img
        }
        
    except Exception as e:
        db.rollback()
        print(f"Error al crear libro: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al crear libro: {str(e)}")

@app.put("/libros/{libro_id}")
async def actualizar_libro(
    libro_id: int,
    titulo: str = Form(None),
    autor: str = Form(None),
    precio: str = Form(None),
    categoria: str = Form(None),
    estado: str = Form(None),
    tipo: str = Form(None),
    descripcion: str = Form(None),
    destacado: str = Form(None),
    imagen: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """Actualizar un libro existente"""
    try:
        libro = db.query(models.Libro).filter(models.Libro.id == libro_id).first()
        if not libro:
            raise HTTPException(status_code=404, detail="Libro no encontrado")
        
        if titulo is not None:
            libro.titulo = titulo
        if autor is not None:
            libro.autor = autor
        if precio is not None and precio.strip():
            libro.precio = float(precio)
        if categoria is not None:
            libro.categoria = categoria
        if estado is not None:
            libro.estado = estado
        if tipo is not None:
            libro.tipo_publicacion = tipo
        if descripcion is not None:
            libro.descripcion = descripcion
        if destacado is not None:
            libro.destacado = destacado.lower() == 'true'
        
        # Actualizar imagen si se envió nueva
        if imagen and imagen.filename:
            ext = imagen.filename.split('.')[-1]
            nombre = f"{uuid.uuid4()}.{ext}"
            ruta_img = f"{UPLOAD_DIR}/{nombre}"
            with open(ruta_img, "wb") as buffer:
                shutil.copyfileobj(imagen.file, buffer)
            libro.imagen_url = ruta_img
            libro.imagenes = ruta_img
        
        db.commit()
        return {"status": "actualizado", "mensaje": "Libro actualizado exitosamente"}
        
    except Exception as e:
        db.rollback()
        print(f"Error al actualizar libro: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al actualizar: {str(e)}")

@app.delete("/libros/{libro_id}")
def eliminar_libro(libro_id: int, db: Session = Depends(get_db)):
    """Eliminar un libro"""
    libro = db.query(models.Libro).filter(models.Libro.id == libro_id).first()
    if not libro:
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    
    db.delete(libro)
    db.commit()
    return {"mensaje": "Libro eliminado exitosamente"}

# ==================== 🔍 3. BÚSQUEDA Y NAVEGACIÓN ====================

@app.get("/libros/buscar")
def buscar_libros(
    q: Optional[str] = Query(None),
    carrera: Optional[str] = None,
    tipo: Optional[str] = None,
    estado: Optional[str] = None,
    precio_min: float = 0,
    precio_max: float = 1000000,
    db: Session = Depends(get_db)
):
    """Búsqueda avanzada con filtros"""
    query = db.query(models.Libro)
    
    if q:
        query = query.filter(
            (models.Libro.titulo.ilike(f"%{q}%")) | 
            (models.Libro.autor.ilike(f"%{q}%"))
        )
    if carrera:
        query = query.filter(models.Libro.categoria == carrera)
    if tipo and tipo != "ambos":
        query = query.filter(models.Libro.tipo_publicacion == tipo)
    if estado:
        query = query.filter(models.Libro.estado == estado)
    
    query = query.filter(models.Libro.precio >= precio_min, models.Libro.precio <= precio_max)
    
    libros = query.order_by(models.Libro.id.desc()).all()
    return [{
        "id": l.id,
        "titulo": l.titulo,
        "autor": l.autor,
        "precio": l.precio,
        "imagen_url": l.imagen_url
    } for l in libros]

# ==================== 💬 4. COMUNICACIÓN Y TRANSACCIONES ====================

@app.post("/solicitudes")
def crear_solicitud(solicitud: SolicitudRequest, db: Session = Depends(get_db)):
    """Crear una solicitud de compra/intercambio"""
    libro = db.query(models.Libro).filter(models.Libro.id == solicitud.libro_id).first()
    if not libro:
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    
    existe = db.query(models.Transaccion).filter(
        models.Transaccion.libro_id == solicitud.libro_id,
        models.Transaccion.comprador_id == solicitud.solicitante_id,
        models.Transaccion.estado == "pendiente"
    ).first()
    
    if existe:
        raise HTTPException(status_code=400, detail="Ya tienes una solicitud pendiente para este libro")
    
    nueva_transaccion = models.Transaccion(
        libro_id=solicitud.libro_id,
        comprador_id=solicitud.solicitante_id,
        vendedor_id=solicitud.propietario_id,
        tipo=solicitud.tipo,
        estado="pendiente",
        precio=libro.precio if solicitud.tipo == "compra" else 0
    )
    db.add(nueva_transaccion)
    db.commit()
    db.refresh(nueva_transaccion)
    
    return {"message": "Solicitud enviada", "transaccion_id": nueva_transaccion.id}

@app.get("/usuarios/{usuario_id}/solicitudes")
def obtener_solicitudes(usuario_id: int, db: Session = Depends(get_db)):
    """Obtener solicitudes pendientes para un usuario"""
    transacciones = db.query(models.Transaccion).filter(
        models.Transaccion.vendedor_id == usuario_id,
        models.Transaccion.estado == "pendiente"
    ).order_by(models.Transaccion.fecha.desc()).all()
    
    resultado = []
    for t in transacciones:
        libro = db.query(models.Libro).filter(models.Libro.id == t.libro_id).first()
        comprador = db.query(models.Usuario).filter(models.Usuario.id == t.comprador_id).first()
        resultado.append({
            "id": t.id,
            "libro_id": t.libro_id,
            "libro_titulo": libro.titulo if libro else "N/A",
            "comprador_id": t.comprador_id,
            "comprador_nombre": comprador.nombre if comprador else "N/A",
            "tipo": t.tipo,
            "estado": t.estado,
            "fecha": t.fecha.isoformat()
        })
    
    return resultado

@app.put("/solicitudes/{transaccion_id}")
def responder_solicitud(transaccion_id: int, respuesta: ResponderSolicitudRequest, db: Session = Depends(get_db)):
    """Aceptar o rechazar una solicitud"""
    transaccion = db.query(models.Transaccion).filter(models.Transaccion.id == transaccion_id).first()
    if not transaccion:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    
    transaccion.estado = respuesta.estado
    db.commit()
    return {"message": f"Solicitud {respuesta.estado}"}

@app.get("/usuarios/{usuario_id}/transacciones")
def obtener_transacciones(usuario_id: int, db: Session = Depends(get_db)):
    """Obtener historial de transacciones de un usuario"""
    transacciones = db.query(models.Transaccion).filter(
        (models.Transaccion.comprador_id == usuario_id) | 
        (models.Transaccion.vendedor_id == usuario_id)
    ).order_by(models.Transaccion.fecha.desc()).all()
    
    resultado = []
    for t in transacciones:
        libro = db.query(models.Libro).filter(models.Libro.id == t.libro_id).first()
        comprador = db.query(models.Usuario).filter(models.Usuario.id == t.comprador_id).first()
        vendedor = db.query(models.Usuario).filter(models.Usuario.id == t.vendedor_id).first()
        
        resultado.append({
            "id": t.id,
            "libro_id": t.libro_id,
            "libro_titulo": libro.titulo if libro else "N/A",
            "comprador_id": t.comprador_id,
            "comprador_nombre": comprador.nombre if comprador else "N/A",
            "vendedor_id": t.vendedor_id,
            "vendedor_nombre": vendedor.nombre if vendedor else "N/A",
            "tipo": t.tipo,
            "estado": t.estado,
            "precio": t.precio,
            "fecha": t.fecha.isoformat()
        })
    
    return resultado

# ==================== 💬 CHAT ====================

@app.get("/usuarios/{usuario_id}/chats")
def obtener_chats_usuario(usuario_id: int, db: Session = Depends(get_db)):
    """Obtener todos los chats de un usuario"""
    chats = db.query(models.Chat).filter(
        (models.Chat.usuario1_id == usuario_id) | 
        (models.Chat.usuario2_id == usuario_id)
    ).order_by(models.Chat.ultima_fecha.desc()).all()
    
    resultado = []
    for chat in chats:
        libro = db.query(models.Libro).filter(models.Libro.id == chat.libro_id).first()
        resultado.append({
            "id": chat.id,
            "libro_id": chat.libro_id,
            "libro_titulo": libro.titulo if libro else "N/A",
            "usuario1_id": chat.usuario1_id,
            "usuario2_id": chat.usuario2_id,
            "ultimo_mensaje": chat.ultimo_mensaje,
            "ultima_fecha": chat.ultima_fecha.isoformat()
        })
    
    return resultado

@app.get("/chats/{chat_id}/mensajes")
def obtener_mensajes(chat_id: int, db: Session = Depends(get_db)):
    """Obtener mensajes de un chat"""
    mensajes = db.query(models.Mensaje).filter(
        models.Mensaje.chat_id == chat_id
    ).order_by(models.Mensaje.fecha.asc()).all()
    
    return [{
        "id": m.id,
        "chat_id": m.chat_id,
        "emisor_id": m.emisor_id,
        "emisor_nombre": m.emisor_nombre,
        "mensaje": m.mensaje,
        "fecha": m.fecha.isoformat(),
        "leido": m.leido
    } for m in mensajes]

@app.post("/chats/{chat_id}/mensajes")
def enviar_mensaje(chat_id: int, mensaje: MensajeRequest, db: Session = Depends(get_db)):
    """Enviar un mensaje en el chat"""
    nuevo_msg = models.Mensaje(
        chat_id=chat_id,
        emisor_id=mensaje.emisor_id,
        emisor_nombre=mensaje.emisor_nombre,
        mensaje=mensaje.mensaje,
        leido=False
    )
    db.add(nuevo_msg)
    
    chat = db.query(models.Chat).filter(models.Chat.id == chat_id).first()
    if chat:
        chat.ultimo_mensaje = mensaje.mensaje[:100]
        chat.ultima_fecha = datetime.datetime.utcnow()
    
    db.commit()
    return {"status": "enviado"}

@app.post("/chats")
def crear_chat(libro_id: int, usuario1_id: int, usuario2_id: int, db: Session = Depends(get_db)):
    """Crear un nuevo chat"""
    existe = db.query(models.Chat).filter(
        models.Chat.libro_id == libro_id,
        ((models.Chat.usuario1_id == usuario1_id) & (models.Chat.usuario2_id == usuario2_id)) |
        ((models.Chat.usuario1_id == usuario2_id) & (models.Chat.usuario2_id == usuario1_id))
    ).first()
    
    if existe:
        return {"id": existe.id}
    
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
    return {"id": chat.id}

# ==================== ⭐ 5. CALIFICACIONES ====================

@app.post("/calificaciones")
def crear_calificacion(calificacion: CalificacionRequest, db: Session = Depends(get_db)):
    """Crear una calificación después de una transacción"""
    if calificacion.estrellas < 1 or calificacion.estrellas > 5:
        raise HTTPException(status_code=400, detail="La calificación debe ser de 1 a 5")
    
    nueva_calificacion = models.Calificacion(
        transaccion_id=calificacion.transaccion_id,
        calificado_id=calificacion.calificado_id,
        calificador_id=calificacion.calificador_id,
        estrellas=calificacion.estrellas,
        comentario=calificacion.comentario
    )
    db.add(nueva_calificacion)
    
    calificado = db.query(models.Usuario).filter(models.Usuario.id == calificacion.calificado_id).first()
    calificaciones = db.query(models.Calificacion).filter(
        models.Calificacion.calificado_id == calificacion.calificado_id
    ).all()
    
    promedio = sum(c.estrellas for c in calificaciones) / len(calificaciones)
    calificado.reputacion = promedio
    
    db.commit()
    return {"message": "Calificación registrada", "nueva_reputacion": promedio}

@app.get("/usuarios/{usuario_id}/calificaciones")
def obtener_calificaciones(usuario_id: int, db: Session = Depends(get_db)):
    """Obtener calificaciones de un usuario"""
    calificaciones = db.query(models.Calificacion).filter(
        models.Calificacion.calificado_id == usuario_id
    ).order_by(models.Calificacion.fecha.desc()).all()
    
    return [{
        "id": c.id,
        "transaccion_id": c.transaccion_id,
        "estrellas": c.estrellas,
        "comentario": c.comentario,
        "fecha": c.fecha.isoformat()
    } for c in calificaciones]

# ==================== 👤 AUTENTICACIÓN ====================

@app.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Iniciar sesión"""
    user = db.query(models.Usuario).filter(models.Usuario.correo == request.correo).first()
    if not user or user.password != request.password:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    transacciones_completadas = db.query(models.Transaccion).filter(
        (models.Transaccion.comprador_id == user.id) | 
        (models.Transaccion.vendedor_id == user.id),
        models.Transaccion.estado == "completado"
    ).count()
    
    return {
        "usuario": {
            "id": user.id,
            "nombre": user.nombre,
            "correo": user.correo,
            "carrera": user.carrera,
            "semestre": user.semestre,
            "reputacion": user.reputacion,
            "transacciones": transacciones_completadas
        }
    }

@app.post("/registro")
def registrar(request: RegistroRequest, db: Session = Depends(get_db)):
    """Registrar nuevo usuario"""
    if db.query(models.Usuario).filter(models.Usuario.correo == request.correo).first():
        raise HTTPException(status_code=400, detail="Correo ya registrado")
    
    nuevo = models.Usuario(
        nombre=request.nombre,
        correo=request.correo,
        password=request.password,
        carrera=request.carrera,
        semestre=request.semestre,
        reputacion=5.0
    )
    db.add(nuevo)
    db.commit()
    return {"message": "Usuario creado exitosamente"}

@app.get("/usuarios/{usuario_id}")
def obtener_usuario(usuario_id: int, db: Session = Depends(get_db)):
    """Obtener información de un usuario"""
    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    transacciones = db.query(models.Transaccion).filter(
        (models.Transaccion.comprador_id == usuario_id) | 
        (models.Transaccion.vendedor_id == usuario_id),
        models.Transaccion.estado == "completado"
    ).count()
    
    return {
        "id": usuario.id,
        "nombre": usuario.nombre,
        "carrera": usuario.carrera,
        "semestre": usuario.semestre,
        "reputacion": usuario.reputacion,
        "transacciones": transacciones
    }