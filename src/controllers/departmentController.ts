import { Request, Response } from 'express';
import prisma from '../prisma';

export const getDepartments = async (req: Request, res: Response) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        faculty: true,
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

export const createDepartment = async (req: Request, res: Response) => {
  try {
    const { name, facultyId, headId } = req.body;

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
    const { name, facultyId, headId } = req.body;

    const updatedDepartment = await prisma.department.update({
      where: { id: String(id) },
      data: {
        name,
        facultyId,
        headId: headId || null
      },
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
