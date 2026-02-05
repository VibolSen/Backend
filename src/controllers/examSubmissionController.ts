import { Request, Response } from 'express';
import prisma from '../prisma';

export const getExamSubmission = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const submission = await prisma.examSubmission.findUnique({
      where: { id },
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

    const updated = await prisma.examSubmission.update({
      where: { id },
      data: {
        grade: grade !== undefined ? parseInt(grade) : undefined,
        feedback,
        status,
        content,
        submittedAt: status === 'SUBMITTED' ? new Date() : undefined
      }
    });
    res.json(updated);
  } catch (err) {
    console.error("Failed to update exam submission:", err);
    res.status(500).json({ error: "Failed to update exam submission" });
  }
};

export const createExamSubmission = async (req: Request, res: Response) => {
  try {
    const { examId, studentId, content } = req.body;
    const submission = await prisma.examSubmission.create({
      data: {
        examId,
        studentId,
        content,
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
