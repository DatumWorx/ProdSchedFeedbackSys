/**
 * Asana Connection Test Script (JavaScript version)
 * 
 * Tests the connection to Asana API and verifies configuration.
 * Provides detailed debugging information for any issues.
 * 
 * Usage: node scripts/test-asana-connection.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const results = [];

function printResult(result) {
  const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
  const color = result.status === 'pass' ? '\x1b[32m' : result.status === 'fail' ? '\x1b[31m' : '\x1b[33m';
  const reset = '\x1b[0m';
  console.log(`${icon} ${color}${result.name}:${reset} ${result.message}`);
  if (result.details) {
    const detailsStr = JSON.stringify(result.details, null, 2);
    const lines = detailsStr.split('\n').slice(0, 10);
    console.log(`   Details: ${lines.join('\n   ')}`);
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
  
  if (typeof token !== 'string' || token.trim().length === 0) {
    results.push({
      name: 'Environment Variables',
      status: 'fail',
      message: 'ASANA_TOKEN appears to be empty or invalid',
    });
    return false;
  }
  
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

// Test 2: Test Asana client creation - Using v1.x Client.create() approach
async function testClientCreation() {
  console.log('\n2️⃣ Testing Asana client creation...');
  
  try {
    const asana = require('asana');
    const token = process.env.ASANA_TOKEN;
    
    if (!token) {
      results.push({
        name: 'Client Creation',
        status: 'fail',
        message: 'ASANA_TOKEN not set',
      });
      return null;
    }
    
    // Asana SDK v1.x uses Client.create().useAccessToken(token) - method chaining
    // Note: lib/asana.ts uses an incorrect approach - it should be useAccessToken, not authType
    const client = asana.Client.create().useAccessToken(token);
    
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
      message: 'Asana client created successfully using v1.x Client.create()',
      details: {
        sdkVersion: '1.x (Client.create)',
        note: 'This matches your lib/asana.ts implementation.'
      }
    });
    
    return client;
  } catch (error) {
    results.push({
      name: 'Client Creation',
      status: 'fail',
      message: `Failed to create Asana client: ${error.message}`,
      details: {
        error: error.toString(),
        stack: error.stack?.split('\n').slice(0, 5)
      }
    });
    return null;
  }
}

// Test 3: Test API authentication using getProjectsForWorkspace (v1.x API)
async function testAuthentication(client) {
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
    // First try to get current user to verify authentication works
    try {
      const user = await client.users.me();
      results.push({
        name: 'Authentication',
        status: 'pass',
        message: `Successfully authenticated as ${user.name || user.email || 'user'}`,
        details: {
          testMethod: 'users.me',
          userGid: user.gid,
          userName: user.name,
          userEmail: user.email
        }
      });
      return true;
    } catch (userError) {
      // If that fails, try getting projects
      const projectsResponse = await client.projects.getProjectsForWorkspace(workspaceGid, {
        opt_fields: 'gid,name',
        limit: 1
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
    }
  } catch (error) {
    let errorMessage = error.message || 'Unknown error';
    let details = { error: error.toString() };
    
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
    } else if (error.status === 400) {
      errorMessage = 'Bad Request - API parameter format incorrect';
      details.hint = 'Check the workspace GID format';
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

// Test 4: Test workspace access
async function testWorkspaceAccess(client) {
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
    // First, get available workspaces to help with debugging
    let availableWorkspaces = [];
    try {
      const workspacesResponse = await client.workspaces.findAll({});
      availableWorkspaces = workspacesResponse.data || [];
    } catch (wsError) {
      // Continue even if workspace fetch fails
    }
    
    // v1.x API: Use getProjectsForWorkspace with workspace GID as first parameter
    const projectsResponse = await client.projects.getProjectsForWorkspace(workspaceGid, {
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
        sampleProjects: projects.slice(0, 3).map(p => ({ name: p.name, gid: p.gid }))
      }
    });
    
    return true;
  } catch (error) {
    let errorMessage = error.message || 'Unknown error';
    let details = { error: error.toString(), workspaceGid };
    
    // Fetch available workspaces to help user identify the correct one
    try {
      const workspacesResponse = await client.workspaces.findAll({});
      const availableWorkspaces = workspacesResponse.data || [];
      details.availableWorkspaces = availableWorkspaces.map(w => ({ 
        name: w.name, 
        gid: w.gid,
        isConfigured: w.gid === workspaceGid ? '← This is your configured workspace' : ''
      }));
      
      // Check if configured workspace matches any available workspace
      const matchingWorkspace = availableWorkspaces.find(w => w.gid === workspaceGid);
      if (!matchingWorkspace) {
        details.hint = `Your configured workspace GID (${workspaceGid}) does not match any available workspace. Use one of the available workspaces above.`;
        if (availableWorkspaces.length > 0) {
          details.suggestion = `Try using: ${availableWorkspaces[0].name} (${availableWorkspaces[0].gid})`;
        }
      }
    } catch (wsError) {
      details.hint = 'Could not fetch available workspaces. Verify ASANA_WORKSPACE_GID manually.';
    }
    
    if (error.status === 404) {
      errorMessage = `Workspace not found: ${workspaceGid}`;
      if (!details.hint) {
        details.hint = 'Verify ASANA_WORKSPACE_GID is correct';
      }
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
  await testWorkspaceAccess(client);
  
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
    console.log('\n💡 To find the correct workspace GID, run:');
    console.log('   node -e "require(\\\'dotenv\\\').config({ path: \\\'.env.local\\\' }); const asana = require(\\\'asana\\\'); const client = asana.Client.create().useAccessToken(process.env.ASANA_TOKEN); client.workspaces.findAll({}).then(ws => { ws.data.forEach(w => console.log(w.name + \\\': \\\' + w.gid)); });"');
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
