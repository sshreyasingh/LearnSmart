import api from '../api/client';

export const uploadProjectZip = (formData) =>
  api.post('/projects', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const uploadProjectFromGitHub = (owner, repo, projectName) =>
  api.post('/projects', {
    uploadMethod: 'github',
    owner,
    repo,
    projectName,
  });

export const uploadProjectFromUrl = (repoUrl, projectName) =>
  api.post('/projects', {
    uploadMethod: 'url',
    repoUrl,
    projectName,
  });

export const getProjects = (page = 1, limit = 10) =>
  api.get('/projects', { params: { page, limit } });

export const getProject = (id) => api.get(`/projects/${id}`);

export const deleteProject = (id) => api.delete(`/projects/${id}`);

export const getGitHubRepos = (page = 1) =>
  api.get('/projects/github-repos', { params: { page } });
