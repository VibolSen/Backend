import { Request, Response } from 'express';
import prisma from '../prisma';

export const getStudents = async (req: Request, res: Response) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      include: { 
        enrollments: {
          include: { course: true }
        },
        profile: true
      },
    });
    res.json(students || []);
  } catch (err) {
    console.error("Failed to fetch students:", err);
    res.status(500).json([]);
  }
};

export const createStudent = async (req: Request, res: Response) => {
  try {
    // Note: Converted to User creation. Ensure body contains email, password, firstName, lastName
    // Original logic linked to an existing user via userId, but schema only has User.
    // Assuming this endpoint now creates a new User with STUDENT role.
    const { currentCourses, ...userData } = req.body;

    const newStudent = await prisma.user.create({
      data: {
        ...userData,
        role: 'STUDENT',
      },
    });

    if (currentCourses && currentCourses.length > 0) {
      // Create enrollments
      await prisma.enrollment.createMany({
        data: currentCourses.map((courseId: string) => ({
          studentId: newStudent.id,
          courseId: courseId
        }))
      });
    }

    res.status(201).json(newStudent);
  } catch (error) {
    console.error("Error creating student:", error);
    res.status(500).json({ error: "Failed to create student" });
  }
};

export const updateStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { currentCourses, ...userData } = req.body;

    if (!id) {
      res.status(400).json({ error: "Student ID is required" });
      return;
    }

    const updatedStudent = await prisma.user.update({
      where: { id },
      data: userData,
    });

    if (currentCourses) {
      // Remove existing enrollments
      await prisma.enrollment.deleteMany({
        where: { studentId: id }
      });
      
      // Add new enrollments
      if (currentCourses.length > 0) {
         await prisma.enrollment.createMany({
            data: currentCourses.map((courseId: string) => ({
              studentId: id,
              courseId: courseId
            }))
         });
      }
    }

    res.json(updatedStudent);
  } catch (error) {
    console.error("Error updating student:", error);
    res.status(500).json({ error: "Failed to update student" });
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
      where: { id },
    });

    res.json({ message: "Student deleted successfully" });
  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).json({ error: "Failed to delete student" });
  }
};
