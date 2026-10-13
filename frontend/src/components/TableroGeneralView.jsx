import React, { useEffect, useState, useMemo } from 'react';
import {
  LayoutDashboard, DollarSign, ShoppingCart, TrendingUp, CheckCircle2,
  Receipt, MapPin, Ban, AlertTriangle
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { api } from '../api/client';

const BAR_COLORS = ['#2563EB', '#D97706', '#059669', '#7C3AED', '#DC2626', '#0891B2', '#CA8A04'];

function formatMoney(n) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);
}

function formatNumber(n) {
  return new Intl.NumberFormat('es-CO').format(n || 0);
}

function LineTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{d.mes_nombre} {d.anio}</div>
      <div>Ingresos: <strong>{formatMoney(d.ingresos)}</strong></div>
      <div>Órdenes: {formatNumber(d.ordenes)}</div>
      <div>Margen: {formatMoney(d.margen)}</div>
    </div>
  );
}

export default function TableroGeneralView({ datasetId, currentDataset, user }) {
  const [filters, setFilters] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [anioInicio, setAnioInicio] = useState('');
  const [anioFin, setAnioFin] = useState('');
  const [region, setRegion] = useState('todos');

  const userRegion = user?.datos && user.datos !== 'todos' ? user.datos : null;
  const isCleaned = Boolean(currentDataset?.has_cleaned);

  useEffect(() => {
    if (!datasetId || !isCleaned) {
      setFilters(null);
      setData(null);
      return;
    }
    (async () => {
      try {
        const opts = await api.getAnalyticsFilters(datasetId, userRegion);
        setFilters(opts);
        if (opts.years?.length) {
          setAnioInicio(String(opts.years[0]));
          setAnioFin(String(opts.years[opts.years.length - 1]));
        }
      } catch (err) {
        setError(err?.response?.data?.detail || 'No se pudieron cargar los filtros');
      }
    })();
  }, [datasetId, isCleaned, userRegion]);

  useEffect(() => {
    if (!datasetId || !isCleaned) return;
    loadTablero();
  }, [datasetId, isCleaned, anioInicio, anioFin, region]);

  const loadTablero = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getTablero(datasetId, {
        anioInicio: anioInicio || undefined,
        anioFin: anioFin || undefined,
        region: region !== 'todos' ? region : undefined,
        userRegion
      });
      setData(res);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Error al cargar el tablero');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const chartWidth = useMemo(() => {
    const points = data?.ingresos_por_mes?.length || 0;
    return Math.max(720, points * 72);
  }, [data]);

  if (!datasetId) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <AlertTriangle size={40} style={{ color: 'var(--accent-gold)', marginBottom: 12 }} />
        <h2>Ninguna base de datos seleccionada</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
          Seleccione un dataset en las pestañas superiores.
        </p>
      </div>
    );
  }

  if (!isCleaned) {
    return (
      <div className="card hito2-gate">
        <AlertTriangle size={40} style={{ color: 'var(--accent-gold)' }} />
        <h2>Hito 2 bloqueado</h2>
        <p>
          El tablero general y las vistas de estadística requieren que los datos
          hayan sido procesados en <strong>Hito 1 → Diagnóstico y Limpieza</strong>.
        </p>
      </div>
    );
  }

  const kpis = data?.kpis;

  return (
    <div className="tablero-view">
      <div className="page-header">
        <h1 className="page-title">
          <LayoutDashboard size={26} style={{ marginRight: 10, verticalAlign: 'middle' }} />
          Tablero general
        </h1>
        <p className="page-description">
          KPIs y tendencias de la base de datos limpia. Filtre por rango de años y región.
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
          <label>Región / País</label>
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="todos">Todas</option>
            {(filters?.regions || []).map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--accent-crimson)', color: '#FCA5A5' }}>
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>Cargando tablero…</div>
      ) : data && (
        <>
          <div className="grid-4" style={{ marginBottom: 20 }}>
            <div className="kpi-card">
              <div className="kpi-label"><DollarSign size={14} /> Ingresos totales</div>
              <div className="kpi-value">{formatMoney(kpis.ingresos_totales)}</div>
              <div className="kpi-subtext">Costo: {formatMoney(kpis.costo_total)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label"><ShoppingCart size={14} /> Órdenes / transacciones</div>
              <div className="kpi-value">{formatNumber(kpis.ordenes)}</div>
              <div className="kpi-subtext">Sin duplicados de identificador</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label"><TrendingUp size={14} /> Margen de ingresos</div>
              <div className="kpi-value">{formatMoney(kpis.margen)}</div>
              <div className="kpi-subtext">{kpis.margen_pct}% del ingreso (ingreso − costo)</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label"><CheckCircle2 size={14} /> {kpis.efectivo_label}</div>
              <div className="kpi-value">{formatNumber(kpis.datos_efectivos)}</div>
              <div className="kpi-subtext">Datos efectivos del período</div>
            </div>
          </div>

          <div className="grid-3" style={{ marginBottom: 20 }}>
            <div className="kpi-card">
              <div className="kpi-label"><Receipt size={14} /> Ticket promedio</div>
              <div className="kpi-value" style={{ fontSize: 22 }}>{formatMoney(kpis.ticket_promedio)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label"><MapPin size={14} /> Regiones activas</div>
              <div className="kpi-value" style={{ fontSize: 22 }}>{formatNumber(kpis.regiones_activas)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label"><Ban size={14} /> Cancelaciones</div>
              <div className="kpi-value" style={{ fontSize: 22 }}>{formatNumber(kpis.cancelaciones)}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Ingresos por mes</div>
            <div className="chart-scroll-x">
              <div style={{ width: chartWidth, minHeight: 320 }}>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.ingresos_por_mes} margin={{ top: 10, right: 24, left: 8, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#94A3B8', fontSize: 11 }}
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      tick={{ fill: '#94A3B8', fontSize: 11 }}
                      tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                      label={{ value: 'Ingresos', angle: -90, position: 'insideLeft', fill: '#64748B' }}
                    />
                    <Tooltip content={<LineTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="ingresos"
                      stroke="#D97706"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#F59E0B' }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid-2">
            <div className="card">
              <div className="card-title">Ingresos por servicio</div>
              <ResponsiveContainer width="100%" height={Math.max(220, (data.ingresos_por_servicio?.length || 1) * 36)}>
                <BarChart data={data.ingresos_por_servicio} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" tick={{ fill: '#94A3B8', fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                  <YAxis type="category" dataKey="servicio" width={110} tick={{ fill: '#94A3B8', fontSize: 11 }} />
                  <Tooltip formatter={(v) => formatMoney(v)} />
                  <Bar dataKey="ingresos" radius={[0, 6, 6, 0]}>
                    {(data.ingresos_por_servicio || []).map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <div className="card-title">Ingresos por región / país</div>
              <ResponsiveContainer width="100%" height={Math.max(220, (data.ingresos_por_region?.length || 1) * 36)}>
                <BarChart data={data.ingresos_por_region} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" tick={{ fill: '#94A3B8', fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                  <YAxis type="category" dataKey="region" width={110} tick={{ fill: '#94A3B8', fontSize: 11 }} />
                  <Tooltip formatter={(v) => formatMoney(v)} />
                  <Bar dataKey="ingresos" radius={[0, 6, 6, 0]}>
                    {(data.ingresos_por_region || []).map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[(i + 2) % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
