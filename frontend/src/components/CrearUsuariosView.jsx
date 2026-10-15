import React, { useEffect, useState } from 'react';
import { UserPlus, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../api/client';

const PANTALLA_OPTIONS = [
  { id: 'carga', label: 'Carga de Datos (Hito 1)' },
  { id: 'diagnostico', label: 'Diagnóstico y Limpieza (Hito 1)' },
  { id: 'modelo', label: 'Modelo de Datos (Hito 1)' },
  { id: 'anonimizacion', label: 'Anonimización (Hito 1)' },
  { id: 'tablero', label: 'Tablero general' },
  { id: 'exploracion', label: 'Exploración de datos' },
  { id: 'alertas', label: 'Alertas' },
  { id: 'accesos', label: 'Accesos' },
  { id: 'crear_usuarios', label: 'Crear usuarios' }
];

const ROL_PRESETS = {
  'gerente general': {
    pantallas: ['tablero', 'exploracion', 'alertas', 'accesos', 'crear_usuarios'],
    region: 'todos',
    datos: 'todos'
  },
  'analista de datos': {
    pantallas: PANTALLA_OPTIONS.map((p) => p.id),
    region: 'todos',
    datos: 'todos'
  }
};

const emptyForm = {
  rol: 'analista de datos',
  nombre_usuario: '',
  contrasena: '',
  region: 'todos',
  datos: 'todos',
  pantallas: [...ROL_PRESETS['analista de datos'].pantallas]
};

export default function CrearUsuariosView() {
  const [usuarios, setUsuarios] = useState([]);
  const [centros, setCentros] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await api.getUsuarios();
      setUsuarios(list);
    } catch (err) {
      setError(err?.response?.data?.detail || 'No se pudieron listar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    api.getAnalyticsCenters()
      .then(setCentros)
      .catch((err) => {
        setError(err?.response?.data?.detail || 'No se pudieron cargar las regiones y centros');
      });
  }, []);

  const handleRolChange = (rol) => {
    const preset = ROL_PRESETS[rol];
    setForm((prev) => ({
      ...prev,
      rol,
      pantallas: preset ? [...preset.pantallas] : prev.pantallas,
      region: preset?.region || prev.region,
      datos: preset?.datos || prev.datos
    }));
  };

  const togglePantalla = (id) => {
    setForm((prev) => {
      const set = new Set(prev.pantallas);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...prev, pantallas: Array.from(set) };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage(null);
    if (!form.nombre_usuario.trim() || !form.contrasena) {
      setError('Usuario y contraseña son obligatorios');
      return;
    }
    if (form.pantallas.length === 0) {
      setError('Seleccione al menos una pantalla');
      return;
    }
    setSaving(true);
    try {
      await api.createUsuario({
        rol: form.rol,
        nombre_usuario: form.nombre_usuario.trim(),
        contrasena: form.contrasena,
        region: form.region,
        datos: form.datos,
        pantallas: form.pantallas.join(',')
      });
      setMessage(`Usuario "${form.nombre_usuario}" creado correctamente`);
      setForm(emptyForm);
      await loadUsers();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Error al crear usuario');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="crear-usuarios-view">
      <div className="page-header">
        <h1 className="page-title">
          <UserPlus size={26} style={{ marginRight: 10, verticalAlign: 'middle' }} />
          Crear usuarios
        </h1>
        <p className="page-description">
          Registre usuarios con rol, región o centro, pantallas permitidas y alcance de datos.
        </p>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">Nuevo usuario</div>
          <form className="user-form" onSubmit={handleSubmit}>
            <label className="login-label">
              Rol
              <select
                className="login-input"
                value={form.rol}
                onChange={(e) => handleRolChange(e.target.value)}
              >
                <option value="gerente general">Gerente general</option>
                <option value="analista de datos">Analista de datos</option>
                <option value="visor regional">Visor regional</option>
              </select>
            </label>

            <label className="login-label">
              Nombre de usuario
              <input
                className="login-input"
                value={form.nombre_usuario}
                onChange={(e) => setForm({ ...form, nombre_usuario: e.target.value })}
                placeholder="usuario"
              />
            </label>

            <label className="login-label">
              Contraseña
              <input
                type="password"
                className="login-input"
                value={form.contrasena}
                onChange={(e) => setForm({ ...form, contrasena: e.target.value })}
                placeholder="••••••••"
              />
            </label>

            <label className="login-label">
              Región / centro
              <select
                className="login-input"
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
              >
                <option value="todos">Todos los centros</option>
                {centros.map((centro) => (
                  <option key={centro} value={centro}>{centro}</option>
                ))}
              </select>
            </label>

            <label className="login-label">
              Datos visibles
              <input
                className="login-input"
                value={form.datos}
                onChange={(e) => setForm({ ...form, datos: e.target.value })}
                placeholder="todos o nombre de región"
              />
            </label>

            <div className="pantallas-grid">
              <div className="kpi-label" style={{ marginBottom: 8 }}>Pantallas</div>
              {PANTALLA_OPTIONS.map((p) => (
                <label key={p.id} className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={form.pantallas.includes(p.id)}
                    onChange={() => togglePantalla(p.id)}
                  />
                  <span>{p.label}</span>
                </label>
              ))}
            </div>

            {error && (
              <div className="login-error"><AlertCircle size={16} /><span>{error}</span></div>
            )}
            {message && (
              <div className="login-success"><CheckCircle2 size={16} /><span>{message}</span></div>
            )}

            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : (
                <>
                  <UserPlus size={16} />
                  Crear usuario
                </>
              )}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="card-title">
            <Users size={18} /> Usuarios registrados
          </div>
          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Cargando…</p>
          ) : (
            <div className="table-container">
              <table className="data-table usuarios-table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Región</th>
                    <th>Datos</th>
                    <th>Pantallas</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id}>
                      <td>{u.nombre_usuario}</td>
                      <td>{u.rol}</td>
                      <td>{u.region}</td>
                      <td>{u.datos}</td>
                      <td className="usuarios-pantallas-cell">
                        {String(u.pantallas || '')
                          .split(',')
                          .map((pantalla) => pantalla.trim())
                          .filter(Boolean)
                          .map((pantalla) => <span key={pantalla}>{pantalla}</span>)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
