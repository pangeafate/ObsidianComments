# TDD Development Workflow for Obsidian Comments

This document outlines the strict Test-Driven Development workflow for the Obsidian Comments project, integrating with both development plans to ensure high-quality, test-first development.

## Quick Start (5-Minute Setup)

### Prerequisites (macOS)
- Node.js 16+ (`brew install node`)
- Git configured with GitHub access
- Obsidian installed with BRAT plugin

### Rapid Setup
```bash
# 1. Clone and setup
cd ~/Developer
git clone https://github.com/pangeafate/ObsidianComments.git
cd ObsidianComments/obsidian-plugin

# 2. Install dependencies
npm install

# 3. Start TDD workflow
npm run tdd:start  # This starts tests in watch mode

# 4. In another terminal - start build watching
npm run dev
```

## Sacred TDD Rules (Non-Negotiable)

### 1. The Red-Green-Refactor Cycle
**NEVER write production code without a failing test first.**

```bash
# Correct TDD workflow:
# 1. RED: Write failing test
npm test -- --testNamePattern="should create share link"

# 2. GREEN: Write minimal code to pass
# (Edit implementation file)

# 3. REFACTOR: Clean up while keeping tests green
npm test  # Verify tests still pass
```

### 2. Test-First Command Workflow

#### Starting a New Feature
```bash
# 1. Create failing test FIRST
touch __tests__/unit/new-feature.test.ts

# 2. Write the test (it WILL fail)
# 3. Run test to confirm failure
npm test -- new-feature.test.ts

# 4. Only NOW create the implementation file
touch src/new-feature.ts

# 5. Write minimal implementation to pass test
# 6. Verify test passes
npm test -- new-feature.test.ts
```

#### Daily TDD Session
```bash
# Terminal 1: Continuous test watching
npm run tdd:start

# Terminal 2: Build watching (for BRAT testing)
npm run dev

# Terminal 3: Your main development terminal
cd ~/Developer/ObsidianComments/obsidian-plugin

# Start with a failing test...
```

## TDD Workflow Integration with BRAT

### Phase 1: Test-First Development
```bash
# 1. Write failing test
echo 'test("should share note", () => { 
  expect(apiClient.shareNote("content")).toBeDefined(); 
});' >> __tests__/unit/api-client.test.ts

# 2. Confirm test fails
npm test -- api-client.test.ts
# ❌ Test should fail - this proves we're doing TDD correctly

# 3. Write minimal implementation
echo 'export class ApiClient { 
  shareNote(content: string) { return {}; } 
}' > src/api-client.ts

# 4. Test should now pass
npm test -- api-client.test.ts
# ✅ Green - minimal implementation works

# 5. Refactor and improve
# (Always keep tests passing)
```

### Phase 2: BRAT Integration Testing
```bash
# After unit tests pass, test in real Obsidian
npm run build

# Quick local sync to BRAT
./scripts/dev-sync.sh  # (Created during setup)

# OR full BRAT update
git add main.js manifest.json styles.css
git commit -m "test: add API client tests and minimal implementation"
git push origin main
# Then: Obsidian → BRAT → Check for updates → Cmd+R
```

## Component-Specific TDD Workflows

### API Client Development
```bash
# 1. Start with authentication test
cat > __tests__/unit/api-client.test.ts << 'EOF'
import { ApiClient } from '../../src/api-client';

describe('ApiClient', () => {
  test('should initialize with API key', () => {
    const client = new ApiClient({ apiKey: 'test-key' });
    expect(client).toBeDefined();
  });
});
EOF

# 2. Run test (will fail - no ApiClient exists)
npm test -- api-client.test.ts

# 3. Create minimal implementation
mkdir -p src
cat > src/api-client.ts << 'EOF'
export class ApiClient {
  constructor(settings: any) {}
}
EOF

# 4. Test passes - now add more behavior
```

