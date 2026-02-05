import { Request, Response } from 'express';
import prisma from '../prisma';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const { role } = req.query;
    const where: any = {};
    
    if (role) {
      where.role = role;
    } else if (req.query.roleType === 'nonStudent') {
      where.role = { not: 'STUDENT' };
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        profile: true,
        department: true,
      },
      orderBy: { lastName: 'asc' }
    });
    res.json(users);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;
    const newUser = await prisma.user.create({
      data: {
        email,
        password, // Hash this in real app
        firstName,
        lastName,
        role,
      },
    });
    res.status(201).json(newUser);
  } catch (error) {
    console.error("Failed to create user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const profile = await prisma.profile.findUnique({
      where: { userId: id },
      include: { user: true }
    });
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }
    res.json(profile);
  } catch (error) {
    console.error("Failed to fetch profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { bio, avatar, address, phone, dateOfBirth } = req.body;
    
    const profile = await prisma.profile.upsert({
      where: { userId: id },
      update: {
        bio,
        avatar,
        address,
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined
      },
      create: {
        userId: id,
        bio,
        avatar,
        address,
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined
      }
    });
    res.json(profile);
  } catch (error) {
    console.error("Failed to update profile:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const id = (req.query.id as string) || req.params.id;
    const { email, firstName, lastName, role, password } = req.body;

    if (!id) return res.status(400).json({ error: "User ID is required" });

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        email,
        firstName,
        lastName,
        role,
        password, // In a real app, hash this if it's being updated
      },
    });
    res.json(updatedUser);
  } catch (error) {
    console.error("Failed to update user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const id = (req.query.id as string) || req.params.id;
    if (!id) return res.status(400).json({ error: "User ID is required" });

    await prisma.user.delete({
      where: { id },
    });
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Failed to delete user:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
};
