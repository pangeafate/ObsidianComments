// Redis mock for testing
export class RedisMock {
  private store: Map<string, string> = new Map();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) || null;
  }

  async set(key: string, value: string, options?: any): Promise<void> {
    this.store.set(key, value);
  }

  async del(key: string): Promise<number> {
    const existed = this.store.has(key);
    this.store.delete(key);
    return existed ? 1 : 0;
  }

  async exists(key: string): Promise<number> {
    return this.store.has(key) ? 1 : 0;
  }

  async flushAll(): Promise<void> {
    this.store.clear();
  }

  async connect(): Promise<void> {
    // Mock connection
  }

  async disconnect(): Promise<void> {
    // Mock disconnect
  }

  async ping(): Promise<string> {
    return 'PONG';
  }
}

// Mock Redis client when MOCK_EXTERNAL_SERVICES is true
if (process.env.MOCK_EXTERNAL_SERVICES === 'true') {
  jest.mock('redis', () => ({
    createClient: () => new RedisMock(),
  }));
}