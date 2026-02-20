import { Request, Response } from 'express';
import prisma from '../prisma';

export const getRooms = async (req: Request, res: Response) => {
  try {
    const rooms = await (prisma as any).room.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(rooms);
  } catch (err) {
    console.error("Failed to fetch rooms:", err);
    res.status(500).json({ error: "Failed to fetch rooms" });
  }
};

export const createRoom = async (req: Request, res: Response) => {
  try {
    const { name, capacity, type, resources } = req.body;
    
    // Check if name already exists
    const existing = await (prisma as any).room.findUnique({
        where: { name }
    });
    
    if (existing) {
        return res.status(409).json({ error: "Room name already exists" });
    }

    const newRoom = await (prisma as any).room.create({
      data: {
        name,
        capacity: capacity ? parseInt(capacity) : 0,
        type: type || "CLASSROOM",
        resources: resources || []
      },
    });
    res.status(201).json(newRoom);
  } catch (err) {
    console.error("Failed to create room:", err);
    res.status(500).json({ error: "Failed to create room" });
  }
};

export const updateRoom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, capacity, type, resources, status } = req.body;

    const updatedRoom = await (prisma as any).room.update({
      where: { id: String(id) },
      data: {
        name,
        capacity: capacity ? parseInt(capacity) : undefined,
        type,
        resources,
        status
      },
    });
    res.json(updatedRoom);
  } catch (err) {
    console.error("Failed to update room:", err);
    res.status(500).json({ error: "Failed to update room" });
  }
};

export const deleteRoom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await (prisma as any).room.delete({
      where: { id: String(id) },
    });
    res.json({ message: "Room deleted successfully" });
  } catch (err) {
    console.error("Failed to delete room:", err);
    res.status(500).json({ error: "Failed to delete room" });
  }
};
