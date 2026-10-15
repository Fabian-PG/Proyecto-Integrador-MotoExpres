"""
Hito 2 analytics engine: Tablero general, Exploración de datos and Alertas.
"""
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.dataset import DatasetMeta
from app.services.ingestion import get_dataset_dataframe
from app.services.column_mapper import prepare_analytics_frame, apply_filters


MONTH_NAMES = {
    1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
    5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
    9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre"
}


def _require_cleaned_dataset(dataset_id: str, db: Session) -> DatasetMeta:
    meta = db.query(DatasetMeta).filter(DatasetMeta.id == dataset_id).first()
    if not meta:
        raise HTTPException(status_code=404, detail="Dataset no encontrado")
    if not meta.cleaned_table_name:
        raise HTTPException(
            status_code=400,
            detail="El dataset aún no ha sido procesado en Diagnóstico y Limpieza (Hito 1). Complete la limpieza para acceder al Hito 2."
        )
    return meta


def _load_prepared(dataset_id: str, db: Session, user_region=None):
    meta = _require_cleaned_dataset(dataset_id, db)
    # Restricted users need the original region values to enforce their scope.
    table_type = (
        "cleaned" if user_region
        else "anonymized" if meta.anonymized_table_name
        else "cleaned"
    )
    try:
        df = get_dataset_dataframe(dataset_id, table_type=table_type)
    except Exception:
        df = get_dataset_dataframe(dataset_id, table_type="cleaned")
    prepared, mapping = prepare_analytics_frame(df)
    return meta, prepared, mapping


def get_available_centers(db: Session) -> list[str]:
    """Returns distinct region/center values found across the stored datasets."""
    datasets = db.query(DatasetMeta).order_by(DatasetMeta.created_at.desc()).all()
    centers = set()
    for meta in datasets:
        table_type = (
            "anonymized" if meta.anonymized_table_name
            else "cleaned" if meta.cleaned_table_name
            else "raw"
        )
        frame = get_dataset_dataframe(meta.id, table_type=table_type)
        prepared, mapping = prepare_analytics_frame(frame)
        if not mapping.get("region"):
            continue
        centers.update(
            value.strip()
            for value in prepared["_region"].dropna().astype(str).unique()
            if value.strip() and value.strip().casefold() not in {"sin región", "nan"}
        )
    return sorted(centers, key=str.casefold)


def get_filter_options(dataset_id: str, db: Session, user_region: str = None) -> dict:
    """Returns available years and regions for filter controls."""
    _, prepared, mapping = _load_prepared(dataset_id, db, user_region=user_region)
    scoped = apply_filters(prepared, user_region=user_region)

    years = sorted([int(y) for y in scoped["_anio"].dropna().unique().tolist()])
    regions = sorted([str(r) for r in scoped["_region"].dropna().unique().tolist() if r and r != "nan"])

    return {
        "years": years,
        "regions": regions,
        "months": [{"value": k, "label": v} for k, v in MONTH_NAMES.items()],
        "column_mapping": mapping,
        "has_date": mapping.get("date") is not None,
        "has_region": mapping.get("region") is not None,
        "has_service": mapping.get("service") is not None
    }


def _unique_orders(df):
    mapping_order = None
    # Prefer order id uniqueness when column exists in prepared frame via original
    for col in df.columns:
        if col.startswith("_"):
            continue
        low = col.lower()
        if any(h in low for h in ["id_transaccion", "transaccion", "orden", "order", "pedido", "factura", "ticket"]):
            mapping_order = col
            break
    if mapping_order:
        return int(df[mapping_order].nunique())
    return int(len(df))


