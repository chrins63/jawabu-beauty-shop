import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

if (import.meta.hot) {
  import.meta.hot.on('vite:error', () => {
    window.setTimeout(() => {
      window.location.reload()
    }, 500)
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)