### Share Manager Development
```bash
# 1. Test frontmatter manipulation first
cat > __tests__/unit/share-manager.test.ts << 'EOF'
import { ShareManager } from '../../src/share-manager';

describe('ShareManager', () => {
  test('should detect shared note', () => {
    const manager = new ShareManager();
    const sharedNote = '---\nshareId: abc123\n---\n# Note';
    expect(manager.isNoteShared(sharedNote)).toBe(true);
  });
});
EOF

# 2. Run failing test
npm test -- share-manager.test.ts

# 3. Implement minimal detection
cat > src/share-manager.ts << 'EOF'
export class ShareManager {
  isNoteShared(content: string): boolean {
    return content.includes('shareId:');
  }
}
EOF

# 4. Test passes - refactor and improve
```

### Settings Management Development
```bash
# 1. Start with validation tests
cat > __tests__/unit/settings.test.ts << 'EOF'
import { validateSettings } from '../../src/settings';

describe('Settings', () => {
  test('should reject empty API key', () => {
    const result = validateSettings({ apiKey: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('API key is required');
  });
});
EOF

# 2. Fail first
npm test -- settings.test.ts

# 3. Implement validation
cat > src/settings.ts << 'EOF'
export function validateSettings(settings: any) {
  const errors: string[] = [];
  if (!settings.apiKey) {
    errors.push('API key is required');
  }
  return { isValid: errors.length === 0, errors };
}
EOF
```

## TDD Quality Gates

### Pre-Commit Checks (Automated)
```bash
# These run automatically before each commit
npm run test          # All tests must pass
npm run test:coverage # Coverage thresholds must be met
npm run verify-tdd    # TDD compliance check
npm run lint          # Code quality check
```

### Manual Quality Gates
```bash
# Before pushing to GitHub
npm run tdd:complete  # Full verification

# Before creating PR
npm run test:all      # Integration tests
npm run test:mutation # Mutation testing
npm run metrics:tdd   # TDD metrics report
```

## Error Handling Workflow

### When Tests Fail
```bash
# 1. STOP - do not write more code
# 2. Fix the failing test or implementation
npm test -- --verbose  # Get detailed failure info

# 3. Use TDD debugging
npm test -- --watch --verbose  # Watch mode for debugging

# 4. If test is wrong, fix test first, then implementation
```

### When Build Fails
```bash
# 1. Check TypeScript errors
npm run build

# 2. Fix compilation issues
npm run lint:fix  # Auto-fix linting issues

# 3. Verify tests still pass after fixes
npm test
```

### When BRAT Update Fails
```bash
# 1. Check build succeeded
npm run build
ls -la main.js manifest.json styles.css

# 2. Verify commit includes built files
git status
git add main.js manifest.json styles.css
git commit --amend --no-edit

# 3. Force push if needed
git push origin main --force-with-lease
```

## Integration Testing Workflow

### End-to-End Feature Testing
```bash
# 1. Unit tests pass
npm test

# 2. Build plugin
npm run build

# 3. Test in Obsidian via BRAT
./scripts/dev-sync.sh
# Open Obsidian, Cmd+R to reload

# 4. Manual testing checklist:
# - Right-click note → "Share Note Online"
# - Verify URL copied to clipboard
# - Open share URL in browser
# - Test authentication flow
# - Test collaborative editing
```

### Performance Testing
```bash
# Test with large notes
npm run test:performance

# Memory leak detection
npm run test:memory

# Bundle size analysis
npm run analyze:bundle
```

## Team Workflow

### Code Review Process
1. **PR Requirements**:
   - All tests passing ✅
   - Coverage thresholds met ✅
   - TDD compliance verified ✅
   - Mutation score acceptable ✅

2. **Review Checklist**:
   - Tests written before implementation?
   - Tests cover edge cases?
   - Implementation is minimal for test requirements?
   - Code follows refactoring principles?

### Pair Programming TDD
```bash
# Navigator: Focus on tests and requirements
# Driver: Focus on minimal implementation

# Switch roles every 15-20 minutes
# Always maintain red-green-refactor cycle
```

## Emergency Procedures

