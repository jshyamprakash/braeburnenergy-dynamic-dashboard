/**
 * Centralized Configuration for Next.js App
 *
 * All environment variables should be accessed through this config module.
 * This ensures type safety and consistent access across the application.
 */

// Validate required environment variables
function validateEnv() {
  const required = {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.warn(
      `⚠️  Missing environment variables: ${missing.join(', ')}\n` +
      `   Using default values for development.`
    );
  }
}

// Run validation in development
if (process.env.NODE_ENV === 'development') {
  validateEnv();
}

/**
 * Application Configuration
 */
export const config = {
  /**
   * Environment
   */
  env: {
    nodeEnv: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isTest: process.env.NODE_ENV === 'test',
  },

  /**
   * API Configuration
   */
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000', 10),
  },

  /**
   * WebSocket Configuration
   */
  websocket: {
    url: process.env.NEXT_PUBLIC_WS_URL ||
         (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/^http/, 'ws'),
    reconnectAttempts: parseInt(process.env.NEXT_PUBLIC_WS_RECONNECT_ATTEMPTS || '5', 10),
    reconnectDelay: parseInt(process.env.NEXT_PUBLIC_WS_RECONNECT_DELAY || '3000', 10),
  },

  /**
   * Authentication Configuration
   */
  auth: {
    tokenKey: 'iot_access_token',
    refreshTokenKey: 'iot_refresh_token',
    userKey: 'iot_user',
    tokenExpiry: 15 * 60 * 1000, // 15 minutes in ms
    refreshTokenExpiry: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  },

  /**
   * Dashboard Configuration
   */
  dashboard: {
    storageKey: 'iot_dashboard_layout',
    autoSaveDelay: 1000, // ms
    maxBlocks: 20,
    gridCols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
    breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 },
  },

  /**
   * UI Configuration
   */
  ui: {
    themeKey: 'iot_theme',
    defaultTheme: 'system' as 'light' | 'dark' | 'system',
    toastDuration: 3000, // ms
  },

  /**
   * Polling Configuration
   */
  polling: {
    deviceStatesInterval: 30000, // 30 seconds
    devicesInterval: 60000, // 1 minute
  },

  /**
   * Pagination Defaults
   */
  pagination: {
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
  },

  /**
   * Feature Flags
   */
  features: {
    enableWebSocket: process.env.NEXT_PUBLIC_ENABLE_WEBSOCKET !== 'false',
    enableDarkMode: process.env.NEXT_PUBLIC_ENABLE_DARK_MODE !== 'false',
    enableExport: process.env.NEXT_PUBLIC_ENABLE_EXPORT !== 'false',
    enableDashboardBuilder: process.env.NEXT_PUBLIC_ENABLE_DASHBOARD_BUILDER !== 'false',
  },

  /**
   * Development Configuration
   */
  dev: {
    showDevTools: process.env.NEXT_PUBLIC_SHOW_DEV_TOOLS === 'true',
    mockData: process.env.NEXT_PUBLIC_MOCK_DATA === 'true',
    logLevel: process.env.NEXT_PUBLIC_LOG_LEVEL || 'info',
  },
} as const;

/**
 * Type-safe config access
 */
export type Config = typeof config;

/**
 * Helper function to get API endpoint URL
 */
export function getApiUrl(path: string): string {
  const baseUrl = config.api.baseUrl.replace(/\/$/, ''); // Remove trailing slash
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Helper function to get WebSocket URL
 */
export function getWebSocketUrl(): string {
  return config.websocket.url;
}

/**
 * Helper to check if feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof config.features): boolean {
  return config.features[feature];
}

/**
 * Export individual sections for convenience
 */
export const apiConfig = config.api;
export const authConfig = config.auth;
export const dashboardConfig = config.dashboard;
export const uiConfig = config.ui;
export const wsConfig = config.websocket;
