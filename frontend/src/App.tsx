import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PeoplePage } from './pages/PeoplePage';
import { ItemsPage } from './pages/ItemsPage';
import { SplitPage } from './pages/SplitPage';
import { SummaryPage } from './pages/SummaryPage';
import { RecordsPage } from './pages/RecordsPage';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = localStorage.getItem('spliteats_token');
  return token ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/people" element={<ProtectedRoute><PeoplePage /></ProtectedRoute>} />
        <Route path="/items" element={<ProtectedRoute><ItemsPage /></ProtectedRoute>} />
        <Route path="/split" element={<ProtectedRoute><SplitPage /></ProtectedRoute>} />
        <Route path="/summary/:id" element={<ProtectedRoute><SummaryPage /></ProtectedRoute>} />
        <Route path="/records" element={<ProtectedRoute><RecordsPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
