import { Request, Response } from 'express';
import prisma from '../prisma';

export const getDepartments = async (req: Request, res: Response) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        faculty: true,
        batches: true,
        head: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        _count: {
          select: {
            departmentCourses: true
          }
        }
      },
      orderBy: { name: 'asc' },
    });
    res.json(departments);
  } catch (err) {
    console.error("Failed to fetch departments:", err);
    res.status(500).json({ error: "Failed to fetch departments" });
  }
};

export const getDepartmentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const department = await prisma.department.findUnique({
      where: { id: String(id) },
      include: {
        faculty: true,
        batches: true,
        head: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        users: { // Students in this department
          where: { role: 'STUDENT' }, // Only students
          include: {
            profile: true
          }
        },
        departmentCourses: {
          include: {
            course: {
              include: {
                leadBy: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                },
                _count: {
                  select: {
                    enrollments: true,
                    groups: true
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            users: true,
            departmentCourses: true
          }
        }
      }
    });

    if (!department) {
      res.status(404).json({ error: "Department not found" });
      return;
    }

    res.json(department);
  } catch (err) {
    console.error("Failed to fetch department:", err);
    res.status(500).json({ error: "Failed to fetch department" });
  }
};

export const createDepartment = async (req: Request, res: Response) => {
  try {
    const { name, facultyId, headId, generations } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const newDepartment = await prisma.department.create({
      data: {
        name,
        facultyId,
        headId: headId || undefined
      },
      include: { batches: true }
    });

    res.status(201).json(newDepartment);
  } catch (error) {
    console.error("Error creating department:", error);
    res.status(500).json({ error: "Failed to create department" });
  }
};

export const updateDepartment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, facultyId, headId, generations } = req.body;

    const updatedDepartment = await prisma.department.update({
      where: { id: String(id) },
      data: {
        name,
        facultyId,
        headId: headId || null
      },
      include: { batches: true }
    });

    res.json(updatedDepartment);
  } catch (error) {
    console.error("Error updating department:", error);
    res.status(500).json({ error: "Failed to update department" });
  }
};

export const deleteDepartment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.department.delete({ where: { id: String(id) } });
    res.json({ message: "Department deleted successfully" });
  } catch (error) {
    console.error("Error deleting department:", error);
    res.status(500).json({ error: "Failed to delete department" });
  }
};
