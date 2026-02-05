import { Request, Response } from 'express';
import prisma from '../prisma';

async function calculateCourseProgress(studentId: string, courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      groups: {
        include: {
          assignments: true,
          exams: true,
        },
      },
    },
  });

  if (!course) return 0;

  const assignments = course.groups.flatMap((g) => g.assignments);
  const exams = course.groups.flatMap((g) => g.exams);

  const totalPossiblePoints = 
    assignments.reduce((sum, a) => sum + (a.points || 100), 0) + 
    exams.length * 100;

  if (totalPossiblePoints === 0) return 0;

  const studentSubmissions = await prisma.submission.findMany({
    where: {
      studentId: studentId,
      assignmentId: { in: assignments.map((a) => a.id) },
      status: "GRADED",
    },
  });

  const studentExamSubmissions = await prisma.examSubmission.findMany({
    where: {
      studentId: studentId,
      examId: { in: exams.map((e) => e.id) },
      status: "GRADED",
    },
  });

  const earnedPoints = 
    studentSubmissions.reduce((sum, s) => sum + (s.grade || 0), 0) + 
    studentExamSubmissions.reduce((sum, s) => sum + (s.grade || 0), 0);

  const progress = (earnedPoints / totalPossiblePoints) * 100;
  return Math.round(progress);
}

export const updateProgress = async (req: Request, res: Response) => {
  try {
    const { studentId, courseId } = req.body;
    if (!studentId || !courseId) {
      return res.status(400).json({ error: "studentId and courseId are required" });
    }

    const progress = await calculateCourseProgress(studentId, courseId);
    const enrollment = await prisma.enrollment.update({
      where: {
        studentId_courseId: { studentId, courseId }
      },
      data: { progress }
    });

    res.json(enrollment);
  } catch (error) {
    console.error("Progress update error:", error);
    res.status(500).json({ error: "Failed to update progress" });
  }
};

export const getEnrollments = async (req: Request, res: Response) => {
    try {
        const { studentId } = req.query;
        const enrollments = await prisma.enrollment.findMany({
            where: { studentId: studentId as string },
            include: { course: true }
        });
        res.json(enrollments);
    } catch (error) {
        console.error("Failed to fetch enrollments:", error);
        res.status(500).json({ error: "Failed to fetch enrollments" });
    }
};
