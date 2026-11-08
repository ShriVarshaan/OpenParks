import axios from "axios"

// Set VITE_API_URL in frontend/.env to point at a different backend (see .env.example).
const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
    withCredentials: true,
})

API.interceptors.request.use((config) => {

  const token = localStorage.getItem("token")

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config

})

export default API