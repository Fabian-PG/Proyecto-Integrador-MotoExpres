"""Authentication and access-log services for the BI platform."""
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.usuario import Usuario, AccesoLog


def authenticate_user(
    nombre_usuario: str,
    contrasena: str,
    db: Session,
    ip: Optional[str] = None
) -> dict:
    """Validates credentials, logs the session, and returns the user profile."""
    user = db.query(Usuario).filter(
        Usuario.nombre_usuario == nombre_usuario,
        Usuario.activo == True
    ).first()

    if not user or user.contrasena != contrasena:
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

    log = AccesoLog(
        nombre_usuario=user.nombre_usuario,
        rol=user.rol,
        pantallas=user.pantallas,
        datos=user.datos,
        accion="login",
        ip=ip
    )
    db.add(log)
    db.commit()

    return {
        "id": user.id,
        "rol": user.rol,
        "nombre_usuario": user.nombre_usuario,
        "region": user.region,
        "pantallas": user.pantallas,
        "datos": user.datos,
        "activo": user.activo
    }


def logout_user(nombre_usuario: str, db: Session, ip: Optional[str] = None) -> dict:
    """Records a logout event in the access history."""
    user = db.query(Usuario).filter(Usuario.nombre_usuario == nombre_usuario).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    log = AccesoLog(
        nombre_usuario=user.nombre_usuario,
        rol=user.rol,
        pantallas=user.pantallas,
        datos=user.datos,
        accion="logout",
        ip=ip
    )
    db.add(log)
    db.commit()
    return {"status": "ok", "message": "Sesión cerrada"}


def get_acceso_historial(db: Session, limit: int = 200) -> list:
    """Returns chronological access history for the Accesos view."""
    logs = (
        db.query(AccesoLog)
        .order_by(AccesoLog.timestamp.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": log.id,
            "nombre_usuario": log.nombre_usuario,
            "rol": log.rol,
            "pantallas": log.pantallas,
            "datos": log.datos,
            "accion": log.accion,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
            "ip": log.ip
        }
        for log in logs
    ]


def list_usuarios(db: Session) -> list:
    """Lists all registered users (password excluded)."""
    users = db.query(Usuario).order_by(Usuario.id.asc()).all()
    return [
        {
            "id": u.id,
            "rol": u.rol,
            "nombre_usuario": u.nombre_usuario,
            "region": u.region,
            "pantallas": u.pantallas,
            "datos": u.datos,
            "activo": u.activo,
            "created_at": u.created_at.isoformat() if u.created_at else None
        }
        for u in users
    ]


def create_usuario(payload: dict, db: Session) -> dict:
    """Creates a new user account."""
    required = ["rol", "nombre_usuario", "contrasena", "region", "pantallas", "datos"]
    for field in required:
        if not payload.get(field):
            raise HTTPException(status_code=400, detail=f"Campo requerido: {field}")

    existing = db.query(Usuario).filter(
        Usuario.nombre_usuario == payload["nombre_usuario"]
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="El nombre de usuario ya existe")

    user = Usuario(
        rol=payload["rol"],
        nombre_usuario=payload["nombre_usuario"],
        contrasena=payload["contrasena"],
        region=payload["region"],
        pantallas=payload["pantallas"],
        datos=payload["datos"],
        activo=payload.get("activo", True)
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "rol": user.rol,
        "nombre_usuario": user.nombre_usuario,
        "region": user.region,
        "pantallas": user.pantallas,
        "datos": user.datos,
        "activo": user.activo
    }
