import hashlib
import uuid
import io
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import inspect
from app.models.dataset import DatasetMeta
from app.database import engine

def compute_checksum(file_bytes: bytes) -> str:
    """Computes SHA-256 hash of file content to detect duplicate uploads."""
    return hashlib.sha256(file_bytes).hexdigest()

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
            "dataset": existing
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
    df.to_sql(name=raw_table_name, con=engine, if_exists="replace", index=False)

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
        "dataset": meta
    }

def get_dataset_dataframe(dataset_id: str, table_type: str = "raw") -> pd.DataFrame:
    """Retrieves dataset table as Pandas DataFrame from DB."""
    if table_type == "raw":
        table_name = f"raw_{dataset_id}"
    elif table_type == "cleaned":
        table_name = f"cleaned_{dataset_id}"
    elif table_type == "anonymized":
        table_name = f"anonymized_{dataset_id}"
    else:
        table_name = f"raw_{dataset_id}"

    return pd.read_sql_table(table_name, con=engine)
