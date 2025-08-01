# Test-Driven Development Rules for Obsidian Comments

**Repository**: https://github.com/pangeafate/ObsidianComments  
**Project**: Obsidian Selective Sharing Tool  
**TDD Approach**: Strict Red-Green-Refactor Cycle

## Core TDD Principles

### The Sacred Rule: NO CODE WITHOUT TESTS FIRST

Every single line of production code must be preceded by a failing test. This is non-negotiable.

### Red-Green-Refactor Cycle

1. **RED**: Write a failing test that defines desired behavior
2. **GREEN**: Write the minimal code to make the test pass
3. **REFACTOR**: Clean up code while keeping tests green

### Test-First Mindset

- Tests are **specifications**, not validation
- Tests define **what** the code should do before **how** it's implemented
- If you can't write a test for it, you don't understand the requirement

## Project-Specific TDD Rules

### Rule 1: Every Feature Starts with a Test

```typescript
// ❌ WRONG: Writing implementation first
export class ApiClient {
  async shareNote(content: string): Promise<ShareResponse> {
    // Implementation here
  }
}

// ✅ CORRECT: Test defines the behavior first
describe('ApiClient', () => {
  test('should create share link for note content', async () => {
    const apiClient = new ApiClient({ apiKey: 'test-key' });
    const response = await apiClient.shareNote('# Test Note');
    
    expect(response.shareUrl).toMatch(/^https:\/\/share\.obsidiancomments\.com\//);
    expect(response.shareId).toHaveLength(12);
  });
});
```

### Rule 2: Test Structure - Arrange, Act, Assert

Every test follows the AAA pattern:

```typescript
test('should add frontmatter to shared note', async () => {
  // ARRANGE: Set up test conditions
  const noteContent = '# My Note\nContent here';
  const shareManager = new ShareManager();
  
  // ACT: Execute the behavior
  const result = await shareManager.addShareMetadata(noteContent, 'abc123');
  
  // ASSERT: Verify the outcome
  expect(result).toContain('shareId: abc123');
  expect(result).toContain('# My Note\nContent here');
});
```

### Rule 3: Test Isolation and Independence

- Each test runs in complete isolation
- No test depends on another test's state
- Setup and teardown for each test

```typescript
describe('ShareManager', () => {
  let shareManager: ShareManager;
  let mockApiClient: jest.Mocked<ApiClient>;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    shareManager = new ShareManager(mockApiClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
```

### Rule 4: Obsidian-Specific Testing Patterns

#### Mock Obsidian API Components

```typescript
// __tests__/__mocks__/obsidian.ts
export class TFile {
  constructor(public path: string) {}
}

export class Vault {
  read = jest.fn();
  modify = jest.fn();
  create = jest.fn();
}

export class App {
  vault = new Vault();
  workspace = {
    getActiveFile: jest.fn()
  };
}
```

#### Test Plugin Lifecycle

```typescript
describe('ObsidianCommentsPlugin', () => {
  test('should initialize with default settings', async () => {
    const app = new App();
    const plugin = new ObsidianCommentsPlugin(app, {} as PluginManifest);
    
    await plugin.onload();
    
    expect(plugin.settings.apiKey).toBe('');
    expect(plugin.settings.serverUrl).toBe('https://api.obsidiancomments.com');
  });
});
```

### Rule 5: Error Handling Tests Come First

Before implementing happy path, define error scenarios:

```typescript
describe('ApiClient error handling', () => {
  test('should throw meaningful error when API key is invalid', async () => {
    const apiClient = new ApiClient({ apiKey: 'invalid' });
    
    await expect(apiClient.shareNote('content'))
      .rejects
      .toThrow('Invalid API key. Please check your settings.');
  });

  test('should handle network failures gracefully', async () => {
    const apiClient = new ApiClient({ apiKey: 'valid' });
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    
    await expect(apiClient.shareNote('content'))
      .rejects
      .toThrow('Failed to connect to sharing service. Please check your internet connection.');
  });
});
```

## TDD Development Workflow

### Phase 1: Test-First Feature Development

For each feature in the requirements:

1. **Analyze the requirement** from functional spec
2. **Write failing tests** that capture the expected behavior
3. **Run tests** to confirm they fail (RED)
4. **Write minimal implementation** to pass tests (GREEN)
5. **Refactor** while keeping tests green
6. **Commit** with clear test/implementation separation

### Phase 2: Integration Testing

After unit tests pass:

1. **Write integration tests** for component interactions
2. **Test against real Obsidian API** (when possible)
3. **Verify end-to-end workflows**

### Phase 3: User Acceptance Testing

1. **Test in real Obsidian environment** using BRAT
2. **Verify against functional requirements**
3. **Performance and usability testing**

## Test Organization Structure

```
obsidian-plugin/
├── __tests__/
│   ├── __mocks__/
│   │   ├── obsidian.ts           # Mock Obsidian API
│   │   └── fetch.ts              # Mock network calls
│   ├── unit/
│   │   ├── api-client.test.ts    # API communication tests
│   │   ├── settings.test.ts      # Settings management tests
│   │   ├── share-manager.test.ts # Share logic tests
│   │   └── main.test.ts          # Plugin lifecycle tests
│   ├── integration/
│   │   ├── share-workflow.test.ts # End-to-end sharing flow
│   │   └── ui-interactions.test.ts # UI component testing
│   └── fixtures/
│       ├── test-notes.ts         # Sample note content
│       └── mock-responses.ts     # API response samples
├── src/
│   └── [implementation files]
└── jest.config.js
```

