import datetime
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.usuario import Usuario


INITIAL_USERS = [
    {
        "rol": "gerente general",
        "nombre_usuario": "gege",
        "contrasena": "123456789",
        "region": "todos",
        "pantallas": "tablero,exploracion,alertas,accesos,crear_usuarios",
        "datos": "todos"
    },
    {
        "rol": "analista de datos",
        "nombre_usuario": "anda",
        "contrasena": "123456789",
        "region": "todos",
        "pantallas": "carga,diagnostico,modelo,anonimizacion,tablero,exploracion,alertas,accesos,crear_usuarios",
        "datos": "todos"
    }
]


def seed_initial_users():
    """Seeds initial users into the database if they don't already exist."""
    db: Session = SessionLocal()
    try:
        for u in INITIAL_USERS:
            existing = db.query(Usuario).filter(Usuario.nombre_usuario == u["nombre_usuario"]).first()
            if not existing:
                new_user = Usuario(**u)
                db.add(new_user)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[SEED] Error seeding users: {e}")
    finally:
        db.close()
