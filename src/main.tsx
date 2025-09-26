import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { getRedirectUrl } from '@/lib/domain'

// Temporarily disabled redirect for testing search fixes
// if (import.meta.env.PROD) {
//   const redirectUrl = getRedirectUrl();
import { logger } from '@/lib/logger';
//   if (redirectUrl) {
//     logger.info('redirecting to', redirectUrl);
//     window.location.replace(redirectUrl);
//   }
// }

createRoot(document.getElementById("root")!).render(<App />);
