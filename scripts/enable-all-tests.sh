#!/bin/bash

# Enable ALL tests by removing skip conditions
# This ensures tests NEVER get skipped in CI/CD

set -e

echo "🔥 Enabling ALL tests - NO SKIPPING ALLOWED!"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Find and replace test.skip with test
echo -e "${YELLOW}Removing test.skip from E2E tests...${NC}"
find tests/e2e -name "*.spec.js" -o -name "*.spec.ts" | while read file; do
    if grep -q "test\.skip" "$file"; then
        echo "  Fixing: $file"
        sed -i.bak 's/test\.skip(/test(/g' "$file"
        sed -i.bak 's/describe\.skip(/describe(/g' "$file"
        rm "${file}.bak"
    fi
done

# Remove skip conditions from tests
echo -e "${YELLOW}Removing conditional skips...${NC}"
find tests/e2e -name "*.spec.js" -o -name "*.spec.ts" | while read file; do
    if grep -q "test\.skip(process\.env\.CI" "$file"; then
        echo "  Fixing conditional skip in: $file"
        sed -i.bak '/test\.skip(process\.env\.CI/d' "$file"
        rm "${file}.bak"
    fi
done

# Fix package.json test scripts
echo -e "${YELLOW}Fixing package.json test scripts...${NC}"

# Frontend
if grep -q "echo.*skipped" packages/frontend/package.json; then
    echo "  Fixing frontend test:ci script"
    sed -i.bak 's/"test:ci":.*/"test:ci": "jest --config jest.config.cjs --coverage --watchAll=false --bail",/' packages/frontend/package.json
    rm packages/frontend/package.json.bak
fi

# Backend
if grep -q "passWithNoTests" packages/backend/package.json; then
    echo "  Removing passWithNoTests from backend"
    sed -i.bak 's/--passWithNoTests//g' packages/backend/package.json
    rm packages/backend/package.json.bak
fi

# Hocuspocus
if grep -q "passWithNoTests" packages/hocuspocus/package.json; then
    echo "  Removing passWithNoTests from hocuspocus"
    sed -i.bak 's/--passWithNoTests//g' packages/hocuspocus/package.json
    rm packages/hocuspocus/package.json.bak
fi

# Remove || true from workflows
echo -e "${YELLOW}Removing '|| true' from CI/CD workflows...${NC}"
find .github/workflows -name "*.yml" -o -name "*.yaml" | while read file; do
    if grep -q "|| true" "$file"; then
        echo "  Fixing: $file"
        sed -i.bak 's/ || true//g' "$file"
        rm "${file}.bak"
    fi
done

# Ensure jest configs run all tests
echo -e "${YELLOW}Ensuring jest configs run ALL tests...${NC}"

# Backend CI config
if [ -f "packages/backend/jest.ci.config.js" ]; then
    echo "  Updating backend jest.ci.config.js to run ALL tests"
    cat > packages/backend/jest.ci.config.js << 'EOF'
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '!**/__tests__/setup*.ts',
    '!**/__tests__/env-setup.ts',
    '!**/__tests__/mocks/**'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  setupFiles: ['<rootDir>/src/__tests__/env-setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testTimeout: 30000,
  verbose: true,
  bail: true, // Stop on first test failure
  maxWorkers: 1 // Run tests sequentially for consistency
};
EOF
fi

echo ""
echo -e "${GREEN}✅ ALL TESTS ENABLED!${NC}"
echo ""
echo "Summary of changes:"
echo "  - Removed all test.skip() calls"
echo "  - Removed all conditional skips"
echo "  - Fixed package.json test scripts"
echo "  - Removed || true from CI/CD workflows"
echo "  - Configured jest to run ALL tests"
echo "  - Added bail flag to stop on first failure"
echo ""
echo -e "${RED}⚠️  WARNING: All tests will now run and failures will block deployment!${NC}"
echo "This is the correct behavior for production systems."
echo ""