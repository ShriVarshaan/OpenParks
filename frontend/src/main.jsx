import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './high-contrast.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router'
import {AccessibilityProvider} from './context/AccessibilityContext'
import { Toaster } from 'react-hot-toast'
createRoot(document.getElementById('root')).render(
  <AccessibilityProvider>
  <BrowserRouter>
  <StrictMode>
    <div><Toaster /></div>
    <App />
  </StrictMode>
  </BrowserRouter>
  </AccessibilityProvider>
)
