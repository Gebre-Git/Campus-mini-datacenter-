#!/usr/bin/env node
/**
 * Make a user an admin.
 * Usage: node scripts/make-admin.js <username>
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const username = process.argv[2];

if (!username) {
  console.error('Usage: node scripts/make-admin.js <username>');
  process.exit(1);
}

async function main() {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    console.error(`User "${username}" not found.`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { username },
    data: { isAdmin: true },
  });

  console.log(`✅ "${username}" is now an admin. They must log out and back in for the change to take effect.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
