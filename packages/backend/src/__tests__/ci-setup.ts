// CI-specific setup that doesn't require database connection
// Used for basic validation tests that should work without external services

beforeAll(async () => {
  // Set up test environment
  process.env.FRONTEND_URL = 'http://localhost:5173';
  console.log('✅ CI validation environment configured');
});

// Dummy test to satisfy Jest requirement
describe('CI Test Setup', () => {
  it('should configure CI test environment correctly', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});