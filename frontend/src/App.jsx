import { useState } from 'react'
import {Route, Routes} from "react-router"
import HomePage from './pages/HomePage'
import {AccessibilityProvider} from './Contexts/AccessibilityContext'
import AccessibilityToggle from './Components/AccessibilityToggle'

function App() {
  const [count, setCount] = useState(0)

  return (
    <AccessibilityProvider>
      <div>
        <Routes>
          <Route path="/" element={<HomePage />}></Route>
        </Routes>
        <AccessibilityToggle />
      </div>
    </AccessibilityProvider>
  )
}

export default App
