import React, { useEffect, useState } from 'react';
import {
  Search, DollarSign, ShoppingCart, TrendingUp, Ban, AlertTriangle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { api, getRegionScope } from '../api/client';

const BAR_COLORS = ['#059669', '#2563EB', '#D97706', '#7C3AED', '#DC2626', '#0891B2'];

function formatMoney(n) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);
}

function formatNumber(n) {
  return new Intl.NumberFormat('es-CO').format(n || 0);
}

export default function ExploracionDatosView({ datasetId, currentDataset, user }) {
  const [filters, setFilters] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [region, setRegion] = useState('todos');
  const [anioInicio, setAnioInicio] = useState('');
  const [anioFin, setAnioFin] = useState('');
  const [mes, setMes] = useState('');

  const regionScope = getRegionScope(user);
  const isRegionLocked = regionScope.length > 0;
  const lockedRegion = regionScope.length === 1 ? regionScope[0] : '__locked_scope__';
  const regionScopeKey = regionScope.join('|');
  const isCleaned = Boolean(currentDataset?.has_cleaned);

  useEffect(() => {
    if (!datasetId || !isCleaned) return;
    (async () => {
      try {
        const opts = await api.getAnalyticsFilters(datasetId);
        setFilters(opts);
        if (opts.years?.length) {
          setAnioInicio(String(opts.years[0]));
          setAnioFin(String(opts.years[opts.years.length - 1]));
        }
      } catch (err) {
        setError(err?.response?.data?.detail || 'Error al cargar filtros');
      }
    })();
  }, [datasetId, isCleaned, regionScopeKey]);

  useEffect(() => {
    if (!datasetId || !isCleaned) return;
    loadData();
  }, [datasetId, isCleaned, region, anioInicio, anioFin, mes, regionScopeKey]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getExploracion(datasetId, {
        anioInicio: anioInicio || undefined,
        anioFin: anioFin || undefined,
        region: !isRegionLocked && region !== 'todos' ? region : undefined,
        mes: mes || undefined
      });
      setData(res);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Error al explorar datos');
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
          Complete <strong>Diagnóstico y Limpieza</strong> en el Hito 1 para explorar los datos limpios.
        </p>
      </div>
    );
  }

  const kpis = data?.kpis;

  return (
    <div className="exploracion-view">
      <div className="page-header">
        <h1 className="page-title">
          <Search size={26} style={{ marginRight: 10, verticalAlign: 'middle' }} />
          Exploración de datos
        </h1>
        <p className="page-description">
          Filtre por región o centro, rango de años o un mes específico para analizar ingresos, márgenes y participación por servicio.
        </p>
      </div>

      <div className="filters-bar card">
        <div className="filter-group">
          <label>Región / centro</label>
          <select
            value={isRegionLocked ? lockedRegion : region}
            onChange={(e) => setRegion(e.target.value)}
            disabled={isRegionLocked}
          >
            {isRegionLocked ? (
              <option value={lockedRegion}>
                {regionScope.length === 1 ? `${lockedRegion} (asignado)` : 'Alcance asignado'}
              </option>
            ) : (
              <>
                <option value="todos">Todas</option>
                {(filters?.regions || []).map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </>
            )}
          </select>
        </div>
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
          <label>Mes específico</label>
          <select value={mes} onChange={(e) => setMes(e.target.value)}>
            <option value="">Todos los meses</option>
            {(filters?.months || []).map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--accent-crimson)', color: '#FCA5A5' }}>{error}</div>
      )}

      {loading && !data ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>Explorando…</div>
      ) : data && (
        <>
          <div className="grid-4" style={{ marginBottom: 20 }}>
            <div className="kpi-card">
              <div className="kpi-label"><DollarSign size={14} /> Ingresos</div>
              <div className="kpi-value" style={{ fontSize: 22 }}>{formatMoney(kpis.ingresos)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label"><ShoppingCart size={14} /> Órdenes / transacciones</div>
              <div className="kpi-value" style={{ fontSize: 22 }}>{formatNumber(kpis.ordenes)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label"><TrendingUp size={14} /> Margen de ganancia</div>
              <div className="kpi-value" style={{ fontSize: 22 }}>{formatMoney(kpis.margen)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label"><Ban size={14} /> Cancelaciones</div>
              <div className="kpi-value" style={{ fontSize: 22 }}>{formatNumber(kpis.cancelaciones)}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Servicios prestados y ganancias</div>
            <ResponsiveContainer width="100%" height={Math.max(240, (data.servicios_chart?.length || 1) * 40)}>
              <BarChart data={data.servicios_chart} layout="vertical" margin={{ left: 24, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" tick={{ fill: '#94A3B8', fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                <YAxis type="category" dataKey="servicio" width={120} tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <Tooltip formatter={(v) => formatMoney(v)} />
                <Bar dataKey="ingresos" name="Ganancias" radius={[0, 6, 6, 0]}>
                  {(data.servicios_chart || []).map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div className="card-title">
              Participación por servicio
              <span className="kpi-subtext">Promedio global: {formatMoney(kpis.promedio_global)}</span>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Servicio / Plan</th>
                    <th>Región / País</th>
                    <th>Promedio</th>
                    <th>Diferencia vs promedio</th>
                    <th>Ingresos</th>
                    <th>Órdenes</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.participacion || []).map((row, idx) => (
                    <tr key={`${row.servicio}-${row.region}-${idx}`}>
                      <td>{row.servicio}</td>
                      <td>{row.region}</td>
                      <td>{formatMoney(row.promedio)}</td>
                      <td style={{ color: row.diferencia >= 0 ? '#6EE7B7' : '#FCA5A5' }}>
                        {row.diferencia >= 0 ? '+' : ''}{formatMoney(row.diferencia)}
                      </td>
                      <td>{formatMoney(row.ingresos)}</td>
                      <td>{formatNumber(row.ordenes)}</td>
                    </tr>
                  ))}
                  {(!data.participacion || data.participacion.length === 0) && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        Sin filas para los filtros seleccionados
                      </td>
                    </tr>
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
