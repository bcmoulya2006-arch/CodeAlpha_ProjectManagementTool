/**
 * PulseBoard API Client
 */

const API = (() => {
  const BASE_URL = '/api';

  function getToken() {
    return localStorage.getItem('pulseboard_token');
  }

  function setToken(token) {
    if (token) {
      localStorage.setItem('pulseboard_token', token);
    } else {
      localStorage.removeItem('pulseboard_token');
    }
  }

  async function request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = { ...options, headers };

    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  }

  return {
    getToken,
    setToken,

    // Auth
    register: (userData) => request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
    login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    getMe: () => request('/auth/me'),
    getAllUsers: () => request('/auth/users'),

    // Projects
    getProjects: () => request('/projects'),
    getProjectById: (id) => request(`/projects/${id}`),
    createProject: (data) => request('/projects', { method: 'POST', body: JSON.stringify(data) }),
    deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
    addMember: (projectId, data) => request(`/projects/${projectId}/members`, { method: 'POST', body: JSON.stringify(data) }),

    // Tasks
    createTask: (data) => request('/tasks', { method: 'POST', body: JSON.stringify(data) }),
    getTaskDetails: (id) => request(`/tasks/${id}`),
    updateTask: (id, data) => request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    moveTask: (id, data) => request(`/tasks/${id}/move`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),

    // Comments
    addComment: (taskId, content) => request(`/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),
    deleteComment: (id) => request(`/comments/${id}`, { method: 'DELETE' })
  };
})();
