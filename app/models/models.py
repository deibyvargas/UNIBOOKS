from sqlalchemy import Column, Integer, String, Float, Text, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from ..core.database import Base
import datetime

class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    correo = Column(String(100), unique=True, index=True, nullable=False)
    password = Column(String(100), nullable=False)
    carrera = Column(String(100))
    semestre = Column(String(20))
    reputacion = Column(Float, default=5.0)
    fecha_registro = Column(DateTime, default=datetime.datetime.utcnow)

    # Relaciones
    libros = relationship("Libro", back_populates="dueno", cascade="all, delete-orphan")
    
    # Para transacciones como comprador
    transacciones_como_comprador = relationship(
        "Transaccion", 
        foreign_keys="Transaccion.comprador_id",
        back_populates="comprador"
    )
    
    # Para transacciones como vendedor
    transacciones_como_vendedor = relationship(
        "Transaccion", 
        foreign_keys="Transaccion.vendedor_id",
        back_populates="vendedor"
    )
    
    # Mensajes enviados
    mensajes_enviados = relationship(
        "Mensaje",
        foreign_keys="Mensaje.emisor_id",
        back_populates="emisor"
    )
    
    # Calificaciones recibidas
    calificaciones_recibidas = relationship(
        "Calificacion",
        foreign_keys="Calificacion.calificado_id",
        back_populates="calificado"
    )
    
    # Calificaciones emitidas
    calificaciones_emitidas = relationship(
        "Calificacion",
        foreign_keys="Calificacion.calificador_id",
        back_populates="calificador"
    )
    
    # Notificaciones
    notificaciones = relationship(
        "Notificacion",
        back_populates="usuario",
        cascade="all, delete-orphan"
    )
    
    # Chats como usuario1
    chats_como_usuario1 = relationship(
        "Chat",
        foreign_keys="Chat.usuario1_id",
        back_populates="usuario1"
    )
    
    # Chats como usuario2
    chats_como_usuario2 = relationship(
        "Chat",
        foreign_keys="Chat.usuario2_id",
        back_populates="usuario2"
    )


class Libro(Base):
    __tablename__ = "libros"
    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(150), nullable=False)
    autor = Column(String(100), nullable=False)
    precio = Column(Float, default=0.0)
    categoria = Column(String(50), index=True)
    estado = Column(String(50), nullable=False)  # Nuevo, Buen estado, Usado, Dañado, Vendido, Intercambiado
    tipo_publicacion = Column(String(50), nullable=False)  # venta, intercambio, ambos
    imagen_url = Column(String(255))  # URL de la primera imagen (para compatibilidad)
    imagenes = Column(Text)  # URLs de múltiples imágenes separadas por coma
    descripcion = Column(Text)
    destacado = Column(Boolean, default=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    fecha_publicacion = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Relaciones
    dueno = relationship("Usuario", back_populates="libros")
    transacciones = relationship("Transaccion", back_populates="libro", cascade="all, delete-orphan")
    chats = relationship("Chat", back_populates="libro", cascade="all, delete-orphan")


class Transaccion(Base):
    __tablename__ = "transacciones"
    id = Column(Integer, primary_key=True)
    libro_id = Column(Integer, ForeignKey("libros.id"), nullable=False)
    comprador_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    vendedor_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    tipo = Column(String(20), nullable=False)  # compra, intercambio
    estado = Column(String(20), default="pendiente")  # pendiente, aceptado, rechazado, completado
    precio = Column(Float, default=0.0)
    fecha = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Relaciones
    libro = relationship("Libro", back_populates="transacciones")
    comprador = relationship("Usuario", foreign_keys=[comprador_id], back_populates="transacciones_como_comprador")
    vendedor = relationship("Usuario", foreign_keys=[vendedor_id], back_populates="transacciones_como_vendedor")
    mensajes = relationship("Mensaje", back_populates="transaccion", cascade="all, delete-orphan")
    calificaciones = relationship("Calificacion", back_populates="transaccion", cascade="all, delete-orphan")


class Chat(Base):
    __tablename__ = "chats"
    id = Column(Integer, primary_key=True)
    libro_id = Column(Integer, ForeignKey("libros.id"), nullable=False)
    usuario1_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    usuario2_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    ultimo_mensaje = Column(String(200))
    ultima_fecha = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Relaciones
    libro = relationship("Libro", back_populates="chats")
    usuario1 = relationship("Usuario", foreign_keys=[usuario1_id], back_populates="chats_como_usuario1")
    usuario2 = relationship("Usuario", foreign_keys=[usuario2_id], back_populates="chats_como_usuario2")
    mensajes = relationship("Mensaje", back_populates="chat", cascade="all, delete-orphan")


class Mensaje(Base):
    __tablename__ = "mensajes"
    id = Column(Integer, primary_key=True)
    chat_id = Column(Integer, ForeignKey("chats.id"), nullable=True)
    transaccion_id = Column(Integer, ForeignKey("transacciones.id"), nullable=True)
    emisor_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    emisor_nombre = Column(String(100))
    mensaje = Column(Text, nullable=False)
    leido = Column(Boolean, default=False)
    fecha = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Relaciones
    emisor = relationship("Usuario", foreign_keys=[emisor_id], back_populates="mensajes_enviados")
    chat = relationship("Chat", back_populates="mensajes")
    transaccion = relationship("Transaccion", back_populates="mensajes")


class Calificacion(Base):
    __tablename__ = "calificaciones"
    id = Column(Integer, primary_key=True)
    transaccion_id = Column(Integer, ForeignKey("transacciones.id"), nullable=False)
    calificado_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    calificador_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    estrellas = Column(Integer, nullable=False)
    comentario = Column(Text)
    fecha = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Relaciones
    transaccion = relationship("Transaccion", back_populates="calificaciones")
    calificado = relationship("Usuario", foreign_keys=[calificado_id], back_populates="calificaciones_recibidas")
    calificador = relationship("Usuario", foreign_keys=[calificador_id], back_populates="calificaciones_emitidas")


class Notificacion(Base):
    __tablename__ = "notificaciones"
    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    tipo = Column(String(50), nullable=False)  # mensaje, solicitud, respuesta, calificacion, publicacion
    titulo = Column(String(100))
    mensaje = Column(Text, nullable=False)
    leida = Column(Boolean, default=False)
    metadata_json = Column(Text)  # JSON con datos adicionales
    fecha = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Relaciones
    usuario = relationship("Usuario", back_populates="notificaciones")