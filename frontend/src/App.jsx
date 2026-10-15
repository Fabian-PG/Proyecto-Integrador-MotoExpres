import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import TopDatasetNav from './components/TopDatasetNav';
import LoginView from './components/LoginView';
import CargaDatosView from './components/CargaDatosView';
import DiagnosticoLimpiezaView from './components/DiagnosticoLimpiezaView';
import ModeloDatosView from './components/ModeloDatosView';
import AnonimizacionView from './components/AnonimizacionView';
import TableroGeneralView from './components/TableroGeneralView';
import ExploracionDatosView from './components/ExploracionDatosView';
import AlertasView from './components/AlertasView';
import AccesosView from './components/AccesosView';
import CrearUsuariosView from './components/CrearUsuariosView';
import { api, getRegionScope } from './api/client';

function parsePantallas(pantallas) {
  if (!pantallas) return [];
  const raw = String(pantallas).toLowerCase().trim();
  if (raw === 'todas' || raw === 'todo' || raw === 'all' || raw === '*') {
    return [
      'carga', 'diagnostico', 'modelo', 'anonimizacion',
      'tablero', 'exploracion', 'alertas', 'accesos', 'crear_usuarios'
    ];
  }
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function loadStoredUser() {
  try {
    const raw = localStorage.getItem('bi_user');
    const user = raw ? JSON.parse(raw) : null;
    return user?.access_token ? user : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [user, setUser] = useState(loadStoredUser);
  const [activeSubtitle, setActiveSubtitle] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [activeDatasetId, setActiveDatasetId] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [activeViewType, setActiveViewType] = useState('raw');

  const allowedScreens = useMemo(() => {
    const screens = parsePantallas(user?.pantallas);
    if (getRegionScope(user).length > 0) {
      return screens.filter((screen) => !['accesos', 'crear_usuarios'].includes(screen));
    }
    return screens;
  }, [user]);

  // Pick first allowed screen when user logs in / pantallas change
  useEffect(() => {
    if (!user) return;
    if (!activeSubtitle || !allowedScreens.includes(activeSubtitle)) {
      setActiveSubtitle(allowedScreens[0] || null);
    }
  }, [user, allowedScreens]);

  useEffect(() => {
    if (user) fetchDatasetsList();
  }, [user]);

  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
      setActiveSubtitle(null);
    };
    window.addEventListener('bi:session-expired', handleSessionExpired);
    return () => window.removeEventListener('bi:session-expired', handleSessionExpired);
  }, []);

  useEffect(() => {
    if (activeDatasetId) {
      fetchPreview(activeDatasetId, activeViewType);
    }
  }, [activeDatasetId, activeViewType]);

  const fetchDatasetsList = async (preferredSelectId = null) => {
    try {
      const list = await api.getDatasets();
      setDatasets(list);
      if (list.length > 0) {
        if (preferredSelectId) {
          setActiveDatasetId(preferredSelectId);
        } else if (!activeDatasetId) {
          setActiveDatasetId(list[0].id);
        }
      }
    } catch (err) {
      console.error('Error al cargar la lista de datasets:', err);
    }
  };

  const fetchPreview = async (id, viewType = 'raw') => {
    try {
      const data = await api.getDatasetDetail(id, viewType);
      setPreviewData(data);
    } catch (err) {
      console.error('Error al cargar la vista previa del dataset:', err);
    }
  };

  const currentDataset = datasets.find((d) => d.id === activeDatasetId);

  const handleUploadSuccess = (newDatasetId) => {
    fetchDatasetsList(newDatasetId);
  };

  const handleLoginSuccess = (loggedUser) => {
    setUser(loggedUser);
  };

  const handleLogout = async () => {
    try {
      if (user?.nombre_usuario) {
        await api.logout(user.nombre_usuario);
      }
    } catch (err) {
      console.error('Error al registrar logout:', err);
    }
    localStorage.removeItem('bi_user');
    setUser(null);
    setActiveSubtitle(null);
  };

  if (!user) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const can = (screen) => allowedScreens.includes(screen);
  const isRegionRestricted = getRegionScope(user).length > 0;
  const showDatasetNav = ['carga', 'diagnostico', 'modelo', 'anonimizacion', 'tablero', 'exploracion', 'alertas']
    .includes(activeSubtitle);

  return (
    <div className="app-container">
      <Sidebar
        activeSubtitle={activeSubtitle}
        setActiveSubtitle={setActiveSubtitle}
        user={user}
        onLogout={handleLogout}
      />

      <div className="main-wrapper">
        {showDatasetNav && (
          <TopDatasetNav
            datasets={datasets}
            activeDatasetId={activeDatasetId}
            setActiveDatasetId={setActiveDatasetId}
            onAddNewClick={!isRegionRestricted && can('carga') ? () => setActiveSubtitle('carga') : null}
          />
        )}

        <main className="content-viewport">
          {activeSubtitle === 'carga' && can('carga') && (
            <CargaDatosView
              onUploadSuccess={handleUploadSuccess}
              currentDataset={currentDataset}
              previewData={previewData}
              onRefresh={() => fetchPreview(activeDatasetId, activeViewType)}
              user={user}
            />
          )}

          {activeSubtitle === 'diagnostico' && can('diagnostico') && (
            <DiagnosticoLimpiezaView
              datasetId={activeDatasetId}
              onCleanCompleted={() => fetchDatasetsList(activeDatasetId)}
              user={user}
            />
          )}

          {activeSubtitle === 'modelo' && can('modelo') && (
            <ModeloDatosView datasetId={activeDatasetId} user={user} />
          )}

          {activeSubtitle === 'anonimizacion' && can('anonimizacion') && (
            <AnonimizacionView
              datasetId={activeDatasetId}
              onAnonymizeCompleted={() => fetchDatasetsList(activeDatasetId)}
              user={user}
            />
          )}

          {activeSubtitle === 'tablero' && can('tablero') && (
            <TableroGeneralView
              datasetId={activeDatasetId}
              currentDataset={currentDataset}
              user={user}
            />
          )}

          {activeSubtitle === 'exploracion' && can('exploracion') && (
            <ExploracionDatosView
              datasetId={activeDatasetId}
              currentDataset={currentDataset}
              user={user}
            />
          )}

          {activeSubtitle === 'alertas' && can('alertas') && (
            <AlertasView
              datasetId={activeDatasetId}
              currentDataset={currentDataset}
              user={user}
            />
          )}

          {activeSubtitle === 'accesos' && can('accesos') && (
            <AccesosView />
          )}

          {activeSubtitle === 'crear_usuarios' && can('crear_usuarios') && (
            <CrearUsuariosView />
          )}
        </main>
      </div>
    </div>
  );
}
