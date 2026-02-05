import { Request, Response } from 'express';
import prisma from '../prisma';

export const getAdminStats = async (req: Request, res: Response) => {
  try {
    const [students, teachers, staff, departments, faculties, courses, groups, totalRevenue] = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'TEACHER' } }),
      prisma.user.count({ where: { role: { in: ['HR', 'STUDY_OFFICE'] } } }), // Counting HR and Study Office as staff
      prisma.department.count(),
      prisma.faculty.count(),
      prisma.course.count(),
      prisma.group.count(),
      prisma.payment.aggregate({ _sum: { amount: true } })
    ]);

    const recentInvoices = await prisma.invoice.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { student: { select: { firstName: true, lastName: true } } }
    });

    res.json({
      studentCount: students,
      teacherCount: teachers,
      staffCount: staff,
      departmentCount: departments,
      facultyCount: faculties,
      courseCount: courses,
      groupCount: groups,
      totalRevenue: totalRevenue._sum.amount || 0,
      recentInvoices
    });
  } catch (error) {
    console.error("Failed to fetch admin stats:", error);
    res.status(500).json({ error: "Failed to fetch admin stats" });
  }
};

export const getTeacherStats = async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.query;
    if (!teacherId) return res.status(400).json({ error: "teacherId is required" });

    const [groupsCount, assignmentsCount, pendingSubmissions, studentsCount, coursesCount] = await Promise.all([
      prisma.group.count({
          where: { schedules: { some: { assignedToTeacherId: teacherId as string } } }
      }),
      prisma.assignment.count({ where: { teacherId: teacherId as string } }),
      prisma.submission.count({
          where: { assignment: { teacherId: teacherId as string }, status: 'SUBMITTED' }
      }),
      prisma.user.count({
          where: { groups: { some: { schedules: { some: { assignedToTeacherId: teacherId as string } } } } }
      }),
      prisma.course.count({
          where: { leadById: teacherId as string }
      })
    ]);

    // Placeholder for complex aggregations (averages/distributions)
    // In a real scenario, these would involve more Prisma queries or raw SQL
    res.json({
      totalStudents: studentsCount,
      totalCourses: coursesCount,
      averageGrade: 85, // Placeholder
      groups: groupsCount,
      assignments: assignmentsCount,
      pendingSubmissions,
      studentsPerCourse: [], // Placeholder
      gradeDistribution: [] // Placeholder
    });
  } catch (error) {
    console.error("Failed to fetch teacher stats:", error);
    res.status(500).json({ error: "Failed to fetch teacher stats" });
  }
};

export const getStudentStats = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.query;
    if (!studentId) return res.status(400).json({ error: "studentId is required" });

    const [enrollments, attendanceRate, pendingInvoices] = await Promise.all([
      prisma.enrollment.count({ where: { studentId: studentId as string } }),
      prisma.attendance.aggregate({
          where: { studentId: studentId as string },
          _count: { id: true },
          // Simplified: total count of recorded attendances
      }),
      prisma.invoice.findMany({
          where: { studentId: studentId as string, status: 'SENT' }
      })
    ]);

    const totalInvoiced = pendingInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

    res.json({
      enrollments,
      attendanceCount: attendanceRate._count.id,
      pendingInvoicesCount: pendingInvoices.length,
      totalInvoiced,
      gpa: 3.8, // Placeholder
      performanceData: [] // Placeholder
    });
  } catch (error) {
    console.error("Failed to fetch student stats:", error);
    res.status(500).json({ error: "Failed to fetch student stats" });
  }
};

export const getHRStats = async (req: Request, res: Response) => {
  try {
    const [totalStaff, totalTeachers, totalDepartments, studentsPerGroup] = await Promise.all([
      prisma.user.count({ where: { role: { in: ['ADMIN', 'HR', 'STUDY_OFFICE'] } } }),
      prisma.user.count({ where: { role: 'TEACHER' } }),
      prisma.department.count(),
      prisma.group.findMany({ select: { name: true, students: { select: { id: true } } } })
    ]);

    res.json({
      totalStaff,
      totalTeachers,
      totalDepartments,
      staffByStatus: [
        { name: 'Active', value: totalStaff },
        { name: 'On Leave', value: 0 }
      ],
      coursesByDepartment: [],
      studentsPerGroup: studentsPerGroup.map(g => ({ name: g.name, count: g.students.length }))
    });
  } catch (error) {
    console.error("Failed to fetch HR stats:", error);
    res.status(500).json({ error: "Failed to fetch HR stats" });
  }
};

export const getStudentsPerformance = async (req: Request, res: Response) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        departmentId: true,
        submissions: {
          where: { status: { in: ['SUBMITTED', 'GRADED'] } },
          select: { grade: true, status: true }
        },
        examSubmissions: {
          where: { status: { in: ['SUBMITTED', 'GRADED'] } },
          select: { grade: true, status: true }
        },
        attendances: {
          select: { status: true }
        }
      }
    });

    const performanceData = students.map(student => {
      // Aggregate Assignment Grades
      const assignmentGrades = student.submissions
        .filter(s => s.grade !== null)
        .map(s => s.grade as number);
      
      const avgAssignmentGrade = assignmentGrades.length > 0 
        ? assignmentGrades.reduce((a, b) => a + b, 0) / assignmentGrades.length 
        : 0;

      // Aggregate Exam Grades
      const examGrades = student.examSubmissions
        .filter(s => s.grade !== null)
        .map(s => s.grade as number);
      
      const avgExamGrade = examGrades.length > 0 
        ? examGrades.reduce((a, b) => a + b, 0) / examGrades.length 
        : 0;

      // Overall Average Grade (Assignments + Exams)
      const allGrades = [...assignmentGrades, ...examGrades];
      const averageGrade = allGrades.length > 0 
        ? Math.round(allGrades.reduce((a, b) => a + b, 0) / allGrades.length) 
        : 0;

      // Attendance Rate
      const totalAttendanceRecords = student.attendances.length;
      const presentCount = student.attendances.filter(a => a.status === 'PRESENT').length;
      const attendanceRate = totalAttendanceRecords > 0 
        ? Math.round((presentCount / totalAttendanceRecords) * 100) 
        : 0;

      return {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        departmentId: student.departmentId,
        averageGrade,
        attendanceRate,
        completedAssignments: student.submissions.length,
        averageAssignmentGrade: Math.round(avgAssignmentGrade),
        averageExamGrade: Math.round(avgExamGrade),
      };
    });

    res.json(performanceData);
  } catch (error) {
    console.error("Failed to fetch student performance:", error);
    res.status(500).json({ error: "Failed to fetch student performance" });
  }
};
