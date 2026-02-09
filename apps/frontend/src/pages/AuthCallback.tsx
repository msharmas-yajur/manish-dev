import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { useAuthContext } from '@features/auth';

export function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const { setAuth } = useAuthContext();
  const hasRun = useRef(false);

  useEffect(() => {
    // Prevent double-execution in React 18 StrictMode
    if (hasRun.current) return;
    hasRun.current = true;

    const token = searchParams.get('token');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError('Authentication failed. Please try again.');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    if (token) {
      // Fetch user info using the token from the URL
      fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) {
            // Update AuthContext state + localStorage atomically
            setAuth(token, data.data);
            // Navigate via React Router (no full page reload needed)
            navigate('/patients', { replace: true });
          } else {
            setError('Failed to fetch user information.');
            setTimeout(() => navigate('/login'), 3000);
          }
        })
        .catch(() => {
          setError('Failed to complete authentication.');
          setTimeout(() => navigate('/login'), 3000);
        });
    } else {
      setError('No authentication token received.');
      setTimeout(() => navigate('/login'), 3000);
    }
  }, [navigate, searchParams, setAuth]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 50%, #00897B 100%)',
      }}
    >
      <Box
        sx={{
          bgcolor: 'white',
          p: 4,
          borderRadius: 2,
          textAlign: 'center',
          minWidth: 300,
        }}
      >
        {error ? (
          <>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
            <Typography variant="body2" color="text.secondary">
              Redirecting to login...
            </Typography>
          </>
        ) : (
          <>
            <CircularProgress size={48} sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Completing Sign In
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please wait while we set up your session...
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
}
