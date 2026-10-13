import axios from 'axios';

const API_BASE = '/api';

export const api = {
  // Datasets
  uploadDataset: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await axios.post(`${API_BASE}/datasets/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  getDatasets: async () => {
    const res = await axios.get(`${API_BASE}/datasets`);
    return res.data;
  },

  getDatasetDetail: async (datasetId, viewType = 'raw', page = 1, limit = 50) => {
    const res = await axios.get(`${API_BASE}/datasets/${datasetId}`, {
      params: { view_type: viewType, page, limit }
    });
    return res.data;
  },

  // Quality & Cleaning
  getQualityDiagnosis: async (datasetId) => {
    const res = await axios.get(`${API_BASE}/quality/diagnose/${datasetId}`);
    return res.data;
  },

  cleanDataset: async (datasetId) => {
    const res = await axios.post(`${API_BASE}/quality/clean/${datasetId}`);
    return res.data;
  },

  getBitacoraLogs: async (datasetId) => {
    const res = await axios.get(`${API_BASE}/quality/bitacora/${datasetId}`);
    return res.data;
  },

  // Modeling
  getStarSchema: async (datasetId) => {
    const res = await axios.get(`${API_BASE}/modeling/star-schema/${datasetId}`);
    return res.data;
  },

  // Anonymization
  getAnonymizationAnalysis: async (datasetId) => {
    const res = await axios.get(`${API_BASE}/anonymization/analyze/${datasetId}`);
    return res.data;
  },

  applyAnonymization: async (datasetId) => {
    const res = await axios.post(`${API_BASE}/anonymization/apply/${datasetId}`);
    return res.data;
  },

  // Auth
  login: async (nombre_usuario, contrasena) => {
    const res = await axios.post(`${API_BASE}/auth/login`, { nombre_usuario, contrasena });
    return res.data;
  },

  logout: async (nombre_usuario) => {
    const res = await axios.post(`${API_BASE}/auth/logout`, { nombre_usuario });
    return res.data;
  },

  getAccesos: async (limit = 200) => {
    const res = await axios.get(`${API_BASE}/auth/accesos`, { params: { limit } });
    return res.data;
  },

  getUsuarios: async () => {
    const res = await axios.get(`${API_BASE}/usuarios`);
    return res.data;
  },

  createUsuario: async (payload) => {
    const res = await axios.post(`${API_BASE}/usuarios`, payload);
    return res.data;
  },

  // Hito 2 Analytics
  getAnalyticsFilters: async (datasetId, userRegion = null) => {
    const res = await axios.get(`${API_BASE}/analytics/${datasetId}/filters`, {
      params: { user_region: userRegion || undefined }
    });
    return res.data;
  },

  getTablero: async (datasetId, { anioInicio, anioFin, region, userRegion } = {}) => {
    const res = await axios.get(`${API_BASE}/analytics/${datasetId}/tablero`, {
      params: {
        anio_inicio: anioInicio || undefined,
        anio_fin: anioFin || undefined,
        region: region || undefined,
        user_region: userRegion || undefined
      }
    });
    return res.data;
  },

  getExploracion: async (datasetId, { anioInicio, anioFin, region, mes, userRegion } = {}) => {
    const res = await axios.get(`${API_BASE}/analytics/${datasetId}/exploracion`, {
      params: {
        anio_inicio: anioInicio || undefined,
        anio_fin: anioFin || undefined,
        region: region || undefined,
        mes: mes || undefined,
        user_region: userRegion || undefined
      }
    });
    return res.data;
  },

  getAlertas: async (datasetId, { anioInicio, anioFin, region, userRegion } = {}) => {
    const res = await axios.get(`${API_BASE}/analytics/${datasetId}/alertas`, {
      params: {
        anio_inicio: anioInicio || undefined,
        anio_fin: anioFin || undefined,
        region: region || undefined,
        user_region: userRegion || undefined
      }
    });
    return res.data;
  }
};
