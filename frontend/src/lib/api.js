import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL + '/api',
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

function setToken(token) {
  if (token) {
    client.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete client.defaults.headers.common.Authorization;
}

async function get(path) {
  const response = await client.get(path);
  return response.data;
}

async function post(path, payload) {
  const response = await client.post(path, payload);
  return response.data;
}

async function patch(path, payload) {
  const response = await client.patch(path, payload);
  return response.data;
}

async function put(path, payload) {
  const response = await client.put(path, payload);
  return response.data;
}

async function remove(path) {
  const response = await client.delete(path);
  return response.data;
}

export default {
  get,
  post,
  patch,
  put,
  delete: remove,
  setToken,
};
