import numpy as np
import pandas as pd
from typing import Dict, Any, List

def generate_star_schema(df: pd.DataFrame, dataset_name: str = "Dataset_BI") -> Dict[str, Any]:
    """
    Analyzes dataset structure to build a dimensional Star Schema (Esquema en estrella):
    - Fact Table (Measures & Foreign Keys)
    - Dimension Tables (Categorical attributes & hierarchies)
    - Explicit Granularity Declaration
    """
    total_rows = len(df)
    cols = df.columns.tolist()

    # Identify candidate measures (numeric columns)
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    
    # Measure keywords
    measure_keywords = ['monto', 'amount', 'precio', 'price', 'venta', 'sale', 'total', 'cantidad', 'quantity', 'descuento', 'discount', 'valor', 'ingreso', 'costo', 'ganancia', 'score']
    
    measures = []
    dimension_cols = []
    
    for col in cols:
        col_lower = col.lower()
        if any(kw in col_lower for kw in measure_keywords) or (col in numeric_cols and df[col].nunique() > 10 and not any(id_kw in col_lower for id_kw in ['id', 'codigo', 'cedula', 'key'])):
            measures.append(col)
        else:
            dimension_cols.append(col)

    if not measures:
        measures = numeric_cols if numeric_cols else cols[:1]

    # Group dimension columns into logical dimensions
    dim_cliente = []
    dim_producto = []
    dim_tiempo = []
    dim_ubicacion = []
    dim_general = []

    for col in dimension_cols:
        clow = col.lower()
        if any(kw in clow for kw in ['cliente', 'customer', 'nombre', 'name', 'email', 'correo', 'genero', 'gender', 'edad', 'age', 'telefono']):
            dim_cliente.append(col)
        elif any(kw in clow for kw in ['producto', 'product', 'item', 'categoria', 'category', 'marca', 'brand', 'sku', 'codigo_prod']):
            dim_producto.append(col)
        elif any(kw in clow for kw in ['fecha', 'date', 'time', 'anio', 'year', 'mes', 'month', 'dia', 'day', 'timestamp']):
            dim_tiempo.append(col)
        elif any(kw in clow for kw in ['ciudad', 'city', 'pais', 'country', 'region', 'direccion', 'address', 'zona', 'departamento']):
            dim_ubicacion.append(col)
        else:
            dim_general.append(col)

    # Build dimension tables list
    dimension_tables = []

    if dim_cliente:
        dimension_tables.append({
            "name": "Dim_Cliente",
            "primary_key": "ID_Cliente",
            "attributes": dim_cliente,
            "description": "Contiene información demográfica y descriptiva del cliente."
        })

    if dim_producto:
        dimension_tables.append({
            "name": "Dim_Producto",
            "primary_key": "ID_Producto",
            "attributes": dim_producto,
            "description": "Contiene los atributos del catálogo de productos e ítems de negocio."
        })

    if dim_tiempo:
        dimension_tables.append({
            "name": "Dim_Tiempo",
            "primary_key": "ID_Tiempo",
            "attributes": dim_tiempo + ["Anio", "Trimestre", "Mes", "Dia_Semana"],
            "description": "Dimensión temporal para agregaciones anuales, mensuales y diarias."
        })

    if dim_ubicacion:
        dimension_tables.append({
            "name": "Dim_Ubicacion",
            "primary_key": "ID_Ubicacion",
            "attributes": dim_ubicacion,
            "description": "Información geográfica y regional para análisis territorial."
        })

    if dim_general or not dimension_tables:
        dimension_tables.append({
            "name": "Dim_Clasificacion_General",
            "primary_key": "ID_Clasificacion",
            "attributes": dim_general if dim_general else cols,
            "description": "Atributos categóricos generales del negocio."
        })

    # Foreign Keys for Fact Table
    foreign_keys = [dim["primary_key"] for dim in dimension_tables]

    fact_table = {
        "name": f"Fact_{dataset_name.replace(' ', '_')}",
        "primary_key": "ID_Hecho",
        "foreign_keys": foreign_keys,
        "measures": measures,
        "total_records": total_rows,
        "description": "Tabla principal de hechos conteniendo todas las métricas cuantitativas del negocio."
    }

    # Granularity declaration
    dim_names_str = ", ".join([d["name"] for d in dimension_tables])
    granularity = (
        f"Nivel de Granularidad Declarado: Cada registro en la tabla de hechos representa "
        f"una transacción o evento indivisible registrado a nivel de {dim_names_str} "
        f"para un total de {total_rows:,} observaciones de inteligencia de negocios."
    )

    return {
        "granularity": granularity,
        "fact_table": fact_table,
        "dimension_tables": dimension_tables,
        "summary": {
            "num_measures": len(measures),
            "num_dimensions": len(dimension_tables),
            "total_attributes": len(cols)
        }
    }
