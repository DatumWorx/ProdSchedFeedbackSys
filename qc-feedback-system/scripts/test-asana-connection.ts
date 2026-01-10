/**
 * Asana Connection Test Script
 * 
 * Tests the connection to Asana API and verifies configuration.
 * Provides detailed debugging information for any issues.
 * 
 * Usage: npx ts-node scripts/test-asana-connection.ts
 */

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

// Import the actual getAsanaClient function that handles the client creation properly
// We'll use a workaround to import it without TypeScript compilation errors
let getAsanaClient: any;
try {
  // Try to dynamically require the compiled JS if available, or use eval to bypass TS checking
  const fs = require('fs');
  const libPath = path.join(__dirname, '../lib/asana.ts');
  // We'll create the client manually using the same logic
  getAsanaClient = function() {
    const asanaModule = require('asana');
    // For ES6 default import compatibility, handle both cases
    const asana = asanaModule.default || asanaModule;
    const token = process.env.ASANA_TOKEN;
    if (!token) {
      throw new Error('ASANA_TOKEN environment variable is not set');
    }
    // The asana module when required might export differently
    // Let's try different approaches
    if (asana.Client && typeof asana.Client.create === 'function') {
      return asana.Client.create({
        authType: 'token',
        token: token,
      });
    } else if (typeof asana === 'function' && asana.Client) {
      return asana.Client.create({
        authType: 'token',
        token: token,
      });
    } else {
      // Last resort: try using the default export as a Client factory
      throw new Error(`Cannot find Client.create. Available keys: ${Object.keys(asanaModule).slice(0, 10).join(', ')}`);
    }
  };
} catch (e) {
  console.error('Error setting up Asana client:', e);
}

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function printResult(result: TestResult) {
  const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
  const color = result.status === 'pass' ? '\x1b[32m' : result.status === 'fail' ? '\x1b[31m' : '\x1b[33m';
  const reset = '\x1b[0m';
  console.log(`${icon} ${color}${result.name}:${reset} ${result.message}`);
  if (result.details) {
    console.log(`   Details: ${JSON.stringify(result.details, null, 2).split('\n').slice(0, 10).join('\n   ')}`);
  }
}

// Test 1: Check environment variables
async function testEnvironmentVariables() {
  console.log('\n1️⃣ Checking environment variables...');
  
  const token = process.env.ASANA_TOKEN;
  const workspaceGid = process.env.ASANA_WORKSPACE_GID;
  
  if (!token) {
    results.push({
      name: 'Environment Variables',
      status: 'fail',
      message: 'ASANA_TOKEN is not set',
      details: {
        hint: 'Create a .env.local file with ASANA_TOKEN=your_token_here',
        docs: 'Get your token from: https://app.asana.com/0/developer-console'
      }
    });
    return false;
  }
  
  if (!workspaceGid) {
    results.push({
      name: 'Environment Variables',
      status: 'fail',
      message: 'ASANA_WORKSPACE_GID is not set',
      details: {
        hint: 'Add ASANA_WORKSPACE_GID=your_workspace_gid to .env.local',
        example: 'ASANA_WORKSPACE_GID=1139018700565569'
      }
    });
    return false;
  }
  
  // Check token format (should be a string, not empty)
  if (typeof token !== 'string' || token.trim().length === 0) {
    results.push({
      name: 'Environment Variables',
      status: 'fail',
      message: 'ASANA_TOKEN appears to be empty or invalid',
    });
    return false;
  }
  
  // Check if token looks like an Asana token (optional validation)
  if (token.length < 10) {
    results.push({
      name: 'Environment Variables',
      status: 'warning',
      message: 'ASANA_TOKEN seems unusually short. Double-check it\'s correct.',
    });
  }
  
  results.push({
    name: 'Environment Variables',
    status: 'pass',
    message: 'All required environment variables are set',
    details: {
      tokenLength: token.length,
      tokenPreview: token.substring(0, 4) + '...' + token.substring(token.length - 4),
      workspaceGid: workspaceGid
    }
  });
  
  return true;
}

