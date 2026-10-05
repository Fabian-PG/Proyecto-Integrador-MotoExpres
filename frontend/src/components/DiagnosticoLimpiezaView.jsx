import React, { useState, useEffect } from 'react';
import { Stethoscope, CheckCircle2, ShieldAlert, Wrench, History, Table as TableIcon } from 'lucide-react';
import { api } from '../api/client';

export default function DiagnosticoLimpiezaView({ datasetId, onCleanCompleted }) {
  const [loading, setLoading] = useState(false);
  const [diagnosis, setDiagnosis] = useState(null);
  const [cleaning, setCleaning] = useState(false);
  const [cleaningResult, setCleaningResult] = useState(null);
  const [bitacora, setBitacora] = useState([]);
  const [activeTab, setActiveTab] = useState('findings'); // 'findings' or 'bitacora'

  useEffect(() => {
    if (datasetId) {
      loadDiagnosis();
      loadBitacora();
    }
  }, [datasetId]);

  const loadDiagnosis = async () => {
    setLoading(true);
    try {
      const data = await api.getQualityDiagnosis(datasetId);
      setDiagnosis(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadBitacora = async () => {
    try {
      const logs = await api.getBitacoraLogs(datasetId);
      setBitacora(logs);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunCleaning = async () => {
    setCleaning(true);
    try {
      const res = await api.cleanDataset(datasetId);
      setCleaningResult(res);
      await loadDiagnosis();
      await loadBitacora();
      setActiveTab('bitacora');
      if (onCleanCompleted) onCleanCompleted();
    } catch (err) {
      console.error(err);
    } finally {
      setCleaning(false);
    }
  };

  if (!datasetId) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <ShieldAlert size={40} style={{ color: 'var(--accent-gold)', marginBottom: '12px' }} />
        <h2>Ninguna Base de Datos Seleccionada</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
          Por favor, selecciona una base de datos en las pestañas superiores o carga un nuevo archivo en 'Carga de Datos'.
        </p>
      </div>
    );
  }

  return (
    <div className="diagnostico-view">
      <div className="page-header">
        <h1 className="page-title">Hito 1: Diagnóstico y Limpieza de Datos</h1>
        <p className="page-description">
          Evaluación automatizada de las 6 dimensiones de calidad de información para Inteligencia de Negocios (Exactitud, Completitud, Consistencia, Actualidad, Validez y Unicidad). Al ejecutar la corrección, el sistema genera una nueva base de datos limpia y registra la bitácora de auditoría.
        </p>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <Stethoscope size={36} style={{ color: 'var(--accent-blue-light)', animation: 'spin 2s linear infinite' }} />
          <p style={{ marginTop: '12px' }}>Diagnosticando dimensiones de calidad de la base de datos...</p>
        </div>
      ) : diagnosis && (
        <>
          {/* Quality Scorecard Grid */}
          <div className="grid-4" style={{ marginBottom: '24px' }}>
            <div className="kpi-card" style={{ borderLeft: '4px solid var(--accent-gold)' }}>
              <div className="kpi-label">Índice DQ General</div>
              <div className="kpi-value" style={{ color: 'var(--accent-gold)' }}>{diagnosis.dq_index}%</div>
              <div className="kpi-subtext">{diagnosis.total_findings} hallazgos detectados</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Completitud</div>
              <div className="kpi-value">{diagnosis.scores?.completitud}%</div>
              <div className="kpi-subtext">Ausencia de nulos y vacíos</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Unicidad</div>
              <div className="kpi-value">{diagnosis.scores?.unicidad}%</div>
              <div className="kpi-subtext">Ausencia de filas duplicadas</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Exactitud & Outliers</div>
              <div className="kpi-value">{diagnosis.scores?.exactitud}%</div>
              <div className="kpi-subtext">Valores numéricos atípicos</div>
            </div>
          </div>

          {/* Remediation Action Card */}
          <div className="card" style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', border: '1px solid var(--accent-gold)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Wrench size={18} style={{ color: 'var(--accent-gold)' }} />
                  <span>Acción de Remediación e Imputación de Datos</span>
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Aplica las correcciones sugeridas en todas las dimensiones. Se creará una nueva tabla <code style={{ color: 'var(--accent-gold)' }}>cleaned_{datasetId}</code> preservando la tabla original <code style={{ color: 'var(--accent-blue-light)' }}>raw_{datasetId}</code>.
                </p>
              </div>

              <button className="btn btn-primary" onClick={handleRunCleaning} disabled={cleaning}>
                {cleaning ? (
                  <span>Procesando Limpieza...</span>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Ejecutar Limpieza y Crear BD Limpia</span>
                  </>
                )}
              </button>
            </div>

            {cleaningResult && (
              <div style={{ marginTop: '16px', padding: '12px 16px', backgroundColor: 'rgba(5, 150, 105, 0.15)', border: '1px solid rgba(5, 150, 105, 0.4)', borderRadius: 'var(--radius-md)', color: '#6EE7B7', fontSize: '13px' }}>
                ✓ ¡Limpieza ejecutada con éxito! Se creó la tabla <strong>{cleaningResult.cleaned_table}</strong> con {cleaningResult.final_rows} filas y se registraron {cleaningResult.total_actions} acciones en la Bitácora.
              </div>
            )}
          </div>

          {/* Navigation Tabs between Findings & Audit Bitácora */}
          <div className="card">
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '20px', gap: '16px' }}>
              <button
                className={`btn ${activeTab === 'findings' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('findings')}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                <Stethoscope size={14} />
                <span>Hallazgos por Dimensión ({diagnosis.findings?.length || 0})</span>
              </button>

              <button
                className={`btn ${activeTab === 'bitacora' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('bitacora')}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                <History size={14} />
                <span>Bitácora de Auditoría ({bitacora.length})</span>
              </button>
            </div>

            {/* View 1: Findings Table */}
            {activeTab === 'findings' && (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Dimensión BI</th>
                      <th>Columna Afectada</th>
                      <th>Severidad</th>
                      <th>Diagnóstico del Hallazgo</th>
                      <th>Filas</th>
                      <th>Decisión de Remediación Sugerida</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diagnosis.findings?.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                          ✓ No se encontraron hallazgos de baja calidad en esta base de datos.
                        </td>
                      </tr>
                    ) : (
                      diagnosis.findings?.map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            <strong style={{ color: 'var(--accent-gold)' }}>{item.dimension}</strong>
                          </td>
                          <td><code>{item.column}</code></td>
                          <td>
                            <span className={`badge badge-${item.severity?.toLowerCase()}`}>
                              {item.severity}
                            </span>
                          </td>
                          <td>{item.issue}</td>
                          <td><strong>{item.rows_affected}</strong></td>
                          <td style={{ color: 'var(--text-secondary)' }}>{item.recommendation}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* View 2: Bitácora Log Table */}
            {activeTab === 'bitacora' && (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Dimensión BI</th>
                      <th>Tipo de Problema</th>
                      <th>Columna</th>
                      <th>Filas Afectadas</th>
                      <th>Acción / Corrección Ejecutada</th>
                      <th>Fecha y Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bitacora.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                          No hay registros en la bitácora aún. Presiona 'Ejecutar Limpieza y Crear BD Limpia'.
                        </td>
                      </tr>
                    ) : (
                      bitacora.map((log) => (
                        <tr key={log.id}>
                          <td>#{log.id}</td>
                          <td><strong style={{ color: 'var(--accent-blue-light)' }}>{log.dimension}</strong></td>
                          <td>{log.issue_type}</td>
                          <td><code>{log.affected_column}</code></td>
                          <td>{log.rows_affected}</td>
                          <td style={{ color: '#6EE7B7' }}>{log.action_description}</td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                            {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
