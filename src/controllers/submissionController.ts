import { Request, Response } from 'express';
import prisma from '../prisma';

export const getSubmission = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 1. Try to find a real submission
    const submission = await prisma.submission.findUnique({
      where: { id },
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
        where: { id },
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
            student: null // We don't have the student context here easily, but the view should handle it
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
    const { grade, feedback, status } = req.body;

    // Mapping frontend statusId to Enum if necessary, or assuming string matches.
    // The Schema has Check SubmissionStatus enum: PENDING, SUBMITTED, GRADED.
    // Frontend likely sends ID or String. The generic 'statusId' suggests a lookup.
    // For now, we update grade/feedback.

    const updated = await prisma.submission.update({
      where: { id },
      data: {
        grade: grade ? parseInt(grade) : undefined,
        feedback,
        status: status // Ensure frontend sends correct Enum string 'GRADED' etc.
      }
    });
    res.json(updated);
  } catch (err) {
    console.error("Failed to update submission:", err);
    res.status(500).json({ error: "Failed to update submission" });
  }
};

export const createSubmission = async (req: Request, res: Response) => {
    // For students submitting work
    try {
        const { assignmentId, studentId, content, fileUrl } = req.body;
        const submission = await prisma.submission.create({
            data: {
                assignmentId,
                studentId,
                content,
                // fileUrl is not in schema I saw? Let's check schema.
                // Schema has `content` string. `resume` string in JobApplication.
                // Assignment Submission schema: `content`, `submittedAt`, `grade`, `feedback`, `status`.
                // No `fileUrl`. Maybe `content` stores the URL?
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
