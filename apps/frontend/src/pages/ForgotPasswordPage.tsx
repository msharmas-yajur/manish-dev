import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  InputAdornment,
  Link,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Email,
  LocalHospital,
  ArrowBack,
  CheckCircleOutline,
} from '@mui/icons-material';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to send reset link');
      }

      setIsSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        minWidth: '1024px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 50%, #00897B 100%)',
      }}
    >
      <Card
        elevation={8}
        sx={{
          width: '100%',
          maxWidth: 480,
          mx: 4,
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ p: 5 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
            <LocalHospital sx={{ fontSize: 40, color: 'primary.main', mr: 1.5 }} />
            <Box>
              <Typography variant="h5" fontWeight={700} color="primary.main">
                Caladrius
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Health AI Studio
              </Typography>
            </Box>
          </Box>

          {!isSubmitted ? (
            <>
              <Typography variant="h5" fontWeight={600} gutterBottom>
                Forgot Password?
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                Enter your email address and we'll send you a link to reset your password.
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              <form onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                  sx={{ mb: 3 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email color="action" />
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={isLoading}
                  sx={{ py: 1.5, mb: 3 }}
                >
                  {isLoading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>

                <Button
                  fullWidth
                  variant="text"
                  startIcon={<ArrowBack />}
                  onClick={() => navigate('/login')}
                  sx={{ color: 'text.secondary' }}
                >
                  Back to Sign In
                </Button>
              </form>
            </>
          ) : (
            /* Success State */
            <Box sx={{ textAlign: 'center' }}>
              <CheckCircleOutline
                sx={{ fontSize: 64, color: 'success.main', mb: 2 }}
              />
              <Typography variant="h5" fontWeight={600} gutterBottom>
                Check Your Email
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                We've sent a password reset link to:
              </Typography>
              <Typography variant="body1" fontWeight={600} sx={{ mb: 3 }}>
                {email}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                The link will expire in 1 hour. If you don't see the email, check your spam folder.
              </Typography>

              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setIsSubmitted(false);
                  setEmail('');
                }}
                sx={{ mb: 2 }}
              >
                Try a Different Email
              </Button>

              <Button
                fullWidth
                variant="text"
                startIcon={<ArrowBack />}
                onClick={() => navigate('/login')}
                sx={{ color: 'text.secondary' }}
              >
                Back to Sign In
              </Button>
            </Box>
          )}

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 4, textAlign: 'center' }}
          >
            Remember your password?{' '}
            <Link
              component="button"
              onClick={() => navigate('/login')}
              underline="hover"
            >
              Sign in
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
