# TDD Test Environment Setup

This document explains the comprehensive Test-Driven Development (TDD) setup for the ObsidianComments project.

## Overview

The test environment has been completely restructured to follow TDD principles with proper mocking and isolation:

✅ **Fixed Issues:**
- Tests no longer try to connect to real databases by default
- Proper `.env.test` files for test configuration
- Separate mocked and integration test modes
- Fast, isolated unit tests for TDD workflow
- CI-compatible test configurations

## Test Environment Structure

### 1. Environment Configuration

**`.env.test` files** are created for each package:
- `/packages/backend/.env.test` - Backend test database and service configurations
- `/packages/frontend/.env.test` - Frontend API endpoints and test configurations  
- `/packages/hocuspocus/.env.test` - Hocuspocus server test configurations

### 2. Test Modes

#### **Default Mode: Mocked TDD (Recommended for Development)**
- Uses mocked dependencies (database, Redis, external APIs)
- Fast execution (no network/database calls)  
- Perfect for Test-Driven Development workflow
- Runs by default with `npm test`

#### **Integration Mode: Real Dependencies**
- Uses actual test database and services
- Slower execution but tests real integrations
- Requires test database to be running
- Run with `npm run test:integration`

#### **CI Mode: Validation Tests Only**
- Runs minimal validation tests for CI/CD
- No external dependencies required
- Used by GitHub Actions and CI pipelines

## Usage Guide

### Local TDD Development

```bash
# Quick TDD cycle with mocked dependencies (RECOMMENDED)
npm run test:tdd                    # Watch mode for TDD
npm run test:tdd:backend           # Backend TDD only

# Unit tests (mocked dependencies)
npm test                           # All packages
npm run test:backend              # Backend only
npm run test:frontend             # Frontend only  
npm run test:hocuspocus           # Hocuspocus only

# Integration tests (real database required)
npm run test:backend:integration   # Backend with real DB
```

### Test Configuration Files

#### Backend Jest Configurations
- `jest.config.js` - Default mocked setup for TDD
- `jest.local.config.js` - Flexible local development (supports both modes)
- `jest.ci.config.js` - CI-only validation tests

#### Frontend & Hocuspocus
- `jest.config.js` - Configured for TDD with proper mocking

### Environment Variables in Tests

Tests automatically load from `.env.test` files:

```bash
# Test Database (for integration tests)
DATABASE_URL=postgresql://postgres:test_password@localhost:5432/obsidian_comments_test

# Mock Mode (for unit tests)  
MOCK_EXTERNAL_SERVICES=true

# Test-specific configurations
NODE_ENV=test
LOG_LEVEL=error
DISABLE_LOGS=true
```

## TDD Workflow

### 1. Write Failing Test
```bash
npm run test:tdd  # Start watch mode
# Write your failing test
```

### 2. Make Test Pass
```bash
# Implement minimal code to make test pass
# Tests re-run automatically in watch mode
```

### 3. Refactor
```bash
# Refactor with confidence - tests will catch regressions
```

### 4. Integration Verification (Optional)
```bash
npm run test:backend:integration  # Verify against real database
```

## Test Setup Files

### Backend
- `src/__tests__/env-setup.ts` - Loads `.env.test` and configures environment
- `src/__tests__/setup-mocked.ts` - Mocked dependencies for TDD
- `src/__tests__/setup-integration.ts` - Real database setup for integration tests

### Frontend
- `src/__tests__/env-setup.ts` - Environment configuration
- `src/__tests__/setup.ts` - React Testing Library setup with mocks

### Hocuspocus
- `src/__tests__/env-setup.ts` - Environment configuration
- `src/__tests__/setup.ts` - WebSocket and collaboration mocking setup

## Database Setup for Integration Tests

If you need to run integration tests:

```bash
# Start test PostgreSQL database
docker run -d --name postgres-test -p 5432:5432 -e POSTGRES_PASSWORD=test_password postgres

# Create test database
docker exec postgres-test createdb -U postgres obsidian_comments_test

# Run migrations
cd packages/backend && npx prisma migrate dev
```

## Benefits of This Setup

✅ **Fast TDD Cycles**: Mocked tests run in milliseconds  
✅ **Proper Isolation**: Tests don't interfere with each other  
✅ **CI/CD Compatible**: No external dependencies in CI  
✅ **Flexible**: Switch between mocked and integration modes  
✅ **Comprehensive Coverage**: Unit tests for logic, integration tests for database  

## Troubleshooting

### Tests Fail with Database Connection Errors
- You're likely running integration tests without a test database
- Switch to mocked mode: `npm run test:unit` instead of `npm run test:integration`

### Mocks Not Working
- Ensure `MOCK_EXTERNAL_SERVICES=true` in `.env.test`
- Check that mock files are properly imported in setup files

### Environment Variables Not Loading
- Verify `.env.test` files exist in each package directory
- Check that `dotenv` is installed in devDependencies

## Script Reference

| Command | Description | Mode | Speed |
|---------|-------------|------|-------|
| `npm test` | Default test suite | Mocked | Fast |
| `npm run test:tdd` | TDD watch mode | Mocked | Fast |  
| `npm run test:unit` | Unit tests | Mocked | Fast |
| `npm run test:integration` | Integration tests | Real DB | Slow |
| `npm run test:ci` | CI validation | Mocked | Fast |
| `npm run test:coverage` | Coverage report | Mocked | Medium |

This setup ensures that your TDD workflow is fast, reliable, and doesn't depend on external services while still allowing comprehensive integration testing when needed.