def build_tablero(
    dataset_id: str,
    db: Session,
    anio_inicio=None,
    anio_fin=None,
    region=None,
    user_region=None
) -> dict:
    """Builds KPIs and chart series for Tablero General."""
    meta, prepared, mapping = _load_prepared(dataset_id, db, user_region=user_region)
    filtered = apply_filters(
        prepared,
        anio_inicio=anio_inicio,
        anio_fin=anio_fin,
        region=region,
        user_region=user_region
    )

    ingresos = float(filtered["_ingresos"].sum())
    costo = float(filtered["_costo"].sum())
    margen = float(filtered["_margen"].sum())
    ordenes = _unique_orders(filtered)
    efectivos = int(filtered["_efectivo"].sum())
    efectivo_label = filtered["_efectivo_label"].iloc[0] if len(filtered) else "Datos efectivos"
    ticket_promedio = ingresos / ordenes if ordenes else 0
    margen_pct = (
        ((ingresos - costo) / ingresos * 100)
        if ingresos and mapping.get("cost")
        else None
    )
    cancelaciones = int(filtered["_cancelado"].sum())
    delivery_records = filtered[filtered["_entrega_reportada"]]
    tasa_entregas_a_tiempo_pct = (
        float(delivery_records["_entrega_a_tiempo"].mean() * 100)
        if mapping.get("delivery_on_time") and len(delivery_records)
        else None
    )
    devoluciones = _unique_orders(filtered[filtered["_devuelto"]])
    orders_for_return_rate = (
        _unique_orders(filtered[~filtered["_cancelado"]])
        if mapping.get("status")
        else ordenes
    )
    tasa_devolucion_pct = (
        devoluciones / orders_for_return_rate * 100
        if (mapping.get("return") or mapping.get("status")) and orders_for_return_rate
        else None
    )

    # Line chart: ingresos por mes (sorted chronologically)
    monthly = (
        filtered.dropna(subset=["_anio", "_mes"])
        .groupby(["_anio", "_mes"], as_index=False)
        .agg(ingresos=("_ingresos", "sum"), ordenes=("_ingresos", "count"), margen=("_margen", "sum"))
        .sort_values(["_anio", "_mes"])
    )
    ingresos_por_mes = []
    for _, row in monthly.iterrows():
        anio = int(row["_anio"])
        mes = int(row["_mes"])
        ingresos_por_mes.append({
            "anio": anio,
            "mes": mes,
            "mes_nombre": MONTH_NAMES.get(mes, str(mes)),
            "label": f"{MONTH_NAMES.get(mes, mes)[:3]} {anio}",
            "periodo": f"{anio}-{mes:02d}",
            "ingresos": round(float(row["ingresos"]), 2),
            "ordenes": int(row["ordenes"]),
            "margen": round(float(row["margen"]), 2)
        })

    # Horizontal bar: ingresos por servicio
    by_service = (
        filtered.groupby("_servicio", as_index=False)
        .agg(ingresos=("_ingresos", "sum"))
        .sort_values("ingresos", ascending=True)
    )
    ingresos_por_servicio = [
        {"servicio": str(r["_servicio"]), "ingresos": round(float(r["ingresos"]), 2)}
        for _, r in by_service.iterrows()
    ]

    # Horizontal bar: ingresos por región
    by_region = (
        filtered.groupby("_region", as_index=False)
        .agg(ingresos=("_ingresos", "sum"))
        .sort_values("ingresos", ascending=True)
    )
    ingresos_por_region = [
        {"region": str(r["_region"]), "ingresos": round(float(r["ingresos"]), 2)}
        for _, r in by_region.iterrows()
    ]

    return {
        "dataset_id": dataset_id,
        "dataset_name": meta.original_filename,
        "ready": True,
        "column_mapping": mapping,
        "kpis": {
            "ingresos_totales": round(ingresos, 2),
            "ordenes": ordenes,
            "margen": round(margen, 2),
            "margen_pct": round(margen_pct, 2),
            "tasa_entregas_a_tiempo_pct": (
                round(tasa_entregas_a_tiempo_pct, 2)
                if tasa_entregas_a_tiempo_pct is not None else None
            ),
            "entregas_a_tiempo": int(delivery_records["_entrega_a_tiempo"].sum()),
            "entregas_evaluadas": int(len(delivery_records)),
            "tasa_devolucion_pct": (
                round(tasa_devolucion_pct, 2)
                if tasa_devolucion_pct is not None else None
            ),
            "devoluciones": devoluciones,
            "ordenes_evaluadas_devolucion": orders_for_return_rate,
            "has_cost_data": bool(mapping.get("cost")),
            "has_on_time_delivery_data": bool(mapping.get("delivery_on_time")),
            "has_return_data": bool(mapping.get("return") or mapping.get("status")),
            "datos_efectivos": efectivos,
            "efectivo_label": efectivo_label,
            "ticket_promedio": round(ticket_promedio, 2),
            "costo_total": round(costo, 2),
            "cancelaciones": cancelaciones,
            "registros": int(len(filtered)),
            "regiones_activas": int(filtered["_region"].nunique())
        },
        "ingresos_por_mes": ingresos_por_mes,
        "ingresos_por_servicio": ingresos_por_servicio,
        "ingresos_por_region": ingresos_por_region
    }


