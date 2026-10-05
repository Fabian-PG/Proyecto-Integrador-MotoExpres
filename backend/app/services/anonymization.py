import hashlib
import numpy as np
import pandas as pd
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.dataset import DatasetMeta
from app.services.ingestion import get_dataset_dataframe
from app.database import engine

def analyze_anonymization_and_bias(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Evaluates:
    1. K-Anonymity score (k=1, 3, 5...)
    2. Identifies Direct Identifiers (DIs), Quasi-Identifiers (QIs), and Sensitive Attributes (SAs)
    3. Identifies Data Biases across demographic & categorical columns
    4. Explains necessity of anonymization and suggests remediation actions
    """
    total_rows = len(df)
    cols = df.columns.tolist()

    direct_identifiers = []
    quasi_identifiers = []
    sensitive_attributes = []
    other_columns = []

    # Keywords for classification
    di_keywords = ['nombre', 'name', 'email', 'correo', 'cedula', 'dni', 'ssn', 'telefono', 'phone', 'direccion', 'address', 'documento']
    qi_keywords = ['edad', 'age', 'genero', 'gender', 'sexo', 'sex', 'ciudad', 'city', 'zip', 'cp', 'pais', 'country', 'ocupacion', 'departamento', 'estado_civil']
    sa_keywords = ['salario', 'salary', 'ingreso', 'income', 'deuda', 'debt', 'enfermedad', 'diagnostico', 'puntaje_credito', 'credit_score', 'evaluacion', 'desempeno']

    for col in cols:
        clow = col.lower()
        if any(kw in clow for kw in di_keywords):
            direct_identifiers.append(col)
        elif any(kw in clow for kw in qi_keywords):
            quasi_identifiers.append(col)
        elif any(kw in clow for kw in sa_keywords):
            sensitive_attributes.append(col)
        else:
            # Check cardinality to classify
            if df[col].nunique() == total_rows and total_rows > 10:
                direct_identifiers.append(col)
            elif pd.api.types.is_numeric_dtype(df[col]):
                sensitive_attributes.append(col)
            else:
                quasi_identifiers.append(col)

    # Calculate current K-Anonymity
    if quasi_identifiers:
        # Group by QIs to find minimum equivalence class size
        group_sizes = df.groupby(quasi_identifiers, observed=False).size()
        k_value = int(group_sizes.min()) if not group_sizes.empty else 1
    else:
        k_value = 1

    # Format k explanation
    if k_value == 1:
        k_status = "Alto Riesgo (k=1)"
        k_explanation = (
            "El nivel de k-anonimato actual es k=1. Esto significa que existen combinaciones únicas de atributos "
            "(Quasi-Identificadores como edad, género o ciudad) que permiten re-identificar a individuos específicos "
            "en el conjunto de datos con un 100% de certeza."
        )
    elif k_value < 5:
        k_status = "Riesgo Moderado (k < 5)"
        k_explanation = f"El nivel actual de k-anonimato es k={k_value}. Se recomienda generalizar variables para alcanzar al menos k>=5."
    else:
        k_status = "Protegido (k >= 5)"
        k_explanation = f"El nivel de k-anonimato es k={k_value}, lo cual otorga una protección robusta contra la re-identificación."

    # Identify Bias in categorical distributions
    bias_findings = []
    cat_cols = quasi_identifiers + [col for col in cols if df[col].dtype == 'object' and col not in direct_identifiers]
    
    for col in set(cat_cols):
        counts = df[col].value_counts(normalize=True)
        top_category = counts.index[0] if not counts.empty else "N/A"
        top_pct = round(counts.iloc[0] * 100, 2) if not counts.empty else 0

        # Skew bias check (e.g., > 70% concentration in single category)
        if top_pct > 70:
            bias_findings.append({
                "column": col,
                "bias_type": "Desbalance de Representación (Sesgo de Muestreo)",
                "dominant_category": str(top_category),
                "percentage": top_pct,
                "description": f"La categoría '{top_category}' domina el {top_pct}% de los registros en '{col}', lo que puede provocar sesgo en modelos de analítica predicativa.",
                "recommendation": f"Aplicar técnicas de re-ponderación o muestreo estratificado sobre la variable '{col}'."
            })

    # Suggested Anonymization Actions
    suggested_actions = []
    if direct_identifiers:
        suggested_actions.append({
            "action": "Enmascaramiento y Hashing de Identificadores Directos",
            "target": direct_identifiers,
            "description": f"Ocultar o encriptar con SHA256 las columnas {direct_identifiers} para evitar divulgación directa de datos personales."
        })
    if quasi_identifiers:
        suggested_actions.append({
            "action": "Generalización en Rangos / Agrupamiento (Generalization)",
            "target": quasi_identifiers,
            "description": f"Agrupar valores numéricos continuos (como edad o salario) en rangos e intervalos para elevar k de 1 a >= 5."
        })

    return {
        "k_value": k_value,
        "k_status": k_status,
        "k_explanation": k_explanation,
        "attributes": {
            "direct_identifiers": direct_identifiers,
            "quasi_identifiers": quasi_identifiers,
            "sensitive_attributes": sensitive_attributes
        },
        "bias_findings": bias_findings,
        "suggested_actions": suggested_actions
    }

def mask_text(val: str) -> str:
    """Masks a text string keeping only initial and ending character."""
    s = str(val).strip()
    if len(s) <= 2:
        return "*" * len(s)
    return s[0] + "*" * (len(s) - 2) + s[-1]

def generalize_age(age: float) -> str:
    """Generalizes numeric age into 10-year bracket ranges."""
    try:
        a = float(age)
        if np.isnan(a):
            return "Desconocido"
        floor_bracket = int(a // 10) * 10
        return f"{floor_bracket}-{floor_bracket + 9}"
    except Exception:
        return "Desconocido"

def execute_anonymization(dataset_id: str, db: Session) -> Dict[str, Any]:
    """
    Executes anonymization on dataset:
    - Masks direct identifiers.
    - Generalizes quasi-identifiers into range buckets.
    - Creates a NEW anonymized table `anonymized_<dataset_id>` preserving raw and cleaned tables intact.
    """
    meta = db.query(DatasetMeta).filter(DatasetMeta.id == dataset_id).first()
    if not meta:
        raise ValueError(f"Dataset {dataset_id} not found.")

    # Read cleanest available DataFrame (cleaned or raw)
    table_to_read = "cleaned" if meta.cleaned_table_name else "raw"
    df = get_dataset_dataframe(dataset_id, table_type=table_to_read)

    anonymized_df = df.copy()
    analysis = analyze_anonymization_and_bias(df)
    
    dis = analysis["attributes"]["direct_identifiers"]
    qis = analysis["attributes"]["quasi_identifiers"]

    # 1. Mask Direct Identifiers
    for col in dis:
        if col in anonymized_df.columns:
            anonymized_df[col] = anonymized_df[col].apply(mask_text)

    # 2. Generalize Age if present
    age_cols = [col for col in qis if 'edad' in col.lower() or 'age' in col.lower()]
    for col in age_cols:
        if col in anonymized_df.columns and pd.api.types.is_numeric_dtype(anonymized_df[col]):
            anonymized_df[col] = anonymized_df[col].apply(generalize_age)

    # 3. Save into NEW anonymized database table (preserves original intact)
    anonymized_table_name = f"anonymized_{dataset_id}"
    anonymized_df.to_sql(name=anonymized_table_name, con=engine, if_exists="replace", index=False)

    # 4. Recalculate Post-Anonymization K
    post_analysis = analyze_anonymization_and_bias(anonymized_df)

    # 5. Update Metadata
    meta.anonymized_table_name = anonymized_table_name
    db.commit()

    return {
        "status": "success",
        "anonymized_table": anonymized_table_name,
        "previous_k": analysis["k_value"],
        "updated_k": post_analysis["k_value"],
        "updated_k_status": post_analysis["k_status"],
        "masked_columns": dis,
        "generalized_columns": age_cols,
        "total_records": len(anonymized_df)
    }
