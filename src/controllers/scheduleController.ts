import { Request, Response } from 'express';
import prisma from '../prisma';

export const getSchedules = async (req: Request, res: Response) => {
  try {
    const schedules = await prisma.schedule.findMany({
      include: {
        assignedToGroup: { select: { name: true } },
        assignedToTeacher: { select: { firstName: true, lastName: true } },
        sessions: true
      },
      orderBy: { startDate: 'asc' },
    });
    res.json(schedules);
  } catch (err) {
    console.error("Failed to fetch schedules:", err);
    res.status(500).json({ error: "Failed to fetch schedules" });
  }
};

export const createSchedule = async (req: Request, res: Response) => {
  try {
    const { title, isRecurring, startDate, endDate, daysOfWeek, creatorId, assignedToTeacherId, assignedToGroupId } = req.body;

    if (!title || !creatorId) {
        res.status(400).json({ error: "Missing required fields" });
        return;
    }

    const newSchedule = await prisma.schedule.create({
      data: {
        title,
        isRecurring: isRecurring || false,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        daysOfWeek: daysOfWeek || [],
        creatorId,
        assignedToTeacherId,
        assignedToGroupId
      },
    });
    res.status(201).json(newSchedule);
  } catch (err) {
    console.error("Failed to create schedule:", err);
    res.status(500).json({ error: "Failed to create schedule" });
  }
};

export const updateSchedule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, isRecurring, startDate, endDate, daysOfWeek, creatorId, assignedToTeacherId, assignedToGroupId } = req.body;

    const updatedSchedule = await prisma.schedule.update({
      where: { id: String(id) },
      data: {
        title,
        isRecurring,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        daysOfWeek,
        creatorId,
        assignedToTeacherId,
        assignedToGroupId
      },
    });
    res.json(updatedSchedule);
  } catch (err) {
    console.error("Failed to update schedule:", err);
    res.status(500).json({ error: "Failed to update schedule" });
  }
};

export const deleteSchedule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.schedule.delete({ where: { id: String(id) } });
    res.json({ message: "Schedule deleted successfully" });
  } catch (err) {
    console.error("Failed to delete schedule:", err);
    res.status(500).json({ error: "Failed to delete schedule" });
  }
};
