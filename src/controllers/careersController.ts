import { Request, Response } from 'express';
import prisma from '../prisma';
import multer from 'multer';
import cloudinary from 'cloudinary';
import DatauriParser from 'datauri/parser';
import path from 'path';

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer Configuration for memory storage
const storage = multer.memoryStorage();
export const upload = multer({ storage: storage });

// DatauriParser for converting buffer to data URI
const parser = new DatauriParser();
const formatBufferToDataUri = (file: Express.Multer.File) => {
  return parser.format(path.extname(file.originalname).toString(), file.buffer);
};

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
      where: { id: String(id) }
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
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    let resumeUrl: string | null = null;
    let coverLetterUrl: string | null = null;

    if (files && files['resume'] && files['resume'].length > 0) {
      const fileDataUri = formatBufferToDataUri(files['resume'][0]).content;
      if (typeof fileDataUri === 'string') { // Ensure fileDataUri is a string
        const result = await cloudinary.v2.uploader.upload(fileDataUri, {
          folder: 'job-applications',
        });
        resumeUrl = result.secure_url;
      }
    }

    if (files && files['coverLetter'] && files['coverLetter'].length > 0) {
      const fileDataUri = formatBufferToDataUri(files['coverLetter'][0]).content;
      if (typeof fileDataUri === 'string') { // Ensure fileDataUri is a string
        const result = await cloudinary.v2.uploader.upload(fileDataUri, {
          folder: 'job-applications',
        });
        coverLetterUrl = result.secure_url;
      }
    }

    const application = await prisma.jobApplication.create({
      data: {
        applicantName,
        applicantEmail,
        jobPostingId,
        resume: resumeUrl,
        coverLetter: coverLetterUrl,
      }
    });

    res.status(201).json(application);
  } catch (err: any) {
    console.error("Failed to submit application:", err);
    res.status(500).json({ error: "Failed to submit application", message: err.message });
  }
};

