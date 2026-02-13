import { Request, Response } from 'express';
import prisma from '../prisma';

// Job Postings
export const getJobPostings = async (req: Request, res: Response) => {
  try {
    const postings = await prisma.jobPosting.findMany({
      include: {
        hiringManager: {
          select: { firstName: true, lastName: true, email: true }
        },
        applications: true
      },
      orderBy: { postedDate: 'desc' }
    });
    res.json(postings);
  } catch (err: any) {
    console.error("Failed to fetch job postings:", err);
    res.status(500).json({ error: "Failed to fetch job postings", message: err.message });
  }
};

export const createJobPosting = async (req: Request, res: Response) => {
  try {
    const { 
      title, 
      description, 
      requirements, 
      responsibilities, 
      location, 
      department, 
      salaryRange, 
      employmentType, 
      applicationDeadline, 
      hiringManagerId,
      status 
    } = req.body;

    const posting = await prisma.jobPosting.create({
      data: {
        title,
        description,
        requirements: Array.isArray(requirements) ? requirements : [requirements],
        responsibilities: Array.isArray(responsibilities) ? responsibilities : [responsibilities],
        location,
        department,
        salaryRange,
        employmentType,
        applicationDeadline: new Date(applicationDeadline),
        hiringManagerId,
        status: status || 'OPEN'
      },
    });
    res.status(201).json(posting);
  } catch (err: any) {
    console.error("Failed to create job posting:", err);
    res.status(500).json({ error: "Failed to create job posting", message: err.message });
  }
};

export const updateJobPosting = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { 
      title, 
      description, 
      requirements, 
      responsibilities, 
      location, 
      department, 
      salaryRange, 
      employmentType, 
      applicationDeadline, 
      hiringManagerId,
      status 
    } = req.body;

    const posting = await prisma.jobPosting.update({
      where: { id: String(id) },
      data: {
        title,
        description,
        requirements: Array.isArray(requirements) ? requirements : [requirements],
        responsibilities: Array.isArray(responsibilities) ? responsibilities : [responsibilities],
        location,
        department,
        salaryRange,
        employmentType,
        applicationDeadline: new Date(applicationDeadline),
        hiringManagerId,
        status: status || 'OPEN'
      },
    });
    res.json(posting);
  } catch (err: any) {
    console.error("Failed to update job posting:", err);
    res.status(500).json({ error: "Failed to update job posting", message: err.message });
  }
};

export const deleteJobPosting = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.jobPosting.delete({
      where: { id: String(id) }
    });
    res.json({ message: 'Job posting deleted successfully' });
  } catch (err: any) {
    console.error("Failed to delete job posting:", err);
    res.status(500).json({ error: "Failed to delete job posting", message: err.message });
  }
};