// Test 2: Test Asana client creation
async function testClientCreation() {
  console.log('\n2️⃣ Testing Asana client creation...');
  
  try {
    if (!getAsanaClient) {
      throw new Error('getAsanaClient function not initialized');
    }
    
    const client: any = getAsanaClient();
    
    if (!client) {
      results.push({
        name: 'Client Creation',
        status: 'fail',
        message: 'Failed to create Asana client - client is null',
      });
      return null;
    }
    
    results.push({
      name: 'Client Creation',
      status: 'pass',
      message: 'Asana client created successfully',
    });
    
    return client;
  } catch (error: any) {
    results.push({
      name: 'Client Creation',
      status: 'fail',
      message: `Failed to create Asana client: ${error.message}`,
      details: {
        error: error.toString(),
        stack: error.stack?.split('\n').slice(0, 3)
      }
    });
    return null;
  }
}

// Test 3: Test API authentication with a simple call (getting projects)
async function testAuthentication(client: any) {
  console.log('\n3️⃣ Testing API authentication...');
  
  const workspaceGid = process.env.ASANA_WORKSPACE_GID;
  if (!workspaceGid) {
    results.push({
      name: 'Authentication',
      status: 'fail',
      message: 'ASANA_WORKSPACE_GID not set - cannot test authentication',
    });
    return false;
  }
  
  try {
    // Test authentication by trying to get projects from workspace
    // This will fail with 401 if token is invalid
    // Using type assertion since we know this method exists at runtime
    const projectsResponse = await (client.projects as any).getProjectsForWorkspace(workspaceGid, {
      opt_fields: 'gid,name',
      limit: 1  // Just need one to verify auth works
    });
    
    results.push({
      name: 'Authentication',
      status: 'pass',
      message: 'Successfully authenticated - API connection working',
      details: {
        testMethod: 'getProjectsForWorkspace',
        projectsFound: projectsResponse.data?.length || 0
      }
    });
    
    return true;
  } catch (error: any) {
    let errorMessage = error.message || 'Unknown error';
    let details: any = { error: error.toString() };
    
    // Provide helpful error messages based on error type
    if (error.status === 401) {
      errorMessage = 'Authentication failed - Invalid ASANA_TOKEN';
      details.hint = 'Verify your token is correct and hasn\'t expired';
      details.help = 'Get a new token from: https://app.asana.com/0/developer-console';
    } else if (error.status === 403) {
      errorMessage = 'Access forbidden - Token may not have required permissions';
      details.hint = 'Ensure your token has access to the workspace';
    } else if (error.status === 429) {
      errorMessage = 'Rate limit exceeded - Too many requests';
      details.hint = 'Wait a few minutes and try again';
    } else if (error.status === 404) {
      errorMessage = 'Workspace not found - Invalid ASANA_WORKSPACE_GID';
      details.hint = 'Verify ASANA_WORKSPACE_GID is correct';
    } else if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      errorMessage = 'Network error - Could not reach Asana API';
      details.hint = 'Check your internet connection';
    }
    
    results.push({
      name: 'Authentication',
      status: 'fail',
      message: errorMessage,
      details: details
    });
    
    return false;
  }
}

// Test 4: Test workspace access (by getting projects from workspace)
async function testWorkspaceAccess(client: any) {
  console.log('\n4️⃣ Testing workspace access...');
  
  const workspaceGid = process.env.ASANA_WORKSPACE_GID;
  if (!workspaceGid) {
    results.push({
      name: 'Workspace Access',
      status: 'fail',
      message: 'ASANA_WORKSPACE_GID not set',
    });
    return false;
  }
  
  try {
    // Test workspace access by getting projects
    // Using type assertion since we know this method exists at runtime
    const projectsResponse = await (client.projects as any).getProjectsForWorkspace(workspaceGid, {
      opt_fields: 'gid,name',
      limit: 10
    });
    
    const projects = projectsResponse.data || [];
    
    results.push({
      name: 'Workspace Access',
      status: 'pass',
      message: `Successfully accessed workspace - found ${projects.length} project(s)`,
      details: {
        workspaceGid: workspaceGid,
        projectCount: projects.length,
        sampleProjects: projects.slice(0, 3).map((p: any) => ({ name: p.name, gid: p.gid }))
      }
    });
    
    return true;
  } catch (error: any) {
    let errorMessage = error.message || 'Unknown error';
    let details: any = { error: error.toString(), workspaceGid };
    
    if (error.status === 404) {
      errorMessage = `Workspace not found: ${workspaceGid}`;
      details.hint = 'Verify ASANA_WORKSPACE_GID is correct';
      details.help = 'Get your workspace GID from Asana API or workspace settings';
    } else if (error.status === 403) {
      errorMessage = 'Access denied to workspace';
      details.hint = 'Your token may not have access to this workspace';
    }
    
    results.push({
      name: 'Workspace Access',
      status: 'fail',
      message: errorMessage,
      details: details
    });
    
    return false;
  }
}

