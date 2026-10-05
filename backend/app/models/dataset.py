from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
import datetime
from app.database import Base

class DatasetMeta(Base):
    __tablename__ = "dataset_meta"

    id = Column(String(64), primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_checksum = Column(String(64), nullable=False, unique=True, index=True)
    file_type = Column(String(10), nullable=False) # csv or xlsx
    total_rows = Column(Integer, default=0)
    total_columns = Column(Integer, default=0)
    columns_meta = Column(JSON, nullable=True) # list of column names & inferred types
    raw_table_name = Column(String(100), nullable=False)
    cleaned_table_name = Column(String(100), nullable=True)
    anonymized_table_name = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    bitacoras = relationship("QualityBitacora", back_populates="dataset", cascade="all, delete-orphan")

class QualityBitacora(Base):
    __tablename__ = "quality_bitacora"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dataset_id = Column(String(64), ForeignKey("dataset_meta.id"), nullable=False)
    dimension = Column(String(50), nullable=False) # Exactitud, Completitud, Consistencia, Actualidad, Validez, Unicidad
    issue_type = Column(String(100), nullable=False)
    affected_column = Column(String(100), nullable=True)
    rows_affected = Column(Integer, default=0)
    action_description = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    dataset = relationship("DatasetMeta", back_populates="bitacoras")
