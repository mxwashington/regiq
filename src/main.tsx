import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { getRedirectUrl } from '@/lib/domain'

// Temporarily disabled redirect for testing search fixes
// if (import.meta.env.PROD) {
//   const redirectUrl = getRedirectUrl();
//   if (redirectUrl) {
//     console.log('redirecting to', redirectUrl);
//     window.location.replace(redirectUrl);
//   }
// }

createRoot(document.getElementById("root")!).render(<App />);
