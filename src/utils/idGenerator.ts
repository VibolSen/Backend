import prisma from '../prisma';

export const generateStudentId = async () => {
  const currentYear = new Date().getFullYear();
  const counterKey = `STUDENT_${currentYear}`;

  try {
    // Atomically increment the counter for students this year
    const counter = await (prisma as any).systemCounter.upsert({
      where: { model: counterKey },
      update: { count: { increment: 1 } },
      create: { 
        model: counterKey, 
        count: 1, 
        year: currentYear 
      },
    });

    // Format: STU-2026-0001
    const sequence = counter.count.toString().padStart(4, '0');
    return `STU-${currentYear}-${sequence}`;
  } catch (error) {
    console.error("Failed to generate Student ID:", error);
    throw new Error("ID generation failed");
  }
};
