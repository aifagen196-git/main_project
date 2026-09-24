import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import AIFAGen from './AIFAGen.jsx'
import './index.css'
import { applyTheme, watchSystem } from './lib/theme.js'

// Before the first render, so a dark-mode user never sees a white flash.
applyTheme()
watchSystem(() => {})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AIFAGen />
    </BrowserRouter>
  </StrictMode>
)
