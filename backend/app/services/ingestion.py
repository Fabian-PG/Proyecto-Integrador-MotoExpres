import hashlib
import uuid
import io
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models.dataset import DatasetMeta, QualityBitacora
from app.database import engine

def compute_checksum(file_bytes: bytes) -> str:
    """Computes SHA-256 hash of file content to detect duplicate uploads."""
    return hashlib.sha256(file_bytes).hexdigest()

def _dataset_to_dict(meta: DatasetMeta) -> dict:
    return {
        "id": meta.id,
        "filename": meta.filename,
        "original_filename": meta.original_filename,
        "file_checksum": meta.file_checksum,
        "file_type": meta.file_type,
        "total_rows": meta.total_rows,
        "total_columns": meta.total_columns,
        "raw_table_name": meta.raw_table_name,
        "cleaned_table_name": meta.cleaned_table_name,
        "anonymized_table_name": meta.anonymized_table_name,
        "created_at": meta.created_at.isoformat() if meta.created_at else None
    }

def process_uploaded_file(file_bytes: bytes, filename: str, db: Session):
    """
    Validates file format, checks for duplicate uploads (SHA256),
    and stores raw dataset in database.
    """
    checksum = compute_checksum(file_bytes)
    
    # 1. Double upload validation check
    existing = db.query(DatasetMeta).filter(DatasetMeta.file_checksum == checksum).first()
    if existing:
        return {
            "status": "duplicate",
            "message": f"El archivo '{filename}' ya fue cargado previamente en el sistema.",
            "dataset": _dataset_to_dict(existing)
        }

    # 2. Parse file format
    file_ext = filename.split(".")[-1].lower()
    if file_ext == "csv":
        try:
            df = pd.read_csv(io.BytesIO(file_bytes), encoding="utf-8")
        except UnicodeDecodeError:
            df = pd.read_csv(io.BytesIO(file_bytes), encoding="latin1")
    elif file_ext in ["xlsx", "xls"]:
        df = pd.read_excel(io.BytesIO(file_bytes))
    else:
        raise ValueError("Formato de archivo no soportado. Debe ser CSV o XLSX.")

    # 3. Clean column headers for SQL table safety
    df.columns = [str(col).strip().replace(" ", "_").replace(".", "_") for col in df.columns]

    dataset_id = str(uuid.uuid4())[:8]
    raw_table_name = f"raw_{dataset_id}"

    # 4. Save raw dataset into Database (preserves original data intact)
    df.to_sql(name=raw_table_name, con=engine, if_exists="replace", index=False, chunksize=5000)

    # 5. Build columns metadata
    cols_meta = []
    for col in df.columns:
        cols_meta.append({
            "name": col,
            "type": str(df[col].dtype),
            "sample": [str(val) for val in df[col].dropna().head(3).tolist()]
        })

    # 6. Create Metadata record
    meta = DatasetMeta(
        id=dataset_id,
        filename=f"{dataset_id}_{filename}",
        original_filename=filename,
        file_checksum=checksum,
        file_type=file_ext,
        total_rows=len(df),
        total_columns=len(df.columns),
        columns_meta=cols_meta,
        raw_table_name=raw_table_name
    )

    db.add(meta)
    db.commit()
    db.refresh(meta)

    return {
        "status": "created",
        "message": f"Archivo '{filename}' cargado exitosamente.",
        "dataset": _dataset_to_dict(meta)
    }

def get_dataset_dataframe(dataset_id: str, table_type: str = "raw", limit: int = None, offset: int = None) -> pd.DataFrame:
    """Retrieves dataset table as Pandas DataFrame from DB with optional limit/offset."""
    if table_type == "raw":
        table_name = f"raw_{dataset_id}"
    elif table_type == "cleaned":
        table_name = f"cleaned_{dataset_id}"
    elif table_type == "anonymized":
        table_name = f"anonymized_{dataset_id}"
    else:
        table_name = f"raw_{dataset_id}"

    if limit is not None:
        query = f"SELECT * FROM {table_name} LIMIT {limit} OFFSET {offset or 0}"
        return pd.read_sql_query(query, con=engine)

    return pd.read_sql_table(table_name, con=engine)

def delete_dataset(dataset_id: str, db: Session) -> dict:
    """
    Safely deletes a dataset:
    - Drops dynamic tables (raw, cleaned, anonymized)
    - Deletes QualityBitacora records
    - Deletes DatasetMeta record (frees up SHA256 checksum for re-upload)
    """
    meta = db.query(DatasetMeta).filter(DatasetMeta.id == dataset_id).first()
    if not meta:
        raise ValueError("Dataset no encontrado")

    original_filename = meta.original_filename
    tables_to_drop = [
        meta.raw_table_name,
        meta.cleaned_table_name,
        meta.anonymized_table_name,
        f"raw_{dataset_id}",
        f"cleaned_{dataset_id}",
        f"anonymized_{dataset_id}"
    ]

    with engine.begin() as conn:
        for tbl in set(filter(None, tables_to_drop)):
            conn.execute(text(f"DROP TABLE IF EXISTS {tbl}"))

    db.query(QualityBitacora).filter(QualityBitacora.dataset_id == dataset_id).delete()
    db.delete(meta)
    db.commit()

    return {
        "status": "success",
        "message": f"Base de datos '{original_filename}' eliminada correctamente.",
        "deleted_id": dataset_id
    }


