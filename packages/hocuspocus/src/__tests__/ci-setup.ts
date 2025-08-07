// CI-specific setup for hocuspocus that doesn't require database connection

beforeAll(async () => {
  // Set up test environment
  console.log('✅ Hocuspocus CI validation environment configured');
});

// Dummy test to satisfy Jest requirement
describe('Hocuspocus CI Test Setup', () => {
  it('should configure CI test environment correctly', () => {
    expect(process.env.NODE_ENV).not.toBe('production');
  });
});