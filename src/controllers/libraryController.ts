import { Request, Response } from 'express';
import prisma from '../prisma';
import { uploadToCloudinary } from '../middleware/upload';

export const getLibraryResources = async (req: Request, res: Response) => {
  try {
    const resources = await prisma.libraryResource.findMany({
        include: {
            uploadedBy: {
                select: { firstName: true, lastName: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
    res.json(resources);
  } catch (err) {
    console.error("Failed to fetch library resources:", err);
    res.status(500).json({ error: "Failed to fetch library resources" });
  }
};

export const createLibraryResource = async (req: any, res: any) => {
  try {
    // Determine department from the uploading user
    const uploadedById = req.body.uploadedById;
    const user = await prisma.user.findUnique({
        where: { id: uploadedById },
        include: { department: true }
    });
    const department = user?.department?.name || null;

    const { title, author, description, publicationYear } = req.body;
    let coverImage = req.body.coverImage;
    let fileUrl = req.body.fileUrl;

    // Handle File Uploads
    if (req.files) {
        if (req.files['coverImage']?.[0]) {
            const result = await uploadToCloudinary(req.files['coverImage'][0].buffer, 'school-management/library');
            coverImage = result.secure_url;
        }
        if (req.files['resourceFile']?.[0]) {
             const result = await uploadToCloudinary(req.files['resourceFile'][0].buffer, 'school-management/library-files');
             fileUrl = result.secure_url;
        }
    }

    if (!coverImage) {
        return res.status(400).json({ error: "Cover image is required" });
    }

    const resource = await prisma.libraryResource.create({
      data: {
        title,
        author,
        coverImage,
        fileUrl, // Store PDF URL
        uploadedById,
        department,
        description,
        publicationYear: publicationYear ? parseInt(String(publicationYear)) : undefined
      },
    });
    res.status(201).json(resource);
  } catch (err) {
    console.error("Failed to create library resource:", err);
    res.status(500).json({ error: "Failed to create library resource" });
  }
};

export const deleteLibraryResource = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.libraryResource.delete({
      where: { id: String(id) },
    });
    res.status(204).send();
  } catch (err) {
    console.error("Failed to delete library resource:", err);
    res.status(500).json({ error: "Failed to delete library resource" });
  }
};

export const updateLibraryResource = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { title, author, description, publicationYear } = req.body;
    let coverImage = req.body.coverImage;
    let fileUrl = req.body.fileUrl;

    // Handle File Uploads
    if (req.files) {
        if (req.files['coverImage']?.[0]) {
            const result = await uploadToCloudinary(req.files['coverImage'][0].buffer, 'school-management/library');
            coverImage = result.secure_url;
        }
        if (req.files['resourceFile']?.[0]) {
             const result = await uploadToCloudinary(req.files['resourceFile'][0].buffer, 'school-management/library-files');
             fileUrl = result.secure_url;
        }
    }

    const updatedResource = await prisma.libraryResource.update({
      where: { id: String(id) },
      data: {
        title,
        author,
        coverImage,
        fileUrl: fileUrl || undefined, // Only update if new file provided
        description,
        publicationYear: publicationYear ? parseInt(String(publicationYear)) : undefined
      },
    });

    res.json(updatedResource);
  } catch (err) {
    console.error("Failed to update library resource:", err);
    res.status(500).json({ error: "Failed to update library resource" });
  }
};
