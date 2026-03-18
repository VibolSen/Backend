import { Request, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';

export const getGroups = async (req: AuthRequest, res: Response) => {
  try {
    const whereClause: any = {};
    
    if (req.user && req.user.role === 'TEACHER') {
      whereClause.courses = {
        some: { leadById: req.user.userId }
      };
    }

    const groups = await prisma.group.findMany({
      where: whereClause,
      include: {
        courses: true,
        batch: {
          include: { department: { select: { id: true, name: true } } }
        },
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

export const getGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (req.user && req.user.role === 'TEACHER') {
        const hasRelation = await prisma.group.findFirst({
            where: {
                id: String(id),
                courses: { some: { leadById: req.user.userId } }
            }
        });
        if (!hasRelation) {
            return res.status(403).json({ error: "Access denied: You do not lead any courses for this group" });
        }
    }

    const group = await prisma.group.findUnique({
      where: { id: String(id) },
      include: {
        courses: true,
        batch: {
          include: { department: { select: { id: true, name: true } } }
        },
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

export const createGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { name, academicYear, batchId, courseIds, studentIds } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    console.log(`[GroupCreate] Creating new group:`, { name, batchId, academicYear, courseCount: courseIds?.length, studentCount: studentIds?.length });

    // Validate courseIds exist
    let verifiedCourseIds = courseIds;
    if (courseIds && Array.isArray(courseIds) && courseIds.length > 0) {
      const existingCourses = await prisma.course.findMany({
        where: { id: { in: courseIds } },
        select: { id: true }
      });
      verifiedCourseIds = existingCourses.map(c => c.id);
    }

    // Validate studentIds exist
    let verifiedStudentIds = studentIds;
    if (studentIds && Array.isArray(studentIds) && studentIds.length > 0) {
      const existingStudents = await prisma.user.findMany({
        where: { id: { in: studentIds }, role: 'STUDENT' },
        select: { id: true }
      });
      verifiedStudentIds = existingStudents.map(s => s.id);
    }

    const newGroup = await prisma.group.create({
      data: {
        name,
        academicYear,
        batchId: batchId || undefined,
        courses: verifiedCourseIds ? { connect: verifiedCourseIds.map((id: string) => ({ id })) } : undefined,
        students: verifiedStudentIds ? { connect: verifiedStudentIds.map((id: string) => ({ id })) } : undefined
      } as any,
    });

    res.status(201).json(newGroup);
  } catch (error: any) {
    console.error("Error creating group:", error);
    res.status(500).json({ error: "Failed to create group", details: error.message });
  }
};

export const updateGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, academicYear, batchId, courseIds, studentIds } = req.body;

    console.log(`[GroupUpdate] Updating group ${id}:`, { name, batchId, academicYear, courseCount: courseIds?.length, studentCount: studentIds?.length });

    // Validate that all courseIds exist
    let verifiedCourseIds = courseIds;
    if (courseIds && Array.isArray(courseIds) && courseIds.length > 0) {
      const existingCourses = await prisma.course.findMany({
        where: { id: { in: courseIds } },
        select: { id: true }
      });
      verifiedCourseIds = existingCourses.map(c => c.id);
      
      if (verifiedCourseIds.length !== courseIds.length) {
        const missing = courseIds.filter((cid: string) => !verifiedCourseIds.includes(cid));
        console.warn(`[GroupUpdate] Warning: Some course IDs were not found and will be skipped:`, missing);
      }
    }

    // Validate that all studentIds exist
    let verifiedStudentIds = studentIds;
    if (studentIds && Array.isArray(studentIds) && studentIds.length > 0) {
      const existingStudents = await prisma.user.findMany({
        where: { id: { in: studentIds }, role: 'STUDENT' },
        select: { id: true }
      });
      verifiedStudentIds = existingStudents.map(s => s.id);

      if (verifiedStudentIds.length !== studentIds.length) {
        const missing = studentIds.filter((sid: string) => !verifiedStudentIds.includes(sid));
        console.warn(`[GroupUpdate] Warning: Some student IDs were not found and will be skipped:`, missing);
      }
    }

    const updatedGroup = await prisma.group.update({
      where: { id: String(id) },
      data: {
        name,
        academicYear,
        batchId: batchId || null,
        courses: verifiedCourseIds ? { set: verifiedCourseIds.map((id: string) => ({ id })) } : undefined,
        students: verifiedStudentIds ? { set: verifiedStudentIds.map((id: string) => ({ id })) } : undefined
      } as any,
    });

    res.json(updatedGroup);
  } catch (error: any) {
    console.error("Error updating group:", error);
    // Provide a more descriptive error if possible
    if (error.code === 'P2025') {
      return res.status(404).json({ 
        error: "Related records not found", 
        message: "One or more connected courses or students no longer exist in the system.",
        details: error.meta?.cause 
      });
    }
    res.status(500).json({ error: "Failed to update group", details: error.message });
  }
};

export const deleteGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.group.delete({ where: { id: String(id) } });
    res.json({ message: "Group deleted successfully" });
  } catch (error) {
    console.error("Error deleting group:", error);
    res.status(500).json({ error: "Failed to delete group" });
  }
};

export const getGroupStudents = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (req.user && req.user.role === 'TEACHER') {
        const hasRelation = await prisma.group.findFirst({
            where: {
                id: String(id),
                courses: { some: { leadById: req.user.userId } }
            }
        });
        if (!hasRelation) {
            return res.status(403).json({ error: "Access denied: You do not lead any courses for this group" });
        }
    }

    const group = await prisma.group.findUnique({
      where: { id: String(id) },
      include: {
        students: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profile: {
              select: {
                studentId: true
              }
            }
          }
        }
      } as any
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Flatten studentId from profile for frontend compatibility
    const studentsWithId = group.students.map((student: any) => ({
      ...student,
      studentId: student.profile?.studentId || null,
      profile: undefined // Remove nested profile to keep it clean
    }));

    res.json(studentsWithId || []);
  } catch (error) {
    console.error("Error fetching group students:", error);
    res.status(500).json({ error: "Failed to fetch group students" });
  }
};
