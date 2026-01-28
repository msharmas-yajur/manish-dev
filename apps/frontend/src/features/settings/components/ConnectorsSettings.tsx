import { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Snackbar,
  CircularProgress,
  IconButton,
  Tooltip,
  Grid,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import SettingsIcon from '@mui/icons-material/Settings';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import SyncIcon from '@mui/icons-material/Sync';
import type {
  EHRConnector,
  EHRProvider,
  ConnectorStatus,
  ConnectEHRRequest,
} from '../types';

// EHR Provider configurations
const EHR_PROVIDERS: {
  id: EHRProvider;
  name: string;
  description: string;
  logo: string;
  capabilities: string[];
}[] = [
  {
    id: 'epic',
    name: 'Epic',
    description: 'Connect to Epic MyChart and EpicCare',
    logo: '/images/ehr/epic.png',
    capabilities: ['Patient Data', 'Appointments', 'Lab Results', 'Medications'],
  },
  {
    id: 'cerner',
    name: 'Cerner',
    description: 'Oracle Cerner Millennium integration',
    logo: '/images/ehr/cerner.png',
    capabilities: ['Patient Data', 'Clinical Notes', 'Orders', 'Documents'],
  },
  {
    id: 'meditech',
    name: 'Meditech',
    description: 'MEDITECH Expanse integration',
    logo: '/images/ehr/meditech.png',
    capabilities: ['Patient Data', 'Scheduling', 'Billing'],
  },
  {
    id: 'allscripts',
    name: 'Allscripts',
    description: 'Allscripts TouchWorks and Professional EHR',
    logo: '/images/ehr/allscripts.png',
    capabilities: ['Patient Data', 'E-Prescribing', 'Lab Integration'],
  },
  {
    id: 'athena',
    name: 'athenahealth',
    description: 'athenaOne cloud-based EHR',
    logo: '/images/ehr/athena.png',
    capabilities: ['Patient Data', 'Revenue Cycle', 'Patient Engagement'],
  },
  {
    id: 'eclinicalworks',
    name: 'eClinicalWorks',
    description: 'eClinicalWorks ambulatory EHR',
    logo: '/images/ehr/ecw.png',
    capabilities: ['Patient Data', 'Telehealth', 'Population Health'],
  },
];

// Mock connected EHRs
const MOCK_CONNECTORS: EHRConnector[] = [
  {
    id: '1',
    provider: 'epic',
    name: 'Epic MyChart',
    description: 'Main hospital Epic integration',
    status: 'connected',
    lastSync: new Date(Date.now() - 3600000).toISOString(),
    configuration: {
      clientId: 'epic-client-123',
      baseUrl: 'https://fhir.epic.com/sandbox',
      environment: 'sandbox',
      scopes: ['patient/*.read', 'observation/*.read'],
    },
    capabilities: ['Patient Data', 'Appointments', 'Lab Results'],
  },
  {
    id: '2',
    provider: 'cerner',
    name: 'Cerner Millennium',
    description: 'Specialty clinic Cerner integration',
    status: 'error',
    errorMessage: 'Authentication token expired',
    configuration: {
      clientId: 'cerner-client-456',
      baseUrl: 'https://fhir.cerner.com/sandbox',
      environment: 'sandbox',
    },
    capabilities: ['Patient Data', 'Clinical Notes'],
  },
];

/**
 * Get status color for connector status
 */
function getStatusColor(
  status: ConnectorStatus
): 'success' | 'error' | 'warning' | 'default' {
  switch (status) {
    case 'connected':
      return 'success';
    case 'error':
      return 'error';
    case 'pending':
      return 'warning';
    case 'disconnected':
    default:
      return 'default';
  }
}

/**
 * Get status icon for connector status
 */
function getStatusIcon(status: ConnectorStatus) {
  switch (status) {
    case 'connected':
      return <CheckCircleIcon fontSize="small" />;
    case 'error':
      return <ErrorIcon fontSize="small" />;
    case 'pending':
      return <HourglassEmptyIcon fontSize="small" />;
    case 'disconnected':
    default:
      return <LinkOffIcon fontSize="small" />;
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
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

/**
 * ConnectorsSettings - EHR connectors management section
 * Handles EHR system connections and OAuth flows
 */
export function ConnectorsSettings() {
  // State
  const [connectors, setConnectors] = useState<EHRConnector[]>(MOCK_CONNECTORS);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removeConnectorId, setRemoveConnectorId] = useState<string | null>(
    null
  );
  const [configDialogConnector, setConfigDialogConnector] =
    useState<EHRConnector | null>(null);

  // Form state for adding new connector
  const [newConnector, setNewConnector] = useState<
    Partial<ConnectEHRRequest>
  >({
    provider: 'epic',
    clientId: '',
    baseUrl: '',
    environment: 'sandbox',
  });

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle add connector dialog
  const handleOpenAddDialog = useCallback(() => {
    setAddDialogOpen(true);
    setNewConnector({
      provider: 'epic',
      clientId: '',
      baseUrl: '',
      environment: 'sandbox',
    });
  }, []);

  const handleCloseAddDialog = useCallback(() => {
    setAddDialogOpen(false);
  }, []);

  // Handle new connector form changes
  const handleNewConnectorChange = useCallback(
    (field: keyof ConnectEHRRequest) =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        setNewConnector((prev) => ({
          ...prev,
          [field]: event.target.value,
        }));
      },
    []
  );

  // Handle add connector
  const handleAddConnector = useCallback(async () => {
    if (!newConnector.clientId || !newConnector.baseUrl) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement OAuth flow to connect EHR
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const providerInfo = EHR_PROVIDERS.find(
        (p) => p.id === newConnector.provider
      );
      const connector: EHRConnector = {
        id: Date.now().toString(),
        provider: newConnector.provider!,
        name: providerInfo?.name || 'New Connector',
        description: providerInfo?.description || '',
        status: 'pending',
        configuration: {
          clientId: newConnector.clientId,
          baseUrl: newConnector.baseUrl,
          environment: newConnector.environment!,
        },
        capabilities: providerInfo?.capabilities || [],
      };

      setConnectors((prev) => [...prev, connector]);
      setSuccessMessage('Connector added. Please complete OAuth authorization.');
      setAddDialogOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to add connector'
      );
    } finally {
      setIsLoading(false);
    }
  }, [newConnector]);

  // Handle remove connector
  const handleRemoveConnector = useCallback(async () => {
    if (!removeConnectorId) return;

    setIsLoading(true);
    try {
      // TODO: Implement API call to remove connector
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setConnectors((prev) => prev.filter((c) => c.id !== removeConnectorId));
      setSuccessMessage('Connector removed successfully');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to remove connector'
      );
    } finally {
      setIsLoading(false);
      setRemoveConnectorId(null);
    }
  }, [removeConnectorId]);

  // Handle sync connector
  const handleSyncConnector = useCallback(async (connectorId: string) => {
    setSyncingId(connectorId);
    try {
      // TODO: Implement sync API call
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setConnectors((prev) =>
        prev.map((c) =>
          c.id === connectorId
            ? { ...c, lastSync: new Date().toISOString(), status: 'connected' }
            : c
        )
      );
      setSuccessMessage('Sync completed successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync connector');
    } finally {
      setSyncingId(null);
    }
  }, []);

  // Handle reconnect
  const handleReconnect = useCallback(async (connectorId: string) => {
    setIsLoading(true);
    try {
      // TODO: Implement OAuth reconnection flow
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setConnectors((prev) =>
        prev.map((c) =>
          c.id === connectorId
            ? { ...c, status: 'connected', errorMessage: undefined }
            : c
        )
      );
      setSuccessMessage('Reconnected successfully');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to reconnect'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle snackbar close
  const handleCloseSnackbar = useCallback(() => {
    setSuccessMessage(null);
  }, []);

  return (
    <Box>
      {/* Header with Add Button */}
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
            alignItems: 'center',
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              EHR Connections
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Connect to Electronic Health Record systems to access patient data
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAddDialog}
          >
            Add Connector
          </Button>
        </Box>
      </Paper>

      {/* Connected EHRs */}
      {connectors.length > 0 ? (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {connectors.map((connector) => {
            return (
              <Grid item xs={12} md={6} key={connector.id}>
                <Card
                  variant="outlined"
                  sx={{
                    height: '100%',
                    borderColor:
                      connector.status === 'error'
                        ? 'error.main'
                        : connector.status === 'connected'
                        ? 'success.main'
                        : 'divider',
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        mb: 2,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 1,
                            bgcolor: 'grey.100',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem',
                            fontWeight: 700,
                            color: 'primary.main',
                          }}
                        >
                          {connector.name[0]}
                        </Box>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {connector.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {connector.description}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        icon={getStatusIcon(connector.status)}
                        label={connector.status}
                        color={getStatusColor(connector.status)}
                        size="small"
                        variant="outlined"
                      />
                    </Box>

                    {/* Error Message */}
                    {connector.status === 'error' && connector.errorMessage && (
                      <Alert severity="error" sx={{ mb: 2, py: 0 }}>
                        {connector.errorMessage}
                      </Alert>
                    )}

                    {/* Capabilities */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                      {connector.capabilities.map((cap) => (
                        <Chip
                          key={cap}
                          label={cap}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>

                    {/* Last Sync */}
                    {connector.lastSync && (
                      <Typography variant="caption" color="text.secondary">
                        Last synced: {formatRelativeTime(connector.lastSync)}
                      </Typography>
                    )}

                    {/* Environment Badge */}
                    <Box sx={{ mt: 1 }}>
                      <Chip
                        label={connector.configuration.environment}
                        size="small"
                        color={
                          connector.configuration.environment === 'production'
                            ? 'primary'
                            : 'default'
                        }
                      />
                    </Box>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                    {connector.status === 'error' ? (
                      <Button
                        size="small"
                        startIcon={<LinkIcon />}
                        onClick={() => handleReconnect(connector.id)}
                        disabled={isLoading}
                      >
                        Reconnect
                      </Button>
                    ) : (
                      <Tooltip title="Sync now">
                        <IconButton
                          size="small"
                          onClick={() => handleSyncConnector(connector.id)}
                          disabled={syncingId === connector.id}
                        >
                          {syncingId === connector.id ? (
                            <CircularProgress size={20} />
                          ) : (
                            <SyncIcon />
                          )}
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Configure">
                      <IconButton
                        size="small"
                        onClick={() => setConfigDialogConnector(connector)}
                      >
                        <SettingsIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setRemoveConnectorId(connector.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      ) : (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            mb: 3,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            textAlign: 'center',
          }}
        >
          <LinkOffIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No EHR Connections
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Connect to your EHR system to access patient data
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAddDialog}
          >
            Add Your First Connector
          </Button>
        </Paper>
      )}

      {/* Available Providers */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Supported EHR Systems
        </Typography>
        <Grid container spacing={2}>
          {EHR_PROVIDERS.map((provider) => {
            const isConnected = connectors.some(
              (c) => c.provider === provider.id
            );
            return (
              <Grid item xs={12} sm={6} md={4} key={provider.id}>
                <Card
                  variant="outlined"
                  sx={{
                    opacity: isConnected ? 0.6 : 1,
                    height: '100%',
                  }}
                >
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {provider.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      {provider.description}
                    </Typography>
                    <Box
                      sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}
                    >
                      {provider.capabilities.slice(0, 3).map((cap) => (
                        <Chip
                          key={cap}
                          label={cap}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
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

      {/* Add Connector Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={handleCloseAddDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add EHR Connector</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Enter your EHR system credentials to establish a connection.
          </DialogContentText>

          <TextField
            select
            label="EHR Provider"
            value={newConnector.provider}
            onChange={handleNewConnectorChange('provider')}
            fullWidth
            sx={{ mb: 2 }}
          >
            {EHR_PROVIDERS.map((provider) => (
              <MenuItem key={provider.id} value={provider.id}>
                {provider.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Client ID"
            value={newConnector.clientId}
            onChange={handleNewConnectorChange('clientId')}
            fullWidth
            required
            sx={{ mb: 2 }}
            helperText="Your OAuth client ID from the EHR vendor"
          />

          <TextField
            label="Base URL"
            value={newConnector.baseUrl}
            onChange={handleNewConnectorChange('baseUrl')}
            fullWidth
            required
            sx={{ mb: 2 }}
            placeholder="https://fhir.example.com"
            helperText="FHIR server base URL"
          />

          <TextField
            select
            label="Environment"
            value={newConnector.environment}
            onChange={handleNewConnectorChange('environment')}
            fullWidth
          >
            <MenuItem value="sandbox">Sandbox (Testing)</MenuItem>
            <MenuItem value="production">Production</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddDialog}>Cancel</Button>
          <Button
            onClick={handleAddConnector}
            variant="contained"
            disabled={isLoading}
            startIcon={
              isLoading ? <CircularProgress size={20} color="inherit" /> : null
            }
          >
            Connect
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove Connector Dialog */}
      <Dialog
        open={!!removeConnectorId}
        onClose={() => setRemoveConnectorId(null)}
      >
        <DialogTitle>Remove Connector</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to remove this EHR connector? This will
            disconnect the integration and revoke access tokens.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveConnectorId(null)}>Cancel</Button>
          <Button
            onClick={handleRemoveConnector}
            color="error"
            variant="contained"
            disabled={isLoading}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      {/* Config Dialog */}
      <Dialog
        open={!!configDialogConnector}
        onClose={() => setConfigDialogConnector(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Connector Configuration</DialogTitle>
        <DialogContent>
          {configDialogConnector && (
            <Box sx={{ pt: 1 }}>
              <TextField
                label="Client ID"
                value={configDialogConnector.configuration.clientId}
                fullWidth
                disabled
                sx={{ mb: 2 }}
              />
              <TextField
                label="Base URL"
                value={configDialogConnector.configuration.baseUrl}
                fullWidth
                disabled
                sx={{ mb: 2 }}
              />
              <TextField
                label="Environment"
                value={configDialogConnector.configuration.environment}
                fullWidth
                disabled
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogConnector(null)}>Close</Button>
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
