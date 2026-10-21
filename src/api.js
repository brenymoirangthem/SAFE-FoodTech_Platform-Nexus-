import axios from "axios"

const API_BASE_URL =(import.meta.env.VITE_API_BASE_URL ||(import.meta.env.DEV?"http://localhost:8000":"https://safe-foodtech-api.onrender.com")
).replace(/\/$/, "");

const api = axios.create({
    baseURL:API_BASE_URL,
    timeout:15000,
});

export default api;