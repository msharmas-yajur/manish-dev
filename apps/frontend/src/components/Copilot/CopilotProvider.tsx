import React, { useMemo, useCallback } from 'react';
import { CopilotKit } from '@copilotkit/react-core';
import { useAuthContext } from '@features/auth';
import type { CopilotConfig } from './types';

/**
 * Default Copilot configuration
 */
const DEFAULT_COPILOT_CONFIG: CopilotConfig = {
  endpoint: '/api/copilot',
  maxTokens: 4096,
  temperature: 0.7,
  streamingEnabled: true,
  timeout: 30000,
  retryAttempts: 3,
};

interface CopilotProviderProps {
  children: React.ReactNode;
  config?: Partial<CopilotConfig>;
}

/**
 * CopilotProvider component that wraps the application with CopilotKit
 * and handles authentication token injection for secure API calls.
 */
export function CopilotProvider({ children, config = {} }: CopilotProviderProps) {
  const { token, isAuthenticated } = useAuthContext();

  // Merge provided config with defaults
  const copilotConfig = useMemo<CopilotConfig>(() => ({
    ...DEFAULT_COPILOT_CONFIG,
    ...config,
  }), [config]);

  /**
   * Custom headers function that injects the JWT token
   * for authenticated requests to the Copilot service
   */
  const getHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }, [token]);

  /**
   * Runtime URL for the Copilot endpoint
   * This points to the BFF proxy which forwards to the Copilot Service
   */
  const runtimeUrl = useMemo(() => {
    return copilotConfig.endpoint;
  }, [copilotConfig.endpoint]);

  // If not authenticated, render children without Copilot
  // This prevents unauthorized API calls
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <CopilotKit
      runtimeUrl={runtimeUrl}
      headers={getHeaders()}
      showDevConsole={process.env.NODE_ENV === 'development'}
    >
      {children}
    </CopilotKit>
  );
}

/**
 * Hook to get the current Copilot configuration
 * Useful for debugging or displaying configuration in UI
 */
export function useCopilotConfig(): CopilotConfig {
  return DEFAULT_COPILOT_CONFIG;
}

export default CopilotProvider;
