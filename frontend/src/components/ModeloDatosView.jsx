import React, { useState, useEffect } from 'react';
import { Network, Database, Layers, Key, Hash, HelpCircle, ArrowRight } from 'lucide-react';
import { api } from '../api/client';

export default function ModeloDatosView({ datasetId }) {
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState(null);

  useEffect(() => {
    if (datasetId) {
      loadStarSchema();
    }
  }, [datasetId]);

  const loadStarSchema = async () => {
    setLoading(true);
    try {
      const data = await api.getStarSchema(datasetId);
      setModel(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!datasetId) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <Network size={40} style={{ color: 'var(--accent-gold)', marginBottom: '12px' }} />
        <h2>Ninguna Base de Datos Seleccionada</h2>
        <p style={{ color: 'var(--text-muted)' }}>Selecciona una base de datos para visualizar su modelo dimensional.</p>
      </div>
    );
  }

  return (
    <div className="modelo-datos-view">
      <div className="page-header">
        <h1 className="page-title">Hito 1: Modelo de Datos (Esquema en Estrella)</h1>
        <p className="page-description">
          Representación dimensional del esquema en estrella (Star Schema) de la base de datos seleccionada, declarando la granularidad de los registros, la tabla de hechos y sus tablas de dimensión asociadas.
        </p>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <Network size={36} style={{ color: 'var(--accent-gold)', animation: 'spin 2s linear infinite' }} />
          <p style={{ marginTop: '12px' }}>Generando modelo dimensional en estrella...</p>
        </div>
      ) : model && (
        <>
          {/* Granularity Declaration Card */}
          <div className="card" style={{ backgroundColor: 'rgba(217, 119, 6, 0.08)', border: '1px solid var(--accent-gold)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <Layers size={24} style={{ color: 'var(--accent-gold)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h3 style={{ fontSize: '15px', color: 'var(--accent-gold)', marginBottom: '4px' }}>
                  Declaración de Granularidad del Modelo BI
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                  {model.granularity}
                </p>
              </div>
            </div>
          </div>

          {/* Model Summary KPIs */}
          <div className="grid-3" style={{ marginBottom: '24px' }}>
            <div className="kpi-card">
              <div className="kpi-label">Tabla Principal de Hechos</div>
              <div className="kpi-value" style={{ fontSize: '20px', color: 'var(--accent-blue-light)' }}>
                {model.fact_table?.name}
              </div>
              <div className="kpi-subtext">{model.fact_table?.total_records} observaciones registradas</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Tablas de Dimensión</div>
              <div className="kpi-value">{model.summary?.num_dimensions}</div>
              <div className="kpi-subtext">Dimensiones de análisis conectadas</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Métricas Quantitative (Measures)</div>
              <div className="kpi-value">{model.summary?.num_measures}</div>
              <div className="kpi-subtext">Métricas numéricas de negocio</div>
            </div>
          </div>

          {/* Star Schema Graphical Visualization Diagram */}
          <div className="card">
            <div className="card-title">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Network size={18} style={{ color: 'var(--accent-gold)' }} />
                <span>Diagrama Visual del Esquema en Estrella (Star Schema)</span>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '32px',
                padding: '30px 10px',
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)',
                position: 'relative'
              }}
            >
              {/* Dimension Tables Row (Top / Outer Ring) */}
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '20px', width: '100%' }}>
                {model.dimension_tables?.map((dim, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: '260px',
                      backgroundColor: 'var(--bg-sidebar)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      boxShadow: 'var(--shadow-md)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                      <Database size={16} style={{ color: 'var(--accent-gold)' }} />
                      <strong style={{ fontSize: '14px', color: 'var(--accent-gold)' }}>{dim.name}</strong>
                    </div>

                    <div style={{ fontSize: '12px', marginBottom: '8px', color: '#6EE7B7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Key size={12} />
                      <span>PK: {dim.primary_key}</span>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <strong>Atributos:</strong>
                      <ul style={{ paddingLeft: '16px', marginTop: '4px' }}>
                        {dim.attributes.map((attr, aIdx) => (
                          <li key={aIdx}><code>{attr}</code></li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>

              {/* Connecting Arrows Indicator */}
              <div style={{ color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '8px', fontStyle: 'italic', fontSize: '13px' }}>
                <span>↓ Relación 1:N entre Tablas de Dimensión y Tabla de Hechos ↓</span>
              </div>

              {/* Central Fact Table */}
              <div
                style={{
                  width: '380px',
                  backgroundColor: 'rgba(30, 41, 59, 0.95)',
                  border: '2px solid var(--accent-blue-light)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px',
                  boxShadow: '0 0 20px rgba(37, 99, 235, 0.3)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', borderBottom: '2px solid var(--accent-blue-light)', paddingBottom: '10px' }}>
                  <Network size={20} style={{ color: 'var(--accent-blue-light)' }} />
                  <strong style={{ fontSize: '16px', color: '#FFFFFF' }}>{model.fact_table?.name}</strong>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <div style={{ color: '#6EE7B7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Key size={14} />
                    <span>PK: {model.fact_table?.primary_key}</span>
                  </div>

                  <div style={{ color: 'var(--accent-gold)' }}>
                    <strong>Llaves Foráneas (FKs):</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                      {model.fact_table?.foreign_keys.map((fk, fIdx) => (
                        <span key={fIdx} style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: 'rgba(217, 119, 6, 0.2)', border: '1px solid rgba(217, 119, 6, 0.4)', borderRadius: '4px', color: '#FCD34D' }}>
                          FK: {fk}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: '8px' }}>
                    <strong style={{ color: 'var(--accent-blue-light)' }}>Métricas Quantitative (Measures):</strong>
                    <ul style={{ paddingLeft: '16px', marginTop: '4px', color: 'var(--text-primary)' }}>
                      {model.fact_table?.measures.map((m, mIdx) => (
                        <li key={mIdx}><code>SUM / AVG ({m})</code></li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
