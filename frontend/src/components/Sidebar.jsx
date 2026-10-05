import React from 'react';
import { Database, Stethoscope, Network, ShieldCheck, Layers } from 'lucide-react';

export default function Sidebar({ activeSubtitle, setActiveSubtitle }) {
  const subtitles = [
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
        <div className="menu-title-group">
          {/* Main Title Required by Prompt: Hito 1 */}
          <div className="menu-title-header">
            <Layers size={14} />
            <span>Hito 1: Gestión & Calidad</span>
          </div>

          <div className="menu-subtitle-list">
            {subtitles.map((sub) => {
              const Icon = sub.icon;
              const isActive = activeSubtitle === sub.id;
              return (
                <div
                  key={sub.id}
                  className={`menu-item ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveSubtitle(sub.id)}
                >
                  <Icon size={18} className="menu-icon" />
                  <span>{sub.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
