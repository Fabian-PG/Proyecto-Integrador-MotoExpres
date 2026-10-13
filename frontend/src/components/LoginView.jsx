import React, { useState } from 'react';
import { LogIn, Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { api } from '../api/client';

export default function LoginView({ onLoginSuccess }) {
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!nombreUsuario.trim() || !contrasena) {
      setError('Ingrese usuario y contraseña');
      return;
    }
    setLoading(true);
    try {
      const user = await api.login(nombreUsuario.trim(), contrasena);
      localStorage.setItem('bi_user', JSON.stringify(user));
      if (onLoginSuccess) onLoginSuccess(user);
    } catch (err) {
      const msg = err?.response?.data?.detail || 'No se pudo iniciar sesión';
      setError(typeof msg === 'string' ? msg : 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-backdrop" />
      <div className="login-card">
        <div className="login-brand">
          <div className="logo-badge">BI</div>
          <h1>Plataforma BI Analytics</h1>
          <p>Inteligencia de Negocios — Acceso seguro</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-label">
            Usuario
            <input
              type="text"
              className="login-input"
              value={nombreUsuario}
              onChange={(e) => setNombreUsuario(e.target.value)}
              placeholder="nombre_usuario"
              autoComplete="username"
              disabled={loading}
            />
          </label>

          <label className="login-label">
            Contraseña
            <div className="login-password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                className="login-input"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                className="login-eye"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          {error && (
            <div className="login-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="btn btn-primary login-submit" disabled={loading}>
            {loading ? 'Verificando…' : (
              <>
                <LogIn size={18} />
                Iniciar sesión
              </>
            )}
          </button>
        </form>

        <div className="login-hint">
          <Shield size={14} />
          <span>El acceso a pantallas y datos depende del rol asignado.</span>
        </div>
      </div>
    </div>
  );
}
