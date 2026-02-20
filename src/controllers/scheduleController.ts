import { Request, Response } from 'express';
import prisma from '../prisma';

/**
 * Helper to check for scheduling conflicts
 */
const checkConflicts = async (data: any, excludeScheduleId?: string) => {
    const { assignedToTeacherId, assignedToGroupId, location, roomId, sessions, daysOfWeek, isRecurring, startDate, endDate } = data;
    
    // 1. Fetch all potential conflicting schedules
    const existingSchedules = await (prisma.schedule as any).findMany({
        where: {
            id: excludeScheduleId ? { not: excludeScheduleId } : undefined,
            OR: [
                { assignedToTeacherId: assignedToTeacherId || undefined },
                { assignedToGroupId: assignedToGroupId || undefined },
                { location: (location && location.trim() !== "") ? location : undefined },
                { roomId: roomId || undefined }
            ]
        },
        include: { sessions: true }
    });

    for (const proposedSession of sessions) {
        for (const existing of existingSchedules) {
            // Check if days overlap
            const daysOverlap = isRecurring && existing.isRecurring
                ? daysOfWeek.some((day: string) => existing.daysOfWeek.includes(day))
                : true; // If not both recurring, assume date range check handles it (simplification)

            if (!daysOverlap) continue;

            for (const existingSession of existing.sessions) {
                // Time Overlap Logic: (StartA < EndB) and (EndA > StartB)
                // We compare only the time portion (HH:mm) since startDate/endDate handles the date range
                const pStart = proposedSession.startTime;
                const pEnd = proposedSession.endTime;
                const eStart = new Date(existingSession.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                const eEnd = new Date(existingSession.endTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

                if (pStart < eEnd && pEnd > eStart) {
                    let reason = "";
                    if (existing.assignedToTeacherId === assignedToTeacherId) reason = "Teacher is already busy";
                    if (existing.assignedToGroupId === assignedToGroupId) reason = "Group already has a class";
                    if (existing.roomId === roomId) reason = "Room is already booked";
                    if (existing.location === location && !reason) reason = `Location ${location} is already booked`;
                    
                    return { conflict: true, reason: `${reason} at ${eStart}-${eEnd} (${existing.title})` };
                }
            }
        }
    }
    return { conflict: false };
};

export const getSchedules = async (req: Request, res: Response) => {
  let where: any = {};
  try {
    console.log("Fetching schedules with query:", req.query);
    const { teacherId, groupId, courseId } = req.query;

    if (teacherId && teacherId !== 'undefined' && teacherId !== '') where.assignedToTeacherId = String(teacherId);
    if (groupId && groupId !== 'undefined' && groupId !== '') where.assignedToGroupId = String(groupId);
    if (courseId && courseId !== 'undefined' && courseId !== '') where.courseId = String(courseId);
    console.log("Prisma where clause:", where);

    const schedules = await (prisma.schedule as any).findMany({
      where,
      include: {
        assignedToGroup: { select: { name: true } },
        assignedToTeacher: { select: { firstName: true, lastName: true } },
        course: { select: { name: true, code: true } },
        sessions: {
            orderBy: { startTime: 'asc' }
        }
      },
      orderBy: { startDate: 'asc' },
    });
    res.json(schedules);
  } catch (err: any) {
    console.error("Failed to fetch schedules:", err.message, err.stack);
    res.status(500).json({ 
        error: "Failed to fetch schedules", 
        details: err.message,
        stack: err.stack,
        query: req.query,
        whereClause: where
    });
  }
};

export const createSchedule = async (req: Request, res: Response) => {
  try {
    const { 
        title, 
        isRecurring, 
        startDate, 
        endDate, 
        daysOfWeek, 
        creatorId, 
        assignedToTeacherId, 
        assignedToGroupId,
        courseId,
        location,
        roomId,
        sessions 
    } = req.body;

    if (!title || !creatorId) {
        res.status(400).json({ error: "Missing required fields" });
        return;
    }

    // Conflict Check
    const conflictResult = await checkConflicts(req.body);
    if (conflictResult.conflict) {
        res.status(409).json({ error: conflictResult.reason });
        return;
    }

    // Determine location string
    let locationString = location;
    if (roomId) {
        const room = await (prisma as any).room.findUnique({ where: { id: roomId } });
        if (room) locationString = room.name;
    }

    const newSchedule = await (prisma.schedule as any).create({
      data: {
        title,
        isRecurring: isRecurring || false,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        daysOfWeek: daysOfWeek || [],
        creatorId,
        assignedToTeacherId,
        assignedToGroupId,
        courseId,
        location: locationString,
        roomId,
        sessions: {
            create: (sessions || []).map((s: any) => ({
                startTime: new Date(`${startDate || new Date().toISOString().split('T')[0]}T${s.startTime}:00`),
                endTime: new Date(`${startDate || new Date().toISOString().split('T')[0]}T${s.endTime}:00`),
            }))
        }
      },
      include: {
        sessions: true
      }
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
    const { 
        title, 
        isRecurring, 
        startDate, 
        endDate, 
        daysOfWeek, 
        creatorId, 
        assignedToTeacherId, 
        assignedToGroupId,
        courseId,
        location,
        roomId,
        sessions 
    } = req.body;

    // Conflict Check
    const conflictResult = await checkConflicts(req.body, id as string);
    if (conflictResult.conflict) {
        res.status(409).json({ error: conflictResult.reason });
        return;
    }

    // Determine location string
    let locationString = location;
    if (roomId) {
        const room = await (prisma as any).room.findUnique({ where: { id: roomId } });
        if (room) locationString = room.name;
    }

    // Delete existing sessions and recreate them for the update
    await prisma.session.deleteMany({
        where: { scheduleId: String(id) }
    });

    const updatedSchedule = await (prisma.schedule as any).update({
      where: { id: String(id) },
      data: {
        title,
        isRecurring,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        daysOfWeek,
        creatorId,
        assignedToTeacherId,
        assignedToGroupId,
        courseId,
        location: locationString,
        roomId,
        sessions: {
            create: (sessions || []).map((s: any) => ({
                startTime: new Date(`${startDate || new Date().toISOString().split('T')[0]}T${s.startTime}:00`),
                endTime: new Date(`${startDate || new Date().toISOString().split('T')[0]}T${s.endTime}:00`),
            }))
        }
      },
      include: {
        sessions: true
      }
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
