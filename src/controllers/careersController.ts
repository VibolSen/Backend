import { Request, Response } from 'express';
import prisma from '../prisma';

export const getJobPostings = async (req: Request, res: Response) => {
  try {
    const postings = await prisma.jobPosting.findMany({
      where: { status: 'OPEN' },
      orderBy: { postedDate: 'desc' }
    });
    res.json(postings);
  } catch (err: any) {
    console.error("Failed to fetch job postings:", err);
    res.status(500).json({ error: "Failed to fetch job postings", message: err.message });
  }
};

export const getJobPostingById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const posting = await prisma.jobPosting.findUnique({
      where: { id }
    });
    if (!posting) {
      return res.status(404).json({ error: "Job posting not found" });
    }
    res.json(posting);
  } catch (err: any) {
    console.error("Failed to fetch job posting:", err);
    res.status(500).json({ error: "Failed to fetch job posting", message: err.message });
  }
};

export const submitApplication = async (req: Request, res: Response) => {
  try {
    const { applicantName, applicantEmail, jobPostingId } = req.body;
    // Note: Multipurpose file upload is temporarily disabled due to environment issues with multer installation.
    // Applications will be submitted without resume files for now.
    
    const resume = ""; // Placeholder
    const coverLetter = null;

    const application = await prisma.jobApplication.create({
      data: {
        applicantName,
        applicantEmail,
        jobPostingId,
        resume: resume,
        coverLetter: coverLetter,
      }
    });

    res.status(201).json(application);
  } catch (err: any) {
    console.error("Failed to submit application:", err);
    res.status(500).json({ error: "Failed to submit application", message: err.message });
  }
};
