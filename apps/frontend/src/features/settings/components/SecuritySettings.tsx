import { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AddIcon from '@mui/icons-material/Add';
import LogoutIcon from '@mui/icons-material/Logout';
import ComputerIcon from '@mui/icons-material/Computer';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import TabletIcon from '@mui/icons-material/Tablet';
import KeyIcon from '@mui/icons-material/Key';
import { useAuthContext } from '@features/auth';
import type {
  PasswordChangeRequest,
  ActiveSession,
  ApiKey,
} from '../types';

// Mock data for sessions
const MOCK_SESSIONS: ActiveSession[] = [
  {
    id: '1',
    deviceType: 'desktop',
    browser: 'Chrome 120',
    operatingSystem: 'macOS 14.2',
    ipAddress: '192.168.1.100',
    location: 'San Francisco, CA',
    lastActive: new Date().toISOString(),
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    isCurrent: true,
  },
  {
    id: '2',
    deviceType: 'mobile',
    browser: 'Safari 17',
    operatingSystem: 'iOS 17.2',
    ipAddress: '192.168.1.101',
    location: 'San Francisco, CA',
    lastActive: new Date(Date.now() - 3600000).toISOString(),
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    isCurrent: false,
  },
];

// Mock data for API keys
const MOCK_API_KEYS: ApiKey[] = [
  {
    id: '1',
    name: 'Production API Key',
    prefix: 'cldr_prod_****',
    permissions: ['patients:read', 'records:read'],
    lastUsed: new Date(Date.now() - 3600000).toISOString(),
    createdAt: new Date(Date.now() - 2592000000).toISOString(),
  },
  {
    id: '2',
    name: 'Development API Key',
    prefix: 'cldr_dev_****',
    permissions: ['patients:read', 'patients:write', 'records:read'],
    lastUsed: undefined,
    createdAt: new Date(Date.now() - 604800000).toISOString(),
  },
];

/**
 * Get device icon based on device type
 */
function getDeviceIcon(deviceType: ActiveSession['deviceType']) {
  switch (deviceType) {
    case 'desktop':
      return <ComputerIcon />;
    case 'mobile':
      return <PhoneIphoneIcon />;
    case 'tablet':
      return <TabletIcon />;
    default:
      return <ComputerIcon />;
  }
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  return `${diffDays} days ago`;
}

/**
 * SecuritySettings - Security management section
 * Handles password change, 2FA, sessions, and API keys
 */
export function SecuritySettings() {
  const { user } = useAuthContext();
  const isOAuthUser = (user as Record<string, unknown>)?.auth_provider === 'google';

  // Password form state
  const [passwordForm, setPasswordForm] = useState<PasswordChangeRequest>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // 2FA state
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState<ActiveSession[]>(MOCK_SESSIONS);
  const [revokeSessionId, setRevokeSessionId] = useState<string | null>(null);

  // API keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(MOCK_API_KEYS);
  const [newKeyDialogOpen, setNewKeyDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle password input changes
  const handlePasswordChange = useCallback(
    (field: keyof PasswordChangeRequest) =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        setPasswordForm((prev) => ({
          ...prev,
          [field]: event.target.value,
        }));
      },
    []
  );

  // Toggle password visibility
  const togglePasswordVisibility = useCallback(
    (field: 'current' | 'new' | 'confirm') => {
      setShowPasswords((prev) => ({
        ...prev,
        [field]: !prev[field],
      }));
    },
    []
  );

  // Handle password change submission
  const handlePasswordSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        setError('New passwords do not match');
        return;
      }

      if (passwordForm.newPassword.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // TODO: Implement API call to change password
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setSuccessMessage('Password changed successfully');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to change password'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [passwordForm]
  );

  // Handle 2FA toggle
  const handle2FAToggle = useCallback(async () => {
    setIsLoading(true);
    try {
      // TODO: Implement 2FA setup flow
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIs2FAEnabled(!is2FAEnabled);
      setSuccessMessage(
        is2FAEnabled
          ? 'Two-factor authentication disabled'
          : 'Two-factor authentication enabled'
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update 2FA settings'
      );
    } finally {
      setIsLoading(false);
    }
  }, [is2FAEnabled]);

  // Handle session revocation
  const handleRevokeSession = useCallback(async () => {
    if (!revokeSessionId) return;

    setIsLoading(true);
    try {
      // TODO: Implement API call to revoke session
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSessions((prev) => prev.filter((s) => s.id !== revokeSessionId));
      setSuccessMessage('Session revoked successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke session');
    } finally {
      setIsLoading(false);
      setRevokeSessionId(null);
    }
  }, [revokeSessionId]);

  // Handle API key creation
  const handleCreateApiKey = useCallback(async () => {
    if (!newKeyName.trim()) {
      setError('Please enter a name for the API key');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement API call to create key
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const newKey: ApiKey = {
        id: Date.now().toString(),
        name: newKeyName,
        prefix: 'cldr_new_****',
        permissions: ['patients:read'],
        createdAt: new Date().toISOString(),
      };
      setApiKeys((prev) => [...prev, newKey]);
      setSuccessMessage(
        'API key created. Make sure to copy the key now as it will not be shown again.'
      );
      setNewKeyDialogOpen(false);
      setNewKeyName('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create API key'
      );
    } finally {
      setIsLoading(false);
    }
  }, [newKeyName]);

  // Handle API key deletion
  const handleDeleteApiKey = useCallback(async () => {
    if (!deleteKeyId) return;

    setIsLoading(true);
    try {
      // TODO: Implement API call to delete key
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setApiKeys((prev) => prev.filter((k) => k.id !== deleteKeyId));
      setSuccessMessage('API key deleted successfully');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete API key'
      );
    } finally {
      setIsLoading(false);
      setDeleteKeyId(null);
    }
  }, [deleteKeyId]);

  // Handle copy to clipboard
  const handleCopyKey = useCallback((prefix: string) => {
    navigator.clipboard.writeText(prefix);
    setSuccessMessage('API key prefix copied to clipboard');
  }, []);

  // Handle snackbar close
  const handleCloseSnackbar = useCallback(() => {
    setSuccessMessage(null);
  }, []);

  return (
    <Box>
      {/* Password Change Section */}
      {!isOAuthUser && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Change Password
          </Typography>

          <Box
            component="form"
            onSubmit={handlePasswordSubmit}
            sx={{ maxWidth: 400 }}
          >
            <TextField
              label="Current Password"
              type={showPasswords.current ? 'text' : 'password'}
              value={passwordForm.currentPassword}
              onChange={handlePasswordChange('currentPassword')}
              fullWidth
              required
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={() => togglePasswordVisibility('current')}
                    edge="end"
                  >
                    {showPasswords.current ? (
                      <VisibilityOffIcon />
                    ) : (
                      <VisibilityIcon />
                    )}
                  </IconButton>
                ),
              }}
            />
            <TextField
              label="New Password"
              type={showPasswords.new ? 'text' : 'password'}
              value={passwordForm.newPassword}
              onChange={handlePasswordChange('newPassword')}
              fullWidth
              required
              sx={{ mb: 2 }}
              helperText="At least 8 characters"
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={() => togglePasswordVisibility('new')}
                    edge="end"
                  >
                    {showPasswords.new ? (
                      <VisibilityOffIcon />
                    ) : (
                      <VisibilityIcon />
                    )}
                  </IconButton>
                ),
              }}
            />
            <TextField
              label="Confirm New Password"
              type={showPasswords.confirm ? 'text' : 'password'}
              value={passwordForm.confirmPassword}
              onChange={handlePasswordChange('confirmPassword')}
              fullWidth
              required
              sx={{ mb: 2 }}
              error={
                passwordForm.confirmPassword !== '' &&
                passwordForm.newPassword !== passwordForm.confirmPassword
              }
              helperText={
                passwordForm.confirmPassword !== '' &&
                passwordForm.newPassword !== passwordForm.confirmPassword
                  ? 'Passwords do not match'
                  : ''
              }
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={() => togglePasswordVisibility('confirm')}
                    edge="end"
                  >
                    {showPasswords.confirm ? (
                      <VisibilityOffIcon />
                    ) : (
                      <VisibilityIcon />
                    )}
                  </IconButton>
                ),
              }}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={isLoading}
              startIcon={
                isLoading ? <CircularProgress size={20} color="inherit" /> : null
              }
            >
              {isLoading ? 'Updating...' : 'Update Password'}
            </Button>
          </Box>
        </Paper>
      )}

      {/* OAuth Notice */}
      {isOAuthUser && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'grey.50',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Password Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You signed in with Google. Password is managed by your Google
            account.
          </Typography>
        </Paper>
      )}

      {/* Two-Factor Authentication Section */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              Two-Factor Authentication
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add an extra layer of security to your account by requiring a
              verification code in addition to your password.
            </Typography>
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={is2FAEnabled}
                onChange={handle2FAToggle}
                disabled={isLoading}
              />
            }
            label={is2FAEnabled ? 'Enabled' : 'Disabled'}
            labelPlacement="start"
          />
        </Box>
      </Paper>

      {/* Active Sessions Section */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Active Sessions
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          These are the devices currently logged into your account.
        </Typography>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Device</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Last Active</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getDeviceIcon(session.deviceType)}
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {session.browser} on {session.operatingSystem}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {session.ipAddress}
                        </Typography>
                      </Box>
                      {session.isCurrent && (
                        <Chip
                          label="Current"
                          size="small"
                          color="success"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{session.location || 'Unknown'}</TableCell>
                  <TableCell>{formatRelativeTime(session.lastActive)}</TableCell>
                  <TableCell align="right">
                    {!session.isCurrent && (
                      <Tooltip title="Revoke session">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setRevokeSessionId(session.id)}
                        >
                          <LogoutIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* API Keys Section */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              API Keys
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage API keys for programmatic access to Caladrius.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setNewKeyDialogOpen(true)}
          >
            Create New Key
          </Button>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Key</TableCell>
                <TableCell>Last Used</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {apiKeys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <KeyIcon color="action" fontSize="small" />
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {key.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: 'monospace' }}
                      >
                        {key.prefix}
                      </Typography>
                      <Tooltip title="Copy key prefix">
                        <IconButton
                          size="small"
                          onClick={() => handleCopyKey(key.prefix)}
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {key.lastUsed
                      ? formatRelativeTime(key.lastUsed)
                      : 'Never used'}
                  </TableCell>
                  <TableCell>{formatRelativeTime(key.createdAt)}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Delete key">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setDeleteKeyId(key.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {apiKeys.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No API keys created yet
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert
          severity="error"
          sx={{ mt: 2 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Revoke Session Dialog */}
      <Dialog
        open={!!revokeSessionId}
        onClose={() => setRevokeSessionId(null)}
      >
        <DialogTitle>Revoke Session</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to revoke this session? The device will be
            logged out immediately.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeSessionId(null)}>Cancel</Button>
          <Button
            onClick={handleRevokeSession}
            color="error"
            variant="contained"
            disabled={isLoading}
          >
            Revoke
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create API Key Dialog */}
      <Dialog
        open={newKeyDialogOpen}
        onClose={() => setNewKeyDialogOpen(false)}
      >
        <DialogTitle>Create API Key</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Give your API key a descriptive name to identify its purpose.
          </DialogContentText>
          <TextField
            autoFocus
            label="Key Name"
            fullWidth
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="e.g., Production API Key"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewKeyDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateApiKey}
            variant="contained"
            disabled={isLoading}
          >
            Create Key
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete API Key Dialog */}
      <Dialog open={!!deleteKeyId} onClose={() => setDeleteKeyId(null)}>
        <DialogTitle>Delete API Key</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this API key? Any applications
            using this key will no longer be able to access the API.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteKeyId(null)}>Cancel</Button>
          <Button
            onClick={handleDeleteApiKey}
            color="error"
            variant="contained"
            disabled={isLoading}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity="success"
          variant="filled"
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
