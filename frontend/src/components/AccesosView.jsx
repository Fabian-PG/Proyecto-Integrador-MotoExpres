import React, { useEffect, useState } from 'react';
import { KeyRound, RefreshCw, LogIn, LogOut } from 'lucide-react';
import { api } from '../api/client';

function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-CO', {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  } catch {
    return iso;
  }
}

export default function AccesosView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getAccesos(300);
      setLogs(data);
    } catch (err) {
      setError(err?.response?.data?.detail || 'No se pudo cargar el historial');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="accesos-view">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">
            <KeyRound size={26} style={{ marginRight: 10, verticalAlign: 'middle' }} />
            Accesos
          </h1>
          <p className="page-description">
            Histórico de ingresos a la plataforma: fecha, hora, rol, pantallas visibles y alcance de datos.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={loadLogs} disabled={loading}>
          <RefreshCw size={16} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--accent-crimson)', color: '#FCA5A5' }}>{error}</div>
      )}

      <div className="card accesos-history-card">
        <div className="card-title">Historial de sesiones ({logs.length})</div>
        {loading && logs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Cargando…</p>
        ) : (
          <div className="table-container accesos-history-table-container">
            <table className="data-table accesos-history-table">
              <thead>
                <tr>
                  <th>Fecha y hora</th>
                  <th>Acción</th>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Pantallas</th>
                  <th>Datos visibles</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{formatDateTime(log.timestamp)}</td>
                    <td>
                      <span className={`badge ${log.accion === 'login' ? 'badge-baja' : 'badge-media'}`}>
                        {log.accion === 'login' ? <LogIn size={12} style={{ marginRight: 4 }} /> : <LogOut size={12} style={{ marginRight: 4 }} />}
                        {log.accion}
                      </span>
                    </td>
                    <td>{log.nombre_usuario}</td>
                    <td>{log.rol}</td>
                    <td className="accesos-pantallas-cell">
                      {String(log.pantallas || '—')
                        .split(',')
                        .map((pantalla) => pantalla.trim())
                        .filter(Boolean)
                        .map((pantalla) => <span key={pantalla}>{pantalla}</span>)}
                    </td>
                    <td>{log.datos || '—'}</td>
                    <td>{log.ip || '—'}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      Aún no hay registros de acceso
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
