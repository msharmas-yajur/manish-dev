import { Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';
import { Dashboard } from '@features/dashboard';
import { Users } from '@features/users';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { AuthCallback } from './pages/AuthCallback';
import { CopilotProvider, CopilotSidebar } from './components/Copilot';
import './App.css';

/**
 * Main application layout component
 * Wraps the app with CopilotKit provider and includes the AI sidebar
 */
function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <CopilotProvider>
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
        <CopilotSidebar />
      </Box>
    </CopilotProvider>
  );
}

function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/" element={<Dashboard />} />
        <Route path="/users/*" element={<Users />} />
      </Routes>
    </AppLayout>
  );
}

export default App;
