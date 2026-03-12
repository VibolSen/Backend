import { Request, Response } from 'express';
import prisma from '../prisma';
import bcrypt from 'bcrypt';
import { generateStudentId } from '../utils/idGenerator';

export const getStudentCourses = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.query;

    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }

    // 1. Get explicit enrollments
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: String(studentId) },
      include: {
        course: {
          include: {
            leadBy: { select: { firstName: true, lastName: true } },
          }
        }
      }
    });

    // 2. Get courses through group membership (using relation lookup for reliability)
    const groups = await prisma.group.findMany({
      where: {
        students: {
          some: { id: String(studentId) }
        }
      },
      include: {
        courses: {
          include: {
            leadBy: { select: { firstName: true, lastName: true } },
          }
        }
      }
    });

    // 3. Merge and deduplicate courses
    const courseMap = new Map();

    // Add courses from explicit enrollments
    enrollments.forEach(en => {
      courseMap.set(en.courseId, {
        ...en.course,
        progress: en.progress,
        groupName: "Individual Enrollment"
      });
    });

    // Add courses from groups
    groups.forEach(group => {
      group.courses.forEach(course => {
        if (!courseMap.has(course.id)) {
          courseMap.set(course.id, {
            ...course,
            progress: 0, // Default for group courses if no enrollment record
            groupName: group.name
          });
        } else {
          // If already there, update groupName if it was "Individual"
          const existing = courseMap.get(course.id);
          existing.groupName = group.name;
        }
      });
    });

    res.json(Array.from(courseMap.values()));
  } catch (error) {
    console.error("Error fetching student courses:", error);
    res.status(500).json({ error: "Failed to fetch student courses" });
  }
};
export const getStudentAssignments = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.query;

    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }

    // Fetch all assignments for groups the student is in
    const assignments = await prisma.assignment.findMany({
      where: {
        group: {
          students: {
            some: { id: String(studentId) }
          }
        }
      },
      include: {
        group: { select: { name: true } },
        submissions: {
          where: { studentId: String(studentId) }
        }
      },
      orderBy: {
        dueDate: 'asc'
      }
    });

    // Map to the format expected by the frontend (Submission-centric)
    const results = assignments.map(a => {
      const submission = a.submissions[0];
      return {
        id: submission?.id || a.id, // Use submission ID if available, otherwise assignment ID
        status: submission?.status || 'PENDING',
        grade: submission?.grade || null,
        submittedAt: submission?.submittedAt || null,
        assignment: a
      };
    });

    res.json(results);
  } catch (error) {
    console.error("Error fetching student assignments:", error);
    res.status(500).json({ error: "Failed to fetch student assignments" });
  }
};

export const getStudentAttendance = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.query;

    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }

    const attendance = await prisma.attendance.findMany({
      where: {
        studentId: String(studentId),
      },
      include: {
        group: true, // Include group details if needed
      },
      orderBy: {
        date: 'desc',
      },
    });

    res.json(attendance);
  } catch (error) {
    console.error("Error fetching student attendance:", error);
    res.status(500).json({ error: "Failed to fetch student attendance" });
  }
};

export const getStudentExams = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.query;

    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }

    // Fetch all exams for groups the student is in
    const exams = await (prisma.exam as any).findMany({
      where: {
        group: {
          students: {
            some: { id: String(studentId) }
          }
        }
      },
      include: {
        group: { select: { name: true } },
        submissions: {
          where: { studentId: String(studentId) }
        }
      },
      orderBy: {
        date: 'asc' // Show upcoming first
      }
    });

    // Map to the format expected by the frontend (Submission-centric)
    const results = exams.map((e: any) => {
      const submission = e.submissions[0];
      return {
        id: submission?.id || e.id,
        status: submission?.status || 'PENDING',
        grade: submission?.grade || null,
        submittedAt: submission?.submittedAt || null,
        exam: e
      };
    });

    res.json(results);
  } catch (error) {
    console.error("Error fetching student exams:", error);
    res.status(500).json({ error: "Failed to fetch student exams" });
  }
};

