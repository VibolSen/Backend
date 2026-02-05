import { Request, Response } from 'express';
import prisma from '../prisma';

/**
 * Fetches all necessary data for the Gradebook view:
 * - Courses with their groups and students
 * - Assignments and Exams
 * - All submissions and exam submissions
 */
export const getGradebookData = async (req: Request, res: Response) => {
  try {
    const [courses, assignments, exams, submissions, examSubmissions] = await Promise.all([
      prisma.course.findMany({
        include: {
          groups: {
            include: {
              students: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                }
              }
            }
          }
        },
        orderBy: { name: 'asc' }
      }),
      prisma.assignment.findMany({
        orderBy: { dueDate: 'asc' }
      }),
      prisma.exam.findMany({
        orderBy: { examDate: 'asc' }
      }),
      prisma.submission.findMany(),
      prisma.examSubmission.findMany()
    ]);

    res.json({
      courses,
      assignments,
      exams,
      submissions,
      examSubmissions
    });
  } catch (error) {
    console.error("Failed to fetch Gradebook data:", error);
    res.status(500).json({ error: "Failed to fetch Gradebook data" });
  }
};
