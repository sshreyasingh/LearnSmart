import api from './client';

export const getInterviewQuestions = (projectId) => api.get(`/interview/${projectId}`);
export const regenerateInterviewQuestions = (projectId) => api.post(`/interview/${projectId}/regenerate`);
