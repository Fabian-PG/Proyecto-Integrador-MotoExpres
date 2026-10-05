import React, { useState } from 'react';
import { Upload, CheckCircle2, AlertTriangle, FileSpreadsheet, Eye, RefreshCw, Database } from 'lucide-react';
import { api } from '../api/client';

export default function CargaDatosView({ onUploadSuccess, currentDataset, previewData, onRefresh }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setProgress(20);
    setError(null);
    setStatusMessage('Validando estructura e integridad del archivo...');

    const timer = setInterval(() => {
      setProgress((prev) => (prev < 90 ? prev + 15 : prev));
    }, 200);

    try {
      const res = await api.uploadDataset(file);
      clearInterval(timer);
      setProgress(100);

      if (res.status === 'duplicate') {
        setStatusMessage(`Alerta de Doble Carga: ${res.message}`);
        onUploadSuccess(res.dataset.id);
      } else {
        setStatusMessage(res.message);
        onUploadSuccess(res.dataset.id);
      }
    } catch (err) {
      clearInterval(timer);
      setError(err.response?.data?.detail || 'Error al procesar y almacenar el archivo.');
    } finally {
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 1500);
    }
  };

  return (
    <div className="carga-datos-view">
      <div className="page-header">
        <h1 className="page-title">Hito 1: Carga de Datos</h1>
        <p className="page-description">
          Sube archivos de datos en formato CSV o XLSX. El sistema valida la información, detecta cargas duplicadas vía hash SHA256 y genera una base de datos aislada preservando los datos originales.
        </p>
      </div>

      {/* Upload Box */}
      <div className="card">
        <div className="card-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={18} style={{ color: 'var(--accent-gold)' }} />
            <span>Cargar Archivo al Sistema (CSV / XLSX)</span>
          </div>
        </div>

        <div
          style={{
            border: '2px dashed var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '40px',
            textAlign: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            cursor: 'pointer'
          }}
          onClick={() => document.getElementById('file-input-trigger').click()}
        >
          <input
            id="file-input-trigger"
            type="file"
            accept=".csv, .xlsx, .xls"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          <FileSpreadsheet size={48} style={{ color: 'var(--accent-gold)', marginBottom: '16px' }} />
          <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Arrastra o selecciona un archivo .csv o .xlsx</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Límite máximo recomendado: 50MB por archivo. El sistema verificará la existencia previa de la firma SHA256.
          </p>

          <button className="btn btn-primary" style={{ marginTop: '20px' }}>
            <Upload size={16} />
            <span>Seleccionar Archivo</span>
          </button>
        </div>

        {/* Real-time Progress Bar */}
        {uploading && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
              <span>{statusMessage}</span>
              <span style={{ fontWeight: '600', color: 'var(--accent-gold)' }}>{progress}%</span>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        )}

        {/* Status Alerts */}
        {statusMessage && !uploading && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: statusMessage.includes('Doble Carga') ? 'rgba(217, 119, 6, 0.15)' : 'rgba(5, 150, 105, 0.15)',
              border: `1px solid ${statusMessage.includes('Doble Carga') ? 'rgba(217, 119, 6, 0.4)' : 'rgba(5, 150, 105, 0.4)'}`,
              color: statusMessage.includes('Doble Carga') ? '#FCD34D' : '#6EE7B7',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '14px'
            }}
          >
            {statusMessage.includes('Doble Carga') ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            <span>{statusMessage}</span>
          </div>
        )}

        {error && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(220, 38, 38, 0.15)',
              border: '1px solid rgba(220, 38, 38, 0.4)',
              color: '#FCA5A5',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '14px'
            }}
          >
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Dataset Details & Live Table Preview */}
      {currentDataset && previewData && (
        <div className="card">
          <div className="card-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Eye size={18} style={{ color: 'var(--accent-blue-light)' }} />
              <span>Vista Previa de la BD Cargada: {currentDataset.original_filename}</span>
            </div>
            <button className="btn btn-secondary" onClick={onRefresh} style={{ padding: '6px 12px', fontSize: '12px' }}>
              <RefreshCw size={14} />
              <span>Actualizar Vista</span>
            </button>
          </div>

          <div className="grid-3" style={{ marginBottom: '20px' }}>
            <div className="kpi-card">
              <div className="kpi-label">Nombre de Tabla BD</div>
              <div className="kpi-value" style={{ fontSize: '18px', color: 'var(--accent-gold)' }}>
                raw_{currentDataset.id}
              </div>
              <div className="kpi-subtext">Base de datos aislada local</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Total de Registros</div>
              <div className="kpi-value">{previewData.dataset_info?.total_rows || currentDataset.total_rows}</div>
              <div className="kpi-subtext">Filas importadas correctamente</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Total de Columnas</div>
              <div className="kpi-value">{previewData.dataset_info?.total_columns || currentDataset.total_columns}</div>
              <div className="kpi-subtext">Campos en la estructura SQL</div>
            </div>
          </div>

          {/* Table Container */}
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  {previewData.dataset_info?.columns.map((col, idx) => (
                    <th key={idx}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.rows.slice(0, 10).map((row, rIdx) => (
                  <tr key={rIdx}>
                    {previewData.dataset_info?.columns.map((col, cIdx) => (
                      <td key={cIdx}>{row[col] !== null ? String(row[col]) : <em style={{ color: 'var(--text-muted)' }}>null</em>}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
