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
    const formattedCourses = courses.map(course => ({
      ...course,
      department: course.courseDepartments[0]?.department,
      groupCount: course._count.groups,
      studentCount: course._count.enrollments
    }));

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
          where: { id, role: 'TEACHER' },
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
      where: { id, role: 'TEACHER' },
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
      where: { id, role: 'TEACHER' },
    });

    res.json({ message: "Teacher deleted successfully" });
  } catch (error) {
    console.error("Error deleting teacher:", error);
    res.status(500).json({ error: "Failed to delete teacher" });
  }
};
