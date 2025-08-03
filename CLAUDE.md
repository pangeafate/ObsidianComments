# Claude Code Implementation Guide for ObsidianComments

## Project Overview
You are implementing a collaborative Markdown editor with real-time editing and commenting features. The project repository is at https://github.com/pangeafate/ObsidianComments.

## Critical Requirements
1. **Port Usage**: DO NOT use ports 3000 or 5678 - these are reserved for existing services
2. **Test-First Approach**: Write tests before implementing features
3. **Git Workflow**: Commit frequently with descriptive messages and push to GitHub
4. **Docker-First Development**: Everything must run in Docker containers

## Test-Driven Development Process

### TDD Cycle
1. **Red**: Write a failing test that defines desired behavior
2. **Green**: Write minimal code to make the test pass
3. **Refactor**: Improve code while keeping tests green

### Test Writing Guidelines
- Test one behavior at a time
- Use descriptive test names that explain what is being tested
- Follow Arrange-Act-Assert pattern
- Test both success and failure scenarios
- Mock external dependencies appropriately

### Backend Testing Requirements

**Unit Test Coverage**
- All service methods must have tests
- Database models need validation tests
- Utility functions require edge case tests
- Error handling must be tested

**Integration Test Coverage**
- Every API endpoint needs request/response tests
- WebSocket events require connection tests
- Database transactions need rollback tests
- Redis sessions need expiration tests

**Test Organization**
- Group tests by feature/module
- Use descriptive describe blocks
- Setup and teardown test databases
- Isolate tests from each other

### Frontend Testing Requirements

**Component Testing**
- Test rendering with different props
- Test user interactions
- Test state changes
- Test error boundaries

**Hook Testing**
- Test custom hooks in isolation
- Mock external dependencies
- Test loading states
- Test error scenarios

**E2E Testing**
- Test complete user workflows
- Test multi-user scenarios
- Test error recovery
- Test performance metrics

