import prisma from '../prisma';

export const logAudit = async (actorId: string, action: string, target: string, targetId: string, details?: any) => {
  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        target,
        targetId,
        details: details ? JSON.stringify(details) : undefined,
      }
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
};
