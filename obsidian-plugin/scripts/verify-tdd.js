#!/usr/bin/env node

/**
 * TDD Verification Script
 * 
 * This script enforces strict Test-Driven Development practices by:
 * 1. Checking that every production file has corresponding tests
 * 2. Verifying test coverage meets minimum thresholds
 * 3. Ensuring no implementation exists without failing tests first
 * 4. Validating commit history follows test-first approach
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class TDDVerifier {
  constructor() {
    this.srcDir = path.join(__dirname, '..', 'src');
    this.testDir = path.join(__dirname, '..', '__tests__');
    this.errors = [];
    this.warnings = [];
  }

  async verify() {
    console.log('🧪 Verifying TDD Compliance...\n');

    try {
      await this.checkTestCoverage();
      await this.verifyTestFileStructure();
      await this.checkImplementationWithoutTests();
      await this.validateCommitHistory();
      await this.analyzeTestToCodeRatio();
      await this.checkMutationTestingScore();

      this.generateReport();

      if (this.errors.length > 0) {
        console.error('\n❌ TDD Verification Failed!');
        process.exit(1);
      } else {
        console.log('\n✅ TDD Verification Passed!');
        process.exit(0);
      }
    } catch (error) {
      console.error('\n💥 TDD Verification Error:', error.message);
      process.exit(1);
    }
  }

  async checkTestCoverage() {
    console.log('📊 Checking test coverage...');

    try {
      // Run coverage and parse results
      const coverageOutput = execSync('npm run test:coverage -- --silent', {
        encoding: 'utf8',
        cwd: path.dirname(__dirname)
      });

      // Parse coverage JSON if available
      const coveragePath = path.join(__dirname, '..', 'coverage', 'coverage-summary.json');
      
      if (fs.existsSync(coveragePath)) {
        const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
        const total = coverage.total;

        const thresholds = {
          lines: 85,
          functions: 85,
          branches: 80,
          statements: 85
        };

        Object.entries(thresholds).forEach(([metric, threshold]) => {
          const actual = total[metric].pct;
          if (actual < threshold) {
            this.errors.push(`Coverage ${metric}: ${actual}% < ${threshold}% (required)`);
          } else {
            console.log(`  ✅ ${metric}: ${actual}% >= ${threshold}%`);
          }
        });

        // Check critical files have 100% coverage
        const criticalFiles = ['api-client.ts', 'share-manager.ts', 'settings.ts'];
        
        Object.entries(coverage).forEach(([filePath, stats]) => {
          const fileName = path.basename(filePath);
          if (criticalFiles.includes(fileName)) {
            if (stats.lines.pct < 100) {
              this.errors.push(`Critical file ${fileName}: ${stats.lines.pct}% < 100% (required)`);
            }
          }
        });
      } else {
        this.errors.push('Coverage report not found. Run npm run test:coverage first.');
      }
    } catch (error) {
      this.errors.push(`Coverage check failed: ${error.message}`);
    }
  }

  async verifyTestFileStructure() {
    console.log('📁 Verifying test file structure...');

    if (!fs.existsSync(this.srcDir)) {
      this.warnings.push('Source directory not found - skipping structure check');
      return;
    }

    const srcFiles = this.getAllFiles(this.srcDir, '.ts')
      .filter(file => !file.includes('.d.ts'))
      .filter(file => !file.includes('index.ts'));

    srcFiles.forEach(srcFile => {
      const relativePath = path.relative(this.srcDir, srcFile);
      const testFileName = relativePath.replace('.ts', '.test.ts');
      const expectedTestPath = path.join(this.testDir, 'unit', testFileName);

      if (!fs.existsSync(expectedTestPath)) {
        this.errors.push(`Missing test file: ${expectedTestPath} for ${srcFile}`);
      } else {
        console.log(`  ✅ Found test for: ${relativePath}`);
      }
    });
  }

  async checkImplementationWithoutTests() {
    console.log('🚨 Checking for implementation without tests...');

    if (!fs.existsSync(this.srcDir)) {
      this.warnings.push('Source directory not found - skipping implementation check');
      return;
    }

    const srcFiles = this.getAllFiles(this.srcDir, '.ts');

    for (const srcFile of srcFiles) {
      try {
        const content = fs.readFileSync(srcFile, 'utf8');
        
        // Skip files that are just type definitions or constants
        if (this.isImplementationFile(content)) {
          const relativePath = path.relative(this.srcDir, srcFile);
          const testFile = path.join(this.testDir, 'unit', relativePath.replace('.ts', '.test.ts'));
          
          if (!fs.existsSync(testFile)) {
            this.errors.push(`Implementation found without tests: ${srcFile}`);
            continue;
          }

          // Check if tests exist for the implementation
          const testContent = fs.readFileSync(testFile, 'utf8');
          const implementationFunctions = this.extractFunctions(content);
          
          implementationFunctions.forEach(func => {
            if (!testContent.includes(func)) {
              this.warnings.push(`Function '${func}' in ${srcFile} may not have tests`);
            }
          });
        }
      } catch (error) {
        this.warnings.push(`Could not analyze file ${srcFile}: ${error.message}`);
      }
    }
  }

  async validateCommitHistory() {
    console.log('📝 Validating commit history for TDD compliance...');

    try {
      // Get recent commits
      const commits = execSync('git log --oneline -20', { encoding: 'utf8' })
        .split('\n')
        .filter(line => line.trim());

      let testFirstViolations = 0;
      const validTestPrefixes = ['test:', 'feat:', 'fix:', 'refactor:'];

      commits.forEach(commit => {
        const message = commit.split(' ').slice(1).join(' ');
        
        // Check if commit follows conventional format
        const hasValidPrefix = validTestPrefixes.some(prefix => 
          message.toLowerCase().startsWith(prefix)
        );

        if (!hasValidPrefix && !message.startsWith('build:') && !message.startsWith('docs:')) {
          this.warnings.push(`Commit message format: "${message}"`);
        }

        // Look for signs of implementation-first development
        if (message.includes('add test') || message.includes('test for')) {
          // This suggests tests were added after implementation
          testFirstViolations++;
        }
      });

      if (testFirstViolations > 0) {
        this.warnings.push(`Found ${testFirstViolations} potential test-after-implementation commits`);
      } else {
        console.log('  ✅ Commit history suggests test-first approach');
      }
    } catch (error) {
      this.warnings.push(`Could not analyze commit history: ${error.message}`);
    }
  }

  async analyzeTestToCodeRatio() {
    console.log('⚖️  Analyzing test-to-code ratio...');

    const srcLines = this.countLines(this.srcDir, '.ts');
    const testLines = this.countLines(this.testDir, '.ts');

    const ratio = testLines / Math.max(srcLines, 1);

    if (ratio < 1.0) {
      this.warnings.push(`Test-to-code ratio: ${ratio.toFixed(2)} < 1.0 (recommended)`);
    } else {
      console.log(`  ✅ Test-to-code ratio: ${ratio.toFixed(2)} >= 1.0`);
    }

    return { srcLines, testLines, ratio };
  }

  async checkMutationTestingScore() {
    console.log('🧬 Checking mutation testing score...');

    const mutationReportPath = path.join(__dirname, '..', 'reports', 'mutation', 'mutation.json');
    
    if (fs.existsSync(mutationReportPath)) {
      try {
        const report = JSON.parse(fs.readFileSync(mutationReportPath, 'utf8'));
        const score = report.mutationScore;

        if (score < 80) {
          this.warnings.push(`Mutation score: ${score}% < 80% (recommended)`);
        } else {
          console.log(`  ✅ Mutation score: ${score}% >= 80%`);
        }
      } catch (error) {
        this.warnings.push(`Could not read mutation report: ${error.message}`);
      }
    } else {
      this.warnings.push('Mutation testing report not found');
    }
  }

  generateReport() {
    console.log('\n📋 TDD Verification Report');
    console.log('=' .repeat(50));

    if (this.errors.length > 0) {
      console.log('\n❌ ERRORS (Must Fix):');
      this.errors.forEach(error => console.log(`  • ${error}`));
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS (Should Consider):');
      this.warnings.forEach(warning => console.log(`  • ${warning}`));
    }

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('\n🎉 Perfect TDD compliance!');
    }

    // Generate JSON report for CI
    const report = {
      timestamp: new Date().toISOString(),
      errors: this.errors,
      warnings: this.warnings,
      success: this.errors.length === 0
    };

    const reportPath = path.join(__dirname, '..', 'tdd-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }

  // Utility methods
  getAllFiles(dir, extension) {
    if (!fs.existsSync(dir)) return [];
    
    let files = [];
    const items = fs.readdirSync(dir);

    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        files = files.concat(this.getAllFiles(fullPath, extension));
      } else if (item.endsWith(extension)) {
        files.push(fullPath);
      }
    });

    return files;
  }

  isImplementationFile(content) {
    // Check if file contains actual implementation (not just types/interfaces)
    const hasClasses = /class\s+\w+/.test(content);
    const hasFunctions = /function\s+\w+|const\s+\w+\s*=\s*\(/.test(content);
    const hasExports = /export\s+(class|function|const)/.test(content);
    const hasOnlyTypes = /^(import|export|interface|type|\/\*|\s)*$/.test(content.replace(/\n/g, ''));

    return (hasClasses || hasFunctions || hasExports) && !hasOnlyTypes;
  }

  extractFunctions(content) {
    const functions = [];
    
    // Extract function names
    const functionMatches = content.match(/(?:function\s+|const\s+)(\w+)/g);
    if (functionMatches) {
      functions.push(...functionMatches.map(match => 
        match.replace(/^(function\s+|const\s+)/, '').trim()
      ));
    }

    // Extract method names from classes
    const methodMatches = content.match(/^\s+(\w+)\s*\(/gm);
    if (methodMatches) {
      functions.push(...methodMatches.map(match => 
        match.trim().replace(/\s*\($/, '')
      ));
    }

    return [...new Set(functions)]; // Remove duplicates
  }

  countLines(dir, extension) {
    if (!fs.existsSync(dir)) return 0;
    
    const files = this.getAllFiles(dir, extension);
    let totalLines = 0;

    files.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n').filter(line => 
          line.trim() && !line.trim().startsWith('//')
        );
        totalLines += lines.length;
      } catch (error) {
        // Skip files that can't be read
      }
    });

    return totalLines;
  }
}

// Run verification if called directly
if (require.main === module) {
  const verifier = new TDDVerifier();
  verifier.verify().catch(error => {
    console.error('TDD Verification failed:', error);
    process.exit(1);
  });
}

module.exports = TDDVerifier;