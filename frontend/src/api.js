import axios from "axios"

const BASE_URL = import.meta.env.VITE_API_URL || (
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:8000"
    : "https://arkive-ai-backend.onrender.com"
)

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

// On 401 responses, clear stale credentials and fire event so App.jsx logs out
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("arkive_token")
      localStorage.removeItem("arkive_user")
      window.dispatchEvent(new Event("arkive_auth_expired"))
    }
    return Promise.reject(error)
  }
)

// Named export for new code
export { api }

// Helper: extract user-facing error message
export function getErrorMessage(error) {
  if (error?.response?.data?.detail) {
    const detail = error.response.data.detail
    if (typeof detail === "string") return detail
    if (typeof detail === "object" && detail.message) return detail.message
    if (Array.isArray(detail)) return detail.map(d => d.msg).join(", ")
  }
  if (error?.message) return error.message
  return "An unexpected error occurred. Please try again."
}

// Poll a task status endpoint until complete/failed
export async function pollTaskStatus(
  statusUrl,
  { onProgress, intervalMs = 2000, timeoutMs = 300_000 } = {}
) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, intervalMs))
    const { data } = await api.get(statusUrl)
    if (onProgress) onProgress(data)
    if (data.status === "complete" || data.status === "failed") {
      return data
    }
  }
  throw new Error("Task timed out")
}

// Default export for backward compatibility
export default api
