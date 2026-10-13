import React, { useEffect, useState } from 'react';
import {
  BellRing, AlertTriangle, Info, TrendingDown, TrendingUp
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell, ComposedChart, Line
} from 'recharts';
import { api } from '../api/client';

function formatMoney(n) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);
}

function tipoIcon(tipo) {
  if (tipo === 'ok') return <Info size={18} />;
  if (tipo === 'baja' || tipo === 'margen') return <TrendingDown size={18} />;
  if (tipo === 'alta') return <TrendingUp size={18} />;
  return <AlertTriangle size={18} />;
}

export default function AlertasView({ datasetId, currentDataset, user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [anioInicio, setAnioInicio] = useState('');
  const [anioFin, setAnioFin] = useState('');
  const [region, setRegion] = useState('todos');
  const [filters, setFilters] = useState(null);

  const userRegion = user?.datos && user.datos !== 'todos' ? user.datos : null;
  const isCleaned = Boolean(currentDataset?.has_cleaned);

  useEffect(() => {
    if (!datasetId || !isCleaned) return;
    (async () => {
      try {
        const opts = await api.getAnalyticsFilters(datasetId, userRegion);
        setFilters(opts);
        if (opts.years?.length) {
          setAnioInicio(String(opts.years[0]));
          setAnioFin(String(opts.years[opts.years.length - 1]));
        }
      } catch (err) {
        setError(err?.response?.data?.detail || 'Error al cargar filtros');
      }
    })();
  }, [datasetId, isCleaned, userRegion]);

  useEffect(() => {
    if (!datasetId || !isCleaned) return;
    loadAlertas();
  }, [datasetId, isCleaned, anioInicio, anioFin, region]);

  const loadAlertas = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getAlertas(datasetId, {
        anioInicio: anioInicio || undefined,
        anioFin: anioFin || undefined,
        region: region !== 'todos' ? region : undefined,
        userRegion
      });
      setData(res);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Error al detectar alertas');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  if (!datasetId) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <AlertTriangle size={40} style={{ color: 'var(--accent-gold)', marginBottom: 12 }} />
        <h2>Ninguna base de datos seleccionada</h2>
      </div>
    );
  }

  if (!isCleaned) {
    return (
      <div className="card hito2-gate">
        <AlertTriangle size={40} style={{ color: 'var(--accent-gold)' }} />
        <h2>Hito 2 bloqueado</h2>
        <p>
          Las alertas de anomalías requieren datos limpios del <strong>Hito 1</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="alertas-view">
      <div className="page-header">
        <h1 className="page-title">
          <BellRing size={26} style={{ marginRight: 10, verticalAlign: 'middle' }} />
          Alertas
        </h1>
        <p className="page-description">
          Detección de anormalidades en órdenes, márgenes y concentración regional, con posibles causas.
        </p>
      </div>

      <div className="filters-bar card">
        <div className="filter-group">
          <label>Año inicio</label>
          <select value={anioInicio} onChange={(e) => setAnioInicio(e.target.value)}>
            <option value="">Todos</option>
            {(filters?.years || []).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Año fin</label>
          <select value={anioFin} onChange={(e) => setAnioFin(e.target.value)}>
            <option value="">Todos</option>
            {(filters?.years || []).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Región</label>
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="todos">Todas</option>
            {(filters?.regions || []).map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--accent-crimson)', color: '#FCA5A5' }}>{error}</div>
      )}

      {loading && !data ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>Analizando anomalías…</div>
      ) : data && (
        <>
          <div className="grid-2">
            <div className="card">
              <div className="card-title">
                Órdenes vs promedio mensual
                <span className="kpi-subtext">Promedio: {data.promedio_ordenes}</span>
              </div>
              <div className="chart-scroll-x">
                <div style={{ width: Math.max(560, (data.ordenes_vs_promedio?.length || 1) * 64), minHeight: 280 }}>
                  <ResponsiveContainer width="100%" height={260}>
                    <ComposedChart data={data.ordenes_vs_promedio} margin={{ bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="label" tick={{ fill: '#94A3B8', fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={55} />
                      <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} />
                      <Tooltip />
                      <ReferenceLine y={data.promedio_ordenes} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: 'Promedio', fill: '#F59E0B', fontSize: 11 }} />
                      <Bar dataKey="ordenes" name="Órdenes" radius={[4, 4, 0, 0]}>
                        {(data.ordenes_vs_promedio || []).map((entry, i) => (
                          <Cell key={i} fill={entry.anomalia ? '#DC2626' : '#2563EB'} />
                        ))}
                      </Bar>
                      <Line type="monotone" dataKey="promedio" stroke="#F59E0B" dot={false} strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-title">
                Margen por año / mes
                <span className="kpi-subtext">Promedio: {formatMoney(data.promedio_margen)}</span>
              </div>
              <div className="chart-scroll-x">
                <div style={{ width: Math.max(560, (data.margen_por_periodo?.length || 1) * 64), minHeight: 280 }}>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data.margen_por_periodo} margin={{ bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="label" tick={{ fill: '#94A3B8', fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={55} />
                      <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                      <Tooltip formatter={(v) => formatMoney(v)} />
                      <ReferenceLine y={data.promedio_margen} stroke="#059669" strokeDasharray="4 4" />
                      <Bar dataKey="margen" name="Margen" radius={[4, 4, 0, 0]}>
                        {(data.margen_por_periodo || []).map((entry, i) => (
                          <Cell key={i} fill={entry.anomalia ? '#D97706' : '#059669'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Mensajes de anomalías y posibles causas</div>
            <div className="alertas-list">
              {(data.mensajes || []).map((msg, idx) => (
                <div key={idx} className={`alerta-item alerta-${msg.tipo}`}>
                  <div className="alerta-icon">{tipoIcon(msg.tipo)}</div>
                  <div className="alerta-body">
                    <div className="alerta-titulo">{msg.titulo}</div>
                    <div className="alerta-detalle">{msg.detalle}</div>
                    <div className="alerta-causa">
                      <strong>Posible causa:</strong> {msg.posible_causa}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
