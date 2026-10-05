import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopDatasetNav from './components/TopDatasetNav';
import CargaDatosView from './components/CargaDatosView';
import DiagnosticoLimpiezaView from './components/DiagnosticoLimpiezaView';
import ModeloDatosView from './components/ModeloDatosView';
import AnonimizacionView from './components/AnonimizacionView';
import { api } from './api/client';

export default function App() {
  const [activeSubtitle, setActiveSubtitle] = useState('carga'); // 'carga', 'diagnostico', 'modelo', 'anonimizacion'
  const [datasets, setDatasets] = useState([]);
  const [activeDatasetId, setActiveDatasetId] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [activeViewType, setActiveViewType] = useState('raw'); // 'raw', 'cleaned', 'anonymized'

  useEffect(() => {
    fetchDatasetsList();
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
      console.error("Error al cargar la lista de datasets:", err);
    }
  };

  const fetchPreview = async (id, viewType = 'raw') => {
    try {
      const data = await api.getDatasetDetail(id, viewType);
      setPreviewData(data);
    } catch (err) {
      console.error("Error al cargar la vista previa del dataset:", err);
    }
  };

  const currentDataset = datasets.find((d) => d.id === activeDatasetId);

  const handleUploadSuccess = (newDatasetId) => {
    fetchDatasetsList(newDatasetId);
  };

  return (
    <div className="app-container">
      {/* Left Sidebar Menu: Title Hito 1 & 4 Subtitles */}
      <Sidebar
        activeSubtitle={activeSubtitle}
        setActiveSubtitle={setActiveSubtitle}
      />

      <div className="main-wrapper">
        {/* Top Navigation Bar: Dynamic Loaded Dataset Tabs */}
        <TopDatasetNav
          datasets={datasets}
          activeDatasetId={activeDatasetId}
          setActiveDatasetId={setActiveDatasetId}
          onAddNewClick={() => setActiveSubtitle('carga')}
        />

        {/* Content Viewport per Subtitle View */}
        <main className="content-viewport">
          {activeSubtitle === 'carga' && (
            <CargaDatosView
              onUploadSuccess={handleUploadSuccess}
              currentDataset={currentDataset}
              previewData={previewData}
              onRefresh={() => fetchPreview(activeDatasetId, activeViewType)}
            />
          )}

          {activeSubtitle === 'diagnostico' && (
            <DiagnosticoLimpiezaView
              datasetId={activeDatasetId}
              onCleanCompleted={() => fetchDatasetsList(activeDatasetId)}
            />
          )}

          {activeSubtitle === 'modelo' && (
            <ModeloDatosView
              datasetId={activeDatasetId}
            />
          )}

          {activeSubtitle === 'anonimizacion' && (
            <AnonimizacionView
              datasetId={activeDatasetId}
              onAnonymizeCompleted={() => fetchDatasetsList(activeDatasetId)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
