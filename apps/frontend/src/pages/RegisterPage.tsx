import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  Link,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Person,
  LocalHospital,
  Google,
} from '@mui/icons-material';

export function RegisterPage() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  // Check if Google OAuth is available
  useEffect(() => {
    const checkProviders = async () => {
      try {
        const response = await fetch('/api/auth/providers');
        const data = await response.json();
        if (data.success && data.data?.providers?.google) {
          setGoogleEnabled(true);
        }
      } catch {
        // Google OAuth not available
      }
    };
    checkProviders();

    // Check for error in URL params (from failed OAuth)
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');
    if (errorParam === 'google_auth_failed') {
      setError('Google authentication failed. Please try again.');
    }
  }, []);

  const handleGoogleSignUp = () => {
    setIsGoogleLoading(true);
    setError(null);
    // Redirect to BFF Google OAuth endpoint
    // Google OAuth will create account if user doesn't exist
    window.location.href = '/api/auth/google';
  };

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
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName, lastName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Registration failed');
      }

      // Store token and redirect
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      navigate('/');
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
        background: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 50%, #00897B 100%)',
      }}
    >
      {/* Left Panel - Branding */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 8,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <LocalHospital sx={{ fontSize: 64, mr: 2 }} />
          <Box>
            <Typography variant="h3" fontWeight={700} sx={{ letterSpacing: '-0.02em' }}>
              Caladrius
            </Typography>
            <Typography variant="h5" fontWeight={400} sx={{ opacity: 0.9 }}>
              Health AI Studio
            </Typography>
          </Box>
        </Box>

        <Typography
          variant="h6"
          sx={{
            maxWidth: 480,
            textAlign: 'center',
            opacity: 0.9,
            lineHeight: 1.6,
            mb: 4,
          }}
        >
          Join thousands of healthcare professionals using AI-driven insights
          to deliver better patient care.
        </Typography>

        <Box sx={{ display: 'flex', gap: 4, mt: 4 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" fontWeight={700}>
              HIPAA
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Compliant
            </Typography>
          </Box>
          <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" fontWeight={700}>
              AI
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Powered
            </Typography>
          </Box>
          <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" fontWeight={700}>
              24/7
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Available
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Right Panel - Registration Form */}
      <Box
        sx={{
          width: 560,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          borderTopLeftRadius: 32,
          borderBottomLeftRadius: 32,
          overflowY: 'auto',
        }}
      >
        <Card
          elevation={0}
          sx={{
            width: '100%',
            maxWidth: 440,
            mx: 4,
            my: 4,
            bgcolor: 'transparent',
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" fontWeight={600} gutterBottom>
              Create Account
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Get started with Caladrius Health AI
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {/* Google Sign Up Button - Show first for convenience */}
            {googleEnabled && (
              <>
                <Button
                  fullWidth
                  variant="outlined"
                  size="large"
                  disabled={isLoading || isGoogleLoading}
                  onClick={handleGoogleSignUp}
                  startIcon={isGoogleLoading ? <CircularProgress size={20} /> : <Google />}
                  sx={{
                    py: 1.5,
                    mb: 2,
                    borderColor: '#4285F4',
                    color: '#4285F4',
                    '&:hover': {
                      borderColor: '#357ABD',
                      backgroundColor: 'rgba(66, 133, 244, 0.04)',
                    },
                  }}
                >
                  {isGoogleLoading ? 'Redirecting...' : 'Sign up with Google'}
                </Button>

                <Divider sx={{ my: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    OR
                  </Typography>
                </Divider>
              </>
            )}

            <form onSubmit={handleSubmit}>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoComplete="given-name"
                  autoFocus={!googleEnabled}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  fullWidth
                  label="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  autoComplete="family-name"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email color="action" />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                sx={{ mb: 2 }}
                helperText="Must be at least 6 characters"
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

              <TextField
                fullWidth
                label="Confirm Password"
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
                disabled={isLoading || isGoogleLoading}
                sx={{
                  py: 1.5,
                  mb: 3,
                  fontSize: '1rem',
                }}
              >
                {isLoading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  'Create Account'
                )}
              </Button>

              <Divider sx={{ my: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  ALREADY HAVE AN ACCOUNT?
                </Typography>
              </Divider>

              <Button
                fullWidth
                variant="outlined"
                size="large"
                sx={{ py: 1.5 }}
                onClick={() => navigate('/login')}
              >
                Sign In
              </Button>
            </form>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 3, textAlign: 'center' }}
            >
              By creating an account, you agree to our{' '}
              <Link href="/terms" underline="hover">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" underline="hover">
                Privacy Policy
              </Link>
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
