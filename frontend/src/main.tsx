import { createRoot } from 'react-dom/client'
import './App.css'
import App from './App.tsx'

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found!');
  }
  
  const root = createRoot(rootElement);
  root.render(<App />);
} catch (error) {
  console.error('[main.tsx] Error mounting React app:', error);
}
