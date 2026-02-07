import { Request, Response } from 'express';
import prisma from '../prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-that-is-long';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const tokenPayload = {
      userId: user.id,
      role: user.role,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1d' });
    const { password: _, ...userWithoutPassword } = user;

    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    console.error("Login API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: role || 'STUDENT',
      },
    });

    const tokenPayload = {
      userId: newUser.id,
      role: newUser.role,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1d' });
    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({ user: userWithoutPassword, token });
  } catch (error) {
    console.error("Register API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    // User ID comes from authenticated JWT token
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        departmentId: true,
        groupIds: true,
        profile: true,
        department: true,
        groups: {
          select: {
            id: true,
            name: true,
            courses: {
              select: {
                id: true,
                name: true
              }
            },
            students: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        headedFaculties: {
          select: {
            id: true,
            name: true,
          },
        },
        ledCourses: {
          select: {
            id: true,
            name: true,
            groups: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // For TEACHER role, consolidate groupIds
    let finalUser = { ...user };
    if (user.role === "TEACHER") {
      const teacherLedGroupIds = user.ledCourses
        ? user.ledCourses.flatMap((course) =>
            course.groups.map((group) => group.id)
          )
        : [];
      finalUser.groupIds = Array.from(
        new Set([...(user.groupIds || []), ...teacherLedGroupIds])
      );
    }

    res.json(finalUser);
  } catch (error) {
    console.error("ME API error:", error);
    res.status(500).json({ error: "An internal server error occurred" });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    // In a stateless JWT system, logout is handled client-side by removing the token
    // This endpoint can be used for logging or future token blacklisting
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
