import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { demoSnapshotFromLocation } from './demo-snapshot';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App initialSnapshot={demoSnapshotFromLocation(window.location)} />
  </StrictMode>
);
