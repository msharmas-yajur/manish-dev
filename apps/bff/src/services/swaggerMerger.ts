import { config } from '../config/env';
import { swaggerSpec } from '../config/swagger';
import { logger } from '../config/logger';

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths?: Record<string, unknown>;
  components?: {
    schemas?: Record<string, unknown>;
    securitySchemes?: Record<string, unknown>;
  };
  tags?: Array<{ name: string; description?: string }>;
  servers?: Array<{ url: string; description?: string }>;
}

interface CachedSpec {
  spec: OpenAPISpec | null;
  timestamp: number;
}

// Cache for backend spec with 60 second TTL
const CACHE_TTL_MS = 60 * 1000;
let cachedBackendSpec: CachedSpec = {
  spec: null,
  timestamp: 0,
};

/**
 * Fetch the Backend OpenAPI specification from the backend service
 */
export async function fetchBackendSpec(): Promise<OpenAPISpec | null> {
  const now = Date.now();

  // Return cached spec if still valid
  if (cachedBackendSpec.spec && now - cachedBackendSpec.timestamp < CACHE_TTL_MS) {
    logger.debug('Using cached backend OpenAPI spec');
    return cachedBackendSpec.spec;
  }

  try {
    const url = `${config.backendUrl}/openapi.json`;
    logger.debug({ url }, 'Fetching backend OpenAPI spec');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      logger.warn(
        { status: response.status, statusText: response.statusText },
        'Failed to fetch backend OpenAPI spec'
      );
      return null;
    }

    const spec = (await response.json()) as OpenAPISpec;

    // Update cache
    cachedBackendSpec = {
      spec,
      timestamp: now,
    };

    logger.info('Successfully fetched and cached backend OpenAPI spec');
    return spec;
  } catch (error) {
    logger.warn({ error }, 'Error fetching backend OpenAPI spec');
    return null;
  }
}

/**
 * Prefix all schema names in a spec with a given prefix
 */
function prefixSchemas(
  schemas: Record<string, unknown>,
  prefix: string
): Record<string, unknown> {
  const prefixedSchemas: Record<string, unknown> = {};

  for (const [name, schema] of Object.entries(schemas)) {
    const prefixedName = `${prefix}${name}`;
    // Deep clone and update any $ref references
    const updatedSchema = updateSchemaRefs(schema, prefix);
    prefixedSchemas[prefixedName] = updatedSchema;
  }

  return prefixedSchemas;
}

/**
 * Recursively update $ref references in a schema to use prefixed names
 */
function updateSchemaRefs(obj: unknown, prefix: string): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => updateSchemaRefs(item, prefix));
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (key === '$ref' && typeof value === 'string') {
      // Update $ref to use prefixed schema name
      // Format: #/components/schemas/SchemaName -> #/components/schemas/Backend_SchemaName
      const refMatch = value.match(/^#\/components\/schemas\/(.+)$/);
      if (refMatch) {
        result[key] = `#/components/schemas/${prefix}${refMatch[1]}`;
      } else {
        result[key] = value;
      }
    } else {
      result[key] = updateSchemaRefs(value, prefix);
    }
  }

  return result;
}

/**
 * Transform backend paths by changing /api/* to /backend/*
 */
function transformBackendPaths(
  paths: Record<string, unknown>,
  schemaPrefix: string
): Record<string, unknown> {
  const transformedPaths: Record<string, unknown> = {};

  for (const [path, pathItem] of Object.entries(paths)) {
    // Transform /api/* paths to /backend/*
    let newPath = path;
    if (path.startsWith('/api/')) {
      newPath = path.replace('/api/', '/backend/');
    } else if (!path.startsWith('/')) {
      newPath = `/backend/${path}`;
    } else {
      newPath = `/backend${path}`;
    }

    // Update schema references in path operations
    const updatedPathItem = updateSchemaRefs(pathItem, schemaPrefix);
    transformedPaths[newPath] = updatedPathItem;
  }

  return transformedPaths;
}

/**
 * Get the BFF-only OpenAPI specification
 */
export function getBffSpec(): OpenAPISpec {
  return swaggerSpec as OpenAPISpec;
}

/**
 * Merge BFF and Backend OpenAPI specifications
 */
export async function getMergedSpec(): Promise<OpenAPISpec> {
  const bffSpec = getBffSpec();
  const backendSpec = await fetchBackendSpec();

  // If backend spec is unavailable, return BFF-only spec
  if (!backendSpec) {
    logger.info('Returning BFF-only spec (backend unavailable)');
    return bffSpec;
  }

  const schemaPrefix = 'Backend_';

  // Start with BFF spec as base
  const mergedSpec: OpenAPISpec = {
    openapi: bffSpec.openapi || '3.0.0',
    info: {
      title: 'Caladrius Health API (Merged)',
      version: bffSpec.info.version,
      description:
        'Combined API specification for BFF and Backend services. Backend endpoints are prefixed with /backend.',
    },
    servers: bffSpec.servers || [{ url: '/api', description: 'BFF API endpoints' }],
    paths: { ...(bffSpec.paths || {}) },
    components: {
      schemas: { ...(bffSpec.components?.schemas || {}) },
      securitySchemes: { ...(bffSpec.components?.securitySchemes || {}) },
    },
    tags: [...(bffSpec.tags || [])],
  };

  // Merge backend paths (transformed)
  if (backendSpec.paths) {
    const transformedPaths = transformBackendPaths(backendSpec.paths, schemaPrefix);
    mergedSpec.paths = {
      ...mergedSpec.paths,
      ...transformedPaths,
    };
  }

  // Merge backend schemas (prefixed)
  if (backendSpec.components?.schemas) {
    const prefixedSchemas = prefixSchemas(backendSpec.components.schemas, schemaPrefix);
    mergedSpec.components!.schemas = {
      ...mergedSpec.components!.schemas,
      ...prefixedSchemas,
    };
  }

  // Merge backend security schemes (prefixed to avoid conflicts)
  if (backendSpec.components?.securitySchemes) {
    const prefixedSecuritySchemes: Record<string, unknown> = {};
    for (const [name, scheme] of Object.entries(backendSpec.components.securitySchemes)) {
      prefixedSecuritySchemes[`${schemaPrefix}${name}`] = scheme;
    }
    mergedSpec.components!.securitySchemes = {
      ...mergedSpec.components!.securitySchemes,
      ...prefixedSecuritySchemes,
    };
  }

  // Add Backend tag if backend has paths
  if (backendSpec.paths && Object.keys(backendSpec.paths).length > 0) {
    const hasBackendTag = mergedSpec.tags?.some((tag) => tag.name === 'Backend');
    if (!hasBackendTag) {
      mergedSpec.tags = mergedSpec.tags || [];
      mergedSpec.tags.push({
        name: 'Backend',
        description: 'Backend service endpoints (proxied through BFF)',
      });
    }
  }

  logger.debug('Successfully merged BFF and Backend OpenAPI specs');
  return mergedSpec;
}

/**
 * Clear the cached backend spec (useful for testing or forced refresh)
 */
export function clearBackendSpecCache(): void {
  cachedBackendSpec = {
    spec: null,
    timestamp: 0,
  };
  logger.debug('Cleared backend OpenAPI spec cache');
}
