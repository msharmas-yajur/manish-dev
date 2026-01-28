import { Routes, Route } from 'react-router-dom';
import { Box, Toolbar } from '@mui/material';
import { Dashboard } from '@features/dashboard';
import { Users } from '@features/users';
import { PatientList } from '@features/patients';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { AuthCallback } from './pages/AuthCallback';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, SIDEBAR_WIDTH } from './components/layout/Sidebar';
// CopilotKit integration disabled for now
// import { CopilotProvider, CopilotSidebar } from './components/Copilot';
import './App.css';

/**
 * MainLayout component - Layout for authenticated pages
 * Includes Navbar at top, Sidebar on left, and main content area
 */
function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Navbar />
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          ml: `${SIDEBAR_WIDTH}px`,
          bgcolor: 'grey.100',
          minHeight: '100vh',
        }}
      >
        {/* Spacer for fixed navbar */}
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}

/**
 * Main application layout component
 * CopilotKit integration disabled for now
 */
function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        minWidth: '1024px', // Desktop-only constraint
      }}
    >
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function App() {
  return (
    <AppLayout>
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
        </Route>
      </Routes>
    </AppLayout>
  );
}

export default App;
