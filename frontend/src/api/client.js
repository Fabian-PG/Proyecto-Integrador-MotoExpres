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

  deleteDataset: async (datasetId) => {
    const res = await axios.delete(`${API_BASE}/datasets/${datasetId}`);
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
  }
};
