import axios from 'axios';

// ← Replace with your Railway URL after deploy
export const API_URL = 'https://your-app.up.railway.app';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Auth ───────────────────────────────────────────────────────────────────
export const register = (data) => api.post('/register', data).then(r => r.data);
export const login    = (email, password) => api.post('/login', { email, password }).then(r => r.data);

// ── Expenses ───────────────────────────────────────────────────────────────
export const addExpense  = (data) => api.post('/expenses', data).then(r => r.data);
export const getExpenses = (userId, limit = 50) =>
  api.get(`/expenses/${userId}`, { params: { limit } }).then(r => r.data);

// ── Social ─────────────────────────────────────────────────────────────────
export const getFeed   = (params) => api.get('/social/feed', { params }).then(r => r.data);
export const createPost = (data)  => api.post('/social/post', data).then(r => r.data);
export const likePost  = (postId, userId) =>
  api.post(`/social/like/${postId}`, null, { params: { user_id: userId } }).then(r => r.data);

// ── Chat ───────────────────────────────────────────────────────────────────
export const sendChatMessage = (data) => api.post('/chat', data).then(r => r.data);

export default api;
