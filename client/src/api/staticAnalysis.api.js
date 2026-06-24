import api from './client';

export const getStaticAnalysis = (projectId) =>
  api.get(`/static-analysis/${projectId}`);

export const getDifficultyAnalysis = (projectId) =>
  api.get(`/static-analysis/${projectId}/difficulty`);
