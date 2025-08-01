import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
// import { configureSentry } from './utils/sentry-config.tsx'

// Initialize Sentry before rendering the app
// configureSentry();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)