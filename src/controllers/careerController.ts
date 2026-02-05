import { Request, Response } from 'express';
import prisma from '../prisma';

// Job Postings
export const getJobPostings = async (req: Request, res: Response) => {
  try {
    const postings = await prisma.jobPosting.findMany({
        include: {
            hiringManager: {
                select: { firstName: true, lastName: true }
            },
            applications: true
        }
    });
    res.json(postings);
  } catch (err) {
    console.error("Failed to fetch job postings:", err);
    res.status(500).json({ error: "Failed to fetch job postings" });
  }
};

export const createJobPosting = async (req: Request, res: Response) => {
  try {
    const { title, description, requirements, responsibilities, location, department, salaryRange, employmentType, applicationDeadline, hiringManagerId } = req.body;
    const posting = await prisma.jobPosting.create({
      data: {
        title,
        description,
        requirements,
        responsibilities,
        location,
        department,
        salaryRange,
        employmentType,
        applicationDeadline: new Date(applicationDeadline),
        hiringManagerId
      },
    });
    res.status(201).json(posting);
  } catch (err) {
    console.error("Failed to create job posting:", err);
    res.status(500).json({ error: "Failed to create job posting" });
  }
};

// Certificates
export const getCertificates = async (req: Request, res: Response) => {
    try {
        const certificates = await prisma.certificate.findMany({
            include: {
                student: {
                    select: { firstName: true, lastName: true }
                },
                course: {
                    select: { name: true }
                }
            }
        });
        res.json(certificates);
    } catch (err) {
        console.error("Failed to fetch certificates:", err);
        res.status(500).json({ error: "Failed to fetch certificates" });
    }
};
