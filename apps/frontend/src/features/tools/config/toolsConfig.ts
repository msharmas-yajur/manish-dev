import type { Tool } from '../types';
import { CopilotTool } from '../components/CopilotTool';

/**
 * Default built-in tools configuration
 * These tools are always available (unless disabled by admin)
 */
export const defaultTools: Tool[] = [
  {
    id: 'copilot',
    name: 'Caladrius Copilot',
    description: 'AI-powered medical assistant for document analysis and clinical support',
    icon: 'AutoAwesome', // MUI sparkle/magic icon
    type: 'component',
    component: CopilotTool,
    isBuiltIn: true,
    isEnabled: true,
    requiredPermissions: ['llm:use'],
    order: 1,
  },
  {
    id: 'snowstorm',
    name: 'Snowstorm Server',
    description: 'SNOMED CT terminology server for medical coding',
    icon: 'AcUnit', // Snowflake icon
    type: 'iframe',
    url: '/api/snowstorm', // Proxied through BFF
    isBuiltIn: true,
    isEnabled: true,
    requiredPermissions: ['records:read'],
    order: 2,
  },
  {
    id: 'snomed',
    name: 'SNOMED CT Browser',
    description: 'Browse and search SNOMED CT terminology',
    icon: 'LocalHospital', // Medical icon
    type: 'iframe',
    url: 'https://browser.ihtsdotools.org',
    isBuiltIn: true,
    isEnabled: true,
    requiredPermissions: ['records:read'],
    order: 3,
  },
  {
    id: 'cpt4',
    name: 'CPT-4 Code Library',
    description: 'Current Procedural Terminology code lookup',
    icon: 'QrCode2', // QR/Code icon
    type: 'link',
    url: 'https://www.aapc.com/codes/cpt-codes-range/',
    isBuiltIn: true,
    isEnabled: true,
    requiredPermissions: ['records:read'],
    order: 4,
  },
  {
    id: 'icd10',
    name: 'ICD-10 Browser',
    description: 'International Classification of Diseases code lookup',
    icon: 'ListAlt', // List icon
    type: 'link',
    url: 'https://www.icd10data.com/ICD10CM/Codes',
    isBuiltIn: true,
    isEnabled: true,
    requiredPermissions: ['records:read'],
    order: 5,
  },
];

/**
 * Get tool by ID
 */
export function getToolById(toolId: string): Tool | undefined {
  return defaultTools.find((tool) => tool.id === toolId);
}

/**
 * Get all enabled tools
 */
export function getEnabledTools(): Tool[] {
  return defaultTools.filter((tool) => tool.isEnabled);
}

/**
 * Filter tools by user permissions
 */
export function filterToolsByPermissions(
  tools: Tool[],
  userPermissions: string[]
): Tool[] {
  return tools.filter((tool) => {
    if (!tool.requiredPermissions || tool.requiredPermissions.length === 0) {
      return true;
    }
    return tool.requiredPermissions.some((perm) => userPermissions.includes(perm));
  });
}

/**
 * Get tools sorted by order
 */
export function getSortedTools(tools: Tool[]): Tool[] {
  return [...tools].sort((a, b) => a.order - b.order);
}
