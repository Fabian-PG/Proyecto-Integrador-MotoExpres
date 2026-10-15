import React from 'react';
import { getRegionScope } from '../api/client';
import {
  Database, Stethoscope, Network, ShieldCheck, Layers,
  LayoutDashboard, Search, BellRing, KeyRound, UserPlus,
  LogOut, BarChart3
} from 'lucide-react';

const HITO1_ITEMS = [
  {
    id: 'carga',
    title: 'Carga de Datos',
    icon: Database,
    description: 'Ingesta de archivos CSV/XLSX y control de duplicados'
  },
  {
    id: 'diagnostico',
    title: 'Diagnóstico y Limpieza',
    icon: Stethoscope,
    description: 'Análisis de 6 dimensiones de calidad y bitácora'
  },
  {
    id: 'modelo',
    title: 'Modelo de Datos',
    icon: Network,
    description: 'Esquema en estrella y declaración de granularidad'
  },
  {
    id: 'anonimizacion',
    title: 'Anonimización',
    icon: ShieldCheck,
    description: 'Evaluación de k-anonimato y sesgos de datos'
  }
];

const HITO2_ITEMS = [
  {
    id: 'tablero',
    title: 'Tablero general',
    icon: LayoutDashboard,
    description: 'KPIs y estadísticas generales'
  },
  {
    id: 'exploracion',
    title: 'Exploración de datos',
    icon: Search,
    description: 'Filtros, márgenes y participación por servicio'
  },
  {
    id: 'alertas',
    title: 'Alertas',
    icon: BellRing,
    description: 'Anomalías en órdenes y márgenes'
  },
  {
    id: 'accesos',
    title: 'Accesos',
    icon: KeyRound,
    description: 'Histórico de ingresos a la plataforma'
  },
  {
    id: 'crear_usuarios',
    title: 'Crear usuarios',
    icon: UserPlus,
    description: 'Alta de usuarios, roles y pantallas'
  }
];

function parsePantallas(pantallas) {
  if (!pantallas) return new Set();
  const raw = String(pantallas).toLowerCase().trim();
  if (raw === 'todas' || raw === 'todo' || raw === 'all' || raw === '*') {
    return new Set([...HITO1_ITEMS, ...HITO2_ITEMS].map((i) => i.id));
  }
  return new Set(raw.split(',').map((s) => s.trim()).filter(Boolean));
}

export default function Sidebar({ activeSubtitle, setActiveSubtitle, user, onLogout }) {
  const allowed = parsePantallas(user?.pantallas);
  if (getRegionScope(user).length > 0) {
    allowed.delete('accesos');
    allowed.delete('crear_usuarios');
  }
  const hito1 = HITO1_ITEMS.filter((i) => allowed.has(i.id));
  const hito2 = HITO2_ITEMS.filter((i) => allowed.has(i.id));

  const renderItems = (items) =>
    items.map((sub) => {
      const Icon = sub.icon;
      const isActive = activeSubtitle === sub.id;
      return (
        <div
          key={sub.id}
          className={`menu-item ${isActive ? 'active' : ''}`}
          onClick={() => setActiveSubtitle(sub.id)}
          title={sub.description}
        >
          <Icon size={18} className="menu-icon" />
          <span>{sub.title}</span>
        </div>
      );
    });

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-badge">BI</div>
        <div>
          <div className="sidebar-title">Plataforma BI Analytics</div>
          <div className="sidebar-subtitle-tag">Inteligencia de Negocios</div>
        </div>
      </div>

      <div className="sidebar-content">
        {hito1.length > 0 && (
          <div className="menu-title-group">
            <div className="menu-title-header">
              <Layers size={14} />
              <span>Hito 1: Gestión & Calidad</span>
            </div>
            <div className="menu-subtitle-list">{renderItems(hito1)}</div>
          </div>
        )}

        {hito2.length > 0 && (
          <div className="menu-title-group">
            <div className="menu-title-header">
              <BarChart3 size={14} />
              <span>Hito 2: Estadística y exploración</span>
            </div>
            <div className="menu-subtitle-list">{renderItems(hito2)}</div>
          </div>
        )}
      </div>

      {user && (
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-name">{user.nombre_usuario}</div>
            <div className="sidebar-user-rol">{user.rol}</div>
          </div>
          <button className="btn btn-secondary sidebar-logout" onClick={onLogout} type="button">
            <LogOut size={16} />
            Salir
          </button>
        </div>
      )}
    </aside>
  );
}
