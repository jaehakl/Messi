import axios from 'axios';
export const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
axios.defaults.withCredentials = true;


// === Images ===
export const imagesUpload = (listImageData) => {
    const formData = new FormData();
    listImageData.forEach(imageData => {
        Object.keys(imageData).forEach(key => {
            formData.append(key, imageData[key]);
        });
    });
    return axios.post(`${API_URL}/images/upload`, formData, 
        {headers: { "Content-Type": "multipart/form-data" },});
}
export const imagesRead = (filterData) => axios.post(`${API_URL}/images/read`, filterData);
export const imagesDelete = (imageIds) => axios.post(`${API_URL}/images/delete`, imageIds);


// === Users ===
export const usersRead = (filterData) => axios.post(`${API_URL}/users/read`, filterData);
export const usersUpsert = (listUserData) => axios.post(`${API_URL}/users/upsert`, listUserData);
export const usersDelete = (userIds) => axios.post(`${API_URL}/users/delete`, userIds);

//=== OAuth ===
export async function fetchMe() {return axios.get(`${API_URL}/auth/me`).then(res => res.data).catch(err => {return null;});}  
export function startGoogleLogin() {const returnTo = window.location.href;window.location.href = `${API_URL}/auth/google/start?return_to=${encodeURIComponent(returnTo)}`;}// 백엔드로 바로 리다이렉트(백엔드가 구글로 다시 리다이렉트)
export async function logout() {await fetch(`${API_URL}/auth/logout`, { method: "POST", credentials: "include" });}
