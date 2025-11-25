import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import AppAdmin from './AppAdmin.jsx';
import './index.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { AuthProviderAdmin } from './AuthContextAdmin';
import Login from './Login.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AuthProviderAdmin>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/admin/*" element={<AppAdmin />} />
            <Route path="/*" element={<App />} />
          </Routes>
        </AuthProviderAdmin>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
