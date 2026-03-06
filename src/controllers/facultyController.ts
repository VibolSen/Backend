import { Request, Response } from 'express';
import prisma from '../prisma';

export const getFaculties = async (req: Request, res: Response) => {
  try {
    const faculties = await prisma.faculty.findMany({
      include: {
        departments: true,
        head: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        }
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
        head: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true }
        },
        departments: {
          include: {
            head: {
              select: { id: true, firstName: true, lastName: true }
            },
            users: {
              where: { role: 'STUDENT' },
              include: { profile: true },
              orderBy: { lastName: 'asc' }
            },
            departmentCourses: {
              include: {
                course: {
                  include: {
                    leadBy: { select: { id: true, firstName: true, lastName: true } },
                    _count: { select: { enrollments: true, groups: true } }
                  }
                }
              }
            },
            _count: {
              select: { users: true, departmentCourses: true }
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
    const { name, headId } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const newFaculty = await prisma.faculty.create({
      data: {
        name,
        headId: headId || undefined,
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
    const { name, headId } = req.body;

    const updatedFaculty = await prisma.faculty.update({
      where: { id: String(id) },
      data: {
        name,
        headId: headId || null // Use null to explicitly clear the head
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
