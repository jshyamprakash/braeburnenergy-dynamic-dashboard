import { Page } from '@playwright/test';

/**
 * Mock authentication helper for E2E tests
 *
 * Injects localStorage tokens and user data before page load.
 * AuthContext will automatically pick up these values on mount,
 * bypassing the need for real login flow.
 */
export async function mockAuth(page: Page) {
  // Test user matching backend structure
  const testUser = {
    id: '507f1f77bcf86cd799439011',
    username: 'testuser',
    email: 'test@example.com',
    role: 'Admin',
    organizationId: '507f1f77bcf86cd799439012',
    isActive: true,
    mustChangePassword: false,
    lastLogin: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Generate mock JWT tokens (format: header.payload.signature)
  const mockAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMSIsInVzZXJuYW1lIjoidGVzdHVzZXIiLCJyb2xlIjoiQWRtaW4iLCJvcmdhbml6YXRpb25JZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMiIsImlhdCI6MTYwMzk4MTI5OCwiZXhwIjoxNjAzOTg0ODk4fQ.5Vk3TXd8eW0Z4vN9sU5xD0mL3bZ7aX2cJ6kY8qP1rS0';
  const mockRefreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMSIsImlhdCI6MTYwMzk4MTI5OCwiZXhwIjoyNjAzOTgxMjk4fQ.8Zy9mL5nO3aT2pV4cW6xB1dE9fR7hS0kJ3qX8sU9vW2';

  const authData = {
    user: testUser,
    accessToken: mockAccessToken,
    refreshToken: mockRefreshToken,
  };

  await page.addInitScript((data: typeof authData) => {
    // Inject localStorage tokens and user data
    localStorage.setItem('iot_access_token', data.accessToken);
    localStorage.setItem('iot_refresh_token', data.refreshToken);
    localStorage.setItem('iot_user', JSON.stringify(data.user));
  }, authData);
}
