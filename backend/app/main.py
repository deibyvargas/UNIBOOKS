from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routes import libro_routes, user_routes, transaccion_routes, chat_routes
from app.core.database import inicializar_base_de_datos
import os

app = FastAPI(title="UNIBOOKS API")

# init DB
inicializar_base_de_datos()

# uploads
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# rutas
app.include_router(libro_routes.router)
app.include_router(user_routes.router)
app.include_router(transaccion_routes.router)
app.include_router(chat_routes.router)