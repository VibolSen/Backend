import { Request, Response } from 'express';
import prisma from '../prisma';

export const getGroups = async (req: Request, res: Response) => {
  try {
    const groups = await prisma.group.findMany({
      include: {
        courses: true,
        students: {
             select: { id: true, firstName: true, lastName: true }
        },
         _count: {
            select: { students: true, courses: true }
         }
      } as any,
      orderBy: { name: 'asc' },
    });
    res.json(groups);
  } catch (err) {
    console.error("Failed to fetch groups:", err);
    res.status(500).json({ error: "Failed to fetch groups" });
  }
};

export const getGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const group = await prisma.group.findUnique({
      where: { id: String(id) },
      include: {
        courses: true,
        students: {
          select: { id: true, firstName: true, lastName: true, email: true },
        }
      } as any,
    });
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }
    res.json(group);
  } catch (error) {
    console.error("Error fetching group:", error);
    res.status(500).json({ error: "Failed to fetch group" });
  }
};

export const createGroup = async (req: Request, res: Response) => {
  try {
    const { name, academicYear, monitorId, courseIds, studentIds } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const newGroup = await prisma.group.create({
      data: {
         name,
         academicYear,
         monitorId: monitorId || undefined,
         courses: courseIds ? { connect: courseIds.map((id: string) => ({ id })) } : undefined,
         students: studentIds ? { connect: studentIds.map((id: string) => ({ id })) } : undefined
      } as any,
    });

    res.status(201).json(newGroup);
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ error: "Failed to create group" });
  }
};

export const updateGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, academicYear, monitorId, courseIds, studentIds } = req.body;

    const updatedGroup = await prisma.group.update({
      where: { id: String(id) },
      data: {
        name,
        academicYear,
        monitorId: monitorId || null,
        courses: courseIds ? { set: courseIds.map((id: string) => ({ id })) } : undefined,
        students: studentIds ? { set: studentIds.map((id: string) => ({ id })) } : undefined
      } as any,
    });

    res.json(updatedGroup);
  } catch (error) {
    console.error("Error updating group:", error);
    res.status(500).json({ error: "Failed to update group" });
  }
};

export const deleteGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.group.delete({ where: { id: String(id) } });
    res.json({ message: "Group deleted successfully" });
  } catch (error) {
    console.error("Error deleting group:", error);
    res.status(500).json({ error: "Failed to delete group" });
  }
};

