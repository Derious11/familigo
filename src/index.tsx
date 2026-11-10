import React from 'react';
import ReactDOM from 'react-dom/client';
const PublicEntry = window.location.pathname.toLowerCase() === '/login'
  ? React.lazy(() => import('./pages/Login'))
  : React.lazy(() => import('./App'));
import './index.css';
import ErrorBoundary from './components/ErrorBoundary';
import PwaProvider from './pwa/PwaProvider';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Failed to find the root element");
}

import {startAnalyticsAfterContent, usePostHog} from './lib/analytics';
startAnalyticsAfterContent();
if (window.location.pathname.toLowerCase() === '/login') {
    const analytics = usePostHog();
    analytics.capture('app_opened', {route:'login',path:'/login'});
    analytics.capture('route_viewed', {route:'login',path:'/login'});
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
      <ErrorBoundary>
        <PwaProvider><React.Suspense fallback={<div role="status">Loading…</div>}><PublicEntry /></React.Suspense></PwaProvider>
      </ErrorBoundary>
  </React.StrictMode>
);