export const getStudents = async (req: Request, res: Response) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      include: {
        enrollments: {
          include: { course: true }
        },
        profile: true,
        department: {
          include: { faculty: true }
        }
      },
      orderBy: { lastName: 'asc' }
    });
    res.json(students || []);
  } catch (err) {
    console.error("Failed to fetch students:", err);
    res.status(500).json([]);
  }
};

export const createStudent = async (req: Request, res: Response) => {
  try {
    const {
      email, password, firstName, lastName, role, departmentId,
      gender, academicStatus, academicYear, generation,
      emergencyContactName, emergencyContactPhone, emergencyContactRelation,
      specialization, maxWorkload,
      currentCourses
    } = req.body;

    if (!email || !firstName || !lastName) {
      return res.status(400).json({ error: "Missing required identity fields" });
    }

    const hashedPassword = await bcrypt.hash(password || '123456', 10);
    const studentId = await generateStudentId();

    const newStudent = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'STUDENT',
        departmentId: departmentId || undefined,
        profile: {
          create: {
            gender: gender || 'Other',
            academicStatus: academicStatus || 'ACTIVE',
            studentId,
            academicYear: academicYear ? parseInt(String(academicYear)) : 1,
            generation: generation || "",
            emergencyContactName,
            emergencyContactPhone,
            emergencyContactRelation,
            specialization: specialization || [],
            maxWorkload: maxWorkload ? parseInt(String(maxWorkload)) : undefined,
          } as any
        }
      },
      include: { profile: true }
    });

    if (currentCourses && Array.isArray(currentCourses) && currentCourses.length > 0) {
      await prisma.enrollment.createMany({
        data: currentCourses.map((courseId: string) => ({
          studentId: newStudent.id,
          courseId: courseId
        }))
      });
    }

    res.status(201).json(newStudent);
  } catch (error: any) {
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return res.status(400).json({ error: "A user with this email already exists." });
    }
    console.error("Error creating student:", error);
    res.status(500).json({ error: "Failed to create student", details: (error as any).message });
  }
};

export const updateStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      email, firstName, lastName, role, departmentId,
      gender, academicStatus, academicYear, generation,
      emergencyContactName, emergencyContactPhone, emergencyContactRelation,
      specialization, maxWorkload,
      currentCourses
    } = req.body;

    if (!id) {
      res.status(400).json({ error: "Student ID is required" });
      return;
    }

    const updatedStudent = await prisma.user.update({
      where: { id: String(id) },
      data: {
        email,
        firstName,
        lastName,
        departmentId: departmentId || undefined,
        profile: {
          upsert: {
            create: {
              gender: gender || 'Other',
              academicStatus: academicStatus || 'ACTIVE',
              academicYear: academicYear ? parseInt(String(academicYear)) : 1,
              generation: generation || "",
              emergencyContactName,
              emergencyContactPhone,
              emergencyContactRelation,
              specialization: specialization || [],
              maxWorkload: maxWorkload ? parseInt(String(maxWorkload)) : undefined,
            } as any,
            update: {
              gender,
              academicStatus,
              academicYear: academicYear ? parseInt(String(academicYear)) : undefined,
              generation,
              emergencyContactName,
              emergencyContactPhone,
              emergencyContactRelation,
              specialization: specialization || undefined,
              maxWorkload: maxWorkload ? parseInt(String(maxWorkload)) : undefined,
            } as any
          }
        }
      },
      include: { profile: true }
    });

    if (currentCourses && Array.isArray(currentCourses)) {
      // Remove existing enrollments
      await prisma.enrollment.deleteMany({
        where: { studentId: String(id) }
      });

      // Add new enrollments
      if (currentCourses.length > 0) {
        await prisma.enrollment.createMany({
          data: currentCourses.map((courseId: string) => ({
            studentId: String(id),
            courseId: courseId
          }))
        });
      }
    }

    res.json(updatedStudent);
  } catch (error: any) {
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return res.status(400).json({ error: "A user with this email already exists." });
    }
    console.error("Error updating student:", error);
    res.status(500).json({ error: "Failed to update student", details: (error as any).message });
  }
};

export const deleteStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: "Student ID (User ID) is required" });
      return;
    }

    await prisma.user.delete({
      where: { id: String(id) },
    });

    res.json({ message: "Student deleted successfully" });
  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).json({ error: "Failed to delete student" });
  }
};
