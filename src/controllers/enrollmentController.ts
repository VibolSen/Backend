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
    assignments.reduce((sum, a: any) => sum + (a.maxPoints || a.points || 100), 0) +
    exams.reduce((sum, e: any) => sum + (e.maxScore || 100), 0);

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
      where: studentId ? { studentId: studentId as string } : {},
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        course: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: { id: 'desc' }
    });
    res.json(enrollments);
  } catch (error) {
    console.error("Failed to fetch enrollments:", error);
    res.status(500).json({ error: "Failed to fetch enrollments" });
  }
};

export const createEnrollment = async (req: Request, res: Response) => {
  try {
    const { studentId, courseId, progress = 0 } = req.body;

    const enrollment = await prisma.enrollment.upsert({
      where: {
        studentId_courseId: { studentId, courseId }
      },
      update: { progress },
      create: { studentId, courseId, progress },
      include: {
        student: true,
        course: true
      }
    });

    res.json(enrollment);
  } catch (error) {
    console.error("Save enrollment error:", error);
    res.status(500).json({ error: "Failed to save enrollment" });
  }
};

export const setFinalGrade = async (req: Request, res: Response) => {
  try {
    const { studentId, courseId, finalGrade } = req.body;

    if (!studentId || !courseId || finalGrade === undefined) {
      return res.status(400).json({ error: "studentId, courseId, and finalGrade are required" });
    }

    const enrollment = await prisma.enrollment.upsert({
      where: {
        studentId_courseId: { studentId, courseId }
      },
      update: {
        finalGrade: parseFloat(finalGrade),
        isCompleted: true
      },
      create: {
        studentId,
        courseId,
        finalGrade: parseFloat(finalGrade),
        isCompleted: true,
        progress: 0
      },
      include: {
        student: true,
        course: true
      }
    });

    res.json(enrollment);
  } catch (error) {
    console.error("Set final grade error:", error);
    res.status(500).json({ error: "Failed to set final grade" });
  }
};

export const getAutoCalculatedScore = async (req: Request, res: Response) => {
  try {
    const { courseId, studentId } = req.params;

    if (!courseId || !studentId) {
      return res.status(400).json({ error: "courseId and studentId are required" });
    }

    const cId = Array.isArray(courseId) ? courseId[0] : courseId;
    const sId = Array.isArray(studentId) ? studentId[0] : studentId;

    const course = await prisma.course.findUnique({
      where: { id: cId as string },
      include: {
        groups: {
          where: { studentIds: { has: sId as string } },
          include: {
            assignments: true,
            exams: true,
          },
        },
      },
    });

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const assignments = course.groups.flatMap((g: any) => g.assignments || []);
    const exams = course.groups.flatMap((g: any) => g.exams || []);

    const totalPossiblePoints =
      assignments.reduce((sum, a: any) => sum + (a.maxPoints || a.points || 100), 0) +
      exams.reduce((sum, e: any) => sum + (e.maxScore || 100), 0);

    if (totalPossiblePoints === 0) {
      return res.json({ suggestedScore: 0, breakdown: { earned: 0, total: 0 } });
    }

    const studentSubmissions = await prisma.submission.findMany({
      where: {
        studentId: sId as string,
        assignmentId: { in: assignments.map((a: any) => a.id) },
        status: "GRADED",
      },
    });

    const studentExamSubmissions = await prisma.examSubmission.findMany({
      where: {
        studentId: sId as string,
        examId: { in: exams.map((e: any) => e.id) },
        status: "GRADED",
      },
    });

    const earnedPoints =
      studentSubmissions.reduce((sum, s) => sum + (s.grade || 0), 0) +
      studentExamSubmissions.reduce((sum, s) => sum + (s.grade || 0), 0);

    const suggestedScore = Math.round((earnedPoints / totalPossiblePoints) * 100);

    res.json({ 
      suggestedScore, 
      breakdown: { earned: earnedPoints, total: totalPossiblePoints, assignments: assignments.length, exams: exams.length } 
    });
  } catch (error) {
    console.error("Auto calculation error:", error);
    res.status(500).json({ error: "Failed to calculate score" });
  }
};
