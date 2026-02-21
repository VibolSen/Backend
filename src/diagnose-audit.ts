import prisma from './prisma';

async function diagnose() {
  console.log("--- Starting Audit Log Diagnosis ---");
  try {
    // 1. Test basic fetch (no relations)
    console.log("Testing basic AuditLog fetch...");
    const baseLogs = await prisma.auditLog.findMany({ take: 5 });
    console.log(`Successfully fetched ${baseLogs.length} logs without relations.`);

    // 2. Test fetch with Actor relation
    console.log("Testing AuditLog fetch with Actor relation...");
    const logsWithActor = await prisma.auditLog.findMany({
      include: {
        actor: {
          select: {
            firstName: true,
            lastName: true,
            role: true,
          }
        }
      },
      take: 10
    });
    console.log(`Successfully fetched ${logsWithActor.length} logs WITH relations.`);

    // 3. Check for orphans
    console.log("Checking for orphaned logs (actorId not found in User)...");
    const allLogs = await prisma.auditLog.findMany({ select: { id: true, actorId: true } });
    const userIds = (await prisma.user.findMany({ select: { id: true } })).map(u => u.id);
    
    const orphans = allLogs.filter(log => !userIds.includes(log.actorId));
    if (orphans.length > 0) {
      console.warn(`FOUND ${orphans.length} ORPHANED LOGS!`);
      console.log("Orphaned ID samples:", orphans.slice(0, 3).map(o => o.id));
    } else {
      console.log("No orphaned logs found.");
    }

  } catch (error) {
    console.error("DIAGNOSIS FAILED with error:");
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
