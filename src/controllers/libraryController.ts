import { Request, Response } from 'express';
import prisma from '../prisma';

export const getLibraryResources = async (req: Request, res: Response) => {
  try {
    const resources = await prisma.libraryResource.findMany({
        include: {
            uploadedBy: {
                select: { firstName: true, lastName: true }
            }
        }
    });
    res.json(resources);
  } catch (err) {
    console.error("Failed to fetch library resources:", err);
    res.status(500).json({ error: "Failed to fetch library resources" });
  }
};

export const createLibraryResource = async (req: Request, res: Response) => {
  try {
    const { title, author, coverImage, uploadedById, department, description, publicationYear } = req.body;
    const resource = await prisma.libraryResource.create({
      data: {
        title,
        author,
        coverImage,
        uploadedById,
        department,
        description,
        publicationYear
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
      where: { id },
    });
    res.status(204).send();
  } catch (err) {
    console.error("Failed to delete library resource:", err);
    res.status(500).json({ error: "Failed to delete library resource" });
  }
};

export const updateLibraryResource = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, author, coverImage, department, description, publicationYear } = req.body;

    const updatedResource = await prisma.libraryResource.update({
      where: { id },
      data: {
        title,
        author,
        coverImage,
        department,
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
