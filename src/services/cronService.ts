
import prisma from '../prisma';

export const cleanOldNotifications = async () => {
    try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const result = await prisma.notification.deleteMany({
            where: {
                createdAt: {
                    lt: oneWeekAgo
                }
            }
        });

        console.log(`[Cron] Cleaned up ${result.count} old notifications.`);
    } catch (error) {
        console.error("[Cron] Failed to clean notifications:", error);
    }
};

export const cleanOldSchedules = async () => {
    try {
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        const result = await prisma.schedule.deleteMany({
            where: {
                OR: [
                    {
                        // Recurring schedules that ended more than 2 weeks ago
                        isRecurring: true,
                        endDate: {
                            lt: twoWeeksAgo
                        }
                    },
                    {
                        // One-time schedules that happened more than 2 weeks ago
                        isRecurring: false,
                        startDate: {
                            lt: twoWeeksAgo
                        }
                    }
                ]
            }
        });

        if (result.count > 0) {
            console.log(`[Cron] Cleaned up ${result.count} expired schedules.`);
        }
    } catch (error) {
        console.error("[Cron] Failed to clean schedules:", error);
    }
};

// Simple interval-based cron (runs once a day)
export const startCronJobs = () => {
    // Run every 24 hours (24 * 60 * 60 * 1000)
    setInterval(() => {
        cleanOldNotifications();
        cleanOldSchedules();
    }, 24 * 60 * 60 * 1000);
    
    // Run immediately on startup too
    cleanOldNotifications();
    cleanOldSchedules();
};
