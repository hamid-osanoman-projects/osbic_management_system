import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Disable wheel scrolling on focused number inputs globally to prevent accidental value updates
document.addEventListener('wheel', (e) => {
  if (document.activeElement && (document.activeElement as HTMLInputElement).type === 'number') {
    e.preventDefault();
  }
}, { passive: false });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
