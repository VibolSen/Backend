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

    const teacherIdStr = teacherId as string;

    // 1. Get Groups related to this teacher (via Schedule OR Course Lead OR Monitor)
    const teacherGroups = await prisma.group.findMany({
        where: {
            OR: [
                { schedules: { some: { assignedToTeacherId: teacherIdStr } } },
                { courses: { some: { leadById: teacherIdStr } } },
                { monitorId: teacherIdStr }
            ]
        },
        select: { id: true, studentIds: true, name: true }
    });

    // 2. Distinct students in these groups
    const studentIdsSet = new Set<string>();
    teacherGroups.forEach(g => {
        g.studentIds.forEach(sid => studentIdsSet.add(sid));
    });
    const studentsCount = studentIdsSet.size;

    // 3. Get all courses this teacher is involved with
    const teacherCourses = await prisma.course.findMany({
      where: {
        OR: [
          { leadById: teacherIdStr },
          { schedules: { some: { assignedToTeacherId: teacherIdStr } } },
          { groups: { some: { OR: [
            { monitorId: teacherIdStr },
            { studentIds: { has: teacherIdStr } }
          ] } } }
        ]
      },
      include: {
        _count: {
          select: {
            enrollments: true,
            groups: true
          }
        },
        groups: {
          select: {
            studentIds: true
          }
        }
      }
    });

    const coursesCount = teacherCourses.length;

    const [assignmentsCount, pendingSubmissionsCount, recentSubmissions, recentAnnouncements, recentLibraryResources] = await Promise.all([
      prisma.assignment.count({ where: { teacherId: teacherIdStr } }),
      prisma.submission.count({
          where: { assignment: { teacherId: teacherIdStr }, status: 'SUBMITTED' }
      }),
      prisma.submission.findMany({
          where: { assignment: { teacherId: teacherIdStr }, status: 'SUBMITTED' },
          take: 5,
          orderBy: { submittedAt: 'desc' },
          include: {
              student: { select: { firstName: true, lastName: true, email: true } },
              assignment: { select: { title: true } }
          }
      }),
      prisma.announcement.findMany({
          where: { authorId: teacherIdStr },
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { course: { select: { name: true } } }
      }),
      prisma.libraryResource.findMany({
          where: { uploadedById: teacherIdStr },
          take: 3,
          orderBy: { createdAt: 'desc' }
      })
    ]);

    // 4. Find sessions that might need attendance marking
    // Look for sessions in the past 48 hours for groups this teacher is assigned to
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const recentSessions = await prisma.session.findMany({
        where: {
            startTime: { gte: fortyEightHoursAgo, lte: new Date() },
            schedule: { assignedToTeacherId: teacherIdStr }
        },
        include: {
            schedule: {
                include: {
                    assignedToGroup: { select: { id: true, name: true } },
                    course: { select: { name: true } }
                }
            }
        }
    });

    const pendingAttendance = [];
    for (const session of recentSessions) {
        if (session.schedule.assignedToGroup) {
            // Check if attendance records exist for this group on this session's date
            // We'll simplify and check if ANY attendance exists for this group + date
            const attendanceExists = await prisma.attendance.count({
                where: {
                    groupId: session.schedule.assignedToGroup.id,
                    date: {
                        gte: new Date(session.startTime.setHours(0,0,0,0)),
                        lte: new Date(session.startTime.setHours(23,59,59,999))
                    }
                }
            });

            if (attendanceExists === 0) {
                pendingAttendance.push({
                    sessionId: session.id,
                    groupName: session.schedule.assignedToGroup.name,
                    groupId: session.schedule.assignedToGroup.id,
                    courseName: session.schedule.course?.name || "N/A",
                    startTime: session.startTime
                });
            }
        }
    }

    // Aggregate stats for studentsPerCourse
    const studentsPerCourse = teacherCourses.map(c => {
      const distinctStudents = new Set<string>();
      c.groups.forEach(g => g.studentIds.forEach(sid => distinctStudents.add(sid)));
      return {
        name: c.name,
        studentCount: Math.max(c._count.enrollments, distinctStudents.size)
      };
    });

    // 5. Calculate real grade metrics
    const [assignmentSubmissions, examSubmissions] = await Promise.all([
      prisma.submission.findMany({
        where: { 
          assignment: { teacherId: teacherIdStr },
          status: 'GRADED',
          grade: { not: null }
        },
        select: { grade: true }
      }),
      prisma.examSubmission.findMany({
        where: {
          exam: { teacherId: teacherIdStr },
          status: 'GRADED',
          grade: { not: null }
        },
        select: { grade: true }
      })
    ]);

    const allGrades = [
      ...assignmentSubmissions.map(s => s.grade as number),
      ...examSubmissions.map(s => s.grade as number)
    ];

    const averageGrade = allGrades.length > 0 
      ? Math.round(allGrades.reduce((a, b) => a + b, 0) / allGrades.length)
      : 0;

    // Calculate Grade Distribution (A: 90-100, B: 80-89, C: 70-79, D: 60-69, F: <60)
    const distribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    allGrades.forEach(g => {
      if (g >= 90) distribution.A++;
      else if (g >= 80) distribution.B++;
      else if (g >= 70) distribution.C++;
      else if (g >= 60) distribution.D++;
      else distribution.F++;
    });

    const gradeDistribution = [
      { name: 'A (90-100)', count: distribution.A },
      { name: 'B (80-89)', count: distribution.B },
      { name: 'C (70-79)', count: distribution.C },
      { name: 'D (60-69)', count: distribution.D },
      { name: 'F (<60)', count: distribution.F }
    ];

    res.json({
      totalStudents: studentsCount,
      totalCourses: coursesCount,
      averageGrade,
      groups: teacherGroups.length,
      assignments: assignmentsCount,
      pendingSubmissions: pendingSubmissionsCount,
      recentSubmissions,
      recentAnnouncements,
      recentLibraryResources,
      pendingAttendance,
      studentsPerCourse,
      gradeDistribution
    });
  } catch (error) {
    console.error("Failed to fetch teacher stats:", error);
    res.status(500).json({ error: "Failed to fetch teacher stats" });
  }
};

