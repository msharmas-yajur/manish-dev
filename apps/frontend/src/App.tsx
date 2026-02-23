import { Routes, Route } from 'react-router-dom';
import { Dashboard } from '@features/dashboard';
import { Users } from '@features/users';
import { PatientList } from '@features/patients';
import { SettingsPage } from '@features/settings';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { AuthCallback } from './pages/AuthCallback';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { MainLayout } from './components/layout/MainLayout';
import './App.css';

function App() {
  return (
    <Routes>
      {/* Public routes - No authentication required */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Protected routes - Authentication required */}
      <Route element={<ProtectedRoute />}>
        <Route
          path="/"
          element={
            <MainLayout>
              <PatientList />
            </MainLayout>
          }
        />
        <Route
          path="/patients"
          element={
            <MainLayout>
              <PatientList />
            </MainLayout>
          }
        />
        <Route
          path="/dashboard"
          element={
            <MainLayout>
              <Dashboard />
            </MainLayout>
          }
        />
        <Route
          path="/users/*"
          element={
            <MainLayout>
              <Users />
            </MainLayout>
          }
        />
        <Route
          path="/settings"
          element={
            <MainLayout>
              <SettingsPage />
            </MainLayout>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
