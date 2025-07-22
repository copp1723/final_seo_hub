#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

async function checkDynamicRoutes() {
  const apiDir = path.join(process.cwd(), 'app', 'api');
  const issues = [];
  
  async function scanDirectory(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await scanDirectory(fullPath);
        } else if (entry.name === 'route.ts' || entry.name === 'route.js') {
          const content = await fs.readFile(fullPath, 'utf-8');
          
          // Check if the file uses cookies, auth, or request-specific data
          const usesCookies = content.includes('cookies') || content.includes('request.cookies');
          const usesAuth = content.includes('auth()') || content.includes('getServerSession') || 
                          content.includes('SimpleAuth.getSession') || content.includes('SimpleAuth.getSessionFromRequest');
          const usesHeaders = content.includes('headers()') || content.includes('request.headers');
          
          // Check if it has dynamic export
          const hasDynamicExport = content.includes("export const dynamic = 'force-dynamic'") ||
                                  content.includes('export const dynamic = "force-dynamic"');
          
          if ((usesCookies || usesAuth || usesHeaders) && !hasDynamicExport) {
            const relativePath = path.relative(process.cwd(), fullPath);
            issues.push({
              file: relativePath,
              usesCookies,
              usesAuth,
              usesHeaders
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dir}:`, error.message);
    }
  }
  
  await scanDirectory(apiDir);
  
  if (issues.length > 0) {
    console.log('\n🚨 Routes that may need dynamic export:\n');
    issues.forEach(issue => {
      console.log(`📄 ${issue.file}`);
      const reasons = [];
      if (issue.usesCookies) reasons.push('uses cookies');
      if (issue.usesAuth) reasons.push('uses auth');
      if (issue.usesHeaders) reasons.push('uses headers');
      console.log(`   Reason: ${reasons.join(', ')}\n`);
    });
    
    console.log(`\nTotal: ${issues.length} files may need "export const dynamic = 'force-dynamic'"\n`);
  } else {
    console.log('\n✅ All routes appear to be properly configured!\n');
  }
}

checkDynamicRoutes().catch(console.error);
