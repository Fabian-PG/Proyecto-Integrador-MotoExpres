import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from app.models.dataset import DatasetMeta, QualityBitacora
from app.services.ingestion import get_dataset_dataframe
from app.services.quality_diagnosis import diagnose_dataset
from app.database import engine

def execute_cleaning_and_audit(dataset_id: str, db: Session) -> dict:
    """
    Executes automated data quality remediation on the raw dataset.
    - Creates a NEW cleaned table `cleaned_<dataset_id>`.
    - Preserves raw data `raw_<dataset_id>` intact.
    - Logs every action into the `QualityBitacora` table.
    """
    meta = db.query(DatasetMeta).filter(DatasetMeta.id == dataset_id).first()
    if not meta:
        raise ValueError(f"Dataset with ID {dataset_id} not found.")

    # 1. Read Raw DataFrame
    df = get_dataset_dataframe(dataset_id, table_type="raw")
    initial_rows = len(df)
    
    # 2. Run diagnosis to identify findings
    diagnosis = diagnose_dataset(df)
    findings = diagnosis["findings"]
    
    cleaned_df = df.copy()
    bitacora_entries = []

    # 3. Apply remediation actions per finding
    for f in findings:
        col = f.get("column")
        action = f.get("action_type")
        dim = f.get("dimension")
        
        # A. Duplicate rows removal
        if action == "remove_duplicates":
            before_len = len(cleaned_df)
            cleaned_df = cleaned_df.drop_duplicates()
            removed = before_len - len(cleaned_df)
            if removed > 0:
                bitacora_entries.append(QualityBitacora(
                    dataset_id=dataset_id,
                    dimension=dim,
                    issue_type="Filas Duplicadas",
                    affected_column="Todas",
                    rows_affected=removed,
                    action_description=f"Se eliminaron {removed} filas idénticas duplicadas conservando la primera ocurrencia."
                ))

        # B. Impute missing values
        elif action == "impute_missing" and col in cleaned_df.columns:
            null_count = int(cleaned_df[col].isnull().sum())
            if null_count > 0:
                if pd.api.types.is_numeric_dtype(cleaned_df[col]):
                    median_val = cleaned_df[col].median()
                    cleaned_df[col] = cleaned_df[col].fillna(median_val)
                    desc = f"Se imputaron {null_count} valores nulos en '{col}' con la mediana ({round(median_val, 2)})."
                else:
                    mode_val = cleaned_df[col].mode()[0] if not cleaned_df[col].mode().empty else "No Especificado"
                    cleaned_df[col] = cleaned_df[col].fillna(mode_val)
                    desc = f"Se imputaron {null_count} valores nulos en '{col}' con la moda ('{mode_val}')."
                
                bitacora_entries.append(QualityBitacora(
                    dataset_id=dataset_id,
                    dimension=dim,
                    issue_type="Valores Faltantes",
                    affected_column=col,
                    rows_affected=null_count,
                    action_description=desc
                ))

        # C. Fix whitespaces
        elif action == "trim_whitespaces" and col in cleaned_df.columns:
            if pd.api.types.is_string_dtype(cleaned_df[col]) or cleaned_df[col].dtype == 'object':
                orig_col = cleaned_df[col].astype(str)
                cleaned_df[col] = orig_col.str.strip()
                changed = int((orig_col != cleaned_df[col]).sum())
                if changed > 0:
                    bitacora_entries.append(QualityBitacora(
                        dataset_id=dataset_id,
                        dimension=dim,
                        issue_type="Espacios Sobrantes",
                        affected_column=col,
                        rows_affected=changed,
                        action_description=f"Se eliminaron espacios en blanco al inicio y final en {changed} registros de '{col}'."
                    ))

        # D. Fix negative values in positive business metrics
        elif action == "fix_negatives" and col in cleaned_df.columns:
            neg_mask = cleaned_df[col] < 0
            neg_count = int(neg_mask.sum())
            if neg_count > 0:
                cleaned_df[col] = cleaned_df[col].abs()
                bitacora_entries.append(QualityBitacora(
                    dataset_id=dataset_id,
                    dimension=dim,
                    issue_type="Valores Negativos Inválidos",
                    affected_column=col,
                    rows_affected=neg_count,
                    action_description=f"Se convirtieron {neg_count} valores negativos en '{col}' a sus valores absolutos positivos."
                ))

        # E. Cap outliers (Winsorization)
        elif action == "cap_outliers" and col in cleaned_df.columns:
            series = cleaned_df[col].dropna()
            q1 = series.quantile(0.25)
            q3 = series.quantile(0.75)
            iqr = q3 - q1
            lower_bound = q1 - 1.5 * iqr
            upper_bound = q3 + 1.5 * iqr

            outliers_mask = (cleaned_df[col] < lower_bound) | (cleaned_df[col] > upper_bound)
            outlier_cnt = int(outliers_mask.sum())
            if outlier_cnt > 0:
                cleaned_df[col] = np.clip(cleaned_df[col], lower_bound, upper_bound)
                bitacora_entries.append(QualityBitacora(
                    dataset_id=dataset_id,
                    dimension=dim,
                    issue_type="Outliers Atípicos IQR",
                    affected_column=col,
                    rows_affected=outlier_cnt,
                    action_description=f"Se acotaron {outlier_cnt} valores atípicos en '{col}' al rango [{round(lower_bound, 2)}, {round(upper_bound, 2)}]."
                ))

        # F. Fix Email format
        elif action == "fix_email_format" and col in cleaned_df.columns:
            cleaned_df[col] = cleaned_df[col].astype(str).str.lower().str.strip()
            bitacora_entries.append(QualityBitacora(
                dataset_id=dataset_id,
                dimension=dim,
                issue_type="Formato Email Inválido",
                affected_column=col,
                rows_affected=f.get("rows_affected", 0),
                action_description=f"Se minunculizó y normalizó el formato de correo electrónico en '{col}'."
            ))

    # 4. Save cleaned dataset into NEW Database Table
    cleaned_table_name = f"cleaned_{dataset_id}"
    cleaned_df.to_sql(name=cleaned_table_name, con=engine, if_exists="replace", index=False)

    # 5. Save Bitácora Records to DB
    for entry in bitacora_entries:
        db.add(entry)

    # 6. Update Dataset Meta
    meta.cleaned_table_name = cleaned_table_name
    db.commit()

    return {
        "status": "success",
        "cleaned_table": cleaned_table_name,
        "initial_rows": initial_rows,
        "final_rows": len(cleaned_df),
        "total_actions": len(bitacora_entries),
        "bitacora": [
            {
                "id": b.id,
                "dimension": b.dimension,
                "issue_type": b.issue_type,
                "affected_column": b.affected_column,
                "rows_affected": b.rows_affected,
                "action_description": b.action_description,
                "timestamp": b.timestamp.isoformat() if b.timestamp else None
            } for b in bitacora_entries
        ]
    }
