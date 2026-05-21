import { useState, useEffect } from "react"
import Chat from "./components/Chat"
import Sidebar from "./components/Sidebar"
import Documents from "./components/Documents"
import AuditLogs from "./components/AuditLogs"
import AuthPage from "./components/AuthPage"
import ComplianceCheck from "./components/ComplianceCheck"
import RedTeam from "./components/RedTeam"
import RiskTier from "./components/RiskTier"
import RoleClassifier from "./components/RoleClassifier"
import "./App.css"

function App() {
  const [activeTab, setActiveTab] = useState("chat")

  // Restore user from localStorage on page reload
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("arkive_user")
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const handleLogout = () => {
    localStorage.removeItem("arkive_token")
    localStorage.removeItem("arkive_user")
    setUser(null)
  }

  // Listen for token expiry events (fired by api.js interceptor)
  useEffect(() => {
    const handleExpiry = () => handleLogout()
    window.addEventListener("arkive_auth_expired", handleExpiry)
    return () => window.removeEventListener("arkive_auth_expired", handleExpiry)
  }, [])

  const handleAuthSuccess = (userData) => setUser(userData)

  // Show auth page if not logged in
  if (!user) return <AuthPage onAuthSuccess={handleAuthSuccess} />

  const userId = user.user_id

  const renderTab = () => {
    switch (activeTab) {
      case "chat":       return <Chat userId={userId} />
      case "compliance": return <ComplianceCheck userId={userId} />
      case "risktier":   return <RiskTier />
      case "roleclassifier": return <RoleClassifier />
      case "docs":       return <Documents />
      case "audit":      return <AuditLogs userId={userId} />
      case "redteam":    return <RedTeam />
      default:           return <Chat userId={userId} />
    }
  }

  return (
    <div className="app-container">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
      />
      <main className="main-content">{renderTab()}</main>
    </div>
  )
}

export default App