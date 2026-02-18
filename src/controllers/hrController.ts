import { Request, Response } from 'express';
import prisma from '../prisma';

enum ApplicationStatus {
  APPLIED = "APPLIED",
  REVIEWING = "REVIEWING",
  INTERVIEWING = "INTERVIEWING",
  OFFERED = "OFFERED",
  HIRED = "HIRED",
  REJECTED = "REJECTED"
}


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

// --- Recruitment & Candidate Management ---

// Get all applications (with filtering)
export const getJobApplications = async (req: Request, res: Response) => {
  try {
    const { qualification, experience, skill, status, postingId } = req.query;

    const filter: any = {};
    if (status) filter.status = status;
    if (postingId) filter.jobPostingId = postingId;
    
    // Simple exact match filtering, can be improved with 'contains' for strings
    if (qualification) filter.qualification = { contains: String(qualification), mode: 'insensitive' };
    if (experience) filter.experience = { contains: String(experience), mode: 'insensitive' };
    
    // Handle skills array filtering
    if (skill) {
      const skillStr = String(skill);
      filter.skills = { has: skillStr }; 
    }

    const applications = await prisma.jobApplication.findMany({
      where: filter,
      include: {
        jobPosting: { select: { title: true, department: true } }
      },
      orderBy: { appliedAt: 'desc' }
    });
    res.json(applications);
  } catch (err: any) {
    console.error("Failed to fetch job applications:", err);
    res.status(500).json({ error: "Failed to fetch applications", message: err.message });
  }
};

// Update application status
export const updateApplicationStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const updatedApp = await (prisma as any).jobApplication.update({
      where: { id },
      data: { status }
    });
    
    // TODO: Trigger email notification to candidate
    
    res.json(updatedApp);
  } catch (err: any) {
    console.error("Failed to update application status:", err);
    res.status(500).json({ error: "Failed to update application status", message: err.message });
  }
};

// Upload Candidate CV (Handled via Multer middleware in route, this just saves metadata if needed)
export const submitApplication = async (req: Request, res: Response) => {
    try {
        const { applicantName, applicantEmail, jobPostingId, phone, qualification, experience, skills } = req.body;
        // Assuming file upload handles file url generation and attaches to req.files or req.file
        // This is a placeholder for the logic handled by the route's upload middleware + controller logic
        // For now, we'll assume the URL is passed or handled separately. 
        // Let's assume the frontend sends the Cloudinary URL directly or we handle it here.
        
        // If integrating with a file upload tool, the URLs would come from there.
        // For this snippet, we'll rely on the body containing the URLs.
        const { resumeUrl, coverLetterUrl } = req.body; 

        const application = await (prisma as any).jobApplication.create({
            data: {
                applicantName,
                applicantEmail,
                jobPostingId,
                resume: resumeUrl,
                coverLetter: coverLetterUrl,
                phone,
                qualification,
                experience,
                skills: Array.isArray(skills) ? skills : (skills ? [skills] : [])
            }
        });
        res.status(201).json(application);
    } catch (err: any) {
        console.error("Failed to submit application:", err);
        res.status(500).json({ error: "Failed to submit application", message: err.message });
    }
};
