from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean
import datetime
from app.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, autoincrement=True)
    rol = Column(String(50), nullable=False)                  # gerente general, analista de datos
    nombre_usuario = Column(String(100), nullable=False, unique=True, index=True)
    contrasena = Column(String(255), nullable=False)
    region = Column(String(255), nullable=False, default="todos")  # todos | nombre_region
    pantallas = Column(Text, nullable=False, default="todas")      # JSON-like list or "todas"/"hito2"
    datos = Column(String(255), nullable=False, default="todos")   # todos | nombre_region
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class AccesoLog(Base):
    __tablename__ = "acceso_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nombre_usuario = Column(String(100), nullable=False)
    rol = Column(String(50), nullable=False)
    pantallas = Column(Text, nullable=True)
    datos = Column(String(255), nullable=True)
    accion = Column(String(20), nullable=False, default="login")   # login | logout
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    ip = Column(String(50), nullable=True)
