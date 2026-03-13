import { useState } from 'react'
import {Route, Routes} from "react-router"
import HomePage from './pages/HomePage'
import {AccessibilityProvider} from './context/AccessibilityContext'
import AccessibilityToggle from './components/AccessibilityToggle'
import ReportPage from './pages/ReportPage'
import LoginPage from './pages/LoginPage'

function App() {
  const [count, setCount] = useState(0)

  return (
      <div>
        <Routes>
          <Route path="/" element={<HomePage />}></Route>
          <Route path="/report" element={<ReportPage />}></Route>
          <Route path="/login" element={<LoginPage />}></Route>
        </Routes>
        <AccessibilityToggle />
      </div>
  )
}

export default App
