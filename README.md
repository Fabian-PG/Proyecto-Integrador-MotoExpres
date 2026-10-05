# Plataforma de Inteligencia de Negocios & Analítica de Datos - Hito 1

Sistema web completo orientado a la carga, diagnóstico de calidad de datos, modelado dimensional en estrella y anonimización de datos personales para inteligencia de negocios.

## 🚀 Arquitectura del Proyecto

```
Proyecto-Integrador-MotoExpres/
├── backend/                  # Configuración y Código del Backend Python
│   ├── app/
│   │   ├── database.py       # Configuración DB (PostgreSQL + Fallback SQLite local)
│   │   ├── models/           # Modelos ORM (DatasetMeta, QualityBitacora)
│   │   ├── services/
│   │   │   ├── ingestion.py          # Validación hash SHA256 y parseo XLSX/CSV
│   │   │   ├── quality_diagnosis.py  # Diagnóstico 6 Dimensiones BI
│   │   │   ├── cleaning.py           # Remediación y Bitácora de Auditoría
│   │   │   ├── star_schema.py        # Generador de Esquema en Estrella
│   │   │   └── anonymization.py      # Evaluador k-anonimato y sesgos
│   │   └── routes/
│   │       └── api.py        # Controladores REST API
│   ├── requirements.txt      # Dependencias backend Python
│   └── main.py               # Punto de entrada FastAPI
│
├── frontend/                 # Configuración y Código del Frontend JavaScript
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx                # Menú lateral (Hito 1 y 4 subtítulos)
│   │   │   ├── TopDatasetNav.jsx          # Pestañas dinámicas de BDs cargadas
│   │   │   ├── CargaDatosView.jsx         # Subtítulo 1: Ingesta y validación
│   │   │   ├── DiagnosticoLimpiezaView.jsx# Subtítulo 2: Diagnóstico 6D y Bitácora
│   │   │   ├── ModeloDatosView.jsx        # Subtítulo 3: Esquema en estrella
│   │   │   └── AnonimizacionView.jsx      # Subtítulo 4: k-anonimato y sesgos
│   │   ├── styles/
│   │   │   └── main.css                   # Sistema de diseño sobrio (Azul Marino / Gris / Amarillo Tostado)
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
│
├── sample_datasets/          # Datasets de prueba (.csv y .xlsx)
└── run_app.py                # Script ejecutor concurrente de la aplicación
```

## 📊 Funcionalidades del Hito 1

### 1. Carga de Datos (Subtítulo 1)
- Soporte para archivos `.xlsx` y `.csv`.
- Visualización de carga en tiempo real con barra de progreso.
- **Validación de Doble Carga:** Firma digital SHA256 para evitar duplicidad de datos.
- Generación de bases de datos aisladas por cada archivo cargado.
- Pestañas superiores dinámicas para navegar entre bases de datos cargadas.

### 2. Diagnóstico y Limpieza (Subtítulo 2)
- Análisis de 6 dimensiones BI: **Exactitud, Completitud, Consistencia, Actualidad, Validez y Unicidad**.
- Presentación de hallazgos por dimensión y tabla.
- Botón de remediación automatizada que crea una **nueva base de datos limpia** preservando los datos originales `raw`.
- Creación de la **Tabla Bitácora de Auditoría** con el registro detallado de transformaciones y timestamps.

### 3. Modelo de Datos (Subtítulo 3)
- Generación interactiva del **Esquema en Estrella (Star Schema)**.
- Identificación de **Tabla de Hechos (Fact Table)** y **Tablas de Dimensión (Dim Tables)**.
- Declaración explícita de la **Granularidad del modelo**.

### 4. Anonimización (Subtítulo 4)
- Evaluación del nivel de **k-anonimato (k=1, k=3, k=5)**.
- Clasificación de Identificadores Directos, Quasi-Identificadores y Atributos Sensibles.
- Identificación de **Sesgos en los Datos** (desbalance categórico / sesgo de muestreo).
- Enmascaramiento y generalización sin eliminación de registros.

## 🛠️ Instrucciones de Ejecución

### Opción 1: Ejecutor Automático (Recomendado)
```bash
python run_app.py
```

### Opción 2: Ejecución Manual

#### Backend Python:
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --port 8000 --reload
```

#### Frontend React:
```bash
cd frontend
npm install
npm run dev
```

Navega en el explorador a `http://localhost:3000`.
