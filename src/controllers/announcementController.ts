import { Request, Response } from 'express';
import prisma from '../prisma';

export const getAnnouncements = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.query;
    
    const announcements = await prisma.announcement.findMany({
        where: courseId ? { courseId: String(courseId) } : {},
        include: {
            author: {
                select: { firstName: true, lastName: true }
            },
            course: {
                select: { name: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
    res.json(announcements);
  } catch (err) {
    console.error("Failed to fetch announcements:", err);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
};

export const createAnnouncement = async (req: Request, res: Response) => {
  try {
    const { title, content, courseId, authorId } = req.body;
    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        courseId,
        authorId
      },
    });
    res.status(201).json(announcement);
  } catch (err) {
    console.error("Failed to create announcement:", err);
    res.status(500).json({ error: "Failed to create announcement" });
  }
};

export const deleteAnnouncement = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.announcement.delete({
      where: { id: String(id) },
    });
    res.status(204).send();
  } catch (err) {
    console.error("Failed to delete announcement:", err);
    res.status(500).json({ error: "Failed to delete announcement" });
  }
};
