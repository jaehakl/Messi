import axios from 'axios';
export const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
axios.defaults.withCredentials = true;

// === OAuth ===
//export async function fetchMe() {
//    return axios.get(`${API_URL}/auth/me`)
//    .then(res => res.data)
//    .catch(err => {
//        return null;
//    });
//
//}  
//export function startGoogleLogin() {
//  const returnTo = window.location.href;
//  // 백엔드로 바로 리다이렉트(백엔드가 구글로 다시 리다이렉트)
//  window.location.href = `${API_URL}/auth/google/start?return_to=${encodeURIComponent(returnTo)}`;
//}
//export async function logout() {
//  await fetch(`${API_URL}/auth/logout`, { method: "POST", credentials: "include" });
//}

// === Messi ===
export const messiHello = (name) => axios.get(`${API_URL}/messi/hello/${name}`);


// === Settings ===
export const settingsList = () => axios.get(`${API_URL}/settings/list`);
export const settingsDetail = (names) => axios.post(`${API_URL}/settings/detail`, names);

// === Users ===
export const usersListByFilter = (params) => axios.post(`${API_URL}/users/list/by_filter`, params);
export const createUser = (data) => axios.post(`${API_URL}/users/`, data);
export const getUser = (id) => axios.get(`${API_URL}/users/${id}`);
export const updateUser = (id, patch) => axios.patch(`${API_URL}/users/${id}`, patch);
export const deleteUser = (id) => axios.delete(`${API_URL}/users/${id}`);
export const bulkUpsertUsers = (rows) => axios.post(`${API_URL}/users/bulk/upsert`, { rows });
export const bulkUpdateUsers = (ids, patch) => axios.post(`${API_URL}/users/bulk/update`, { ids, patch });
export const bulkDeleteUsers = (ids) => axios.post(`${API_URL}/users/bulk/delete`, { ids });
