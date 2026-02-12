import { Request, Response } from 'express';
import prisma from '../prisma';
import bcrypt from 'bcrypt';
import { AuthRequest } from '../middleware/auth';
import { logAudit } from '../utils/audit';
import { generateStudentId } from '../utils/idGenerator';
import { authenticateToken } from '../middleware/auth';

export const getUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        department: true,
        _count: {
          select: { ledCourses: true }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Failed to fetch user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const { role, status } = req.query;
    const where: any = {};
    
    if (role) {
      where.role = role;
    } else if (req.query.roleType === 'nonStudent') {
      where.role = { not: 'STUDENT' };
    }

    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;

    const users = await prisma.user.findMany({
      where,
      include: {
        profile: true,
        department: true,
        _count: {
          select: { ledCourses: true }
        }
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
    const { email, password, firstName, lastName, role, gender } = req.body;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password || '123456', 10);

    let studentId = undefined;
    if (role === 'STUDENT') {
      studentId = await generateStudentId();
    }

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: role || 'STUDENT',
        isActive: true,
        profile: {
          create: {
            gender: gender || 'Other',
            studentId,
            specialization: req.body.specialization || [],
            maxWorkload: req.body.maxWorkload ? parseInt(req.body.maxWorkload) : undefined,
          } as any
        }
      },
      include: {
        profile: true
      }
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
    const { 
      bio, avatar, address, phone, dateOfBirth, gender,
      academicStatus, emergencyContactName, emergencyContactPhone, emergencyContactRelation,
      specialization, maxWorkload
    } = req.body;
    
    const profile = await prisma.profile.upsert({
      where: { userId: id },
      update: {
        bio,
        avatar,
        address,
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        gender,
        academicStatus,
        emergencyContactName,
        emergencyContactPhone,
        emergencyContactRelation,
        specialization,
        maxWorkload: maxWorkload ? parseInt(maxWorkload) : undefined
      } as any,
      create: {
        userId: id,
        bio,
        avatar,
        address,
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        gender,
        academicStatus,
        emergencyContactName,
        emergencyContactPhone,
        emergencyContactRelation,
        specialization: specialization || [],
        maxWorkload: maxWorkload ? parseInt(maxWorkload) : undefined
      } as any
    });
    res.json(profile);
  } catch (error) {
    console.error("Failed to update profile:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const id = (req.query.id as string) || req.params.id;
    const { email, firstName, lastName, role, isActive, specialization, maxWorkload } = req.body;

    if (!id) return res.status(400).json({ error: "User ID is required" });

    const currentUserData = await prisma.user.findUnique({
      where: { id },
      include: { profile: true }
    });

    if (!currentUserData) return res.status(404).json({ error: "User not found" });

    let studentId = (currentUserData.profile as any)?.studentId;
    
    // If migrating TO Student and doesn't have an ID yet
    if (role === 'STUDENT' && !studentId) {
      studentId = await generateStudentId();
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        email,
        firstName,
        lastName,
        role,
        isActive: isActive !== undefined ? isActive : undefined,
        profile: {
          upsert: {
            create: { 
              studentId,
              specialization: specialization || [],
              maxWorkload: maxWorkload ? parseInt(maxWorkload) : undefined
            } as any,
            update: { 
              studentId,
              specialization: specialization || undefined,
              maxWorkload: maxWorkload ? parseInt(maxWorkload) : undefined
            } as any
          }
        }
      },
    });

    if (req.user && role !== currentUserData.role) {
      await logAudit(req.user.userId, "ROLE_MIGRATION", "USER", id, { 
        from: currentUserData.role, 
        to: role 
      });
    } else if (req.user) {
      await logAudit(req.user.userId, "USER_UPDATED", "USER", id, { email, role, isActive });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error("Failed to update user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
};

export const adminResetPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) return res.status(400).json({ error: "New password is required" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    if (req.user) {
      await logAudit(req.user.userId, "PASSWORD_RESET", "USER", id);
    }

    res.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error("Failed to reset password:", error);
    res.status(500).json({ error: "Failed to reset password" });
  }
};

export const toggleUserStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive },
    });

    if (req.user) {
      await logAudit(req.user.userId, isActive ? "ACCOUNT_ACTIVATED" : "ACCOUNT_SUSPENDED", "USER", id);
    }

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Failed to toggle user status:", error);
    res.status(500).json({ error: "Failed to toggle user status" });
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

export const bulkCreateUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { users } = req.body; 

    if (!Array.isArray(users)) {
      return res.status(400).json({ error: "Invalid data format. Expected an array of users." });
    }

    const createdUsers = [];
    for (const userData of users) {
      const { email, password, firstName, lastName, role, gender, academicStatus } = userData;
      const hashedPassword = await bcrypt.hash(password || 'password123', 10);

      let studentId = undefined;
      const userRole = role || 'STUDENT';
      if (userRole === 'STUDENT') {
        studentId = await generateStudentId();
      }

      const newUser = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role: userRole,
          profile: {
            create: {
              gender: gender || 'Other',
              academicStatus: academicStatus || 'ACTIVE',
              studentId,
              specialization: userData.specialization || [],
              maxWorkload: userData.maxWorkload ? parseInt(userData.maxWorkload) : undefined,
            } as any
          }
        }
      });
      createdUsers.push(newUser);
    }

    if (req.user) {
      await logAudit(req.user.userId, "BULK_USER_CREATION", "USER", "MULTIPLE", { count: createdUsers.length });
    }

    res.status(201).json({ success: true, count: createdUsers.length, users: createdUsers });
  } catch (error) {
    console.error("Failed to bulk create users:", error);
    res.status(500).json({ error: "Failed to bulk create users" });
  }
};

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        actor: {
          select: {
            firstName: true,
            lastName: true,
            role: true,
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 100 // Limit to last 100 for performance
    });
    res.json(logs);
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
};
