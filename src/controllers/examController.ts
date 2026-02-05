import { Request, Response } from 'express';
import prisma from '../prisma';

export const getExams = async (req: Request, res: Response) => {
  try {
    const exams = await prisma.exam.findMany({
      include: {
        group: { select: { name: true } },
        teacher: { select: { firstName: true, lastName: true } },
        _count: { select: { submissions: true } }
      },
      orderBy: { examDate: 'asc' },
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
    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        group: { select: { name: true, id: true } }, // Added id for edit page selection if needed
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
    const { title, description, examDate, groupId, teacherId } = req.body;

    if (!title || !groupId || !teacherId) {
        res.status(400).json({ error: "Missing required fields" });
        return;
    }

    const newExam = await prisma.exam.create({
      data: {
        title,
        description,
        examDate: examDate ? new Date(examDate) : null,
        groupId,
        teacherId
      },
    });
    res.status(201).json(newExam);
  } catch (err) {
    console.error("Failed to create exam:", err);
    res.status(500).json({ error: "Failed to create exam" });
  }
};

export const updateExam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, examDate, groupId, teacherId } = req.body;

    const updatedExam = await prisma.exam.update({
      where: { id },
      data: {
        title,
        description,
        examDate: examDate ? new Date(examDate) : undefined,
        groupId,
        teacherId
      },
    });
    res.json(updatedExam);
  } catch (err) {
    console.error("Failed to update exam:", err);
    res.status(500).json({ error: "Failed to update exam" });
  }
};

export const deleteExam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.exam.delete({ where: { id } });
    res.json({ message: "Exam deleted successfully" });
  } catch (err) {
    console.error("Failed to delete exam:", err);
    res.status(500).json({ error: "Failed to delete exam" });
  }
};
