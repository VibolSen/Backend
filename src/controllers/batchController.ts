import { Request, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';

export const getBatches = async (req: Request, res: Response) => {
    try {
        const { departmentId } = req.query;
        const where: any = {};
        if (departmentId) where.departmentId = String(departmentId);

        const batches = await prisma.batch.findMany({
            where,
            include: {
                department: true,
                _count: {
                    select: { profiles: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(batches);
    } catch (err) {
        console.error("Failed to fetch batches:", err);
        res.status(500).json({ error: "Failed to fetch batches" });
    }
};

export const createBatch = async (req: Request, res: Response) => {
    try {
        const { name, startDate, endDate, departmentId } = req.body;

        if (!name || !departmentId) {
            return res.status(400).json({ error: "Name and Department ID are required" });
        }

        const newBatch = await prisma.batch.create({
            data: {
                name,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                departmentId,
                status: 'ACTIVE'
            }
        });

        res.status(201).json(newBatch);
    } catch (error) {
        console.error("Error creating batch:", error);
        res.status(500).json({ error: "Failed to create batch" });
    }
};

export const updateBatch = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, startDate, endDate, status } = req.body;

        const updatedBatch = await prisma.batch.update({
            where: { id: String(id) },
            data: {
                name,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                status
            }
        });

        res.json(updatedBatch);
    } catch (error) {
        console.error("Error updating batch:", error);
        res.status(500).json({ error: "Failed to update batch" });
    }
};

export const deleteBatch = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.batch.delete({ where: { id: String(id) } });
        res.json({ message: "Batch deleted successfully" });
    } catch (error) {
        console.error("Error deleting batch:", error);
        res.status(500).json({ error: "Failed to delete batch" });
    }
};

// Bulk Actions for Batch
export const promoteBatchYear = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Find all profiles in this batch
        const profiles = await prisma.profile.findMany({
            where: { batchId: String(id) }
        });

        // Update each profile to next year
        const updates = profiles.map(profile => {
            const currentYear = profile.academicYear || 1;
            return prisma.profile.update({
                where: { id: profile.id },
                data: { academicYear: currentYear < 5 ? currentYear + 1 : 5 }
            });
        });

        await Promise.all(updates);

        res.json({ message: `Successfully promoted ${profiles.length} students to the next year.` });
    } catch (error) {
        console.error("Error promoting batch:", error);
        res.status(500).json({ error: "Failed to promote batch students" });
    }
};

export const updateBatchStudentsStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { academicStatus } = req.body;

        if (!academicStatus) {
            return res.status(400).json({ error: "Academic status is required" });
        }

        const result = await prisma.profile.updateMany({
            where: { batchId: String(id) },
            data: { academicStatus }
        });

        res.json({ message: `Successfully updated status for ${result.count} students.` });
    } catch (error) {
        console.error("Error updating batch status:", error);
        res.status(500).json({ error: "Failed to update batch students status" });
    }
};
