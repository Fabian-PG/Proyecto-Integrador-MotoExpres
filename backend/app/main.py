import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routes.api import router as api_router

# Create database tables automatically on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Inteligencia de Negocios - Platform API",
    description="Sistema de Analítica, Calidad de Datos, Modelado Dimensional y Anonimización",
    version="1.0.0"
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Business Intelligence Data Analysis Platform API",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
