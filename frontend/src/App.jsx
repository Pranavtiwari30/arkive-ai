import { useState } from "react"
import Chat from "./components/Chat"
import Sidebar from "./components/Sidebar"
import Documents from "./components/Documents"
import AuditLogs from "./components/AuditLogs"
import Login from "./components/Login"
import "./App.css"

function App() {
  const [activeTab, setActiveTab] = useState("chat")
  const [user, setUser] = useState(null)

  const handleLogin = (username) => {
    setUser(username)
  }

  const handleLogout = () => {
    setUser(null)
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  const renderTab = () => {
    switch(activeTab) {
      case "chat": return <Chat userId={user} />
      case "docs": return <Documents />
      case "audit": return <AuditLogs userId={user} />
      default: return <Chat userId={user} />
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
      <main className="main-content">
        {renderTab()}
      </main>
    </div>
  )
}

export default App