import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import {
  Lock,
  Visibility,
  VisibilityOff,
  LocalHospital,
  CheckCircleOutline,
  ErrorOutline,
} from '@mui/icons-material';

// Password strength indicator
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  if (score <= 1) return { score: 20, label: 'Weak', color: 'error.main' };
  if (score <= 2) return { score: 40, label: 'Fair', color: 'warning.main' };
  if (score <= 3) return { score: 60, label: 'Good', color: 'info.main' };
  if (score <= 4) return { score: 80, label: 'Strong', color: 'success.light' };
  return { score: 100, label: 'Very Strong', color: 'success.main' };
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('No reset token provided. Please request a new password reset link.');
        setIsVerifying(false);
        return;
      }

      try {
        const response = await fetch(`/api/auth/verify-reset-token/${token}`);
        const data = await response.json();

        if (data.success) {
          setIsTokenValid(true);
          setUserEmail(data.data.email);
        } else {
          setError(data.error?.message || 'Invalid or expired reset link. Please request a new one.');
        }
      } catch {
        setError('Failed to verify reset link. Please try again.');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to reset password');
      }

      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(password);

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

          {/* Loading State */}
          {isVerifying && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress size={48} sx={{ mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                Verifying your reset link...
              </Typography>
            </Box>
          )}

          {/* Invalid Token State */}
          {!isVerifying && !isTokenValid && !isSuccess && (
            <Box sx={{ textAlign: 'center' }}>
              <ErrorOutline
                sx={{ fontSize: 64, color: 'error.main', mb: 2 }}
              />
              <Typography variant="h5" fontWeight={600} gutterBottom>
                Invalid Reset Link
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                {error || 'This password reset link is invalid or has expired.'}
              </Typography>

              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={() => navigate('/forgot-password')}
                sx={{ py: 1.5, mb: 2 }}
              >
                Request New Reset Link
              </Button>

              <Button
                fullWidth
                variant="text"
                onClick={() => navigate('/login')}
                sx={{ color: 'text.secondary' }}
              >
                Back to Sign In
              </Button>
            </Box>
          )}

          {/* Reset Form */}
          {!isVerifying && isTokenValid && !isSuccess && (
            <>
              <Typography variant="h5" fontWeight={600} gutterBottom>
                Create New Password
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                Enter a new password for:
              </Typography>
              <Typography variant="body1" fontWeight={600} sx={{ mb: 3 }}>
                {userEmail}
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              <form onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="New Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  autoFocus
                  sx={{ mb: 1 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                {/* Password Strength Indicator */}
                {password && (
                  <Box sx={{ mb: 2 }}>
                    <LinearProgress
                      variant="determinate"
                      value={passwordStrength.score}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: passwordStrength.color,
                        },
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{ color: passwordStrength.color, mt: 0.5, display: 'block' }}
                    >
                      Password strength: {passwordStrength.label}
                    </Typography>
                  </Box>
                )}

                <TextField
                  fullWidth
                  label="Confirm New Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  sx={{ mb: 3 }}
                  error={confirmPassword.length > 0 && password !== confirmPassword}
                  helperText={
                    confirmPassword.length > 0 && password !== confirmPassword
                      ? 'Passwords do not match'
                      : ''
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={isLoading || password !== confirmPassword}
                  sx={{ py: 1.5 }}
                >
                  {isLoading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'Reset Password'
                  )}
                </Button>
              </form>
            </>
          )}

          {/* Success State */}
          {isSuccess && (
            <Box sx={{ textAlign: 'center' }}>
              <CheckCircleOutline
                sx={{ fontSize: 64, color: 'success.main', mb: 2 }}
              />
              <Typography variant="h5" fontWeight={600} gutterBottom>
                Password Reset Complete
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                Your password has been successfully reset. You can now sign in with your new password.
              </Typography>

              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={() => navigate('/login')}
                sx={{ py: 1.5 }}
              >
                Sign In
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
