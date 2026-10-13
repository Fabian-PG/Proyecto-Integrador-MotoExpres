from typing import Optional
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.dataset import DatasetMeta, QualityBitacora
from app.services.ingestion import process_uploaded_file, get_dataset_dataframe
from app.services.quality_diagnosis import diagnose_dataset
from app.services.cleaning import execute_cleaning_and_audit
from app.services.star_schema import generate_star_schema
from app.services.anonymization import analyze_anonymization_and_bias, execute_anonymization
from app.services.auth import (
    authenticate_user, logout_user, get_acceso_historial,
    list_usuarios, create_usuario
)
from app.services.analytics import (
    get_filter_options, build_tablero, build_exploracion, build_alertas
)

router = APIRouter(prefix="/api")


class LoginRequest(BaseModel):
    nombre_usuario: str
    contrasena: str


class LogoutRequest(BaseModel):
    nombre_usuario: str


class UsuarioCreateRequest(BaseModel):
    rol: str
    nombre_usuario: str
    contrasena: str
    region: str = "todos"
    pantallas: str
    datos: str = "todos"
    activo: bool = True

# ==========================================
# 1. DATASETS & INGESTION ENDPOINTS
# ==========================================
@router.post("/datasets/upload")
async def upload_dataset(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Uploads CSV or XLSX dataset with real-time double-upload SHA256 check."""
    if not (file.filename.endswith(".csv") or file.filename.endswith(".xlsx") or file.filename.endswith(".xls")):
        raise HTTPException(status_code=400, detail="Formato no soportado. Solo se permiten archivos .csv o .xlsx")

    file_bytes = await file.read()
    res = process_uploaded_file(file_bytes, file.filename, db)
    return res

@router.get("/datasets")
def list_datasets(db: Session = Depends(get_db)):
    """Returns list of all uploaded datasets for top navigation tabs."""
    datasets = db.query(DatasetMeta).order_by(DatasetMeta.created_at.desc()).all()
    return [
        {
            "id": d.id,
            "filename": d.filename,
            "original_filename": d.original_filename,
            "file_type": d.file_type,
            "total_rows": d.total_rows,
            "total_columns": d.total_columns,
            "columns_meta": d.columns_meta,
            "has_cleaned": bool(d.cleaned_table_name),
            "has_anonymized": bool(d.anonymized_table_name),
            "created_at": d.created_at.isoformat() if d.created_at else None
        } for d in datasets
    ]

@router.get("/datasets/{dataset_id}")
def get_dataset_detail(dataset_id: str, view_type: str = "raw", page: int = 1, limit: int = 50, db: Session = Depends(get_db)):
    """Retrieves dataset details and preview rows efficiently."""
    meta = db.query(DatasetMeta).filter(DatasetMeta.id == dataset_id).first()
    if not meta:
        raise HTTPException(status_code=404, detail="Dataset no encontrado")

    start = (page - 1) * limit
    try:
        df = get_dataset_dataframe(dataset_id, table_type=view_type, limit=limit, offset=start)
    except Exception:
        df = get_dataset_dataframe(dataset_id, table_type="raw", limit=limit, offset=start)

    # Convert timestamps, NaNs and null values safely to clean string representations
    preview_df = df.astype(str).replace({"nan": "", "None": "", "<NA>": "", "NaT": ""})

    return {
        "dataset_info": {
            "id": meta.id,
            "original_filename": meta.original_filename,
            "file_type": meta.file_type,
            "total_rows": meta.total_rows,
            "total_columns": meta.total_columns,
            "columns": df.columns.tolist()
        },
        "view_type": view_type,
        "rows": preview_df.to_dict(orient="records")
    }


# ==========================================
# 2. DATA QUALITY & CLEANING ENDPOINTS
# ==========================================
@router.get("/quality/diagnose/{dataset_id}")
def get_quality_diagnosis(dataset_id: str, db: Session = Depends(get_db)):
    """Gets 6-dimensional Data Quality Diagnosis."""
    meta = db.query(DatasetMeta).filter(DatasetMeta.id == dataset_id).first()
    if not meta:
        raise HTTPException(status_code=404, detail="Dataset no encontrado")

    df = get_dataset_dataframe(dataset_id, table_type="raw")
    res = diagnose_dataset(df)
    return res

@router.post("/quality/clean/{dataset_id}")
def run_quality_clean(dataset_id: str, db: Session = Depends(get_db)):
    """Executes cleaning, creates cleaned dataset table and logs bitacora."""
    try:
        res = execute_cleaning_and_audit(dataset_id, db)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/quality/bitacora/{dataset_id}")
def get_bitacora_logs(dataset_id: str, db: Session = Depends(get_db)):
    """Retrieves audit bitacora log history for dataset."""
    logs = db.query(QualityBitacora).filter(QualityBitacora.dataset_id == dataset_id).order_by(QualityBitacora.id.asc()).all()
    return [
        {
            "id": b.id,
            "dimension": b.dimension,
            "issue_type": b.issue_type,
            "affected_column": b.affected_column,
            "rows_affected": b.rows_affected,
            "action_description": b.action_description,
            "timestamp": b.timestamp.isoformat() if b.timestamp else None
        } for b in logs
    ]

# ==========================================
# 3. DATA MODELING ENDPOINTS
# ==========================================
@router.get("/modeling/star-schema/{dataset_id}")
def get_star_schema_model(dataset_id: str, db: Session = Depends(get_db)):
    """Generates Star Schema model and granularity declaration."""
    meta = db.query(DatasetMeta).filter(DatasetMeta.id == dataset_id).first()
    if not meta:
        raise HTTPException(status_code=404, detail="Dataset no encontrado")

    df = get_dataset_dataframe(dataset_id, table_type="raw")
    schema = generate_star_schema(df, dataset_name=meta.original_filename)
    return schema

# ==========================================
# 4. ANONYMIZATION ENDPOINTS
# ==========================================
@router.get("/anonymization/analyze/{dataset_id}")
def get_anonymization_analysis(dataset_id: str, db: Session = Depends(get_db)):
    """Evaluates K-anonymity score, sensitive attributes, and bias."""
    meta = db.query(DatasetMeta).filter(DatasetMeta.id == dataset_id).first()
    if not meta:
        raise HTTPException(status_code=404, detail="Dataset no encontrado")

    table_type = "cleaned" if meta.cleaned_table_name else "raw"
    df = get_dataset_dataframe(dataset_id, table_type=table_type)
    res = analyze_anonymization_and_bias(df)
    return res

@router.post("/anonymization/apply/{dataset_id}")
def run_anonymization_transformation(dataset_id: str, db: Session = Depends(get_db)):
    """Applies anonymization transformations and creates anonymized table."""
    try:
        res = execute_anonymization(dataset_id, db)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# 5. AUTHENTICATION & USERS ENDPOINTS
# ==========================================
@router.post("/auth/login")
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Authenticates user credentials and logs the access event."""
    client_ip = request.client.host if request.client else None
    return authenticate_user(payload.nombre_usuario, payload.contrasena, db, ip=client_ip)


@router.post("/auth/logout")
def logout(payload: LogoutRequest, request: Request, db: Session = Depends(get_db)):
    """Registers a logout event in the access history."""
    client_ip = request.client.host if request.client else None
    return logout_user(payload.nombre_usuario, db, ip=client_ip)


@router.get("/auth/accesos")
def acceso_historial(limit: int = 200, db: Session = Depends(get_db)):
    """Returns login/logout history for the Accesos view."""
    return get_acceso_historial(db, limit=limit)


@router.get("/usuarios")
def get_usuarios(db: Session = Depends(get_db)):
    """Lists registered platform users."""
    return list_usuarios(db)


@router.post("/usuarios")
def post_usuario(payload: UsuarioCreateRequest, db: Session = Depends(get_db)):
    """Creates a new user with role, screens and data scope."""
    return create_usuario(payload.model_dump(), db)


# ==========================================
# 6. HITO 2 ANALYTICS ENDPOINTS
# ==========================================
@router.get("/analytics/{dataset_id}/filters")
def analytics_filters(
    dataset_id: str,
    user_region: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Available years and regions for dashboard filters (requires cleaned dataset)."""
    return get_filter_options(dataset_id, db, user_region=user_region)


@router.get("/analytics/{dataset_id}/tablero")
def analytics_tablero(
    dataset_id: str,
    anio_inicio: Optional[int] = None,
    anio_fin: Optional[int] = None,
    region: Optional[str] = None,
    user_region: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Tablero general KPIs and charts filtered by year range and region."""
    return build_tablero(
        dataset_id, db,
        anio_inicio=anio_inicio,
        anio_fin=anio_fin,
        region=region,
        user_region=user_region
    )


@router.get("/analytics/{dataset_id}/exploracion")
def analytics_exploracion(
    dataset_id: str,
    anio_inicio: Optional[int] = None,
    anio_fin: Optional[int] = None,
    region: Optional[str] = None,
    mes: Optional[int] = None,
    user_region: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Exploración de datos with participation table and service bars."""
    return build_exploracion(
        dataset_id, db,
        anio_inicio=anio_inicio,
        anio_fin=anio_fin,
        region=region,
        mes=mes,
        user_region=user_region
    )


@router.get("/analytics/{dataset_id}/alertas")
def analytics_alertas(
    dataset_id: str,
    anio_inicio: Optional[int] = None,
    anio_fin: Optional[int] = None,
    region: Optional[str] = None,
    user_region: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Anomaly detection charts and explanatory messages."""
    return build_alertas(
        dataset_id, db,
        anio_inicio=anio_inicio,
        anio_fin=anio_fin,
        region=region,
        user_region=user_region
    )
