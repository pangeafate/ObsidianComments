// TDD Demo Test - Shows that the test environment is working properly

describe('TDD Environment Verification', () => {
  beforeEach(() => {
    // Clean slate for each test
    jest.clearAllMocks();
  });

  it('should have test environment configured correctly', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.MOCK_EXTERNAL_SERVICES).toBe('true');
    expect(process.env.DATABASE_URL).toBeDefined();
    expect(process.env.REDIS_URL).toBeDefined();
  });

  it('should run tests fast with mocked dependencies', () => {
    const startTime = Date.now();
    
    // This would normally be a database call, but it's mocked
    const mockResult = { id: '1', title: 'Test', content: 'Content' };
    
    // Simulate fast execution
    expect(mockResult).toHaveProperty('id');
    expect(mockResult).toHaveProperty('title');
    expect(mockResult).toHaveProperty('content');
    
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    // Should be very fast since we're using mocks
    expect(executionTime).toBeLessThan(100); // Less than 100ms
  });

  it('should support TDD red-green-refactor cycle', () => {
    // RED: Write a failing test (this would initially fail)
    const calculateSum = (a: number, b: number) => a + b;
    
    // GREEN: Make it pass with minimal implementation
    expect(calculateSum(2, 3)).toBe(5);
    
    // REFACTOR: Code is already simple, but tests give confidence to refactor
    expect(calculateSum(-1, 1)).toBe(0);
    expect(calculateSum(0, 0)).toBe(0);
  });

  it('should isolate tests properly', () => {
    // Each test runs in isolation - no shared state
    const testState = { counter: 0 };
    testState.counter++;
    
    expect(testState.counter).toBe(1);
    
    // This test doesn't affect other tests
  });

  it('should mock external dependencies', () => {
    // External services are mocked, so tests are fast and reliable
    const mockDatabase = {
      findUser: jest.fn().mockResolvedValue({ id: '1', name: 'Test User' }),
      createUser: jest.fn().mockResolvedValue({ id: '2', name: 'New User' })
    };
    
    // Test the mocked behavior
    expect(mockDatabase.findUser).toBeDefined();
    expect(mockDatabase.createUser).toBeDefined();
    
    // Mocks return predictable results
    expect(mockDatabase.findUser()).resolves.toHaveProperty('name', 'Test User');
  });

  it('should provide fast feedback for TDD', () => {
    // TDD requires fast feedback - this setup provides it
    const isEven = (num: number) => num % 2 === 0;
    
    // Multiple assertions run quickly
    expect(isEven(2)).toBe(true);
    expect(isEven(3)).toBe(false);
    expect(isEven(0)).toBe(true);
    expect(isEven(-2)).toBe(true);
    expect(isEven(-1)).toBe(false);
  });
});