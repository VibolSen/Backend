import { Request, Response } from 'express';
import prisma from '../prisma';

// Helper to get today's range
// Helper to get today's range and date string
const getTodayInfo = () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const start = new Date(dateStr);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { dateStr, start, end };
};

export const getAttendance = async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
    }

    const { dateStr } = getTodayInfo();

    const attendanceRecord = await prisma.staffAttendance.findUnique({
      where: {
        staff_attendance_unique: {
            userId: userId,
            date: dateStr
        }
      }
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
            res.status(400).json({ error: 'User identity (userId) is missing from request' });
            return;
        }

        const { dateStr } = getTodayInfo();
        
        const existing = await prisma.staffAttendance.findUnique({
            where: {
                staff_attendance_unique: {
                    userId,
                    date: dateStr
                }
            }
        });

        if (existing) {
            res.status(400).json({ error: `Shift already initiated for today at ${new Date(existing.checkInTime).toLocaleTimeString()}` });
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
                date: dateStr,
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

        const { dateStr } = getTodayInfo();
        const record = await prisma.staffAttendance.findUnique({
            where: {
                staff_attendance_unique: {
                    userId,
                    date: dateStr
                }
            }
        });

        if (!record) {
             res.status(400).json({ error: 'No active shift found to terminate. Ensure you have initiated a shift first.' });
             return;
        }

        if (record.checkOutTime) {
            res.status(400).json({ error: 'Shift already terminated for today.' });
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

// Dispatcher for HR page
export const checkAttendanceAction = async (req: Request, res: Response) => {
    const { action } = req.body;
    if (action === "CHECK_IN") return checkIn(req, res);
    if (action === "CHECK_OUT") return checkOut(req, res);
    res.status(400).json({ error: "Invalid action type" });
}

export const manualUpdate = async (req: Request, res: Response) => {
    try {
        const { userId, date, status, checkOutTime, checkInTime } = req.body;
        if (!userId || !date || !status) {
             res.status(400).json({ error: 'Missing required fields' });
             return;
        }
        
        const dateStr = new Date(date).toISOString().split('T')[0];
        const cin = checkInTime ? new Date(checkInTime) : new Date(dateStr);
        if (!checkInTime) cin.setHours(8, 0, 0, 0);

        const updated = await prisma.staffAttendance.upsert({
             where: {
                staff_attendance_unique: {
                    userId,
                    date: dateStr
                }
             },
             update: {
                 status,
                 checkInTime: cin,
                 checkOutTime: checkOutTime ? new Date(checkOutTime) : null
             },
             create: {
                 userId,
                 date: dateStr,
                 checkInTime: cin,
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
            dateFilter.date = {
                gte: String(startDate),
                lte: String(endDate)
            };
        }

        const staff = await prisma.user.findMany({
            where: {
                role: { in: ['HR', 'ADMIN', 'TEACHER', 'STUDY_OFFICE', 'FINANCE'] }
            }
        });

        const stats = await Promise.all(staff.map(async (user) => {
             const present = await prisma.staffAttendance.count({
                 where: {
                     userId: user.id,
                     status: { in: ['PRESENT', 'LATE'] },
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
        const dateStr = date || new Date().toISOString().split('T')[0];
        
        const query: any = {
            where: {
                date: dateStr
            }
        };

        if (userIds && Array.isArray(userIds)) {
            query.where.userId = { in: userIds };
        }

        const records = await prisma.staffAttendance.findMany(query);

        // Convert array to dictionary indexed by userId
        const attendanceMap: Record<string, any> = {};
        records.forEach(record => {
            attendanceMap[record.userId] = record;
        });

        res.json(attendanceMap);
    } catch (err) {
        console.error("Bulk fetch failed:", err);
        res.status(500).json({ error: "Failed to fetch bulk attendance" });
    }
};

export const getSessionAttendance = async (req: Request, res: Response) => {
    try {
        const { courseId, date } = req.query;
        if (!courseId || !date) {
            return res.status(400).json({ error: "courseId and date are required" });
        }

        const startOfDay = new Date(String(date));
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(String(date));
        endOfDay.setHours(23, 59, 59, 999);

        const attendance = await prisma.attendance.findMany({
            where: {
                date: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
                student: {
                    OR: [
                        { enrollments: { some: { courseId: String(courseId) } } },
                        { groups: { some: { courses: { some: { id: String(courseId) } } } } }
                    ]
                }
            },
            select: {
                studentId: true,
                status: true
            }
        });

        res.json(attendance);
    } catch (err) {
        console.error("Failed to fetch session attendance:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const submitSessionAttendance = async (req: Request, res: Response) => {
    try {
        const { records } = req.body;
        if (!records || !Array.isArray(records)) {
            return res.status(400).json({ error: "records array is required" });
        }

        const results = [];
        for (const record of records) {
            const { studentId, date, status, courseId } = record;
            
            const attendanceDate = new Date(date);
            const startOfDay = new Date(attendanceDate);
            startOfDay.setHours(0, 0, 0, 0);

            const group = await prisma.group.findFirst({
                where: {
                    students: { some: { id: studentId } },
                    courses: { some: { id: courseId } }
                },
                select: { id: true }
            });

            if (!group) {
                console.warn(`No group found for student ${studentId} and course ${courseId}`);
                continue;
            }

            const upserted = await prisma.attendance.upsert({
                where: {
                    attendance_unique: {
                        date: startOfDay,
                        studentId: studentId,
                        groupId: group.id
                    }
                },
                update: {
                    status: status
                },
                create: {
                    date: startOfDay,
                    studentId: studentId,
                    groupId: group.id,
                    status: status
                }
            });
            results.push(upserted);
        }

        res.json({ message: "Attendance saved", count: results.length });
    } catch (err) {
        console.error("Failed to submit session attendance:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
