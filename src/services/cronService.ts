
import prisma from '../prisma';

export const cleanOldNotifications = async () => {
    try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const result = await prisma.notification.deleteMany({
            where: {
                createdAt: {
                    lt: oneWeekAgo
                },
                isRead: true // Only delete if read? Or delete all? Usually better to delete ALL old ones to save space.
            }
        });

        console.log(`[Cron] Cleaned up ${result.count} old notifications.`);
    } catch (error) {
        console.error("[Cron] Failed to clean notifications:", error);
    }
};

// Simple interval-based cron (runs once a day)
export const startCronJobs = () => {
    // Run every 24 hours (24 * 60 * 60 * 1000)
    setInterval(cleanOldNotifications, 24 * 60 * 60 * 1000);
    
    // Run immediately on startup too
    cleanOldNotifications();
};
