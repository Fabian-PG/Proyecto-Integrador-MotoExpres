"""
Heuristic column detection for heterogeneous BI datasets.
Maps common Spanish/English column names to semantic roles used by Hito 2 analytics.
"""
import pandas as pd
import numpy as np
import re


REVENUE_HINTS = [
    "monto_venta", "monto", "ingreso", "ingresos", "revenue", "venta", "ventas",
    "precio", "total", "importe", "amount", "sales", "valor", "pago", "facturacion"
]
COST_HINTS = ["costo", "costos", "cost", "costs", "gasto", "gastos", "cogs"]
DATE_HINTS = ["fecha", "date", "datetime", "periodo", "period", "timestamp", "created"]
REGION_HINTS = [
    "ciudad", "region", "país", "pais", "country", "departamento", "zona",
    "estado", "provincia", "localidad", "ubicacion", "ubicación"
]
SERVICE_HINTS = [
    "servicio", "servicios", "categoria", "categoría", "producto", "plan",
    "planes", "tipo_servicio", "categoria_producto", "service", "category", "product"
]
ORDER_HINTS = [
    "id_transaccion", "transaccion", "orden", "order", "pedido", "factura",
    "id_orden", "id_pedido", "transaction", "ticket"
]
STATUS_HINTS = ["estado", "status", "estatus", "cancel", "cancelacion", "cancelación"]
DELIVERY_HINTS = [
    "entrega", "entregado", "a_tiempo", "ontime", "on_time", "puntual",
    "delivery", "cumplimiento"
]
ACTIVE_HINTS = ["activo", "activa", "active", "plan_activo", "estado_plan"]
CANCEL_VALUES = {"cancelado", "cancelada", "cancelled", "canceled", "anulado", "anulada"}


def _norm(name: str) -> str:
    return re.sub(r"[^a-z0-9_]", "", str(name).lower().strip().replace(" ", "_"))


def _find_column(columns, hints):
    normalized = {_norm(c): c for c in columns}
    for hint in hints:
        hint_n = _norm(hint)
        for ncol, original in normalized.items():
            if hint_n == ncol or hint_n in ncol:
                return original
    return None


def detect_columns(df: pd.DataFrame) -> dict:
    """Detects semantic roles from dataframe column names."""
    cols = list(df.columns)
    mapping = {
        "revenue": _find_column(cols, REVENUE_HINTS),
        "cost": _find_column(cols, COST_HINTS),
        "date": _find_column(cols, DATE_HINTS),
        "region": _find_column(cols, REGION_HINTS),
        "service": _find_column(cols, SERVICE_HINTS),
        "order_id": _find_column(cols, ORDER_HINTS),
        "status": _find_column(cols, STATUS_HINTS),
        "delivery": _find_column(cols, DELIVERY_HINTS),
        "active": _find_column(cols, ACTIVE_HINTS),
    }

    # Fallback: first numeric column as revenue if none matched
    if not mapping["revenue"]:
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        if numeric_cols:
            mapping["revenue"] = numeric_cols[0]

    # Fallback: first datetime-like column
    if not mapping["date"]:
        for c in cols:
            if pd.api.types.is_datetime64_any_dtype(df[c]):
                mapping["date"] = c
                break
            sample = df[c].dropna().astype(str).head(5)
            parsed = pd.to_datetime(sample, errors="coerce")
            if parsed.notna().sum() >= max(1, len(sample) // 2):
                mapping["date"] = c
                break

    return mapping


def prepare_analytics_frame(df: pd.DataFrame) -> tuple:
    """
    Returns (prepared_df, column_mapping).
    Adds derived year/month, numeric revenue/cost/margin columns.
    """
    work = df.copy()
    mapping = detect_columns(work)

    # Parse dates
    if mapping["date"]:
        work["_fecha"] = pd.to_datetime(work[mapping["date"]], errors="coerce")
    else:
        work["_fecha"] = pd.NaT

    work["_anio"] = work["_fecha"].dt.year
    work["_mes"] = work["_fecha"].dt.month
    work["_mes_nombre"] = work["_fecha"].dt.strftime("%b")
    work["_periodo"] = work["_fecha"].dt.to_period("M").astype(str)

    # Revenue
    if mapping["revenue"]:
        work["_ingresos"] = pd.to_numeric(work[mapping["revenue"]], errors="coerce").fillna(0)
    else:
        work["_ingresos"] = 0.0

    # Cost (estimate 60% of revenue when absent)
    if mapping["cost"]:
        work["_costo"] = pd.to_numeric(work[mapping["cost"]], errors="coerce").fillna(0)
    else:
        work["_costo"] = work["_ingresos"] * 0.60

    work["_margen"] = work["_ingresos"] - work["_costo"]

    # Region / service labels
    work["_region"] = work[mapping["region"]].astype(str) if mapping["region"] else "Sin región"
    work["_servicio"] = work[mapping["service"]].astype(str) if mapping["service"] else "General"

    # Cancellations
    if mapping["status"]:
        status_norm = work[mapping["status"]].astype(str).str.lower().str.strip()
        work["_cancelado"] = status_norm.isin(CANCEL_VALUES)
    else:
        work["_cancelado"] = False

    # Effective metric: on-time deliveries OR active plans
    if mapping["delivery"]:
        deliv = work[mapping["delivery"]]
        if pd.api.types.is_bool_dtype(deliv) or set(deliv.dropna().unique()).issubset({0, 1, True, False, "0", "1", "True", "False", "Si", "No", "si", "no"}):
            work["_efectivo"] = deliv.astype(str).str.lower().isin(["1", "true", "si", "sí", "yes", "a tiempo", "ontime"])
        else:
            work["_efectivo"] = deliv.astype(str).str.lower().str.contains("tiempo|ontime|puntual|entregado", na=False)
        work["_efectivo_label"] = "Entregas a tiempo"
    elif mapping["active"]:
        act = work[mapping["active"]]
        work["_efectivo"] = act.astype(str).str.lower().isin(["1", "true", "si", "sí", "yes", "activo", "activa", "active"])
        work["_efectivo_label"] = "Planes activos"
    else:
        # Fallback: non-cancelled rows with positive revenue
        work["_efectivo"] = (~work["_cancelado"]) & (work["_ingresos"] > 0)
        work["_efectivo_label"] = "Registros efectivos"

    return work, mapping


def apply_filters(
    df: pd.DataFrame,
    anio_inicio=None,
    anio_fin=None,
    region=None,
    mes=None,
    user_region=None
) -> pd.DataFrame:
    """Applies year range, month and region filters. Respects user data scope."""
    filtered = df.copy()

    if user_region and str(user_region).lower() not in ("todos", "todo", "all", "*"):
        filtered = filtered[filtered["_region"].astype(str).str.lower() == str(user_region).lower()]

    if region and str(region).lower() not in ("todos", "todo", "all", ""):
        filtered = filtered[filtered["_region"].astype(str) == str(region)]

    if anio_inicio is not None:
        filtered = filtered[(filtered["_anio"].isna()) | (filtered["_anio"] >= int(anio_inicio))]
    if anio_fin is not None:
        filtered = filtered[(filtered["_anio"].isna()) | (filtered["_anio"] <= int(anio_fin))]
    if mes is not None and str(mes) not in ("", "todos", "all"):
        filtered = filtered[filtered["_mes"] == int(mes)]

    return filtered