// Test 5: Test getting department projects
async function testGetDepartmentProjects(client: any) {
  console.log('\n5️⃣ Testing department project retrieval...');
  
  const workspaceGid = process.env.ASANA_WORKSPACE_GID;
  if (!workspaceGid) {
    results.push({
      name: 'Department Projects',
      status: 'fail',
      message: 'ASANA_WORKSPACE_GID not set',
    });
    return false;
  }
  
  // Expected department projects from lib/asana.ts
  const DEPARTMENT_PROJECTS: Record<string, string> = {
    'Water Jets': '1209296874456267',
    'Routers': '1211016974304211',
    'Saws': '1211016974322485',
    'Presses': '1211016974322479',
    'Assembly': '1211016974322491',
    'Sampling': '1211017167732352',
  };
  
  try {
    // Get all projects from workspace
    const projectsResponse = await (client.projects as any).getProjectsForWorkspace(workspaceGid, {
      opt_fields: 'gid,name,notes',
    });
    
    const allProjects = projectsResponse.data || [];
    const expectedNames = Object.keys(DEPARTMENT_PROJECTS);
    const filteredProjects = allProjects.filter((p: any) => expectedNames.includes(p.name));
    
    if (filteredProjects.length === 0) {
      results.push({
        name: 'Department Projects',
        status: 'warning',
        message: 'No department projects found',
        details: {
          hint: 'Expected projects: ' + expectedNames.join(', '),
          note: 'Projects must match names exactly (case-sensitive)',
          foundProjects: allProjects.slice(0, 5).map((p: any) => p.name)
        }
      });
      return filteredProjects;
    }
    
    // Check for GID mismatches
    const gidMismatches: any[] = [];
    filteredProjects.forEach((project: any) => {
      const expectedGid = DEPARTMENT_PROJECTS[project.name];
      if (expectedGid && project.gid !== expectedGid) {
        gidMismatches.push({
          name: project.name,
          foundGid: project.gid,
          expectedGid: expectedGid
        });
      }
    });
    
    results.push({
      name: 'Department Projects',
      status: 'pass',
      message: `Successfully retrieved ${filteredProjects.length} department project(s)`,
      details: {
        projects: filteredProjects.map((p: any) => ({
          name: p.name,
          gid: p.gid,
          expectedGid: DEPARTMENT_PROJECTS[p.name] || 'not configured',
          gidMatch: DEPARTMENT_PROJECTS[p.name] ? p.gid === DEPARTMENT_PROJECTS[p.name] : 'N/A'
        })),
        gidMismatches: gidMismatches.length > 0 ? gidMismatches : 'none'
      }
    });
    
    return filteredProjects;
  } catch (error: any) {
    results.push({
      name: 'Department Projects',
      status: 'fail',
      message: `Failed to retrieve projects: ${error.message}`,
      details: {
        error: error.toString(),
        status: error.status
      }
    });
    
    return null;
  }
}

