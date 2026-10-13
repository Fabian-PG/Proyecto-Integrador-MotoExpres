import sys
import os
import traceback

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend'))
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend'))

print("=== Probando importaciones del backend ===\n")

try:
    print("[1] Importando app.database...")
    from app.database import engine, Base
    print("    OK - database")
except Exception as e:
    print(f"    ERROR: {e}")
    traceback.print_exc()

try:
    print("[2] Importando app.models.dataset...")
    from app.models.dataset import DatasetMeta, QualityBitacora
    print("    OK - models")
except Exception as e:
    print(f"    ERROR: {e}")
    traceback.print_exc()

try:
    print("[3] Importando app.services.ingestion...")
    from app.services.ingestion import process_uploaded_file, get_dataset_dataframe
    print("    OK - ingestion")
except Exception as e:
    print(f"    ERROR: {e}")
    traceback.print_exc()

try:
    print("[4] Importando app.services.quality_diagnosis...")
    from app.services.quality_diagnosis import diagnose_dataset
    print("    OK - quality_diagnosis")
except Exception as e:
    print(f"    ERROR: {e}")
    traceback.print_exc()

try:
    print("[5] Importando app.services.cleaning...")
    from app.services.cleaning import execute_cleaning_and_audit
    print("    OK - cleaning")
except Exception as e:
    print(f"    ERROR: {e}")
    traceback.print_exc()

try:
    print("[6] Importando app.services.star_schema...")
    from app.services.star_schema import generate_star_schema
    print("    OK - star_schema")
except Exception as e:
    print(f"    ERROR: {e}")
    traceback.print_exc()

try:
    print("[7] Importando app.services.anonymization...")
    from app.services.anonymization import analyze_anonymization_and_bias, execute_anonymization
    print("    OK - anonymization")
except Exception as e:
    print(f"    ERROR: {e}")
    traceback.print_exc()

try:
    print("[8] Importando app.main (FastAPI app)...")
    from app.main import app
    print("    OK - main app cargada correctamente")
except Exception as e:
    print(f"    ERROR: {e}")
    traceback.print_exc()

print("\n=== Diagnóstico completado ===")
