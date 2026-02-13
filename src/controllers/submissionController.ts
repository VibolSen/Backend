import { Request, Response } from 'express';
import prisma from '../prisma';
import { uploadToCloudinary, deleteFromCloudinary, getPublicIdFromUrl } from '../middleware/upload';
import { createInternalNotification } from './notificationController';

export const getSubmission = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 1. Try to find a real submission
    const submission = await prisma.submission.findUnique({
      where: { id: String(id) },
      include: {
        assignment: true,
        student: {
            select: { firstName: true, lastName: true, email: true }
        }
      }
    });

    if (submission) {
        return res.json(submission);
    }

    // 2. If no submission, check if the ID is an Assignment ID (Virtual Submission)
    const assignment = await prisma.assignment.findUnique({
        where: { id: String(id) },
        include: {
            group: { select: { name: true } }
        }
    });

    if (assignment) {
        // Return a mocked "PENDING" submission
        return res.json({
            id: assignment.id,
            status: 'PENDING',
            assignment: assignment,
            grade: null,
            feedback: null,
            submittedAt: null,
            student: null 
        });
    }

    res.status(404).json({ error: "Submission or Assignment not found" });
  } catch (err) {
    console.error("Failed to fetch submission:", err);
    res.status(500).json({ error: "Failed to fetch submission" });
  }
};

export const updateSubmission = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { grade, feedback, status, content } = req.body;
    let { fileUrls } = req.body;

    // Handle File Uploads (for resubmissions)
    const files = req.files as Express.Multer.File[];
    const uploadedUrls: string[] = [];
    if (files && files.length > 0) {
      const uploadPromises = files.map(file => uploadToCloudinary(file.buffer, 'submissions'));
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
    const original = await prisma.submission.findUnique({
        where: { id: String(id) },
        select: { fileUrls: true }
    });

    const updated = await prisma.submission.update({
      where: { id: String(id) },
      data: {
        grade: grade !== undefined ? parseInt(grade) : undefined,
        feedback,
        status: status,
        content: content,
        fileUrls: finalUrls,
        submittedAt: status === 'SUBMITTED' ? new Date() : undefined
      }
    });

    // Notify student if graded
    if (status === 'GRADED') {
        const assignment = await prisma.assignment.findUnique({
            where: { id: updated.assignmentId },
            select: { title: true }
        });
        
        await createInternalNotification(
            updated.studentId,
            "Assignment Graded",
            `Your submission for "${assignment?.title}" has been graded.`,
            "GRADE",
            `/student/assignments/${updated.id}`
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
    console.error("Failed to update submission:", err);
    res.status(500).json({ error: "Failed to update submission" });
  }
};

export const createSubmission = async (req: Request, res: Response) => {
    try {
        const { assignmentId, studentId, content } = req.body;
        let { fileUrls } = req.body;

        // Handle File Uploads
        const files = req.files as Express.Multer.File[];
        const uploadedUrls: string[] = [];
        if (files && files.length > 0) {
          const uploadPromises = files.map(file => uploadToCloudinary(file.buffer, 'submissions'));
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

        const submission = await prisma.submission.create({
            data: {
                assignmentId,
                studentId,
                content,
                fileUrls: finalUrls,
                submittedAt: new Date(),
                status: 'SUBMITTED'
            }
        });
        res.status(201).json(submission);
    } catch (err) {
        console.error("Failed to create submission:", err);
        res.status(500).json({ error: "Failed to create submission" });
    }
};
