from app.models.models import Usuario


# ✅ CREAR USUARIO
def crear_usuario(db, usuario):
    # validar duplicado
    existe = db.query(Usuario).filter(Usuario.correo == usuario.correo).first()
    if existe:
        return {"error": "El correo ya está registrado"}

    nuevo_usuario = Usuario(
        nombre=usuario.nombre,
        correo=usuario.correo,
        password=usuario.password,
        carrera=usuario.carrera,
        semestre=usuario.semestre
    )

    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)

    return {"mensaje": "Usuario creado", "usuario": nuevo_usuario}


# ✅ LOGIN
def login(db, usuario):
    user = db.query(Usuario).filter(Usuario.correo == usuario.correo).first()

    if not user or user.password != usuario.password:
        return {"error": "Credenciales incorrectas"}

    return {"mensaje": "Login correcto", "usuario": user}