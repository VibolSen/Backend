import { Request, Response } from 'express';
import prisma from '../prisma';
import { ExamSubmissionStatus } from '@prisma/client';
import { uploadToCloudinary, deleteFromCloudinary, getPublicIdFromUrl } from '../middleware/upload';
import { createInternalNotification } from './notificationController';

export const getExamSubmission = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const submission = await prisma.examSubmission.findUnique({
      where: { id: String(id) },
      include: {
        exam: {
          include: {
            teacher: { select: { firstName: true, lastName: true, email: true } },
            group: { select: { name: true } }
          },
        },
        student: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      },
    });

    if (!submission) {
      return res.status(404).json({ error: "Exam submission not found" });
    }
    res.json(submission);
  } catch (err) {
    console.error("Failed to fetch exam submission:", err);
    res.status(500).json({ error: "Failed to fetch exam submission" });
  }
};

export const updateExamSubmission = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { grade, feedback, status, content } = req.body;
    let { fileUrls } = req.body;

    // Handle File Uploads (resubmission)
    const files = req.files as Express.Multer.File[];
    const uploadedUrls: string[] = [];
    if (files && files.length > 0) {
      const uploadPromises = files.map(file => uploadToCloudinary(file.buffer, 'exam-submissions'));
      const results = await Promise.all(uploadPromises);
      uploadedUrls.push(...results.map(r => r.secure_url));
    }

    // Handle existing URLs
    let finalUrls: string[] = [];
    if (Array.isArray(fileUrls)) {
        finalUrls = fileUrls;
    } else if (typeof fileUrls === 'string' && fileUrls.trim().length > 0) {
        finalUrls = fileUrls.split(',').map(u => u.trim());
    }
    
    finalUrls = [...finalUrls, ...uploadedUrls];

    // Fetch original to cleanup removed files
    const original = await prisma.examSubmission.findUnique({
        where: { id: String(id) },
        select: { fileUrls: true }
    });

    const updated = await prisma.examSubmission.update({
      where: { id: String(id) },
      data: {
        grade: grade !== undefined ? parseInt(grade) : undefined,
        feedback,
        status: status as ExamSubmissionStatus,
        content,
        fileUrls: finalUrls,
        submittedAt: status === 'SUBMITTED' ? new Date() : undefined
      }
    });

    // Notify student if graded
    if (status === 'GRADED') {
        const exam = await prisma.exam.findUnique({
            where: { id: updated.examId },
            select: { title: true }
        });
        
        await createInternalNotification(
            updated.studentId,
            "Exam Graded",
            `Your exam submission for "${exam?.title}" has been graded.`,
            "GRADE",
            `/student/exams/${updated.id}`
        );
    }

    // Cleanup removed assets
    if (original?.fileUrls) {
        const removedUrls = original.fileUrls.filter(url => !finalUrls.includes(url));
        for (const url of removedUrls) {
            const publicId = getPublicIdFromUrl(url);
            if (publicId) await deleteFromCloudinary(publicId);
        }
    }

    res.json(updated);
  } catch (err) {
    console.error("Failed to update exam submission:", err);
    res.status(500).json({ error: "Failed to update exam submission" });
  }
};

export const createExamSubmission = async (req: Request, res: Response) => {
  try {
    const { examId, studentId, content } = req.body;
    let { fileUrls } = req.body;

    // Handle File Uploads
    const files = req.files as Express.Multer.File[];
    const uploadedUrls: string[] = [];
    if (files && files.length > 0) {
      const uploadPromises = files.map(file => uploadToCloudinary(file.buffer, 'exam-submissions'));
      const results = await Promise.all(uploadPromises);
      uploadedUrls.push(...results.map(r => r.secure_url));
    }

    // Handle existing URLs
    let finalUrls: string[] = [];
    if (Array.isArray(fileUrls)) {
        finalUrls = fileUrls;
    } else if (typeof fileUrls === 'string' && fileUrls.trim().length > 0) {
        finalUrls = fileUrls.split(',').map(u => u.trim());
    }
    
    finalUrls = [...finalUrls, ...uploadedUrls];

    const submission = await prisma.examSubmission.create({
      data: {
        examId,
        studentId,
        content,
        fileUrls: finalUrls,
        submittedAt: new Date(),
        status: 'SUBMITTED'
      }
    });
    res.status(201).json(submission);
  } catch (err) {
    console.error("Failed to create exam submission:", err);
    res.status(500).json({ error: "Failed to create exam submission" });
  }
};
