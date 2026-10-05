import React from 'react';
import { Database, FileSpreadsheet, PlusCircle } from 'lucide-react';

export default function TopDatasetNav({ datasets, activeDatasetId, setActiveDatasetId, onAddNewClick }) {
  return (
    <header className="top-nav">
      <div className="tabs-label">
        <Database size={16} />
        <span>Bases de Datos Cargadas:</span>
      </div>

      <div className="dataset-tabs-container">
        {datasets.length === 0 ? (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No hay bases de datos cargadas aún. Sube un archivo en 'Carga de Datos'.
          </div>
        ) : (
          datasets.map((ds) => {
            const isActive = activeDatasetId === ds.id;
            return (
              <div
                key={ds.id}
                className={`dataset-tab ${isActive ? 'active' : ''}`}
                onClick={() => setActiveDatasetId(ds.id)}
              >
                <FileSpreadsheet size={14} style={{ color: isActive ? 'var(--accent-gold)' : 'var(--text-muted)' }} />
                <span>{ds.original_filename}</span>
                <span className="tab-badge">{ds.total_rows} filas</span>
              </div>
            );
          })
        )}
      </div>

      <button className="btn btn-secondary" onClick={onAddNewClick} style={{ padding: '6px 12px', fontSize: '12px' }}>
        <PlusCircle size={14} />
        <span>Nueva BD</span>
      </button>
    </header>
  );
}
