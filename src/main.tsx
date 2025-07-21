import { createRoot } from 'react-dom/client'
import { StrictMode } from 'react'
import App from './App.tsx'
import './index.css'
import { getRedirectUrl } from '@/lib/domain'

if (import.meta.env.PROD) {
  const redirectUrl = getRedirectUrl();
  if (redirectUrl) {
    console.log('redirecting to', redirectUrl);
    window.location.replace(redirectUrl);
  }
}

const container = document.getElementById("root");
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(<App />);
