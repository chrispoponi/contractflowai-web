import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "68e168e0d22c71f370bf61f4", 
  requiresAuth: true // Ensure authentication is required for all operations
});