def build_exploracion(
    dataset_id: str,
    db: Session,
    anio_inicio=None,
    anio_fin=None,
    region=None,
    mes=None,
    user_region=None
) -> dict:
    """Builds exploration metrics, service bars and participation table."""
    meta, prepared, mapping = _load_prepared(dataset_id, db, user_region=user_region)
    filtered = apply_filters(
        prepared,
        anio_inicio=anio_inicio,
        anio_fin=anio_fin,
        region=region,
        mes=mes,
        user_region=user_region
    )

    ingresos = float(filtered["_ingresos"].sum())
    margen = float(filtered["_margen"].sum())
    ordenes = _unique_orders(filtered)
    cancelaciones = int(filtered["_cancelado"].sum())

    by_service = (
        filtered.groupby("_servicio", as_index=False)
        .agg(ingresos=("_ingresos", "sum"), ordenes=("_ingresos", "count"))
        .sort_values("ingresos", ascending=True)
    )
    servicios_chart = [
        {
            "servicio": str(r["_servicio"]),
            "ingresos": round(float(r["ingresos"]), 2),
            "ordenes": int(r["ordenes"])
        }
        for _, r in by_service.iterrows()
    ]

    # Participation table: service x region with average and difference vs global avg
    global_avg = float(filtered["_ingresos"].mean()) if len(filtered) else 0
    grouped = (
        filtered.groupby(["_servicio", "_region"], as_index=False)
        .agg(
            promedio=("_ingresos", "mean"),
            ingresos=("_ingresos", "sum"),
            ordenes=("_ingresos", "count")
        )
        .sort_values(["_servicio", "_region"])
    )
    participacion = []
    for _, r in grouped.iterrows():
        promedio = float(r["promedio"])
        participacion.append({
            "servicio": str(r["_servicio"]),
            "region": str(r["_region"]),
            "promedio": round(promedio, 2),
            "diferencia": round(promedio - global_avg, 2),
            "ingresos": round(float(r["ingresos"]), 2),
            "ordenes": int(r["ordenes"])
        })

    return {
        "dataset_id": dataset_id,
        "dataset_name": meta.original_filename,
        "kpis": {
            "ingresos": round(ingresos, 2),
            "ordenes": ordenes,
            "margen": round(margen, 2),
            "cancelaciones": cancelaciones,
            "promedio_global": round(global_avg, 2)
        },
        "servicios_chart": servicios_chart,
        "participacion": participacion
    }


