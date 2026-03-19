
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Checking DB connection via JS...");
    const userCount = await prisma.user.count();
    console.log("DB Connection successful. User count:", userCount);
    process.exit(0);
  } catch (err) {
    console.error("DB Connection failed:", err);
    process.exit(1);
  }
}

main();
