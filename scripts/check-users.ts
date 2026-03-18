import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      select: {
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        isActive: true
      }
    });
    console.log(JSON.stringify(users, null, 2));
  } catch (error) {
    console.error("Diagnostic error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
