import { Request, Response } from 'express';
import prisma from '../prisma';

export const getAssignments = async (req: Request, res: Response) => {
  try {
    const assignments = await prisma.assignment.findMany({
      include: {
        group: { select: { name: true } },
        teacher: { select: { firstName: true, lastName: true } },
        _count: { select: { submissions: true } }
      },
      orderBy: { dueDate: 'asc' },
    });
    res.json(assignments);
  } catch (err) {
    console.error("Failed to fetch assignments:", err);
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
};

export const getAssignment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        group: { select: { name: true } },
        submissions: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { student: { firstName: "asc" } },
        },
      },
    });
    if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
    }
    res.json(assignment);
  } catch (err) {
    console.error("Failed to fetch assignment:", err);
    res.status(500).json({ error: "Failed to fetch assignment" });
  }
};

export const createAssignment = async (req: Request, res: Response) => {
  try {
    const { title, description, dueDate, points, groupId, teacherId } = req.body;
    
    if (!title || !groupId || !teacherId) {
        res.status(400).json({ error: "Missing required fields" });
        return;
    }

    const newAssignment = await prisma.assignment.create({
      data: {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        points: points ? parseInt(points) : null,
        groupId,
        teacherId
      },
    });
    res.status(201).json(newAssignment);
  } catch (err) {
    console.error("Failed to create assignment:", err);
    res.status(500).json({ error: "Failed to create assignment" });
  }
};

export const updateAssignment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, dueDate, points, groupId, teacherId } = req.body;

    const updatedAssignment = await prisma.assignment.update({
      where: { id },
      data: {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        points: points ? parseInt(points) : undefined,
        groupId,
        teacherId
      },
    });
    res.json(updatedAssignment);
  } catch (err) {
    console.error("Failed to update assignment:", err);
    res.status(500).json({ error: "Failed to update assignment" });
  }
};

export const deleteAssignment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.assignment.delete({ where: { id } });
    res.json({ message: "Assignment deleted successfully" });
  } catch (err) {
    console.error("Failed to delete assignment:", err);
    res.status(500).json({ error: "Failed to delete assignment" });
  }
};
