import { Request, Response } from 'express';
import prisma from '../prisma';

export const getFaculties = async (req: Request, res: Response) => {
  try {
    const faculties = await prisma.faculty.findMany({
      include: {
        departments: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json(faculties);
  } catch (err) {
    console.error("Failed to fetch faculties:", err);
    res.status(500).json({ error: "Failed to fetch faculties" });
  }
};

export const getFacultyById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const faculty = await prisma.faculty.findUnique({
      where: { id: String(id) },
      include: {
        departments: {
          include: {
            users: {
              where: { role: 'STUDENT' },
              include: { profile: true },
              orderBy: { lastName: 'asc' }
            },
            _count: {
              select: { users: true }
            }
          }
        }
      }
    });

    if (!faculty) {
      return res.status(404).json({ error: 'Faculty not found' });
    }

    res.json(faculty);
  } catch (err) {
    console.error("Failed to fetch faculty detail:", err);
    res.status(500).json({ error: "Failed to fetch faculty detail" });
  }
};


export const createFaculty = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const newFaculty = await prisma.faculty.create({
      data: {
        name,
      },
    });

    res.status(201).json(newFaculty);
  } catch (error) {
    console.error("Error creating faculty:", error);
    res.status(500).json({ error: "Failed to create faculty" });
  }
};

export const updateFaculty = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const updatedFaculty = await prisma.faculty.update({
      where: { id: String(id) },
      data: {
        name,
      },
    });

    res.json(updatedFaculty);
  } catch (error) {
    console.error("Error updating faculty:", error);
    res.status(500).json({ error: "Failed to update faculty" });
  }
};

export const deleteFaculty = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.faculty.delete({ where: { id: String(id) } });
    res.json({ message: "Faculty deleted successfully" });
  } catch (error) {
    console.error("Error deleting faculty:", error);
    res.status(500).json({ error: "Failed to delete faculty" });
  }
};

export const getReportsData = async (req: Request, res: Response) => {
  try {
    const { departmentId } = req.query;
    
    const studentQuery: any = { role: 'STUDENT', isActive: true };
    if (departmentId && typeof departmentId === 'string' && departmentId.trim() !== '') {
        studentQuery.departmentId = departmentId;
    }

    // 1. Fetch students (removed hard take: 20 limit for complete data)
    const students = await prisma.user.findMany({
      where: studentQuery,
      select: {
          id: true,
          firstName: true,
          lastName: true,
          enrollments: { select: { progress: true } },
          attendances: { select: { status: true } }
      },
      take: 100
    });

    // 2. Grade trajectories — include all enrolled students (even 0 progress)
    const studentPerformance = students
      .filter(s => s.enrollments.length > 0)
      .map(s => {
          const totalProgress = s.enrollments.reduce((sum, en) => sum + (en.progress || 0), 0);
          const avgGrade = totalProgress / s.enrollments.length;
          return {
              name: `${s.firstName} ${s.lastName}`.trim().substring(0, 12),
              grade: Math.round(avgGrade)
          };
      });

    // 3. Engagement rate — attendance rate per student
    const classParticipation = students.map(s => {
        const totalAttendance = s.attendances.length;
        const presentCount = s.attendances.filter(a => a.status === 'PRESENT').length;
        const participationRate = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0;
        return {
            name: `${s.firstName} ${s.lastName}`.trim().substring(0, 12),
            participation: Math.round(participationRate)
        };
    }).filter(s => s.participation > 0);

    // 4. Fix: Use studentIds list instead of invalid nested where query on Attendance
    const studentIds = students.map(s => s.id);
    
    const rawAttendances = studentIds.length > 0
      ? await prisma.attendance.findMany({
            where: { studentId: { in: studentIds } },
            orderBy: { date: 'asc' },
            take: 500
        })
      : [];

    const trendsMap: Record<string, { present: number, absent: number }> = {};
    rawAttendances.forEach(a => {
        if (!a.date) return;
        const dateStr = new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!trendsMap[dateStr]) trendsMap[dateStr] = { present: 0, absent: 0 };
        if (a.status === 'PRESENT') trendsMap[dateStr].present++;
        if (a.status === 'ABSENT') trendsMap[dateStr].absent++;
    });

    const attendanceTrends = Object.keys(trendsMap).map(date => ({
        date,
        present: trendsMap[date].present,
        absent: trendsMap[date].absent
    })).slice(-10);

    res.json({
        studentPerformance,
        classParticipation,
        attendanceTrends,
        meta: {
          totalStudents: students.length,
          department: departmentId || 'all'
        }
    });
  } catch (error) {
    console.error("Failed to fetch reports:", error);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
};
