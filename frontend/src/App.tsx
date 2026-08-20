import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AddMatterProvider } from './context/AddMatterContext';
import { AppLayout } from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import BoardPage from './pages/BoardPage';
import KanbanPage from './pages/KanbanPage';
import CalendarPage from './pages/CalendarPage';
import AutomationsPage from './pages/AutomationsPage';
import ReceiptsPage from './pages/ReceiptsPage';
import CalculatorPage from './pages/CalculatorPage';
import SettingsPage from './pages/SettingsPage';

const qc = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<ProtectedRoute><AddMatterProvider><AppLayout /></AddMatterProvider></ProtectedRoute>}>
              <Route index element={<Navigate to="/board" replace />} />
              <Route path="board" element={<BoardPage />} />
              <Route path="kanban" element={<KanbanPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="automations" element={<AutomationsPage />} />
              <Route path="receipts" element={<ReceiptsPage />} />
              <Route path="calculator" element={<CalculatorPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