export const getStudentStats = async (req: any, res: Response) => {
  try {
    const { studentId: queryStudentId } = req.query;
    const { userId, role } = req.user;

    // Use query param studentId if admin/staff, otherwise force use of own userId for students
    let targetStudentId = userId;
    if ((role === 'ADMIN' || role === 'STUDY_OFFICE' || role === 'TEACHER') && queryStudentId) {
      targetStudentId = queryStudentId as string;
    }

    if (!targetStudentId) return res.status(400).json({ error: "studentId is required" });

    console.log(`[Dashboard] Fetching stats for target student: ${targetStudentId}`);

    // Fetch user to get their groupIds directly
    let targetUser = await prisma.user.findUnique({
      where: { id: targetStudentId },
      select: { groupIds: true }
    });

    let groupIds = targetUser?.groupIds || [];

    // Fallback: If User.groupIds is empty, check Group.studentIds
    if (groupIds.length === 0) {
        const groups = await prisma.group.findMany({
            where: { studentIds: { has: targetStudentId } },
            select: { id: true }
        });
        groupIds = groups.map(g => g.id);
    }

    console.log(`[Dashboard] Student groups: ${groupIds.join(', ')}`);

    // 1. Fetch Basic Stats
    const [enrollments, pendingInvoices, pendingAssignmentsCount, pendingExamsCount] = await Promise.all([
      prisma.enrollment.count({ where: { studentId: targetStudentId } }),
      prisma.invoice.findMany({
          where: { studentId: targetStudentId, status: 'SENT' }
      }),
      // Count assignments for the student's groups that they haven't submitted yet
      groupIds.length > 0 ? prisma.assignment.count({
          where: { 
            groupId: { in: groupIds },
            submissions: { none: { studentId: targetStudentId } }
          }
      }) : 0,
      // Count exams for the student's groups
      groupIds.length > 0 ? prisma.exam.count({
          where: {
            groupId: { in: groupIds },
            submissions: { none: { studentId: targetStudentId } }
          }
      }) : 0
    ]);

    console.log(`[Dashboard] Stats: enrollments=${enrollments}, assignments=${pendingAssignmentsCount}, exams=${pendingExamsCount}`);

    // 2. Fetch Recent Announcements (from student's groups/courses)
    const recentAnnouncements = await prisma.announcement.findMany({
      where: {
        OR: [
          { course: { enrollments: { some: { studentId: targetStudentId } } } },
          { course: { groupIds: { hasSome: groupIds } } }
        ]
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { firstName: true, lastName: true } },
        course: { select: { name: true } }
      }
    });

    // 3. Fetch Upcoming Schedule Sessions
    const upcomingSchedules = groupIds.length > 0 ? await (prisma.schedule as any).findMany({
      where: {
        assignedToGroupId: { in: groupIds }
      },
      include: {
        sessions: {
          where: { startTime: { gte: new Date() } },
          orderBy: { startTime: 'asc' },
          take: 5
        },
        course: { select: { name: true } }
      }
    }) : [];

    const upcomingSessions = upcomingSchedules.flatMap((s: any) => 
      s.sessions.map((sess: any) => ({
        ...sess,
        title: s.title,
        courseName: s.course?.name,
        location: s.location
      }))
    ).sort((a: any, b: any) => a.startTime.getTime() - b.startTime.getTime()).slice(0, 5);

    // 4. Fetch Recent Grades
    const recentGrades = await prisma.submission.findMany({
      where: {
        studentId: targetStudentId,
        status: 'GRADED'
      },
      take: 5,
      orderBy: { submittedAt: 'desc' },
      include: {
        assignment: { select: { title: true } }
      }
    });

    const totalInvoiced = pendingInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

    const attendances = await prisma.attendance.findMany({
      where: { studentId: targetStudentId }
    });
    const totalAttendance = attendances.length;
    const presentCount = attendances.filter(a => a.status === 'PRESENT').length;
    const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

    res.json({
      enrollments,
      attendanceRate,
      pendingInvoicesCount: pendingInvoices.length,
      pendingAssignmentsCount,
      pendingExamsCount,
      totalInvoiced,
      gpa: 3.8, // Placeholder
      recentAnnouncements,
      upcomingSessions,
      recentGrades,
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

    const departmentsWithCourseCount = await prisma.department.findMany({
      select: {
        name: true,
        _count: {
          select: { departmentCourses: true }
        }
      }
    });

    res.json({
      totalStaff,
      totalTeachers,
      totalDepartments,
      staffByStatus: [
        { name: 'Active', value: totalStaff },
        { name: 'On Leave', value: 0 }
      ],
      coursesByDepartment: departmentsWithCourseCount.map(d => ({
        name: d.name,
        count: d._count.departmentCourses
      })),
      studentsPerGroup: studentsPerGroup.map(g => ({ name: g.name, count: g.students.length }))
    });
  } catch (error) {
    console.error("Failed to fetch HR stats:", error);
    res.status(500).json({ error: "Failed to fetch HR stats" });
  }
};

export const getStudentsPerformance = async (req: any, res: Response) => {
  try {
    const { userId, role } = req.user;
    let whereClause: any = { role: 'STUDENT' };

    // 1. Determine which students to fetch based on role
    if (role === 'STUDENT') {
      whereClause.id = userId;
    } else if (role === 'TEACHER') {
      // Find students in groups the teacher is lead of, monitor of, or scheduled for
      const teacherGroups = await prisma.group.findMany({
        where: {
          OR: [
            { courses: { some: { leadById: userId } } },
            { monitorId: userId },
            { schedules: { some: { assignedToTeacherId: userId } } }
          ]
        },
        select: { studentIds: true }
      });

      const studentIds = Array.from(new Set(teacherGroups.flatMap(g => g.studentIds)));
      whereClause.id = { in: studentIds };
    }
    // For ADMIN and STUDY_OFFICE, we leave whereClause as is (role: 'STUDENT')

    const students = await prisma.user.findMany({
      where: whereClause,
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

export const getStudyOfficeStats = async (req: Request, res: Response) => {
  try {
    const [students, teachers, courses, groups, departments, faculties, enrollmentsCount] = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'TEACHER' } }),
      prisma.course.count(),
      prisma.group.count(),
      prisma.department.count(),
      prisma.faculty.count(),
      prisma.enrollment.count()
    ]);

    const [recentAnnouncements, recentCourses, pendingEnrollments] = await Promise.all([
      prisma.announcement.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { firstName: true, lastName: true } }, course: { select: { name: true } } }
      }),
      prisma.course.findMany({
          take: 5,
          orderBy: { id: 'desc' }, // Assuming newer IDs are recent
          include: { leadBy: { select: { firstName: true, lastName: true } } }
      }),
      // Simple pending logic: students with no enrollments
      prisma.user.count({
          where: { role: 'STUDENT', enrollments: { none: {} } }
      })
    ]);

    res.json({
      studentCount: students,
      teacherCount: teachers,
      courseCount: courses,
      groupCount: groups,
      departmentCount: departments,
      facultyCount: faculties,
      enrollmentsCount,
      pendingEnrollments,
      recentAnnouncements,
      recentCourses
    });
  } catch (error) {
    console.error("Failed to fetch study office stats:", error);
    res.status(500).json({ error: "Failed to fetch study office stats" });
  }
};
