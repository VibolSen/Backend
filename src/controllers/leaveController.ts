import { Request, Response } from 'express';
import prisma from '../prisma';

// --- Leave Management ---

// Create a new leave request
export const createLeaveRequest = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId; // Assuming authentication middleware attaches user
    const { type, startDate, endDate, reason } = req.body;

    // Basic validation
    if (!type || !startDate || !endDate) {
      return res.status(400).json({ error: "Missing required fields: type, startDate, endDate" });
    }

    const leaveRequest = await (prisma as any).leaveRequest.create({
      data: {
        userId,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason
      }
    });

    // Notify HR/Admin (Implementation of notification service pending, but mocking here)
    // await createNotification({ userId: 'admin_id', message: `New leave request from ${userId}` });

    res.status(201).json(leaveRequest);
  } catch (err: any) {
    console.error("Failed to create leave request:", err);
    res.status(500).json({ error: "Failed to create leave request", message: err.message });
  }
};

// Get current user's leave requests
export const getMyLeaveRequests = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const requests = await (prisma as any).leaveRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(requests);
  } catch (err: any) {
    console.error("Failed to fetch leave requests:", err);
    res.status(500).json({ error: "Failed to fetch leave requests", message: err.message });
  }
};

// Get all leave requests (Admin/HR only)
export const getAllLeaveRequests = async (req: Request, res: Response) => {
  try {
    const { status, type } = req.query;
    
    const filter: any = {};
    if (status) filter.status = String(status);
    if (type) filter.type = String(type);

    const requests = await (prisma as any).leaveRequest.findMany({
      where: filter,
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true, department: { select: { name: true } } }
        },
        approvedBy: {
          select: { firstName: true, lastName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(requests);
  } catch (err: any) {
    console.error("Failed to fetch all leave requests:", err);
    res.status(500).json({ error: "Failed to fetch leave requests", message: err.message });
  }
};

// Update leave request status (Approve/Reject)
export const updateLeaveStatus = async (req: any, res: Response) => {
  const { id } = req.params;
  const { status, rejectionReason } = req.body;
  const approverId = req.user.userId;

  try {
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const updatedRequest = await (prisma as any).leaveRequest.update({
      where: { id },
      data: {
        status,
        rejectionReason: status === 'REJECTED' ? rejectionReason : null,
        approvedById: approverId
      }
    });

    // Notify the user
    await prisma.notification.create({
      data: {
        userId: updatedRequest.userId,
        title: `Leave Request ${status}`,
        message: `Your leave request for ${new Date(updatedRequest.startDate).toLocaleDateString()} has been ${status.toLowerCase()}.`,
        type: 'LEAVE_STATUS'
      }
    });

    res.json(updatedRequest);
  } catch (err: any) {
    console.error("Failed to update leave status:", err);
    res.status(500).json({ error: "Failed to update leave status", message: err.message });
  }
};

// Get Leave Balances (Mock calculation for now, or aggregations)
export const getLeaveBalances = async (req: any, res: Response) => {
    // In a real system, you'd have a 'LeaveEntitlement' model. 
    // Here we will just return the total days taken by type for the current year.
    try {
        const userId = req.user.userId;
        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(currentYear, 0, 1);
        const endOfYear = new Date(currentYear, 11, 31);

        const approvedLeaves = await (prisma as any).leaveRequest.findMany({
            where: {
                userId,
                status: 'APPROVED',
                startDate: { gte: startOfYear },
                endDate: { lte: endOfYear }
            }
        });

        // Calculate days per type
        const balances: any = {};
        approvedLeaves.forEach((leave: any) => {
            const days = (leave.endDate.getTime() - leave.startDate.getTime()) / (1000 * 3600 * 24) + 1; // Inclusive
            balances[leave.type] = (balances[leave.type] || 0) + Math.ceil(days);
        });

        res.json({ year: currentYear, taken: balances });
    } catch (err: any) {
        console.error("Failed to fetch leave balances:", err);
        res.status(500).json({ error: "Failed to fetch leave balances", message: err.message });
    }
};
