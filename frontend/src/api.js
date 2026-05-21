import axios from "axios"

const BASE_URL = import.meta.env.VITE_API_URL || (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" ? "http://127.0.0.1:8000" : "https://arkive-ai-backend.onrender.com")

// Create Axios instance with base URL
const api = axios.create({ baseURL: BASE_URL })

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("arkive_token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// On 401 responses, clear stale credentials and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("arkive_token")
      localStorage.removeItem("arkive_user")
      // Trigger re-render by dispatching a custom event
      window.dispatchEvent(new Event("arkive_auth_expired"))
    }
    return Promise.reject(error)
  }
)

export default api
