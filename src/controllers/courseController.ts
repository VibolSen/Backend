import { Request, Response } from 'express';
import prisma from '../prisma';

export const getCourses = async (req: Request, res: Response) => {
  try {
    const courses = await prisma.course.findMany({
      include: {
        leadBy: {
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
            }
        },
        courseDepartments: {
             include: { department: true }
        },
        _count: {
            select: {
                enrollments: true
            }
        }
      },
      orderBy: { name: 'asc' },
    });
    res.json(courses);
  } catch (err) {
    console.error("Failed to fetch courses:", err);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
};

export const getCourseById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        leadBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        courseDepartments: {
          include: { department: true }
        },
        _count: {
          select: {
            enrollments: true,
            announcements: true
          }
        }
      },
    });

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    res.json(course);
  } catch (err) {
    console.error("Failed to fetch course detail:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const createCourse = async (req: Request, res: Response) => {
  try {
    const { name, leadById, departmentIds } = req.body; // Expecting departmentIds generic array

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const newCourse = await prisma.course.create({
      data: {
        name,
        leadById,
      },
    });

    if (departmentIds && Array.isArray(departmentIds)) {
        await prisma.courseDepartment.createMany({
            data: departmentIds.map((deptId: string) => ({
                courseId: newCourse.id,
                departmentId: deptId
            }))
        })
    }

    res.status(201).json(newCourse);
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({ error: "Failed to create course" });
  }
};

export const updateCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, leadById, departmentIds } = req.body;

    const updatedCourse = await prisma.course.update({
      where: { id },
      data: { name, leadById },
    });

    if (departmentIds) {
        // Clear existing
        await prisma.courseDepartment.deleteMany({ where: { courseId: id }});
        
        // Add new
        if(Array.isArray(departmentIds) && departmentIds.length > 0) {
             await prisma.courseDepartment.createMany({
                data: departmentIds.map((deptId: string) => ({
                    courseId: id,
                    departmentId: deptId
                }))
            })
        }
    }

    res.json(updatedCourse);
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({ error: "Failed to update course" });
  }
};

export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.course.delete({ where: { id } });
    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).json({ error: "Failed to delete course" });
  }
};

export const getCourseAnalytics = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.query;

    if (!courseId || typeof courseId !== 'string') {
      res.status(400).json({ error: "Course ID is required" });
      return;
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        leadBy: {
          select: { firstName: true, lastName: true, id: true, email: true }
        },
        courseDepartments: {
          include: { department: true }
        },
        enrollments: {
          include: {
            student: {
              select: { firstName: true, lastName: true, email: true, id: true }
            }
          }
        },
        _count: {
          select: { enrollments: true }
        }
      }
    });

    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }

    // Calculate completion rate based on progress field in Enrollment
    const enrolledStudents = course.enrollments;
    const totalStudents = enrolledStudents.length;
    
    let completionRate = 0;
    if (totalStudents > 0) {
      const totalProgress = enrolledStudents.reduce((acc, enrollment) => acc + (enrollment.progress || 0), 0);
      completionRate = Math.round(totalProgress / totalStudents);
    }

    res.json({
      course,
      enrolledStudents: enrolledStudents.map(e => e.student),
      completionRate
    });
  } catch (err: any) {
    console.error("Failed to fetch course analytics:", err);
    res.status(500).json({ error: "Failed to fetch course analytics", message: err.message });
  }
};