// Test 6: Test getting tasks from a project
async function testGetTasks(client: any, projects: any[]) {
  console.log('\n6️⃣ Testing task retrieval...');
  
  if (!projects || projects.length === 0) {
    results.push({
      name: 'Task Retrieval',
      status: 'warning',
      message: 'Skipped - No projects available to test',
    });
    return;
  }
  
  // Test with the first project
  const testProject = projects[0];
  const projectGid = testProject.gid;
  const projectName = testProject.name;
  
  try {
    // Get sections for the project (using type assertion since we know this method exists at runtime)
    const sectionsResponse = await (client.sections as any).getSectionsForProject(projectGid, {
      opt_fields: 'gid,name'
    });
    
    const sections = sectionsResponse.data || [];
    const excludedSections = ['New Orders', 'Done'];
    const validSections = sections.filter((s: any) => !excludedSections.includes(s.name));
    
    results.push({
      name: 'Task Retrieval',
      status: 'pass',
      message: `Successfully retrieved ${sections.length} section(s) from project: ${projectName}`,
      details: {
        projectName,
        projectGid,
        totalSections: sections.length,
        validSections: validSections.length,
        sectionNames: sections.map((s: any) => s.name),
        excludedSections: excludedSections,
        validSectionNames: validSections.map((s: any) => s.name)
      }
    });
    
    // Try to get tasks from the first valid section
    if (validSections.length > 0) {
      const testSection = validSections[0];
      // Using type assertion since we know this method exists at runtime
      const tasksResponse = await (client.tasks as any).getTasksForSection(testSection.gid, {
        opt_fields: 'gid,name',
        limit: 5  // Just get a few tasks for testing
      });
      
      const tasks = tasksResponse.data || [];
      
      results.push({
        name: 'Task Retrieval (Sample)',
        status: 'pass',
        message: `Found ${tasks.length} task(s) in section "${testSection.name}" (sample)`,
        details: {
          sectionName: testSection.name,
          taskCount: tasks.length,
          sampleTasks: tasks.slice(0, 3).map((t: any) => ({ gid: t.gid, name: t.name }))
        }
      });
    }
    
  } catch (error: any) {
    results.push({
      name: 'Task Retrieval',
      status: 'fail',
      message: `Failed to retrieve tasks: ${error.message}`,
      details: {
        projectName,
        projectGid,
        error: error.toString(),
        status: error.status
      }
    });
  }
}

// Main test function
async function main() {
  console.log('🔍 Testing Asana Connection...\n');
  console.log('='.repeat(60));
  
  // Test 1: Environment variables
  const envOk = await testEnvironmentVariables();
  if (!envOk) {
    printResults();
    process.exit(1);
  }
  
  // Test 2: Client creation
  const client = await testClientCreation();
  if (!client) {
    printResults();
    process.exit(1);
  }
  
  // Test 3: Authentication
  const authOk = await testAuthentication(client);
  if (!authOk) {
    printResults();
    process.exit(1);
  }
  
  // Test 4: Workspace access
  const workspaceOk = await testWorkspaceAccess(client);
  if (!workspaceOk) {
    printResults();
    process.exit(1);
  }
  
  // Test 5: Get department projects
  const projects = await testGetDepartmentProjects(client);
  
  // Test 6: Get tasks (if we have projects)
  if (projects && projects.length > 0) {
    await testGetTasks(client, projects);
  }
  
  // Print all results
  printResults();
  
  // Summary
  const hasFailures = results.some(r => r.status === 'fail');
  const hasWarnings = results.some(r => r.status === 'warning');
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Summary:\n');
  
  if (hasFailures) {
    console.log('❌ Connection test FAILED. Please fix the issues above.');
    console.log('\n💡 Common solutions:');
    console.log('   1. Verify ASANA_TOKEN is correct: https://app.asana.com/0/developer-console');
    console.log('   2. Verify ASANA_WORKSPACE_GID matches your workspace');
    console.log('   3. Ensure your token has access to the workspace');
    console.log('   4. Check that .env.local file exists and is in the correct location');
    process.exit(1);
  } else if (hasWarnings) {
    console.log('⚠️  Connection test completed with warnings. Review above.');
    process.exit(0);
  } else {
    console.log('✅ All tests passed! Asana connection is working correctly.');
    process.exit(0);
  }
}

function printResults() {
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 Test Results:\n');
  results.forEach(printResult);
}

// Run the tests
main().catch((error) => {
  console.error('\n❌ Fatal error running tests:', error);
  process.exit(1);
});
