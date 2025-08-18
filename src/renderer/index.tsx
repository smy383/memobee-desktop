import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { uiLogger } from '../shared/utils/logger';

uiLogger.info('🚀 MemoBee Desktop 시작!');

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Hot Module Replacement (개발 모드)
declare const module: any;
if (module.hot && window.memobeeDesktop && window.memobeeDesktop.isDevelopment) {
  module.hot.accept();
}