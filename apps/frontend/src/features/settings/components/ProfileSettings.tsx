import { useState, useCallback, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  IconButton,
  MenuItem,
  Alert,
  Snackbar,
  CircularProgress,
  Tooltip,
  Chip,
} from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import LockIcon from '@mui/icons-material/Lock';
import { useAuthContext } from '@features/auth';
import type { UpdateProfileRequest } from '../types';
import { TIMEZONE_OPTIONS } from '../types';

/**
 * ProfileSettings - User profile management section
 * Handles avatar upload, personal info, and timezone preferences
 */
export function ProfileSettings() {
  const { user } = useAuthContext();

  // Form state
  const [formData, setFormData] = useState<UpdateProfileRequest>({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    organization: '',
    department: '',
    timezone: 'America/New_York',
  });

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check if email is from OAuth (read-only)
  const isOAuthUser = user?.auth_provider === 'google';

  // Handle input changes
  const handleInputChange = useCallback(
    (field: keyof UpdateProfileRequest) =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({
          ...prev,
          [field]: event.target.value,
        }));
      },
    []
  );

  // Handle avatar upload click
  const handleAvatarClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle avatar file selection
  const handleAvatarChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          setError('Please select an image file');
          return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          setError('Image must be less than 5MB');
          return;
        }

        setAvatarFile(file);
        setAvatarUrl(URL.createObjectURL(file));
      }
    },
    []
  );

  // Handle avatar removal
  const handleRemoveAvatar = useCallback(() => {
    setAvatarFile(null);
    setAvatarUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setIsSaving(true);
      setError(null);

      try {
        // TODO: Implement API call to update profile
        // await settingsService.updateProfile(formData, avatarFile);

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));

        setSuccessMessage('Profile updated successfully');
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to update profile'
        );
      } finally {
        setIsSaving(false);
      }
    },
    [formData]
  );

  // Handle snackbar close
  const handleCloseSnackbar = useCallback(() => {
    setSuccessMessage(null);
  }, []);

  // Get user initials for avatar fallback
  const getInitials = () => {
    const first = formData.firstName?.[0] || user?.first_name?.[0] || '';
    const last = formData.lastName?.[0] || user?.last_name?.[0] || '';
    return `${first}${last}`.toUpperCase() || 'U';
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {/* Avatar Section */}
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
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            mb: 2,
          }}
        >
          Profile Picture
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
          }}
        >
          {/* Avatar with upload overlay */}
          <Box sx={{ position: 'relative' }}>
            <Avatar
              src={avatarUrl || undefined}
              sx={{
                width: 100,
                height: 100,
                fontSize: '2rem',
                bgcolor: 'primary.main',
              }}
            >
              {getInitials()}
            </Avatar>
            <IconButton
              onClick={handleAvatarClick}
              sx={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                bgcolor: 'background.paper',
                border: '2px solid',
                borderColor: 'divider',
                '&:hover': {
                  bgcolor: 'grey.100',
                },
              }}
              size="small"
            >
              <PhotoCameraIcon fontSize="small" />
            </IconButton>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              style={{ display: 'none' }}
            />
          </Box>

          <Box>
            <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
              Upload a new photo
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              JPG, PNG, or GIF. Max size 5MB.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleAvatarClick}
                startIcon={<PhotoCameraIcon />}
              >
                Upload
              </Button>
              {avatarUrl && (
                <Tooltip title="Remove photo">
                  <IconButton
                    size="small"
                    onClick={handleRemoveAvatar}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Personal Information Section */}
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
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            mb: 2,
          }}
        >
          Personal Information
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 2,
          }}
        >
          <TextField
            label="First Name"
            value={formData.firstName}
            onChange={handleInputChange('firstName')}
            fullWidth
            required
          />
          <TextField
            label="Last Name"
            value={formData.lastName}
            onChange={handleInputChange('lastName')}
            fullWidth
            required
          />
          <Box sx={{ gridColumn: { xs: '1', md: '1 / 3' } }}>
            <TextField
              label="Email"
              value={user?.email || ''}
              fullWidth
              disabled
              InputProps={{
                endAdornment: isOAuthUser ? (
                  <Chip
                    label="Google"
                    size="small"
                    color="primary"
                    variant="outlined"
                    icon={<LockIcon />}
                    sx={{ ml: 1 }}
                  />
                ) : (
                  <Tooltip title="Email cannot be changed">
                    <LockIcon color="action" sx={{ ml: 1 }} />
                  </Tooltip>
                ),
              }}
              helperText={
                isOAuthUser
                  ? 'Managed by Google account'
                  : 'Contact support to change email'
              }
            />
          </Box>
        </Box>
      </Paper>

      {/* Organization Section */}
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
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            mb: 2,
          }}
        >
          Organization
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 2,
          }}
        >
          <TextField
            label="Organization"
            value={formData.organization}
            onChange={handleInputChange('organization')}
            fullWidth
            placeholder="Enter your organization name"
          />
          <TextField
            label="Department"
            value={formData.department}
            onChange={handleInputChange('department')}
            fullWidth
            placeholder="e.g., Radiology, Cardiology"
          />
        </Box>
      </Paper>

      {/* Preferences Section */}
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
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            mb: 2,
          }}
        >
          Preferences
        </Typography>

        <TextField
          select
          label="Timezone"
          value={formData.timezone}
          onChange={handleInputChange('timezone')}
          fullWidth
          sx={{ maxWidth: 400 }}
        >
          {TIMEZONE_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Save Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          type="submit"
          variant="contained"
          disabled={isSaving}
          startIcon={
            isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />
          }
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </Box>

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
