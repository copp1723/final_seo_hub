#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
const { PrismaClient } = require('@prisma/client');

async function main() {
  console.log('--- Starting Authentication Fix Script ---');

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable not found. Please ensure it is set.');
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    console.log('Database connection successful.');
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    process.exit(1);
  }

  console.log("\n[ACTION REQUIRED] Please ensure you are using a production-ready authentication strategy.");
  console.log("The 'simple' authentication system is not secure and should be disabled.");
  console.log("Manually switch to a secure NextAuth provider in your authentication logic.\n");

  console.log('--- Correcting super admin role name ---');
  try {
    const updatedUsers = await prisma.user.updateMany({
      where: { role: 'super_admin' },
      data: { role: 'super-admin' },
    });
    console.log(`Successfully updated ${updatedUsers.count} users from 'super_admin' to 'super-admin'.`);
  } catch (error) {
    console.error('Error correcting super admin role:', error);
  }

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  if (!superAdminEmail) {
    console.error('SUPER_ADMIN_EMAIL environment variable not set. Please set it in your Render environment and re-run the script.');
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`--- Verifying Super Admin: ${superAdminEmail} ---`);
  try {
    let superAdmin = await prisma.user.findUnique({
      where: { email: superAdminEmail },
    });

    if (superAdmin) {
      if (superAdmin.role !== 'super-admin') {
        console.log(`User ${superAdminEmail} found, but with incorrect role. Updating role to 'super-admin'.`);
        await prisma.user.update({
          where: { id: superAdmin.id },
          data: { role: 'super-admin' },
        });
        console.log('Super admin role updated successfully.');
      } else {
        console.log('Super admin user already configured correctly.');
      }
    } else {
      console.log(`Super admin user with email ${superAdminEmail} not found. Creating user...`);
      await prisma.user.create({
        data: {
          email: superAdminEmail,
          name: 'Super Admin',
          role: 'super-admin',
          emailVerified: new Date(),
        },
      });
      console.log('Super admin user created successfully.');
    }
  } catch (error) {
    console.error('Error verifying or creating super admin user:', error);
  }

  await prisma.$disconnect();
  console.log('\n--- Authentication Fix Script Finished ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });