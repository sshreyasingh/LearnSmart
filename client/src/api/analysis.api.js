import api from './client';

export const getProjectAnalysis = (projectId) =>
  api.get(`/analysis/${projectId}`);

export const getNotes = (projectId) =>
  api.get(`/analysis/${projectId}/notes`);

export const saveNotes = (projectId, notes) =>
  api.put(`/analysis/${projectId}/notes`, { notes });
