import uuid
import shutil

def guardar_imagen(imagen, upload_dir):
    ext = imagen.filename.split('.')[-1]
    nombre = f"{uuid.uuid4()}.{ext}"
    ruta = f"{upload_dir}/{nombre}"

    with open(ruta, "wb") as buffer:
        shutil.copyfileobj(imagen.file, buffer)

    return ruta