import { Request, Response } from 'express';
import prisma from '../prisma';

// Helper to get today's range
const getTodayRange = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return { today, tomorrow };
};

export const getAttendance = async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
    }

    const { today, tomorrow } = getTodayRange();

    const attendanceRecord = await prisma.staffAttendance.findFirst({
      where: {
        userId: userId,
        checkInTime: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: { checkInTime: 'desc' },
    });

    res.json(attendanceRecord || null);
  } catch (err) {
    console.error("Failed to fetch attendance:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const checkIn = async (req: Request, res: Response) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            res.status(400).json({ error: 'User ID is required' });
            return;
        }

        const { today, tomorrow } = getTodayRange();
        
        const existing = await prisma.staffAttendance.findFirst({
            where: {
                userId,
                checkInTime: { gte: today, lt: tomorrow }
            }
        });

        if (existing) {
            res.status(400).json({ error: 'Already checked in for today' });
            return;
        }

        const now = new Date();
        const workStartTime = new Date();
        workStartTime.setHours(8, 0, 0, 0);

        const lateMinutes = Math.max(0, Math.floor((now.getTime() - workStartTime.getTime()) / 60000));
        let status: 'PRESENT' | 'LATE' = lateMinutes > 0 ? 'LATE' : 'PRESENT';
        let note = lateMinutes > 0 ? `Late by ${lateMinutes} minutes.` : null;

        const record = await prisma.staffAttendance.create({
            data: {
                userId,
                checkInTime: now,
                status,
                lateMinutes,
                note
            }
        });
        res.status(201).json(record);

    } catch (err) {
        console.error("Check-in failed:", err);
        res.status(500).json({ error: "Check-in failed" });
    }
}

export const checkOut = async (req: Request, res: Response) => {
    try {
        const { userId } = req.body;
        if (!userId) {
             res.status(400).json({ error: 'User ID is required' });
             return;
        }

        const { today, tomorrow } = getTodayRange();
        const record = await prisma.staffAttendance.findFirst({
            where: {
                userId,
                checkInTime: { gte: today, lt: tomorrow },
                checkOutTime: null
            },
            orderBy: { checkInTime: 'desc' }
        });

        if (!record) {
             res.status(400).json({ error: 'No active check-in found for today' });
             return;
        }

        const updated = await prisma.staffAttendance.update({
            where: { id: record.id },
            data: { checkOutTime: new Date() }
        });
        res.json(updated);

    } catch (err) {
        console.error("Check-out failed:", err);
        res.status(500).json({ error: "Check-out failed" });
    }
}

export const manualUpdate = async (req: Request, res: Response) => {
    try {
        const { userId, date, status, checkOutTime } = req.body;
        if (!userId || !date || !status) {
             res.status(400).json({ error: 'Missing required fields' });
             return;
        }
        
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        const updated = await prisma.staffAttendance.upsert({
             where: {
                staff_attendance_unique: {
                    userId,
                    checkInTime: targetDate
                }
             },
             update: {
                 status,
                 checkOutTime: checkOutTime ? new Date(checkOutTime) : null
             },
             create: {
                 userId,
                 checkInTime: targetDate,
                 status,
                 checkOutTime: checkOutTime ? new Date(checkOutTime) : null
             }
        });
        res.json(updated);

    } catch (err) {
        console.error("Manual update failed:", err);
         res.status(500).json({ error: "Manual update failed" });
    }
}

export const getStaffStats = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;
        
        const dateFilter: any = {};
        if (startDate && endDate) {
            dateFilter.checkInTime = {
                gte: new Date(startDate as string),
                lte: new Date(endDate as string)
            };
        }

        const staff = await prisma.user.findMany({
            where: {
                role: { in: ['HR', 'ADMIN', 'TEACHER'] }
            }
        });

        const stats = await Promise.all(staff.map(async (user) => {
             const present = await prisma.staffAttendance.count({
                 where: {
                     userId: user.id,
                     status: 'PRESENT',
                     ...dateFilter
                 }
             });
             const absent = await prisma.staffAttendance.count({
                 where: {
                     userId: user.id,
                     status: 'ABSENT',
                     ...dateFilter
                 }
             });
             return {
                 name: `${user.firstName} ${user.lastName}`,
                 present,
                 absent
             };
        }));

        res.json(stats);
    } catch (err) {
        console.error("Failed to fetch staff stats:", err);
        res.status(500).json({ error: "Failed to fetch staff stats" });
    }
};

export const bulkFetchAttendance = async (req: Request, res: Response) => {
    try {
        const { userIds, date } = req.body;
        if (!userIds || !Array.isArray(userIds) || !date) {
            res.status(400).json({ error: 'userIds array and date are required' });
            return;
        }

        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        const records = await prisma.staffAttendance.findMany({
            where: {
                userId: { in: userIds },
                checkInTime: {
                    gte: targetDate,
                    lt: nextDay
                }
            }
        });

        // Convert array to map { [userId]: record } for frontend convenience
        const recordMap = records.reduce((acc: any, record) => {
            acc[record.userId] = record;
            return acc;
        }, {});

        res.json(recordMap);
    } catch (err) {
        console.error("Bulk attendance fetch failed:", err);
        res.status(500).json({ error: "Bulk attendance fetch failed" });
    }
};
