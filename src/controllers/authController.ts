import { Request, Response } from 'express';
import prisma from '../prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

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

    // Check if account is active
    if (user.isActive === false) {
      return res.status(403).json({ error: "Your account has been suspended. Please contact administration." });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Create session
    const userAgent = req.headers['user-agent'] || 'Unknown Device';
    let device = 'Desktop';
    if (/mobile/i.test(userAgent)) device = 'Mobile';
    else if (/tablet/i.test(userAgent)) device = 'Tablet';

    let browser = 'Unknown Browser';
    if (/chrome|crios/i.test(userAgent)) browser = 'Chrome';
    else if (/firefox|fxios/i.test(userAgent)) browser = 'Firefox';
    else if (/safari/i.test(userAgent)) browser = 'Safari';
    else if (/edge/i.test(userAgent)) browser = 'Edge';

    const session = await prisma.userSession.create({
      data: {
        userId: user.id,
        device: device,
        browser: browser,
        ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || 'Unknown',
        location: 'Phnom Penh, KH', // Placeholder for now
        status: 'active'
      }
    });

    const tokenPayload = {
      userId: user.id,
      role: user.role,
      sessionId: session.id
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1d' });
    const { password: _, ...userWithoutPassword } = user;

    res.json({ user: userWithoutPassword, token, sessionId: session.id });
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
        isActive: true,
        lastLogin: true,
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
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ ...user, sessionId: req.user.sessionId });
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

export const getUserSessions = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const sessions = await prisma.userSession.findMany({
      where: { 
        userId: req.user.userId,
        status: 'active'
      },
      orderBy: { createdAt: 'desc' },
      take: 5 // Limit to recent 5 active sessions
    });

    res.json(sessions);
  } catch (error) {
    console.error("Fetch sessions error:", error);
    res.status(500).json({ error: "Failed to fetch active sessions" });
  }
};

export const revokeOtherSessions = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const currentSessionId = req.user.sessionId;

    await prisma.userSession.updateMany({
      where: {
        userId: req.user.userId,
        id: { not: currentSessionId },
        status: 'active'
      },
      data: {
        status: 'logged_out'
      }
    });

    res.json({ message: "Other devices signed out successfully" });
  } catch (error) {
    console.error("Revoke sessions error:", error);
    res.status(500).json({ error: "Failed to revoke other sessions" });
  }
};

export const revokeSession = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { sessionId } = req.params;

    await prisma.userSession.update({
      where: {
        id: sessionId as string,
        userId: req.user.userId
      },
      data: {
        status: 'logged_out'
      }
    });

    res.json({ message: "Session revoked successfully" });
  } catch (error) {
    console.error("Revoke session error:", error);
    res.status(500).json({ error: "Failed to revoke session" });
  }
};
