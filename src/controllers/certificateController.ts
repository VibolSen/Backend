import { Request, Response } from 'express';
import prisma from '../prisma';

export const getCertificates = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    
    const where: any = {};
    if (userId) {
      where.studentId = String(userId);
    }

    const certificates = await prisma.certificate.findMany({
      where,
      include: {
        course: {
          select: { id: true, name: true }
        },
        student: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(certificates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getCertificateById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const certificate = await prisma.certificate.findUnique({
      where: { id: String(id) },
      include: {
        course: true,
        student: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    res.json(certificate);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createCertificate = async (req: Request, res: Response) => {
  const { recipient, courseId, issueDate, expiryDate, studentId } = req.body;
  try {
    const certificate = await prisma.certificate.create({
      data: {
        recipient,
        courseId,
        issueDate: new Date(issueDate),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        studentId: studentId || null,
      },
      include: {
        course: true,
        student: true
      }
    });
    res.status(201).json(certificate);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateCertificate = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { recipient, courseId, issueDate, expiryDate, studentId } = req.body;
  try {
    const certificate = await prisma.certificate.update({
      where: { id: String(id) },
      data: {
        recipient,
        courseId,
        issueDate: new Date(issueDate),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        studentId: studentId || null,
      },
      include: {
        course: true,
        student: true
      }
    });
    res.json(certificate);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteCertificate = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.certificate.delete({
      where: { id: String(id) }
    });
    res.json({ message: 'Certificate deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const bulkIssueCertificates = async (req: Request, res: Response) => {
  const { studentIds, courseId, issueDate, expiryDate } = req.body;

  if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ error: 'No student IDs provided' });
  }

  try {
    // Fetch students to get their names for the recipient field
    const students = await prisma.user.findMany({
      where: {
        id: { in: studentIds }
      }
    });

    const certificateData = students.map(student => ({
      recipient: `${student.firstName} ${student.lastName}`,
      studentId: student.id,
      courseId,
      issueDate: new Date(issueDate),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
    }));

    const result = await prisma.certificate.createMany({
      data: certificateData
    });

    res.status(201).json({ count: result.count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const downloadCertificate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const certificate = await prisma.certificate.findUnique({
      where: { id: String(id) },
      include: { course: true }
    });

    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    // Placeholder: In a real app, you'd use a library like PDFKit or Puppeteer to generate a PDF here.
    // For now, we'll return a 501 Not Implemented or a simple message.
    res.status(501).json({ error: 'PDF generation service is temporarily unavailable. Please use the View option.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
