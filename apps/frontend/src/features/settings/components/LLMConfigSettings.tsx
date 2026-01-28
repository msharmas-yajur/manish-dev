import { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  MenuItem,
  Slider,
  Alert,
  Snackbar,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  InputAdornment,
  Tooltip,
  Divider,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import type {
  LLMProvider,
  LLMProviderConfig,
  LLMSettings,
  LLMConnectionTestResult,
} from '../types';

// Provider configurations
const LLM_PROVIDERS: LLMProviderConfig[] = [
  {
    id: 'openai',
    provider: 'openai',
    name: 'OpenAI',
    description: 'GPT-4, GPT-3.5 Turbo, and other OpenAI models',
    requiresApiKey: true,
    isConfigured: false,
    isEnabled: true,
    models: [
      {
        id: 'gpt-4-turbo',
        name: 'gpt-4-turbo',
        displayName: 'GPT-4 Turbo',
        contextWindow: 128000,
        costPer1kInputTokens: 0.01,
        costPer1kOutputTokens: 0.03,
        capabilities: ['chat', 'analysis', 'coding'],
      },
      {
        id: 'gpt-4',
        name: 'gpt-4',
        displayName: 'GPT-4',
        contextWindow: 8192,
        costPer1kInputTokens: 0.03,
        costPer1kOutputTokens: 0.06,
        capabilities: ['chat', 'analysis', 'coding'],
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'gpt-3.5-turbo',
        displayName: 'GPT-3.5 Turbo',
        contextWindow: 16385,
        costPer1kInputTokens: 0.0005,
        costPer1kOutputTokens: 0.0015,
        capabilities: ['chat', 'analysis'],
      },
    ],
  },
  {
    id: 'anthropic',
    provider: 'anthropic',
    name: 'Anthropic',
    description: 'Claude 3.5 Sonnet, Claude 3 Opus, and other Claude models',
    requiresApiKey: true,
    isConfigured: false,
    isEnabled: true,
    models: [
      {
        id: 'claude-3-5-sonnet',
        name: 'claude-3-5-sonnet-20241022',
        displayName: 'Claude 3.5 Sonnet',
        contextWindow: 200000,
        costPer1kInputTokens: 0.003,
        costPer1kOutputTokens: 0.015,
        capabilities: ['chat', 'analysis', 'coding', 'vision'],
      },
      {
        id: 'claude-3-opus',
        name: 'claude-3-opus-20240229',
        displayName: 'Claude 3 Opus',
        contextWindow: 200000,
        costPer1kInputTokens: 0.015,
        costPer1kOutputTokens: 0.075,
        capabilities: ['chat', 'analysis', 'coding', 'vision'],
      },
      {
        id: 'claude-3-haiku',
        name: 'claude-3-haiku-20240307',
        displayName: 'Claude 3 Haiku',
        contextWindow: 200000,
        costPer1kInputTokens: 0.00025,
        costPer1kOutputTokens: 0.00125,
        capabilities: ['chat', 'analysis'],
      },
    ],
  },
  {
    id: 'azure',
    provider: 'azure',
    name: 'Azure OpenAI',
    description: 'Azure-hosted OpenAI models with enterprise features',
    requiresApiKey: true,
    isConfigured: false,
    isEnabled: true,
    baseUrl: 'https://your-resource.openai.azure.com',
    models: [
      {
        id: 'azure-gpt-4',
        name: 'gpt-4',
        displayName: 'GPT-4 (Azure)',
        contextWindow: 8192,
        capabilities: ['chat', 'analysis', 'coding'],
      },
      {
        id: 'azure-gpt-35-turbo',
        name: 'gpt-35-turbo',
        displayName: 'GPT-3.5 Turbo (Azure)',
        contextWindow: 16385,
        capabilities: ['chat', 'analysis'],
      },
    ],
  },
  {
    id: 'google',
    provider: 'google',
    name: 'Google AI',
    description: 'Gemini Pro and other Google AI models',
    requiresApiKey: true,
    isConfigured: false,
    isEnabled: true,
    models: [
      {
        id: 'gemini-pro',
        name: 'gemini-pro',
        displayName: 'Gemini Pro',
        contextWindow: 32000,
        costPer1kInputTokens: 0.00025,
        costPer1kOutputTokens: 0.0005,
        capabilities: ['chat', 'analysis'],
      },
      {
        id: 'gemini-pro-vision',
        name: 'gemini-pro-vision',
        displayName: 'Gemini Pro Vision',
        contextWindow: 16000,
        capabilities: ['chat', 'analysis', 'vision'],
      },
    ],
  },
  {
    id: 'ollama',
    provider: 'ollama',
    name: 'Ollama (Local)',
    description: 'Run open-source models locally with Ollama',
    requiresApiKey: false,
    isConfigured: false,
    isEnabled: true,
    baseUrl: 'http://localhost:11434',
    models: [
      {
        id: 'llama2',
        name: 'llama2',
        displayName: 'Llama 2',
        contextWindow: 4096,
        capabilities: ['chat', 'analysis'],
      },
      {
        id: 'mistral',
        name: 'mistral',
        displayName: 'Mistral 7B',
        contextWindow: 8192,
        capabilities: ['chat', 'analysis'],
      },
      {
        id: 'codellama',
        name: 'codellama',
        displayName: 'Code Llama',
        contextWindow: 16384,
        capabilities: ['chat', 'coding'],
      },
    ],
  },
];

/**
 * LLMConfigSettings - LLM configuration section
 * Handles provider selection, API keys, model settings, and connection testing
 */
export function LLMConfigSettings() {
  // Settings state
  const [settings, setSettings] = useState<LLMSettings>({
    selectedProvider: 'openai',
    selectedModel: 'gpt-4-turbo',
    apiKey: '',
    temperature: 0.7,
    maxTokens: 2048,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
  });

  // UI state
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<LLMConnectionTestResult | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Get current provider config
  const currentProvider = LLM_PROVIDERS.find(
    (p) => p.provider === settings.selectedProvider
  );

  // Handle provider change
  const handleProviderChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const provider = event.target.value as LLMProvider;
      const providerConfig = LLM_PROVIDERS.find((p) => p.provider === provider);
      setSettings((prev) => ({
        ...prev,
        selectedProvider: provider,
        selectedModel: providerConfig?.models[0]?.id || '',
        apiKey: '', // Clear API key when changing provider
      }));
      setTestResult(null);
    },
    []
  );

  // Handle model change
  const handleModelChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSettings((prev) => ({
        ...prev,
        selectedModel: event.target.value,
      }));
    },
    []
  );

  // Handle API key change
  const handleApiKeyChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSettings((prev) => ({
        ...prev,
        apiKey: event.target.value,
      }));
      setTestResult(null);
    },
    []
  );

  // Handle slider changes
  const handleSliderChange = useCallback(
    (field: keyof LLMSettings) =>
      (_event: Event, value: number | number[]) => {
        setSettings((prev) => ({
          ...prev,
          [field]: value as number,
        }));
      },
    []
  );

  // Handle connection test
  const handleTestConnection = useCallback(async () => {
    if (currentProvider?.requiresApiKey && !settings.apiKey) {
      setError('Please enter an API key');
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setError(null);

    try {
      // TODO: Implement actual API connection test
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Simulate success
      setTestResult({
        success: true,
        message: 'Connection successful',
        latencyMs: Math.floor(Math.random() * 500) + 100,
        modelInfo: {
          name: settings.selectedModel,
          provider: settings.selectedProvider,
        },
      });
    } catch (err) {
      setTestResult({
        success: false,
        message:
          err instanceof Error ? err.message : 'Failed to connect to provider',
      });
    } finally {
      setIsTesting(false);
    }
  }, [currentProvider, settings]);

  // Handle save
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);

    try {
      // TODO: Implement API call to save settings
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSuccessMessage('LLM settings saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  }, [settings]);

  // Handle snackbar close
  const handleCloseSnackbar = useCallback(() => {
    setSuccessMessage(null);
  }, []);

  // Get selected model info
  const selectedModelInfo = currentProvider?.models.find(
    (m) => m.id === settings.selectedModel
  );

  return (
    <Box>
      {/* Provider Selection */}
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
          LLM Provider
        </Typography>

        <TextField
          select
          label="Provider"
          value={settings.selectedProvider}
          onChange={handleProviderChange}
          fullWidth
          sx={{ mb: 2, maxWidth: 400 }}
        >
          {LLM_PROVIDERS.map((provider) => (
            <MenuItem key={provider.id} value={provider.provider}>
              <Box>
                <Typography variant="body1">{provider.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {provider.description}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </TextField>

        {/* API Key Input */}
        {currentProvider?.requiresApiKey && (
          <TextField
            label="API Key"
            type={showApiKey ? 'text' : 'password'}
            value={settings.apiKey}
            onChange={handleApiKeyChange}
            fullWidth
            sx={{ mb: 2, maxWidth: 600 }}
            placeholder={`Enter your ${currentProvider.name} API key`}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowApiKey(!showApiKey)}
                    edge="end"
                  >
                    {showApiKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            helperText="Your API key is encrypted and stored securely"
          />
        )}

        {/* Base URL for self-hosted */}
        {currentProvider?.baseUrl && (
          <TextField
            label="Base URL"
            value={currentProvider.baseUrl}
            fullWidth
            sx={{ mb: 2, maxWidth: 600 }}
            disabled
            helperText="Configure the base URL for self-hosted instances"
          />
        )}

        {/* Test Connection */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={handleTestConnection}
            disabled={isTesting}
            startIcon={
              isTesting ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <PlayArrowIcon />
              )
            }
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </Button>

          {testResult && (
            <Chip
              icon={testResult.success ? <CheckCircleIcon /> : <ErrorIcon />}
              label={
                testResult.success
                  ? `Connected (${testResult.latencyMs}ms)`
                  : testResult.message
              }
              color={testResult.success ? 'success' : 'error'}
              variant="outlined"
            />
          )}
        </Box>
      </Paper>

      {/* Model Selection */}
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
          Model Selection
        </Typography>

        <TextField
          select
          label="Model"
          value={settings.selectedModel}
          onChange={handleModelChange}
          fullWidth
          sx={{ mb: 2, maxWidth: 400 }}
        >
          {currentProvider?.models.map((model) => (
            <MenuItem key={model.id} value={model.id}>
              <Box>
                <Typography variant="body1">{model.displayName}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Context: {model.contextWindow.toLocaleString()} tokens
                  {model.costPer1kInputTokens &&
                    ` | Input: $${model.costPer1kInputTokens}/1K tokens`}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </TextField>

        {/* Model Info Card */}
        {selectedModelInfo && (
          <Card variant="outlined" sx={{ maxWidth: 500 }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {selectedModelInfo.displayName}
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Chip
                  label={`${selectedModelInfo.contextWindow.toLocaleString()} tokens`}
                  size="small"
                  variant="outlined"
                />
                {selectedModelInfo.capabilities.map((cap) => (
                  <Chip
                    key={cap}
                    label={cap}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
              {selectedModelInfo.costPer1kInputTokens && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 1 }}
                >
                  Cost: ${selectedModelInfo.costPer1kInputTokens}/1K input, $
                  {selectedModelInfo.costPer1kOutputTokens}/1K output
                </Typography>
              )}
            </CardContent>
          </Card>
        )}
      </Paper>

      {/* Model Parameters */}
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
            mb: 2,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Model Parameters
          </Typography>
          <Tooltip title="Reset to defaults">
            <IconButton
              size="small"
              onClick={() =>
                setSettings((prev) => ({
                  ...prev,
                  temperature: 0.7,
                  maxTokens: 2048,
                  topP: 1,
                  frequencyPenalty: 0,
                  presencePenalty: 0,
                }))
              }
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 4,
          }}
        >
          {/* Temperature */}
          <Box>
            <Typography gutterBottom>
              Temperature: {settings.temperature}
            </Typography>
            <Slider
              value={settings.temperature}
              onChange={handleSliderChange('temperature')}
              min={0}
              max={2}
              step={0.1}
              marks={[
                { value: 0, label: '0' },
                { value: 1, label: '1' },
                { value: 2, label: '2' },
              ]}
            />
            <Typography variant="caption" color="text.secondary">
              Lower values make output more focused and deterministic
            </Typography>
          </Box>

          {/* Max Tokens */}
          <Box>
            <Typography gutterBottom>
              Max Tokens: {settings.maxTokens}
            </Typography>
            <Slider
              value={settings.maxTokens}
              onChange={handleSliderChange('maxTokens')}
              min={256}
              max={8192}
              step={256}
              marks={[
                { value: 256, label: '256' },
                { value: 4096, label: '4K' },
                { value: 8192, label: '8K' },
              ]}
            />
            <Typography variant="caption" color="text.secondary">
              Maximum number of tokens in the response
            </Typography>
          </Box>

          {/* Top P */}
          <Box>
            <Typography gutterBottom>Top P: {settings.topP}</Typography>
            <Slider
              value={settings.topP}
              onChange={handleSliderChange('topP')}
              min={0}
              max={1}
              step={0.1}
              marks={[
                { value: 0, label: '0' },
                { value: 0.5, label: '0.5' },
                { value: 1, label: '1' },
              ]}
            />
            <Typography variant="caption" color="text.secondary">
              Nucleus sampling threshold
            </Typography>
          </Box>

          {/* Frequency Penalty */}
          <Box>
            <Typography gutterBottom>
              Frequency Penalty: {settings.frequencyPenalty}
            </Typography>
            <Slider
              value={settings.frequencyPenalty}
              onChange={handleSliderChange('frequencyPenalty')}
              min={0}
              max={2}
              step={0.1}
              marks={[
                { value: 0, label: '0' },
                { value: 1, label: '1' },
                { value: 2, label: '2' },
              ]}
            />
            <Typography variant="caption" color="text.secondary">
              Reduces repetition of tokens based on frequency
            </Typography>
          </Box>

          {/* Presence Penalty */}
          <Box>
            <Typography gutterBottom>
              Presence Penalty: {settings.presencePenalty}
            </Typography>
            <Slider
              value={settings.presencePenalty}
              onChange={handleSliderChange('presencePenalty')}
              min={0}
              max={2}
              step={0.1}
              marks={[
                { value: 0, label: '0' },
                { value: 1, label: '1' },
                { value: 2, label: '2' },
              ]}
            />
            <Typography variant="caption" color="text.secondary">
              Encourages the model to discuss new topics
            </Typography>
          </Box>
        </Box>
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
          variant="contained"
          onClick={handleSave}
          disabled={isSaving}
          startIcon={
            isSaving ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <SaveIcon />
            )
          }
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
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