## Test Coverage Requirements

### Minimum Coverage Thresholds

```javascript
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 90,
      lines: 85,
      statements: 85
    },
    './src/api-client.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    },
    './src/share-manager.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  }
};
```

### Critical Components Requiring 100% Coverage

- **API Client**: All network communication
- **Share Manager**: Note frontmatter manipulation
- **Settings**: Configuration and validation
- **Error Handling**: All error scenarios

## TDD Anti-Patterns to Avoid

### ❌ Writing Tests After Implementation

```typescript
// This is not TDD - it's validation, not specification
function shareNote(content: string) {
  return { url: 'https://example.com', id: '123' };
}

// Test written afterwards
test('shareNote returns expected format', () => {
  const result = shareNote('test');
  expect(result.url).toBeTruthy();
  expect(result.id).toBeTruthy();
});
```

### ❌ Testing Implementation Details

```typescript
// Don't test how, test what
test('should call fetch with correct parameters', () => {
  const spy = jest.spyOn(global, 'fetch');
  apiClient.shareNote('content');
  expect(spy).toHaveBeenCalledWith('/api/share', { ... });
});
```

### ❌ Overly Complex Test Setup

```typescript
// Keep tests simple and focused
test('should handle complex scenario with 50 lines of setup', () => {
  // If your test setup is huge, you're testing too much at once
});
```

## CI/CD Integration

### Pre-commit Hooks

```bash
#!/bin/sh
# .git/hooks/pre-commit
npm run test
if [ $? -ne 0 ]; then
  echo "❌ Tests must pass before commit"
  exit 1
fi

npm run test:coverage
if [ $? -ne 0 ]; then
  echo "❌ Coverage thresholds must be met"
  exit 1
fi
```

### GitHub Actions Workflow

```yaml
# .github/workflows/tdd-validation.yml
name: TDD Validation

on: [push, pull_request]

jobs:
  test-first-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: |
          cd obsidian-plugin
          npm ci
          
      - name: Run tests
        run: |
          cd obsidian-plugin
          npm test
          
      - name: Check coverage
        run: |
          cd obsidian-plugin
          npm run test:coverage
          
      - name: Verify no implementation without tests
        run: |
          cd obsidian-plugin
          # Custom script to verify test-first approach
          npm run verify-tdd
```

## Development Commands

### Test-Driven Development Workflow

```bash
# Start TDD session
npm run tdd:start    # Runs tests in watch mode

# Write failing test, then run
npm run test:single  # Run specific test file

# After implementation, verify
npm run test:verify  # Run all tests + coverage

# Before commit
npm run tdd:complete # Full test suite + linting + coverage
```

### Test Execution

```bash
# Run all tests
npm test

# Run tests in watch mode (for TDD)
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- api-client.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should handle errors"
```

## TDD Success Metrics

### Code Quality Metrics

- **Test Coverage**: ≥85% overall, 100% for critical components
- **Test-to-Code Ratio**: ≥1:1 (more test code than production code)
- **Mutation Testing Score**: ≥80% (tests catch intentional bugs)

### Development Velocity Metrics

- **Time to First Failing Test**: <5 minutes for new features
- **Red-Green Cycle Time**: <10 minutes average
- **Bug Escape Rate**: <5% (bugs found in production vs. tests)

### Process Adherence Metrics

- **Commits with Tests First**: 100% (enforced by CI)
- **Test-First Violations**: 0 (automated detection)
- **Code Review Test Quality**: Mandatory test review checklist

## Emergency Protocols

### When Tests Break Production Build

1. **Stop all development** immediately
2. **Identify the breaking change** in version control
3. **Revert to last known good state**
4. **Write tests that would have caught the issue**
5. **Re-implement with TDD approach**

### When Falling Behind on TDD

1. **Never skip tests** to "catch up"
2. **Reduce feature scope** to maintain TDD discipline
3. **Pair program** to maintain test-first mentality
4. **Review and strengthen TDD practices**

## Learning Resources

### Recommended Reading

- "Test-Driven Development by Example" - Kent Beck
- "Growing Object-Oriented Software, Guided by Tests" - Freeman & Pryce
- "The Art of Unit Testing" - Roy Osherove

### Obsidian Plugin Testing Resources

- [Obsidian Plugin Developer Docs](https://docs.obsidian.md/Plugins)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
- [TypeScript Testing Best Practices](https://github.com/Microsoft/TypeScript/wiki/Coding-guidelines)

## Commitment

By following this TDD approach, we commit to:

- **Zero production bugs** that could have been caught by tests
- **Code that is always ready to ship** (thanks to continuous testing)
- **Self-documenting code** through comprehensive test suites
- **Fearless refactoring** enabled by safety net of tests
- **Faster development** in the long run through early bug detection

---

*"The goal of TDD is not to test. The goal is to drive the design of your code through tests."*

**Remember**: If you didn't write the test first, you're not doing TDD. Start over.