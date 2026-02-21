import { useState } from "react"
import Chat from "./components/Chat"
import Sidebar from "./components/Sidebar"
import "./App.css"

function App() {
  const [activeTab, setActiveTab] = useState("chat")

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="main-content">
        <Chat />
      </main>
    </div>
  )
}

export default App