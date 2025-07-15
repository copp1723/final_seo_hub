const fs = require('fs');
const path = require('path');

// Fix all remaining TypeScript errors based on the last type check output

const fixes = [
  // Missing closing brackets in pages
  {
    file: 'app/(authenticated)/super-admin/page.tsx',
    pattern: /(\s+)(<Card className="mb-8">)/,
    replacement: '$1{stats && (\n$1$2'
  },
  {
    file: 'app/(authenticated)/super-admin/page.tsx',
    pattern: /(\s+)(<\/Card>\s*\n\s*<\/div>)/m,
    replacement: '$1</Card>\n$1)}\n$1</div>'
  },
  {
    file: 'app/debug/dealerships/page.tsx',
    pattern: /(\s+return \(\s*\n\s*<div)/,
    replacement: '$1return (\n$1<div'
  },
  {
    file: 'app/debug/dealerships/page.tsx',
    pattern: /(<\/div>\s*\n\s*\))$/m,
    replacement: '</div>\n  )\n}'
  },
  
  // Fix missing commas in API routes
  {
    file: 'app/api/requests/route.ts',
    pattern: /const emailTemplate = requestCreatedTemplate\(newRequest, newRequest\.users\s*\n/,
    replacement: 'const emailTemplate = requestCreatedTemplate(newRequest, newRequest.users)\n'
  },
  {
    file: 'app/api/requests/route.ts',
    pattern: /const welcomeTemplate = welcomeEmailTemplate\(newRequest\.users\s*\n/,
    replacement: 'const welcomeTemplate = welcomeEmailTemplate(newRequest.users)\n'
  },
  {
    file: 'app/api/requests/route.ts',
    pattern: /where: \{ userId: authResult\.user\.id \}/,
    replacement: 'where: { userId: authResult.user.id },'
  },
  {
    file: 'app/api/requests/route.ts',
    pattern: /to: newRequest\.user\.email\s*\n\s*\}/g,
    replacement: 'to: newRequest.user.email\n      },'
  },
  
  // Fix webhook route
  {
    file: 'app/api/seoworks/webhook/route.ts',
    pattern: /seoworksTaskId: taskId\s*\n\s*requestId: requestId/,
    replacement: 'seoworksTaskId: taskId,\n        requestId: requestId'
  },
  {
    file: 'app/api/seoworks/webhook/route.ts',
    pattern: /taskType: taskType\s*\n\s*status: 'active'/,
    replacement: 'taskType: taskType,\n        status: \'active\''
  },
  {
    file: 'app/api/seoworks/webhook/route.ts',
    pattern: /requestId\s*\n\s*\}\s*\n\s*\}\)/,
    replacement: 'requestId\n      },\n    })'
  },
  
  // Fix component issues
  {
    file: 'components/admin/content-notification-management.tsx',
    pattern: /onClick=\{handleDeleteSubscription\}\s*\n\s*disabled=\{isDeletingId === sub\.id\}/,
    replacement: 'onClick={handleDeleteSubscription}\n                disabled={isDeletingId === sub.id}'
  },
  {
    file: 'components/agency/agency-settings-page.tsx',
    pattern: /disabled=\{isUpdating\}\s*\n\s*className=/g,
    replacement: 'disabled={isUpdating}\n        className='
  },
  {
    file: 'components/agency/agency-settings-page.tsx',
    pattern: /\.\.\. dealershipForm/,
    replacement: '...dealershipForm'
  },
  {
    file: 'components/ui/toaster.tsx',
    pattern: /return \(\s*\n\s*\{toasts\.map/,
    replacement: 'return (\n    <>\n      {toasts.map'
  },
  {
    file: 'components/ui/toaster.tsx',
    pattern: /\)\s*\}\)\s*\n\s*\}/,
    replacement: ')\n      })}\n    </>\n  )'
  }
];

// Apply fixes
fixes.forEach(fix => {
  const filePath = path.join(__dirname, fix.file);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    content = content.replace(fix.pattern, fix.replacement);
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed: ${fix.file}`);
    } else {
      console.log(`⚠️  No match found in: ${fix.file}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${fix.file}:`, error.message);
  }
});

console.log('\nDone! Run npm run type-check to verify all errors are fixed.');