import sys
import os
sys.path.append('backend')

# Usa la base de datos local sqlite definida en backend/app/database.py
from app.database import inicializar_base_de_datos
try:
    inicializar_base_de_datos()
    print('✅ Conexión exitosa a la base de datos local')
except Exception as e:
    print(f'❌ Error de conexión: {e}')