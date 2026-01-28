import type { ComponentType } from 'react';

/**
 * Tool type definitions for the right panel
 */

export type ToolType = 'component' | 'iframe' | 'link';

export interface Tool {
  /** Unique identifier for the tool */
  id: string;
  /** Display name shown in the panel header */
  name: string;
  /** Short description for tooltips */
  description: string;
  /** MUI icon name or custom icon component */
  icon: string;
  /** Type of tool rendering */
  type: ToolType;
  /** URL for iframe or link types */
  url?: string;
  /** React component for component type */
  component?: ComponentType<ToolComponentProps>;
  /** Whether this is a built-in tool (cannot be removed) */
  isBuiltIn: boolean;
  /** Whether the tool is currently enabled */
  isEnabled: boolean;
  /** Required permissions to access this tool */
  requiredPermissions?: string[];
  /** Order in the tool rail */
  order: number;
}

export interface ToolComponentProps {
  /** Tool configuration */
  tool: Tool;
  /** Callback to close the panel */
  onClose: () => void;
}

export interface UserTool {
  /** Reference to base tool or custom tool id */
  toolId: string;
  /** User-specific configuration */
  config?: Record<string, unknown>;
  /** Whether user has enabled this tool */
  enabled: boolean;
  /** User-defined order override */
  order?: number;
}

export interface ToolsState {
  /** All available tools */
  tools: Tool[];
  /** Currently active tool id */
  activeToolId: string | null;
  /** User-specific tool configurations */
  userTools: UserTool[];
}
