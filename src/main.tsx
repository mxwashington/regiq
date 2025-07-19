import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { getCurrentDomain } from '@/lib/domain'

if (typeof window !== 'undefined') {
  const target = getCurrentDomain();
  if (window.location.href !== target) {
    window.location.replace(target);
  }
}

createRoot(document.getElementById("root")!).render(<App />);
