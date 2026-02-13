import { Request, Response } from 'express';
import prisma from '../prisma';

export const getTeachers = async (req: Request, res: Response) => {
  try {
    const teachers = await prisma.user.findMany({
      where: { role: "TEACHER" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        _count: {
            select: {
              ledCourses: true,
            },
        },
      },
      orderBy: { firstName: "asc" },
    });
    res.json(teachers);
  } catch (err) {
    console.error("Failed to fetch teachers:", err);
    res.status(500).json({ error: "Failed to fetch teachers" });
  }
};

export const getTeacherCourses = async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.query;

    if (!teacherId) {
      return res.status(400).json({ error: 'Teacher ID is required' });
    }

    const courses = await prisma.course.findMany({
      where: {
        leadById: String(teacherId),
      },
      include: {
        courseDepartments: {
          include: {
            department: true
          }
        },
        enrollments: {
          select: {
            studentId: true
          }
        },
        groups: {
          select: {
            studentIds: true
          }
        },
        _count: {
          select: {
            groups: true,
            enrollments: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Map the response to match the frontend expectations
    const formattedCourses = courses.map(course => {
      // Collect unique student IDs from both enrollments and groups
      const studentIdSet = new Set<string>();
      
      // Add students from enrollments
      course.enrollments.forEach(enrollment => {
        studentIdSet.add(enrollment.studentId);
      });
      
      // Add students from groups
      course.groups.forEach(group => {
        group.studentIds.forEach(studentId => {
          studentIdSet.add(studentId);
        });
      });

      return {
        ...course,
        department: course.courseDepartments[0]?.department,
        groupCount: course._count.groups,
        studentCount: studentIdSet.size
      };
    });

    res.json(formattedCourses);
  } catch (error) {
    console.error("Error fetching teacher courses:", error);
    res.status(500).json({ error: "Failed to fetch teacher courses" });
  }
};

export const createTeacher = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // TODO: Hash password here using bcrypt when auth is fully migrated
    const hashedPassword = password; 

    const newTeacher = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role: 'TEACHER',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    });

    res.status(201).json(newTeacher);
  } catch (error) {
    console.error("Error creating teacher:", error);
    res.status(500).json({ error: "Failed to create teacher" });
  }
};

export const getTeacherById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const teacher = await prisma.user.findUnique({
          where: { id: String(id), role: 'TEACHER' },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        });
    
        if (!teacher) {
          res.status(404).json({ message: 'Teacher not found' });
          return;
        }
    
        res.json(teacher);
      } catch (error) {
        console.error('Error fetching teacher:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
};


export const updateTeacher = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email } = req.body;

    const updatedTeacher = await prisma.user.update({
      where: { id: String(id), role: 'TEACHER' },
      data: {
        firstName,
        lastName,
        email,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    });

    res.json(updatedTeacher);
  } catch (error) {
    console.error("Error updating teacher:", error);
    res.status(500).json({ error: "Failed to update teacher" });
  }
};

export const deleteTeacher = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.user.delete({
      where: { id: String(id), role: 'TEACHER' },
    });

    res.json({ message: "Teacher deleted successfully" });
  } catch (error) {
    console.error("Error deleting teacher:", error);
    res.status(500).json({ error: "Failed to delete teacher" });
  }
};
export const getMyStudents = async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.query;

    if (!teacherId) {
      return res.status(400).json({ error: "Teacher ID is required" });
    }

    // Find all courses led by this teacher
    const courses = await prisma.course.findMany({
      where: {
        leadById: String(teacherId),
      },
      include: {
        // Include students from direct enrollments
        enrollments: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
        },
        // Include students from groups
        groups: {
          include: {
            students: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    // Use a Map to get unique students across multiple courses and sources
    const studentMap = new Map();
    
    courses.forEach((course) => {
      // Add students from enrollments
      course.enrollments.forEach((enrollment) => {
        const student = enrollment.student;
        if (student && !studentMap.has(student.id)) {
          studentMap.set(student.id, student);
        }
      });

      // Add students from groups
      course.groups.forEach((group) => {
        group.students.forEach((student) => {
          if (student && !studentMap.has(student.id)) {
            studentMap.set(student.id, student);
          }
        });
      });
    });

    const students = Array.from(studentMap.values());
    res.json(students);
  } catch (error) {
    console.error("Error fetching my students:", error);
    res.status(500).json({ error: "Failed to fetch students" });
  }
};

export const getMyGroups = async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.query;

    if (!teacherId) {
      return res.status(400).json({ error: "Teacher ID is required" });
    }

    // Find all courses led by this teacher and their associated groups
    const courses = await prisma.course.findMany({
      where: {
        leadById: String(teacherId),
      },
      include: {
        groups: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Flatten and deduplicate groups
    const groupMap = new Map();
    courses.forEach((course) => {
      course.groups.forEach((group) => {
        if (!groupMap.has(group.id)) {
          groupMap.set(group.id, group);
        }
      });
    });

    const groups = Array.from(groupMap.values());
    res.json(groups);
  } catch (error) {
    console.error("Error fetching my groups:", error);
    res.status(500).json({ error: "Failed to fetch groups" });
  }
};

export const getGroupStudents = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;

    const group = await prisma.group.findUnique({
      where: { id: String(groupId) },
      include: {
        students: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    res.json(group.students);
  } catch (error) {
    console.error("Error fetching group students:", error);
    res.status(500).json({ error: "Failed to fetch group students" });
  }
};

export const getGroupAttendance = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: "Date is required" });
    }

    const startOfDay = new Date(String(date));
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(String(date));
    endOfDay.setHours(23, 59, 59, 999);

    const attendance = await prisma.attendance.findMany({
      where: {
        groupId: String(groupId),
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.json(attendance);
  } catch (error) {
    console.error("Error fetching group attendance:", error);
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
};

export const submitGroupAttendance = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const { date, attendances } = req.body;

    if (!date || !attendances || !Array.isArray(attendances)) {
      return res.status(400).json({ error: "Date and attendances array are required" });
    }

    const attendanceDate = new Date(date);

    // Delete existing attendance for this group and date
    await prisma.attendance.deleteMany({
      where: {
        groupId: String(groupId),
        date: {
          gte: new Date(attendanceDate.setHours(0, 0, 0, 0)),
          lte: new Date(attendanceDate.setHours(23, 59, 59, 999)),
        },
      },
    });

    // Create new attendance records
    const records = await prisma.attendance.createMany({
      data: attendances.map((att: any) => ({
        studentId: att.studentId,
        groupId: String(groupId),
        date: new Date(date),
        status: att.status,
      })),
    });

    res.json({ message: "Attendance submitted successfully", count: records.count });
  } catch (error) {
    console.error("Error submitting group attendance:", error);
    res.status(500).json({ error: "Failed to submit attendance" });
  }
};
