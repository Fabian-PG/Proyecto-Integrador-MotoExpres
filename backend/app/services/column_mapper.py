"""
Heuristic column detection for heterogeneous BI datasets.
Maps common Spanish/English column names to semantic roles used by Hito 2 analytics.
"""
import pandas as pd
import numpy as np
import re


REVENUE_HINTS = [
    "monto_venta", "ingresos", "ingreso", "revenue", "monto", "precio",
    "venta", "ventas", "total", "importe", "amount", "sales", "valor", "pago", "facturacion"
]
COST_HINTS = ["costo", "costos", "cost", "costs", "gasto", "gastos", "cogs"]
DATE_PREFERRED = [
    "fecha_orden", "fecha_venta", "fecha_alta", "fecha_pedido", "order_date",
    "sale_date", "fecha", "date", "datetime", "periodo", "timestamp", "created_at", "created"
]
REGION_HINTS = [
    "ciudad_venta", "ciudad_residencia", "ciudad", "region", "país", "pais",
    "country", "departamento", "zona", "provincia", "localidad", "ubicacion",
    "ubicación", "centro", "sede", "sucursal", "tienda"
]
# "estado" is deliberately omitted: in logistics DBs it usually means order status
SERVICE_HINTS = [
    "categoria_producto", "tipo_servicio", "servicio", "servicios", "categoria",
    "categoría", "producto", "plan", "planes", "service", "category", "product"
]
ORDER_HINTS = [
    "id_transaccion", "orden_id", "id_orden", "id_pedido", "transaccion",
    "orden", "order", "pedido", "factura", "transaction", "ticket"
]
STATUS_HINTS = ["estado", "status", "estatus", "cancelacion", "cancelación"]
DELIVERY_HINTS = [
    "entrega_a_tiempo", "a_tiempo", "entrega", "entregado", "ontime",
    "on_time", "puntual", "delivery", "cumplimiento"
]
ACTIVE_HINTS = ["plan_activo", "activo", "activa", "active", "estado_plan"]
CANCEL_VALUES = {
    "cancelado", "cancelada", "cancelled", "canceled", "anulado", "anulada",
    "devuelta", "devuelto", "returned"
}


def _norm(name: str) -> str:
    return re.sub(r"[^a-z0-9_]", "", str(name).lower().strip().replace(" ", "_"))


def _find_column(columns, hints, exclude=None):
    exclude = {_norm(c) for c in (exclude or [])}
    normalized = {_norm(c): c for c in columns}
    for hint in hints:
        hint_n = _norm(hint)
        # Exact match first
        if hint_n in normalized and hint_n not in exclude:
            return normalized[hint_n]
        for ncol, original in normalized.items():
            if ncol in exclude:
                continue
            if hint_n in ncol:
                return original
    return None


def _score_date_column(df: pd.DataFrame, col: str) -> float:
    """Higher score = better date candidate. Penalize surrogate keys like fecha_id."""
    ncol = _norm(col)
    score = 0.0
    if ncol.endswith("_id") or ncol.endswith("id"):
        score -= 5.0
    if pd.api.types.is_datetime64_any_dtype(df[col]):
        score += 10.0
    sample = df[col].dropna().head(20)
    if len(sample) == 0:
        return score - 10
    parsed = pd.to_datetime(sample, errors="coerce")
    ok = parsed.notna().sum()
    score += (ok / len(sample)) * 5
    if ok:
        years = parsed.dt.year.dropna()
        if len(years) and years.between(1990, 2100).mean() > 0.7:
            score += 4
        elif len(years) and (years < 1980).mean() > 0.5:
            score -= 4
    for token in ("orden", "venta", "pedido", "alta", "date", "fecha"):
        if token in ncol and not ncol.endswith("_id"):
            score += 2
    return score


def _detect_date(df: pd.DataFrame, cols: list) -> str | None:
    preferred = _find_column(cols, DATE_PREFERRED)
    candidates = []
    for c in cols:
        ncol = _norm(c)
        if any(h in ncol for h in ("fecha", "date", "datetime", "periodo", "timestamp", "created")):
            candidates.append(c)
        elif pd.api.types.is_datetime64_any_dtype(df[c]):
            candidates.append(c)
    if preferred and preferred not in candidates:
        candidates.append(preferred)
    if not candidates:
        return preferred
    ranked = sorted(candidates, key=lambda c: _score_date_column(df, c), reverse=True)
    best = ranked[0]
    if _score_date_column(df, best) < 0:
        return preferred
    return best


