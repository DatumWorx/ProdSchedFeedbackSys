/**
 * Setup Verification Script
 * 
 * Checks that all required environment variables and prerequisites are configured.
 * 
 * Usage: npx ts-node scripts/check-setup.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
}

const results: CheckResult[] = [];

// Check Node.js version
function checkNodeVersion() {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.split('.')[0].replace('v', ''));
  const requiredVersion = 20;
  
  if (majorVersion >= requiredVersion) {
    results.push({
      name: 'Node.js Version',
      status: 'pass',
      message: `Node.js ${nodeVersion} is compatible (requires >=${requiredVersion}.9.0)`
    });
  } else {
    results.push({
      name: 'Node.js Version',
      status: 'fail',
      message: `Node.js ${nodeVersion} is too old. Next.js 16.1.1 requires Node.js >=20.9.0. Please upgrade.`
    });
  }
}

// Check for .env.local file
function checkEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    results.push({
      name: 'Environment File',
      status: 'pass',
      message: '.env.local file exists'
    });
  } else {
    results.push({
      name: 'Environment File',
      status: 'warning',
      message: '.env.local file not found. Create it with ASANA_TOKEN and ASANA_WORKSPACE_GID'
    });
  }
}

// Check for environment variables (without exposing values)
function checkEnvVariables() {
  const requiredVars = ['ASANA_TOKEN', 'ASANA_WORKSPACE_GID'];
  const missing: string[] = [];
  
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });
  
  if (missing.length === 0) {
    results.push({
      name: 'Environment Variables',
      status: 'pass',
      message: 'All required environment variables are set'
    });
  } else {
    results.push({
      name: 'Environment Variables',
      status: 'fail',
      message: `Missing environment variables: ${missing.join(', ')}. Set them in .env.local`
    });
  }
}

// Check database directory
function checkDatabase() {
  const workspaceRoot = path.resolve(process.cwd(), '..');
  const dbDir = path.join(workspaceRoot, 'QC_Data', 'databases');
  const dbPath = path.join(dbDir, 'qc_unified.db');
  
  if (fs.existsSync(dbDir)) {
    if (fs.existsSync(dbPath)) {
      results.push({
        name: 'Database',
        status: 'pass',
        message: `Database exists at ${dbPath}`
      });
    } else {
      results.push({
        name: 'Database',
        status: 'warning',
        message: `Database directory exists but database file not found. It will be created on first run.`
      });
    }
  } else {
    results.push({
      name: 'Database',
      status: 'warning',
      message: `Database directory not found at ${dbDir}. It will be created on first run.`
    });
  }
}

// Check dependencies
function checkDependencies() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  
  if (fs.existsSync(packageJsonPath)) {
    if (fs.existsSync(nodeModulesPath)) {
      results.push({
        name: 'Dependencies',
        status: 'pass',
        message: 'node_modules directory exists. Run "npm install" if missing dependencies.'
      });
    } else {
      results.push({
        name: 'Dependencies',
        status: 'fail',
        message: 'node_modules not found. Run "npm install" to install dependencies.'
      });
    }
  } else {
    results.push({
      name: 'Dependencies',
      status: 'fail',
      message: 'package.json not found. Are you in the correct directory?'
    });
  }
}

// Main function
function main() {
  console.log('🔍 Checking setup...\n');
  
  checkNodeVersion();
  checkEnvFile();
  checkEnvVariables();
  checkDatabase();
  checkDependencies();
  
  // Print results
  console.log('Results:\n');
  results.forEach(result => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
    const color = result.status === 'pass' ? '\x1b[32m' : result.status === 'fail' ? '\x1b[31m' : '\x1b[33m';
    const reset = '\x1b[0m';
    console.log(`${icon} ${color}${result.name}:${reset} ${result.message}`);
  });
  
  console.log('\n');
  
  const hasFailures = results.some(r => r.status === 'fail');
  const hasWarnings = results.some(r => r.status === 'warning');
  
  if (hasFailures) {
    console.log('❌ Setup check failed. Please fix the issues above before running the application.');
    process.exit(1);
  } else if (hasWarnings) {
    console.log('⚠️  Setup check completed with warnings. Review the warnings above.');
    process.exit(0);
  } else {
    console.log('✅ All checks passed! Setup looks good.');
    process.exit(0);
  }
}

main();