def build_alertas(
    dataset_id: str,
    db: Session,
    anio_inicio=None,
    anio_fin=None,
    region=None,
    user_region=None
) -> dict:
    """Detects order volume and margin anomalies with explanatory messages."""
    meta, prepared, mapping = _load_prepared(dataset_id, db, user_region=user_region)
    filtered = apply_filters(
        prepared,
        anio_inicio=anio_inicio,
        anio_fin=anio_fin,
        region=region,
        user_region=user_region
    )

    monthly = (
        filtered.dropna(subset=["_anio", "_mes"])
        .groupby(["_anio", "_mes"], as_index=False)
        .agg(
            ordenes=("_ingresos", "count"),
            ingresos=("_ingresos", "sum"),
            margen=("_margen", "sum"),
            cancelaciones=("_cancelado", "sum")
        )
        .sort_values(["_anio", "_mes"])
    )

    mensajes = []
    ordenes_vs_promedio = []
    margen_por_periodo = []

    if len(monthly) == 0:
        return {
            "dataset_id": dataset_id,
            "dataset_name": meta.original_filename,
            "ordenes_vs_promedio": [],
            "margen_por_periodo": [],
            "mensajes": [{
                "tipo": "info",
                "titulo": "Sin datos temporales",
                "detalle": "No se encontraron fechas válidas para analizar anomalías. Verifique la columna de fecha en la base de datos.",
                "posible_causa": "Columna de fecha ausente, mal formateada o filtrada fuera del rango seleccionado."
            }]
        }

    avg_ordenes = float(monthly["ordenes"].mean())
    std_ordenes = float(monthly["ordenes"].std(ddof=0)) or 1.0
    avg_margen = float(monthly["margen"].mean())
    std_margen = float(monthly["margen"].std(ddof=0)) or 1.0

    for _, row in monthly.iterrows():
        anio = int(row["_anio"])
        mes = int(row["_mes"])
        ordenes = int(row["ordenes"])
        margen = float(row["margen"])
        ingresos = float(row["ingresos"])
        cancel = int(row["cancelaciones"])
        label = f"{MONTH_NAMES.get(mes, mes)} {anio}"
        diff_pct = ((ordenes - avg_ordenes) / avg_ordenes * 100) if avg_ordenes else 0
        z_ord = (ordenes - avg_ordenes) / std_ordenes
        z_mar = (margen - avg_margen) / std_margen

        ordenes_vs_promedio.append({
            "anio": anio,
            "mes": mes,
            "label": label,
            "ordenes": ordenes,
            "promedio": round(avg_ordenes, 2),
            "diferencia": ordenes - avg_ordenes,
            "diferencia_pct": round(diff_pct, 2),
            "anomalia": abs(z_ord) >= 1.5
        })

        margen_por_periodo.append({
            "anio": anio,
            "mes": mes,
            "label": label,
            "margen": round(margen, 2),
            "ingresos": round(ingresos, 2),
            "promedio_margen": round(avg_margen, 2),
            "anomalia": abs(z_mar) >= 1.5
        })

        if z_ord >= 1.5:
            mensajes.append({
                "tipo": "alta",
                "titulo": f"Pico de órdenes en {label}",
                "detalle": f"Se registraron {ordenes} órdenes/transacciones, un {diff_pct:.1f}% por encima del promedio ({avg_ordenes:.1f}).",
                "posible_causa": "Campaña comercial, estacionalidad, carga masiva de datos o evento puntual de demanda."
            })
        elif z_ord <= -1.5:
            mensajes.append({
                "tipo": "baja",
                "titulo": f"Caída de órdenes en {label}",
                "detalle": f"Solo {ordenes} órdenes/transacciones, un {abs(diff_pct):.1f}% por debajo del promedio ({avg_ordenes:.1f}).",
                "posible_causa": "Problemas operativos, fallas de captura, temporada baja o filtro regional restrictivo."
            })

        if z_mar <= -1.5:
            mensajes.append({
                "tipo": "margen",
                "titulo": f"Margen anómalo bajo en {label}",
                "detalle": f"El margen fue {margen:,.2f}, significativamente por debajo del promedio ({avg_margen:,.2f}).",
                "posible_causa": "Aumento de costos, descuentos agresivos, datos negativos de ingreso o errores de limpieza."
            })
        elif z_mar >= 1.5:
            mensajes.append({
                "tipo": "margen",
                "titulo": f"Margen anómalo alto en {label}",
                "detalle": f"El margen fue {margen:,.2f}, muy por encima del promedio ({avg_margen:,.2f}).",
                "posible_causa": "Mix de productos premium, reducción de costos o outlier de ingresos altos."
            })

        if cancel > 0 and avg_ordenes > 0 and (cancel / max(ordenes, 1)) > 0.2:
            mensajes.append({
                "tipo": "cancelacion",
                "titulo": f"Cancelaciones elevadas en {label}",
                "detalle": f"Se detectaron {cancel} cancelaciones sobre {ordenes} registros ({cancel/max(ordenes,1)*100:.1f}%).",
                "posible_causa": "Fallas de servicio, problemas de pago, o clasificación incorrecta del estado."
            })

    # Revenue concentration anomaly
    if len(filtered) > 0:
        top_region = filtered.groupby("_region")["_ingresos"].sum().sort_values(ascending=False)
        total_ing = float(top_region.sum()) or 1
        if len(top_region) > 1 and (top_region.iloc[0] / total_ing) > 0.7:
            mensajes.append({
                "tipo": "concentracion",
                "titulo": f"Concentración alta en {top_region.index[0]}",
                "detalle": f"La región {top_region.index[0]} concentra el {top_region.iloc[0]/total_ing*100:.1f}% de los ingresos.",
                "posible_causa": "Dependencia comercial de una sola zona o sesgo de muestreo en la base de datos."
            })

    if not mensajes:
        mensajes.append({
            "tipo": "ok",
            "titulo": "Sin anomalías críticas",
            "detalle": "Los volúmenes de órdenes y márgenes se mantienen dentro de rangos esperados respecto al promedio.",
            "posible_causa": "Comportamiento estable del negocio en el período analizado."
        })

    return {
        "dataset_id": dataset_id,
        "dataset_name": meta.original_filename,
        "promedio_ordenes": round(avg_ordenes, 2),
        "promedio_margen": round(avg_margen, 2),
        "ordenes_vs_promedio": ordenes_vs_promedio,
        "margen_por_periodo": margen_por_periodo,
        "mensajes": mensajes
    }