### Production Bug Fix
```bash
# 1. STOP - write failing test that reproduces bug
npm test -- --testNamePattern="should handle edge case"

# 2. Confirm test fails (reproduces bug)
# 3. Fix implementation to pass test
# 4. Verify all tests still pass
npm test

# 5. Deploy fix
npm run build
git add main.js manifest.json styles.css
git commit -m "fix: handle edge case in share manager"
git push origin main
```

### When Behind Schedule
**NEVER skip tests to catch up**
```bash
# Instead:
# 1. Reduce feature scope
# 2. Pair program to maintain TDD discipline
# 3. Focus on MVP requirements
# 4. Use TDD to go faster (fewer bugs)
```

## Development Environment Setup

### VS Code Configuration
Create `.vscode/settings.json`:
```json
{
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "jest.jestCommandLine": "npm test --",
  "jest.autoRun": "watch",
  "jest.showCoverageOnLoad": true,
  "editor.formatOnSave": true,
  "files.autoSave": "afterDelay",
  "autoDocstring.docstringFormat": "docblockr"
}
```

### Recommended Extensions
- Jest (for test running)
- TypeScript Hero (auto imports)
- GitLens (commit history)
- Coverage Gutters (coverage visualization)

### Terminal Setup
```bash
# Add to ~/.zshrc or ~/.bash_profile
alias obs-tdd="cd ~/Developer/ObsidianComments/obsidian-plugin && npm run tdd:start"
alias obs-build="cd ~/Developer/ObsidianComments/obsidian-plugin && npm run build"
alias obs-test="cd ~/Developer/ObsidianComments/obsidian-plugin && npm test"
alias obs-sync="cd ~/Developer/ObsidianComments/obsidian-plugin && ./scripts/dev-sync.sh"
```

## Metrics and Monitoring

### TDD Success Metrics
```bash
# Generate TDD quality report
npm run metrics:tdd

# Expected metrics:
# - Test Coverage: ≥85% overall, 100% for critical components
# - Test-to-Code Ratio: ≥1:1
# - Mutation Score: ≥80%
# - TDD Compliance: ≥95%
# - Red-Green Cycle Time: <10 minutes average
```

### Continuous Monitoring
```bash
# Daily check
npm run verify-tdd

# Weekly deep analysis
npm run metrics:weekly

# Before release
npm run metrics:release
```

## Troubleshooting Common Issues

### "Tests pass but feature doesn't work"
- Tests may not cover real-world scenarios
- Add integration tests
- Test in actual Obsidian environment

### "Implementation seems over-engineered"
- Focus on making tests pass with minimal code
- Refactor only when tests are green
- YAGNI principle - don't add unused features

### "Hard to write tests for this"
- Break down into smaller, testable units
- Use dependency injection for mocking
- Consider if design needs improvement

### "TDD feels slow"
- You're probably not doing it right
- Write smaller tests
- Focus on one behavior at a time
- TDD should speed up development long-term

## Learning Resources

### TDD-Specific Resources
- [Test-Driven Development by Example - Kent Beck](https://www.amazon.com/Test-Driven-Development-Kent-Beck/dp/0321146530)
- [Growing Object-Oriented Software, Guided by Tests](https://www.amazon.com/Growing-Object-Oriented-Software-Guided-Tests/dp/0321503627)

### Obsidian Plugin Development
- [Official Plugin Development Docs](https://docs.obsidian.md/Plugins)
- [Plugin API Reference](https://github.com/obsidianmd/obsidian-api)

### TypeScript Testing
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [TypeScript Jest Setup](https://kulshekhar.github.io/ts-jest/)

---

## Final Reminders

🚨 **NEVER write production code without a failing test first**
🎯 **Keep the red-green-refactor cycle short (< 10 minutes)**
🧪 **Test behavior, not implementation details**
🔄 **Refactor fearlessly when tests are green**
📊 **Monitor TDD metrics continuously**
✅ **Commit early and often with clear test/implementation separation**

*"The goal of TDD is not to test. The goal is to drive the design of your code through tests."*