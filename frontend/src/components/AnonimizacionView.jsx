import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, EyeOff, AlertTriangle, CheckCircle2, Sliders, Scale } from 'lucide-react';
import { api } from '../api/client';

export default function AnonimizacionView({ datasetId, onAnonymizeCompleted }) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState(null);

  useEffect(() => {
    if (datasetId) {
      loadAnalysis();
    }
  }, [datasetId]);

  const loadAnalysis = async () => {
    setLoading(true);
    try {
      const data = await api.getAnonymizationAnalysis(datasetId);
      setAnalysis(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyAnonymization = async () => {
    setApplying(true);
    try {
      const res = await api.applyAnonymization(datasetId);
      setApplyResult(res);
      await loadAnalysis();
      if (onAnonymizeCompleted) onAnonymizeCompleted();
    } catch (err) {
      console.error(err);
    } finally {
      setApplying(false);
    }
  };

  if (!datasetId) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <ShieldCheck size={40} style={{ color: 'var(--accent-gold)', marginBottom: '12px' }} />
        <h2>Ninguna Base de Datos Seleccionada</h2>
        <p style={{ color: 'var(--text-muted)' }}>Selecciona una base de datos para evaluar el k-anonimato y la privacidad.</p>
      </div>
    );
  }

  return (
    <div className="anonimizacion-view">
      <div className="page-header">
        <h1 className="page-title">Hito 1: Anonimización de Datos & Identificación de Sesgos</h1>
        <p className="page-description">
          Evaluación del nivel de k-anonimato (k=1, k=3, k=5), identificación de datos sensibles y detección de sesgos de representación. El usuario puede accionar la anonimización para enmascarar identificadores directos sin eliminar información.
        </p>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <ShieldCheck size={36} style={{ color: 'var(--accent-gold)', animation: 'spin 2s linear infinite' }} />
          <p style={{ marginTop: '12px' }}>Evaluando k-anonimato y patrones de sesgo...</p>
        </div>
      ) : analysis && (
        <>
          {/* K-Anonymity Status Scorecard */}
          <div className="grid-3" style={{ marginBottom: '24px' }}>
            <div
              className="kpi-card"
              style={{
                borderLeft: `4px solid ${analysis.k_value === 1 ? 'var(--accent-crimson)' : analysis.k_value < 5 ? 'var(--accent-gold)' : 'var(--accent-emerald)'}`
              }}
            >
              <div className="kpi-label">Nivel de K-Anonimato Actual</div>
              <div
                className="kpi-value"
                style={{
                  color: analysis.k_value === 1 ? '#FCA5A5' : analysis.k_value < 5 ? '#FCD34D' : '#6EE7B7'
                }}
              >
                k = {analysis.k_value}
              </div>
              <div className="kpi-subtext">{analysis.k_status}</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-label">Identificadores Directos</div>
              <div className="kpi-value">{analysis.attributes?.direct_identifiers?.length || 0}</div>
              <div className="kpi-subtext">Nombres, emails, cédulas a ocultar</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-label">Quasi-Identificadores</div>
              <div className="kpi-value">{analysis.attributes?.quasi_identifiers?.length || 0}</div>
              <div className="kpi-subtext">Edad, género, ubicación</div>
            </div>
          </div>

          {/* Explanation & Action Trigger Card */}
          <div className="card" style={{ border: '1px solid var(--accent-gold)', backgroundColor: 'rgba(15, 23, 42, 0.7)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-gold)' }}>
                  <Lock size={18} />
                  <span>¿Por qué es necesario realizar el proceso de anonimización?</span>
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: '1.6' }}>
                  {analysis.k_explanation}
                </p>

                <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  <em>Nota: Cumple con regulaciones GDPR / Habeas Data. Los cambios crean una nueva tabla <code style={{ color: 'var(--accent-gold)' }}>anonymized_{datasetId}</code> sin eliminar los datos originales.</em>
                </div>
              </div>

              <button className="btn btn-primary" onClick={handleApplyAnonymization} disabled={applying}>
                {applying ? (
                  <span>Anonimizando...</span>
                ) : (
                  <>
                    <EyeOff size={16} />
                    <span>Aplicar Anonimización</span>
                  </>
                )}
              </button>
            </div>

            {applyResult && (
              <div style={{ marginTop: '16px', padding: '12px 16px', backgroundColor: 'rgba(5, 150, 105, 0.15)', border: '1px solid rgba(5, 150, 105, 0.4)', borderRadius: 'var(--radius-md)', color: '#6EE7B7', fontSize: '13px' }}>
                ✓ ¡Anonimización aplicada! Se creó la tabla <strong>{applyResult.anonymized_table}</strong>. Nivel de k-anonimato actualizado de k={applyResult.previous_k} a <strong>k={applyResult.updated_k} ({applyResult.updated_k_status})</strong>.
              </div>
            )}
          </div>

          {/* Sensitive Attributes Classification Grid */}
          <div className="grid-3" style={{ marginBottom: '24px' }}>
            <div className="card">
              <h4 style={{ fontSize: '14px', color: 'var(--accent-crimson)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={16} /> Identificadores Directos
              </h4>
              <ul style={{ paddingLeft: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                {analysis.attributes?.direct_identifiers.length === 0 ? (
                  <li>Ninguno detectado</li>
                ) : (
                  analysis.attributes?.direct_identifiers.map((col, idx) => (
                    <li key={idx}><code>{col}</code> (Enmascaramiento completo)</li>
                  ))
                )}
              </ul>
            </div>

            <div className="card">
              <h4 style={{ fontSize: '14px', color: 'var(--accent-gold)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sliders size={16} /> Quasi-Identificadores (QIs)
              </h4>
              <ul style={{ paddingLeft: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                {analysis.attributes?.quasi_identifiers.length === 0 ? (
                  <li>Ninguno detectado</li>
                ) : (
                  analysis.attributes?.quasi_identifiers.map((col, idx) => (
                    <li key={idx}><code>{col}</code> (Generalización en rangos)</li>
                  ))
                )}
              </ul>
            </div>

            <div className="card">
              <h4 style={{ fontSize: '14px', color: 'var(--accent-blue-light)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={16} /> Atributos Sensibles (SAs)
              </h4>
              <ul style={{ paddingLeft: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                {analysis.attributes?.sensitive_attributes.length === 0 ? (
                  <li>Ninguno detectado</li>
                ) : (
                  analysis.attributes?.sensitive_attributes.map((col, idx) => (
                    <li key={idx}><code>{col}</code> (Preservado para analítica BI)</li>
                  ))
                )}
              </ul>
            </div>
          </div>

          {/* Data Bias Detection Table */}
          <div className="card">
            <div className="card-title">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Scale size={18} style={{ color: 'var(--accent-gold)' }} />
                <span>Identificación de Sesgos en los Datos</span>
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Variable Analizada</th>
                    <th>Tipo de Sesgo Detectado</th>
                    <th>Categoría Dominante</th>
                    <th>Concentración (%)</th>
                    <th>Acción / Recomendación Sugerida</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.bias_findings?.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                        ✓ No se detectaron sesgos extremos de concentración de datos en esta base de datos.
                      </td>
                    </tr>
                  ) : (
                    analysis.bias_findings?.map((b, idx) => (
                      <tr key={idx}>
                        <td><code>{b.column}</code></td>
                        <td><strong style={{ color: 'var(--accent-gold)' }}>{b.bias_type}</strong></td>
                        <td><strong>{b.dominant_category}</strong></td>
                        <td><span className="badge badge-media">{b.percentage}%</span></td>
                        <td style={{ color: 'var(--text-secondary)' }}>{b.recommendation}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
