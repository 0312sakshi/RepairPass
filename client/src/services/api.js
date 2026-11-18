const API_BASE = '/api';

/**
 * Helper to make API requests with optional authentication
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('repairpass_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  let data;
  try {
    data = await response.json();
  } catch (err) {
    data = { message: 'Unexpected server response format.' };
  }

  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (userData) => request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  registerTechnician: (userData) => request('/auth/register-technician', { method: 'POST', body: JSON.stringify(userData) }),
  getMe: () => request('/auth/me'),

  // Appliances
  getAppliances: () => request('/appliances'),
  getApplianceById: (id) => request(`/appliances/${id}`),
  createAppliance: (data) => request('/appliances', { method: 'POST', body: JSON.stringify(data) }),
  getApplianceHistory: (id) => request(`/appliances/${id}/history`),

  // Customer Requests
  getRequests: () => request('/requests'),
  getRequestById: (id) => request(`/requests/${id}`),
  createRequest: (data) => request('/requests', { method: 'POST', body: JSON.stringify(data) }),
  getCompletionOtp: (id) => request(`/requests/${id}/completion-otp`),
  verifyCompletion: (id, otp) => request(`/requests/${id}/verify-completion`, { method: 'POST', body: JSON.stringify({ otp }) }),
  regenerateOtp: (id) => request(`/requests/${id}/regenerate-otp`, { method: 'POST' }),
  getMyRecords: () => request('/requests/records/my'),

  // Technician Operations
  getTechnicianJobs: () => request('/technician/jobs'),
  getTechnicianJobById: (id) => request(`/technician/jobs/${id}`),
  acceptJob: (id) => request(`/technician/jobs/${id}/accept`, { method: 'POST' }),
  updateJobStatus: (id, status, note) => request(`/technician/jobs/${id}/status`, { method: 'POST', body: JSON.stringify({ status, note }) }),
  completeJob: (id, data) => request(`/technician/jobs/${id}/complete`, { method: 'POST', body: JSON.stringify(data) }),

  // Administrator Operations
  getAdminUsers: () => request('/admin/users'),
  getAdminTechnicians: () => request('/admin/technicians'),
  getAdminRequests: () => request('/admin/requests'),
  assignTechnician: (id, technicianId) => request(`/admin/requests/${id}/assign`, { method: 'POST', body: JSON.stringify({ technicianId }) })
};
