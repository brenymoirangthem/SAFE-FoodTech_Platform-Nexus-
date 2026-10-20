import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import i18n from './i18n'
import { I18nextProvider } from 'react-i18next'

// --- PWA Service Worker Registration ---
// This replaces the old "unregister" code. It actively listens for app updates
// and ensures the app can work offline when the internet drops.
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() {
    // When you push new code to GitHub/Production, this prompts the user to update
    if (confirm('New emergency routing data is available. Reload app to update?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('SAFE FoodTech is now ready to work offline.')
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-slate-50 text-slate-400 font-sans">Loading SAFE...</div>}>
      <I18nextProvider i18n={i18n}>
        <App />
      </I18nextProvider>
    </Suspense>
  </React.StrictMode>,
)