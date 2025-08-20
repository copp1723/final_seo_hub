#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Only the most critical and safe fixes
const criticalFixes = [
  // Fix the invitation route that was corrupted
  {
    file: 'app/api/invitation/route.ts',
    fixes: [
      {
        from: '  } catch (error: any) {\n    logger.error(\'Generate invitation token error:\', error, {\n      email,\n      role,\n      agencyId,\n      dealershipId,\n      inviterEmail: inviterSession?.user?.email\n    })\n\n    return NextResponse.json({\n      error: error.message || \'Failed to generate invitation\',\n      details: process.env.NODE_ENV === \'development\' ? error.stack : undefined\n    }, {\n      status: 500\n    })\n  }\n}',
        to: '  } catch (error: any) {\n    logger.error(\'Generate invitation error\', {\n      error: error instanceof Error ? error.message : String(error),\n      email,\n      role,\n      inviterUserId: inviterSession?.user?.id\n    })\n\n    return NextResponse.json(\n      { error: \'Failed to create invitation\' },\n      { status: 500 }\n    )\n  }\n}'
      }
    ]
  },
  
  // Fix auth-simple.ts relation name
  {
    file: 'lib/auth-simple.ts',
    fixes: [
      {
        from: '        include: {\n          dealership: {',
        to: '        include: {\n          dealerships: {'
      },
      {
        from: 'dealershipName: access.dealership.name,\n        accessLevel: access.accessLevel as \'READ\' | \'WRITE\' | \'ADMIN\',\n        agencyId: access.dealership.agencyId,\n        agencyName: access.dealership.agencies.name',
        to: 'dealershipName: access.dealerships.name,\n        accessLevel: access.accessLevel as \'READ\' | \'WRITE\' | \'ADMIN\',\n        agencyId: access.dealerships.agencyId,\n        agencyName: access.dealerships.agencies.name'
      }
    ]
  },
  
  // Fix super admin agencies page button size
  {
    file: 'app/(authenticated)/super-admin/agencies/page.tsx',
    fixes: [
      {
        from: 'size="xs"',
        to: 'size="sm"'
      }
    ]
  }
];

// Apply fixes
criticalFixes.forEach(({ file, fixes }) => {
  const filePath = path.join(__dirname, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  fixes.forEach(({ from, to }) => {
    if (content.includes(from)) {
      content = content.replace(from, to);
      changed = true;
    }
  });
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed ${file}`);
  }
});

console.log('🎉 Critical fixes applied!');