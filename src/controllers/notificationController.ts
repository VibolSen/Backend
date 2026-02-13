import { Request, Response } from 'express';
import prisma from '../prisma';

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    if (!userId) {
        return res.status(400).json({ error: "userId is required" });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: String(userId) },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json(notifications);
  } catch (err) {
    console.error("Failed to fetch notifications:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await prisma.notification.update({
      where: { id: String(id) },
      data: { isRead: true }
    });
    res.json(updated);
  } catch (err) {
    console.error("Failed to update notification:", err);
    res.status(500).json({ error: "Failed to update notification" });
  }
};

export const markAllAsRead = async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      await prisma.notification.updateMany({
        where: { userId: String(userId), isRead: false },
        data: { isRead: true }
      });
      res.json({ message: "All notifications marked as read" });
    } catch (err) {
      console.error("Failed to mark all as read:", err);
      res.status(500).json({ error: "Failed to mark all as read" });
    }
  };

// Internal helper to create notifications
export const createInternalNotification = async (userId: string, title: string, message: string, type: string, link?: string) => {
    try {
        return await prisma.notification.create({
            data: {
                userId,
                title,
                message,
                type,
                link
            }
        });
    } catch (error) {
        console.error("Error creating internal notification:", error);
    }
};
