import { Request, Response } from 'express';
import prisma from '../prisma';
import { AssignmentType, AssignmentStatus } from '@prisma/client';
import { uploadToCloudinary, deleteFromCloudinary, getPublicIdFromUrl } from '../middleware/upload';
import { createInternalNotification } from './notificationController';

export const getAssignments = async (req: Request, res: Response) => {
  try {
    const { teacherId, groupId, courseId } = req.query;

    const whereClause: any = {};
    if (teacherId) whereClause.teacherId = String(teacherId);
    if (groupId) whereClause.groupId = String(groupId);
    if (courseId) whereClause.courseId = String(courseId);

    const assignments = await (prisma.assignment as any).findMany({
      where: whereClause,
      include: {
        group: { 
            select: { 
                name: true,
                _count: { select: { students: true } }
            } 
        },
        course: { select: { name: true, code: true } },
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
    const assignment = await (prisma.assignment as any).findUnique({
      where: { id: String(id) },
      include: {
        group: { select: { name: true } },
        course: { select: { name: true, code: true } },
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
    const { 
      title, 
      description, 
      dueDate, 
      groupId, 
      teacherId, 
      courseId,
      type,
      status, 
      weight, 
      maxPoints
    } = req.body;
    
    let { attachmentUrls } = req.body;
    
    if (!title || !groupId || !teacherId) {
        res.status(400).json({ error: "Missing required fields" });
        return;
    }

    // Handle File Uploads
    const files = req.files as Express.Multer.File[];
    const uploadedUrls: string[] = [];
    if (files && files.length > 0) {
      const uploadPromises = files.map(file => uploadToCloudinary(file.buffer, 'assignments'));
      const results = await Promise.all(uploadPromises);
      uploadedUrls.push(...results.map(r => r.secure_url));
    }

    // Handle existing URLs sent via form (comma separated or array)
    let finalUrls: string[] = [];
    if (Array.isArray(attachmentUrls)) {
        finalUrls = attachmentUrls;
    } else if (typeof attachmentUrls === 'string' && attachmentUrls.trim().length > 0) {
        finalUrls = attachmentUrls.split(',').map(u => u.trim());
    }
    
    finalUrls = [...finalUrls, ...uploadedUrls];

    const newAssignment = await (prisma.assignment as any).create({
      data: {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        groupId,
        teacherId,
        courseId: courseId || null,
        type: (type as AssignmentType) || 'HOMEWORK',
        status: (status as AssignmentStatus) || 'DRAFT',
        weight: weight ? parseFloat(weight) : 0,
        maxPoints: maxPoints ? parseInt(maxPoints) : 100,
        attachmentUrls: finalUrls
      },
    });

    // Notify students in the group if published
    if (status === 'PUBLISHED') {
        const group = await prisma.group.findUnique({
            where: { id: groupId },
            select: { studentIds: true, name: true }
        });

        if (group?.studentIds) {
            const notifications = group.studentIds.map(studentId => 
                createInternalNotification(
                    studentId,
                    "New Assignment",
                    `A new assignment "${title}" has been posted for group ${group.name}.`,
                    "ASSIGNMENT",
                    `/student/assignments/${newAssignment.id}`
                )
            );
            await Promise.all(notifications);
        }
    }

    res.status(201).json(newAssignment);
  } catch (err) {
    console.error("Failed to create assignment:", err);
    res.status(500).json({ error: "Failed to create assignment" });
  }
};

export const updateAssignment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      description, 
      dueDate, 
      groupId, 
      teacherId,
      courseId,
      type,
      status,
      weight,
      maxPoints
    } = req.body;

    let { attachmentUrls } = req.body;

    // Handle File Uploads
    const files = req.files as Express.Multer.File[];
    const uploadedUrls: string[] = [];
    if (files && files.length > 0) {
      const uploadPromises = files.map(file => uploadToCloudinary(file.buffer, 'assignments'));
      const results = await Promise.all(uploadPromises);
      uploadedUrls.push(...results.map(r => r.secure_url));
    }

    // Handle existing URLs
    let finalUrls: string[] = [];
    if (Array.isArray(attachmentUrls)) {
        finalUrls = attachmentUrls;
    } else if (typeof attachmentUrls === 'string' && attachmentUrls.trim().length > 0) {
        finalUrls = attachmentUrls.split(',').map(u => u.trim());
    }
    
    finalUrls = [...finalUrls, ...uploadedUrls];

    // Cloudinary Cleanup: Find removed URLs
    const originalAssignment = await (prisma.assignment as any).findUnique({
        where: { id: String(id) },
        select: { attachmentUrls: true }
    });

    const updatedAssignment = await (prisma.assignment as any).update({
      where: { id: String(id) },
      data: {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        groupId,
        teacherId,
        courseId,
        type: type as AssignmentType,
        status: status as AssignmentStatus,
        weight: weight !== undefined ? parseFloat(weight) : undefined,
        maxPoints: maxPoints !== undefined ? parseInt(maxPoints) : undefined,
        attachmentUrls: finalUrls
      },
    });
    
    // Cleanup removed assets
    if (originalAssignment?.attachmentUrls) {
        const removedUrls = originalAssignment.attachmentUrls.filter((url: string) => !finalUrls.includes(url));
        for (const url of removedUrls) {
            const publicId = getPublicIdFromUrl(url);
            if (publicId) await deleteFromCloudinary(publicId);
        }
    }

    res.json(updatedAssignment);
  } catch (err) {
    console.error("Failed to update assignment:", err);
    res.status(500).json({ error: "Failed to update assignment" });
  }
};

export const deleteAssignment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Fetch assignment to get attachment URLs
    const assignment = await (prisma.assignment as any).findUnique({
        where: { id: String(id) },
        select: { attachmentUrls: true }
    });

    if (assignment?.attachmentUrls && assignment.attachmentUrls.length > 0) {
        for (const url of assignment.attachmentUrls) {
            const publicId = getPublicIdFromUrl(url);
            if (publicId) await deleteFromCloudinary(publicId);
        }
    }

    // 2. Fetch all submissions to get their file URLs
    const submissions = await prisma.submission.findMany({
        where: { assignmentId: String(id) },
        select: { fileUrls: true }
    });

    for (const sub of submissions) {
        if (sub.fileUrls && sub.fileUrls.length > 0) {
            for (const url of sub.fileUrls) {
                const publicId = getPublicIdFromUrl(url);
                if (publicId) await deleteFromCloudinary(publicId);
            }
        }
    }

    await prisma.assignment.delete({ where: { id: String(id) } });
    res.json({ message: "Assignment deleted successfully" });
  } catch (err) {
    console.error("Failed to delete assignment:", err);
    res.status(500).json({ error: "Failed to delete assignment" });
  }
};
