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
    const { studentId, courseId } = req.query;
    const where: any = {};
    if (studentId) where.studentId = studentId as string;
    if (courseId) where.courseId = courseId as string;

    const enrollments = await prisma.enrollment.findMany({
      where,
      include: {
        student: true,
        course: true,
        group: true,
      } as any,
      orderBy: { createdAt: 'desc' } as any
    });
    res.json(enrollments);
  } catch (error) {
    console.error("Failed to fetch enrollments:", error);
    res.status(500).json({ error: "Failed to fetch enrollments" });
  }
};

export const createEnrollment = async (req: Request, res: Response) => {
  try {
    const { studentId, courseId, groupId, semester, status } = req.body;

    if (!studentId || !courseId) {
      return res.status(400).json({ error: "studentId and courseId are required" });
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId,
        courseId,
        groupId: groupId || undefined,
        semester,
        status: status || 'PENDING',
      } as any,
      include: {
        student: true,
        course: true,
        group: true,
      } as any
    });

    res.status(201).json(enrollment);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: "Student is already enrolled in this course" });
    }
    console.error("Failed to create enrollment:", error);
    res.status(500).json({ error: "Failed to create enrollment" });
  }
};

export const updateEnrollment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, semester, groupId, progress } = req.body;

    const updated = await prisma.enrollment.update({
      where: { id: id as any },
      data: {
        status,
        semester,
        groupId: groupId !== undefined ? groupId : undefined,
        progress,
      } as any,
      include: {
        student: true,
        course: true,
        group: true,
      } as any
    });

    res.json(updated);
  } catch (error) {
    console.error("Failed to update enrollment:", error);
    res.status(500).json({ error: "Failed to update enrollment" });
  }
};

export const deleteEnrollment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.enrollment.delete({
      where: { id: id as any }
    });

    res.json({ message: "Enrollment removed successfully" });
  } catch (error) {
    console.error("Failed to delete enrollment:", error);
    res.status(500).json({ error: "Failed to delete enrollment" });
  }
};