def detect_columns(df: pd.DataFrame) -> dict:
    """Detects semantic roles from dataframe column names and dtypes."""
    cols = list(df.columns)

    status = _find_column(cols, STATUS_HINTS)
    # Region must not reuse the status column
    region = _find_column(cols, REGION_HINTS, exclude=[status] if status else None)

    mapping = {
        "revenue": _find_column(cols, REVENUE_HINTS),
        "cost": _find_column(cols, COST_HINTS),
        "date": _detect_date(df, cols),
        "region": region,
        "service": _find_column(cols, SERVICE_HINTS),
        "order_id": _find_column(cols, ORDER_HINTS),
        "status": status,
        "delivery": _find_column(cols, DELIVERY_HINTS),
        "active": _find_column(cols, ACTIVE_HINTS),
    }

    if not mapping["revenue"]:
        numeric_cols = [
            c for c in df.select_dtypes(include=[np.number]).columns.tolist()
            if not _norm(c).endswith("_id")
        ]
        if numeric_cols:
            mapping["revenue"] = numeric_cols[0]

    return mapping


def prepare_analytics_frame(df: pd.DataFrame) -> tuple:
    """
    Returns (prepared_df, column_mapping).
    Adds derived year/month, numeric revenue/cost/margin columns.
    """
    work = df.copy()
    mapping = detect_columns(work)

    if mapping["date"]:
        work["_fecha"] = pd.to_datetime(work[mapping["date"]], errors="coerce")
    else:
        work["_fecha"] = pd.NaT

    work["_anio"] = work["_fecha"].dt.year
    work["_mes"] = work["_fecha"].dt.month
    work["_mes_nombre"] = work["_fecha"].dt.strftime("%b")
    work["_periodo"] = work["_fecha"].dt.to_period("M").astype(str)

    if mapping["revenue"]:
        work["_ingresos"] = pd.to_numeric(work[mapping["revenue"]], errors="coerce").fillna(0)
    else:
        work["_ingresos"] = 0.0

    if mapping["cost"]:
        work["_costo"] = pd.to_numeric(work[mapping["cost"]], errors="coerce").fillna(0)
    else:
        work["_costo"] = work["_ingresos"] * 0.60

    work["_margen"] = work["_ingresos"] - work["_costo"]

    if mapping["region"]:
        region_series = work[mapping["region"]]
        # Friendly labels for numeric centro/sede ids
        if pd.api.types.is_numeric_dtype(region_series) or _norm(mapping["region"]).endswith("_id"):
            work["_region"] = region_series.apply(
                lambda v: f"Centro {int(v)}" if pd.notna(v) and str(v).replace('.', '', 1).isdigit() else str(v)
            )
        else:
            work["_region"] = region_series.astype(str)
    else:
        work["_region"] = "Sin región"

    if mapping["service"]:
        svc = work[mapping["service"]]
        if pd.api.types.is_numeric_dtype(svc) or _norm(mapping["service"]).endswith("_id"):
            work["_servicio"] = svc.apply(
                lambda v: f"Servicio {int(float(v))}" if pd.notna(v) else "Sin servicio"
            )
        else:
            work["_servicio"] = svc.astype(str)
    else:
        work["_servicio"] = "General"

    if mapping["status"]:
        status_norm = work[mapping["status"]].astype(str).str.lower().str.strip()
        work["_cancelado"] = status_norm.isin(CANCEL_VALUES)
    else:
        work["_cancelado"] = False

    if mapping["delivery"]:
        deliv = work[mapping["delivery"]]
        work["_efectivo"] = deliv.astype(str).str.lower().isin(
            ["1", "true", "si", "sí", "yes", "a tiempo", "ontime"]
        )
        work["_efectivo_label"] = "Entregas a tiempo"
    elif mapping["active"]:
        act = work[mapping["active"]]
        work["_efectivo"] = act.astype(str).str.lower().isin(
            ["1", "true", "si", "sí", "yes", "activo", "activa", "active"]
        )
        work["_efectivo_label"] = "Planes activos"
    else:
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
