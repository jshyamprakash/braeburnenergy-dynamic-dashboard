import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Convert Zod schema to JSON Schema for Swagger
 */
export function zodToSwagger(zodSchema: any, options?: { description?: string }): any {
  const jsonSchema = zodToJsonSchema(zodSchema, {
    target: 'openApi3',
    $refStrategy: 'none',
  });

  // Remove the $schema property as it's not needed in OpenAPI
  const { $schema, ...schema } = jsonSchema as any;

  if (options?.description) {
    return {
      ...schema,
      description: options.description,
    };
  }

  return schema;
}

/**
 * Create standard success response schema
 */
export function successResponse(dataSchema: any, description?: string) {
  return {
    description: description || 'Successful response',
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: dataSchema,
    },
    required: ['success', 'data'],
  };
}

/**
 * Create paginated response schema
 */
export function paginatedResponse(dataSchema: any, description?: string) {
  return {
    description: description || 'Paginated response',
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: {
        type: 'array',
        items: dataSchema,
      },
      pagination: {
        type: 'object',
        properties: {
          total: { type: 'number', example: 100 },
          limit: { type: 'number', example: 100 },
          offset: { type: 'number', example: 0 },
          hasMore: { type: 'boolean', example: false },
        },
      },
    },
    required: ['success', 'data', 'pagination'],
  };
}

/**
 * Create error response schema
 */
export function errorResponse(description?: string) {
  return {
    description: description || 'Error response',
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      error: { type: 'string', example: 'Error message' },
      details: { type: 'object', additionalProperties: true },
    },
    required: ['success', 'error'],
  };
}
