import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getStudentCertifications = async (req: Request, res: Response): Promise<any> => {
  const { studentId } = req.params as { studentId: string };

  try {
    const student = await prisma.user.findUnique({
      where: { id: studentId, role: 'STUDENT' },
      include: {
        profile: true,
        department: true,
        enrollments: {
          include: {
            course: true,
          },
        },
        certificates: true,
      },
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const groups = await prisma.group.findMany({
      where: { studentIds: { has: studentId } },
      include: {
        courses: true,
      },
    });

    // 1. Calculate macro-progress per Academic Year
    const yearlyProgress: Record<string, any> = {};
    let degreeCreditsTotal = 0;
    let degreeCreditsEarned = 0;

    groups.forEach((group) => {
      const year = group.academicYear || 'UNKNOWN_YEAR';
      if (!yearlyProgress[year]) {
        yearlyProgress[year] = {
          yearLabel: year,
          coursesTotal: 0,
          coursesCompleted: 0,
          creditsTotal: 0,
          creditsEarned: 0,
          isCompleted: false,
          courses: [],
        };
      }

      // Add group's courses to this year
      group.courses.forEach((course) => {
        const enrollment = student.enrollments.find(e => e.courseId === course.id);
        const isCourseCompleted = enrollment?.isCompleted || false;
        const finalGrade = enrollment?.finalGrade || null;
        const courseCredits = course.credits || 0;

        // Skip adding the same course multiple times if they are in overlapping groups for the same year
        if (!yearlyProgress[year].courses.find((c: any) => c.id === course.id)) {
            yearlyProgress[year].courses.push({
                id: course.id,
                name: course.name,
                credits: courseCredits,
                isCompleted: isCourseCompleted,
                finalGrade,
            });
            yearlyProgress[year].coursesTotal += 1;
            yearlyProgress[year].creditsTotal += courseCredits;
            degreeCreditsTotal += courseCredits;

            if (isCourseCompleted) {
                yearlyProgress[year].coursesCompleted += 1;
                yearlyProgress[year].creditsEarned += courseCredits;
                degreeCreditsEarned += courseCredits;
            }
        }
      });
    });

    // Determine completion status for each year
    Object.keys(yearlyProgress).forEach(year => {
        const progress = yearlyProgress[year];
        if (progress.coursesTotal > 0 && progress.coursesCompleted === progress.coursesTotal) {
            progress.isCompleted = true;
        }
    });

    // 2. Evaluate specific major milestones
    const hasFoundationYear = yearlyProgress['YEAR_1']?.isCompleted === true;
    
    // Bachelor requires Year 1, 2, 3, and 4
    const hasBachelor = 
        yearlyProgress['YEAR_1']?.isCompleted &&
        yearlyProgress['YEAR_2']?.isCompleted &&
        yearlyProgress['YEAR_3']?.isCompleted &&
        yearlyProgress['YEAR_4']?.isCompleted;

    return res.json({
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        batch: student.profile?.generation || 'N/A',
        department: student.department?.name || 'Unassigned',
      },
      degreeProgress: {
        totalCreditsRequired: degreeCreditsTotal,
        totalCreditsEarned: degreeCreditsEarned,
        completionPercentage: degreeCreditsTotal > 0 ? Math.round((degreeCreditsEarned / degreeCreditsTotal) * 100) : 0
      },
      yearlyProgress: Object.values(yearlyProgress),
      eligibility: {
          foundationYear: hasFoundationYear,
          bachelorsDegree: hasBachelor,
      },
      issuedCertificates: student.certificates,
    });
  } catch (error: any) {
    console.error("Get Student Certifications Error:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const issueDegreeCertificate = async (req: Request, res: Response): Promise<any> => {
    try {
        const { studentId, title } = req.body;

        if (!studentId || !title) {
            return res.status(400).json({ error: "studentId and title are required" });
        }

        const student = await prisma.user.findUnique({ where: { id: studentId } });
        if (!student) {
            return res.status(404).json({ error: "Student not found" });
        }

        const recipientName = `${student.firstName} ${student.lastName}`;

        const newCertificate = await prisma.certificate.create({
            data: {
                recipient: recipientName,
                studentId: student.id,
                title: title, // e.g. "Foundation Year" or "Bachelor's Degree in IT"
                issueDate: new Date(),
            }
        });

        return res.status(201).json({ message: "Certificate issued successfully", certificate: newCertificate });

    } catch (error: any) {
        console.error("Issue Degree Error:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

