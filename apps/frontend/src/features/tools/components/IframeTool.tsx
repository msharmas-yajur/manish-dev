import { useState, useCallback, useRef } from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Button,
  Alert,
  AlertTitle,
} from '@mui/material';
import {
  OpenInNew as OpenInNewIcon,
  ErrorOutline as ErrorOutlineIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

/**
 * Props for the IframeTool component
 */
interface IframeToolProps {
  /** URL to load in the iframe */
  url: string;
  /** Title displayed in error states */
  title: string;
  /** Unique identifier for the tool */
  toolId: string;
  /** Callback when user wants to close the tool */
  onClose?: () => void;
  /** Custom sandbox attributes (default: "allow-scripts allow-same-origin allow-forms") */
  sandbox?: string;
}

/** Default sandbox attributes for security */
const DEFAULT_SANDBOX = 'allow-scripts allow-same-origin allow-forms';

/**
 * IframeTool - Generic component for embedding external tools via iframe
 *
 * Features:
 * - Loading state with CircularProgress
 * - Error handling for X-Frame-Options blocked sites
 * - Full height iframe (100% of panel content area)
 * - Secure sandbox attributes
 * - Fallback to open in new tab
 */
export function IframeTool({
  url,
  title,
  toolId,
  onClose,
  sandbox = DEFAULT_SANDBOX,
}: IframeToolProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  /**
   * Handle successful iframe load
   */
  const handleLoad = useCallback(() => {
    setIsLoading(false);
    // Note: Due to cross-origin restrictions, we cannot reliably detect
    // all X-Frame-Options blocking scenarios. Some sites will load a blank
    // page or show their own error instead of triggering onError.
  }, []);

  /**
   * Handle iframe load error
   */
  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    setErrorMessage(
      `Unable to load ${title}. The site may block embedding in iframes.`
    );
  }, [title]);

  /**
   * Open the URL in a new browser tab
   */
  const handleOpenInNewTab = useCallback(() => {
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [url]);

  /**
   * Retry loading the iframe
   */
  const handleRetry = useCallback(() => {
    setHasError(false);
    setErrorMessage('');
    setIsLoading(true);
    // Force iframe reload by updating the src
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }
  }, [url]);

  // Error state UI
  if (hasError) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          p: 3,
          textAlign: 'center',
        }}
      >
        <ErrorOutlineIcon
          sx={{
            fontSize: 64,
            color: 'warning.main',
            mb: 2,
          }}
        />
        <Alert
          severity="warning"
          sx={{
            mb: 3,
            maxWidth: 400,
          }}
        >
          <AlertTitle>Content Cannot Be Displayed</AlertTitle>
          {errorMessage}
        </Alert>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3, maxWidth: 350 }}
        >
          Some websites block embedding in iframes for security reasons.
          You can open this tool in a new browser tab instead.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<OpenInNewIcon />}
            onClick={handleOpenInNewTab}
          >
            Open in New Tab
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRetry}
          >
            Retry
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
      data-tool-id={toolId}
    >
      {/* Loading overlay */}
      {isLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'background.paper',
            zIndex: 1,
          }}
        >
          <CircularProgress size={48} sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Loading {title}...
          </Typography>
        </Box>
      )}

      {/* Iframe */}
      <Box
        component="iframe"
        ref={iframeRef}
        src={url}
        title={title}
        sandbox={sandbox}
        onLoad={handleLoad}
        onError={handleError}
        sx={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
        }}
        // Additional security attributes
        referrerPolicy="strict-origin-when-cross-origin"
        loading="lazy"
      />
    </Box>
  );
}

export default IframeTool;
