import re
import numpy as np
import pandas as pd
from typing import Dict, Any, List

def diagnose_dataset(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Performs a 6-Dimensional Data Quality Diagnosis for Business Intelligence:
    1. Exactitud (Accuracy)
    2. Completitud (Completeness)
    3. Consistencia (Consistency)
    4. Actualidad (Timeliness)
    5. Validez (Validity)
    6. Unicidad (Uniqueness)
    """
    total_rows = len(df)
    total_cols = len(df.columns)
    findings = []

    # -------------------------------------------------------------
    # 1. COMPLETITUD (Completeness)
    # -------------------------------------------------------------
    null_counts = df.isnull().sum()
    empty_str_placeholders = ['n/a', 'na', 'null', 'none', 'unknown', 'sin_datos', '???', '-']
    
    missing_total = 0
    for col in df.columns:
        col_nulls = int(null_counts[col])
        # Check placeholder strings
        placeholder_mask = df[col].astype(str).str.strip().str.lower().isin(empty_str_placeholders)
        placeholder_count = int(placeholder_mask.sum())
        
        col_missing = col_nulls + placeholder_count
        missing_total += col_missing
        
        if col_missing > 0:
            pct = round((col_missing / total_rows) * 100, 2)
            findings.append({
                "dimension": "Completitud",
                "table": "dataset",
                "column": col,
                "issue": f"{col_missing} valores faltantes o vacíos ({pct}%)",
                "rows_affected": col_missing,
                "severity": "Alta" if pct > 20 else "Media" if pct > 5 else "Baja",
                "recommendation": f"Imputar valores nulos en '{col}' utilizando la mediana/moda o valor por defecto según el contexto de negocio.",
                "action_type": "impute_missing"
            })
    
    completeness_score = max(0, round(100 - (missing_total / (total_rows * max(total_cols, 1)) * 100), 2))

    # -------------------------------------------------------------
    # 2. UNICIDAD (Uniqueness)
    # -------------------------------------------------------------
    dup_rows = int(df.duplicated().sum())
    if dup_rows > 0:
        pct = round((dup_rows / total_rows) * 100, 2)
        findings.append({
            "dimension": "Unicidad",
            "table": "dataset",
            "column": "Todas las columnas (Fila completa)",
            "issue": f"{dup_rows} filas exactamente duplicadas ({pct}%)",
            "rows_affected": dup_rows,
            "severity": "Alta" if pct > 5 else "Media",
            "recommendation": "Eliminar registros duplicados idénticos conservando la primera ocurrencia.",
            "action_type": "remove_duplicates"
        })
    
    # Check ID/Key duplicate candidates
    id_cols = [col for col in df.columns if any(kw in col.lower() for kw in ['id', 'codigo', 'cedula', 'key', 'num_doc'])]
    for col in id_cols:
        dup_keys = int(df[col].dropna().duplicated().sum())
        if dup_keys > 0:
            findings.append({
                "dimension": "Unicidad",
                "table": "dataset",
                "column": col,
                "issue": f"{dup_keys} valores de clave primaria/identificador duplicados en '{col}'",
                "rows_affected": dup_keys,
                "severity": "Alta",
                "recommendation": f"Desduplicar o asignar identificadores únicos en '{col}'.",
                "action_type": "deduplicate_keys"
            })
            
    uniqueness_score = max(0, round(100 - (dup_rows / max(total_rows, 1) * 100), 2))

    # -------------------------------------------------------------
    # 3. EXACTITUD (Accuracy & Outliers)
    # -------------------------------------------------------------
    outlier_total = 0
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    
    for col in numeric_cols:
        series = df[col].dropna()
        if len(series) > 4:
            q1 = series.quantile(0.25)
            q3 = series.quantile(0.75)
            iqr = q3 - q1
            lower_bound = q1 - 1.5 * iqr
            upper_bound = q3 + 1.5 * iqr
            
            outliers = series[(series < lower_bound) | (series > upper_bound)]
            outlier_cnt = len(outliers)
            outlier_total += outlier_cnt
            
            if outlier_cnt > 0:
                pct = round((outlier_cnt / total_rows) * 100, 2)
                findings.append({
                    "dimension": "Exactitud",
                    "table": "dataset",
                    "column": col,
                    "issue": f"{outlier_cnt} valores atípicos (outliers IQR) fuera del rango [{round(lower_bound, 2)}, {round(upper_bound, 2)}]",
                    "rows_affected": outlier_cnt,
                    "severity": "Media" if pct < 10 else "Alta",
                    "recommendation": f"Ajustar/Acotar valores atípicos (winsorización/capping) en '{col}' al rango intercuartílico.",
                    "action_type": "cap_outliers"
                })

    # Negative values check for positive metric fields (price, sales, age, quantity)
    positive_keywords = ['precio', 'price', 'monto', 'amount', 'venta', 'sale', 'cantidad', 'quantity', 'edad', 'age', 'stock']
    for col in df.columns:
        if any(kw in col.lower() for kw in positive_keywords) and col in numeric_cols:
            neg_mask = df[col] < 0
            neg_cnt = int(neg_mask.sum())
            if neg_cnt > 0:
                findings.append({
                    "dimension": "Exactitud",
                    "table": "dataset",
                    "column": col,
                    "issue": f"{neg_cnt} valores negativos no válidos en métrica de negocio '{col}'",
                    "rows_affected": neg_cnt,
                    "severity": "Alta",
                    "recommendation": f"Convertir valores negativos a su valor absoluto o reemplazar por 0 en '{col}'.",
                    "action_type": "fix_negatives"
                })

    accuracy_score = max(0, round(100 - (outlier_total / max(total_rows * len(numeric_cols), 1) * 100), 2))

    # -------------------------------------------------------------
    # 4. VALIDEZ (Validity)
    # -------------------------------------------------------------
    email_pattern = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    email_cols = [col for col in df.columns if 'email' in col.lower() or 'correo' in col.lower()]
    invalid_formats_cnt = 0

    for col in email_cols:
        non_nulls = df[col].dropna().astype(str)
        invalid_emails = non_nulls[~non_nulls.str.match(email_pattern)]
        inv_cnt = len(invalid_emails)
        invalid_formats_cnt += inv_cnt
        if inv_cnt > 0:
            findings.append({
                "dimension": "Validez",
                "table": "dataset",
                "column": col,
                "issue": f"{inv_cnt} correos electrónicos con formato inválido",
                "rows_affected": inv_cnt,
                "severity": "Media",
                "recommendation": f"Normalizar formato o marcar emails no válidos en '{col}'.",
                "action_type": "fix_email_format"
            })

    validity_score = max(0, round(100 - (invalid_formats_cnt / max(total_rows, 1) * 100), 2))

    # -------------------------------------------------------------
    # 5. CONSISTENCIA (Consistency)
    # -------------------------------------------------------------
    inconsistency_cnt = 0
    # Check mixed data types or string columns with trailing/leading whitespaces
    text_cols = df.select_dtypes(include=['object']).columns
    for col in text_cols:
        whitespace_cnt = int(df[col].astype(str).str.contains(r'^\s+|\s+$', regex=True).sum())
        if whitespace_cnt > 0:
            inconsistency_cnt += whitespace_cnt
            findings.append({
                "dimension": "Consistencia",
                "table": "dataset",
                "column": col,
                "issue": f"{whitespace_cnt} valores con espacios sobrantes al inicio/final",
                "rows_affected": whitespace_cnt,
                "severity": "Baja",
                "recommendation": f"Aplicar trim/limpieza de espacios en blanco en '{col}'.",
                "action_type": "trim_whitespaces"
            })
            
    consistency_score = max(0, round(100 - (inconsistency_cnt / max(total_rows * max(len(text_cols), 1), 1) * 100), 2))

    # -------------------------------------------------------------
    # 6. ACTUALIDAD (Timeliness / Currency)
    # -------------------------------------------------------------
    date_cols = [col for col in df.columns if any(kw in col.lower() for kw in ['fecha', 'date', 'created', 'timestamp'])]
    stale_cnt = 0
    for col in date_cols:
        try:
            parsed_dates = pd.to_datetime(df[col], errors='coerce')
            future_dates = parsed_dates[parsed_dates > pd.Timestamp.now()]
            fut_cnt = len(future_dates)
            if fut_cnt > 0:
                stale_cnt += fut_cnt
                findings.append({
                    "dimension": "Actualidad",
                    "table": "dataset",
                    "column": col,
                    "issue": f"{fut_cnt} fechas futuras ilógicas registradas en '{col}'",
                    "rows_affected": fut_cnt,
                    "severity": "Alta",
                    "recommendation": f"Ajustar o corregir fechas futuras en '{col}'.",
                    "action_type": "fix_future_dates"
                })
        except Exception:
            pass

    timeliness_score = max(0, round(100 - (stale_cnt / max(total_rows, 1) * 100), 2))

    # Overall Data Quality Index (DQ Index)
    dq_index = round(np.mean([
        completeness_score, uniqueness_score, accuracy_score,
        validity_score, consistency_score, timeliness_score
    ]), 2)

    return {
        "dq_index": dq_index,
        "scores": {
            "completitud": completeness_score,
            "unicidad": uniqueness_score,
            "exactitud": accuracy_score,
            "validez": validity_score,
            "consistencia": consistency_score,
            "actualidad": timeliness_score
        },
        "total_findings": len(findings),
        "findings": findings
    }
