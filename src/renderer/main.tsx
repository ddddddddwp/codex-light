import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { demoSnapshotFromLocation } from './demo-snapshot';
import { SettingsApp } from './SettingsApp';

const isSettingsView = new URLSearchParams(window.location.search).get('view') === 'settings';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isSettingsView ? <SettingsApp /> : <App initialSnapshot={demoSnapshotFromLocation(window.location)} />}
  </StrictMode>
);
