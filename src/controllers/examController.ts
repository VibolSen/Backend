import { Request, Response } from 'express';
import prisma from '../prisma';
import { ExamType, ExamStatus } from '@prisma/client';
import { uploadToCloudinary, deleteFromCloudinary, getPublicIdFromUrl } from '../middleware/upload';
import { createInternalNotification } from './notificationController';

export const getExams = async (req: Request, res: Response) => {
  try {
    const { teacherId, groupId, courseId } = req.query;

    const whereClause: any = {};
    if (teacherId) whereClause.teacherId = String(teacherId);
    if (groupId) whereClause.groupId = String(groupId);
    if (courseId) whereClause.courseId = String(courseId);

    const exams = await (prisma.exam as any).findMany({
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
      orderBy: { date: 'asc' },
    });
    res.json(exams);
  } catch (err) {
    console.error("Failed to fetch exams:", err);
    res.status(500).json({ error: "Failed to fetch exams" });
  }
};

export const getExam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const exam = await (prisma.exam as any).findUnique({
      where: { id: String(id) },
      include: {
        group: { select: { name: true, id: true } },
        course: { select: { name: true, code: true } },
        teacher: { select: { firstName: true, lastName: true } },
        submissions: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
          orderBy: { student: { firstName: "asc" } },
        },
      },
    });

    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }
    res.json(exam);
  } catch (err) {
    console.error("Failed to fetch exam:", err);
    res.status(500).json({ error: "Failed to fetch exam" });
  }
};

export const createExam = async (req: Request, res: Response) => {
  try {
    const { 
      title, 
      description, 
      date, 
      startTime,
      endTime,
      groupId, 
      teacherId,
      courseId,
      location,
      type,
      status,
      maxScore
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
      const uploadPromises = files.map(file => uploadToCloudinary(file.buffer, 'exams'));
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

    const newExam = await (prisma.exam as any).create({
      data: {
        title,
        description,
        date: date ? new Date(date) : null,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        groupId,
        teacherId,
        courseId: courseId || null,
        location,
        type: (type as ExamType) || 'WRITTEN',
        status: (status as ExamStatus) || 'SCHEDULED',
        maxScore: maxScore ? parseInt(maxScore) : 100,
        attachmentUrls: finalUrls
      },
    });

    // Notify students in the group
    if (status === 'SCHEDULED' || !status) {
        const group = await prisma.group.findUnique({
            where: { id: groupId },
            select: { studentIds: true, name: true }
        });

        if (group?.studentIds) {
            const notifications = group.studentIds.map(studentId => 
                createInternalNotification(
                    studentId,
                    "New Exam Scheduled",
                    `A new exam "${title}" has been scheduled for group ${group.name}.`,
                    "EXAM",
                    `/student/exams`
                )
            );
            await Promise.all(notifications);
        }
    }

    res.status(201).json(newExam);
  } catch (err) {
    console.error("Failed to create exam:", err);
    res.status(500).json({ error: "Failed to create exam" });
  }
};

export const updateExam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      description, 
      date, 
      startTime,
      endTime,
      groupId, 
      teacherId,
      courseId,
      location,
      type,
      status,
      maxScore
    } = req.body;

    let { attachmentUrls } = req.body;

    // Handle File Uploads
    const files = req.files as Express.Multer.File[];
    const uploadedUrls: string[] = [];
    if (files && files.length > 0) {
      const uploadPromises = files.map(file => uploadToCloudinary(file.buffer, 'exams'));
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
    const originalExam = await (prisma.exam as any).findUnique({
        where: { id: String(id) },
        select: { attachmentUrls: true }
    });

    const updatedExam = await (prisma.exam as any).update({
      where: { id: String(id) },
      data: {
        title,
        description,
        date: date ? new Date(date) : undefined,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        groupId,
        teacherId,
        courseId,
        location,
        type: type as ExamType,
        status: status as ExamStatus,
        maxScore: maxScore ? parseInt(maxScore) : undefined,
        attachmentUrls: finalUrls
      },
    });

    // Cleanup removed assets
    if (originalExam?.attachmentUrls) {
        const removedUrls = originalExam.attachmentUrls.filter((url: string) => !finalUrls.includes(url));
        for (const url of removedUrls) {
            const publicId = getPublicIdFromUrl(url);
            if (publicId) await deleteFromCloudinary(publicId);
        }
    }

    res.json(updatedExam);
  } catch (err) {
    console.error("Failed to update exam:", err);
    res.status(500).json({ error: "Failed to update exam" });
  }
};

export const deleteExam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Fetch exam to get attachment URLs
    const exam = await (prisma.exam as any).findUnique({
        where: { id: String(id) },
        select: { attachmentUrls: true }
    });

    if (exam?.attachmentUrls && exam.attachmentUrls.length > 0) {
        for (const url of exam.attachmentUrls) {
            const publicId = getPublicIdFromUrl(url);
            if (publicId) await deleteFromCloudinary(publicId);
        }
    }

    // 2. Fetch all exam submissions to get their file URLs
    const submissions = await prisma.examSubmission.findMany({
        where: { examId: String(id) },
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

    await prisma.exam.delete({ where: { id: String(id) } });
    res.json({ message: "Exam deleted successfully" });
  } catch (err) {
    console.error("Failed to delete exam:", err);
    res.status(500).json({ error: "Failed to delete exam" });
  }
};
