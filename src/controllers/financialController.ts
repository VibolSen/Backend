import { Request, Response } from 'express';
import prisma from '../prisma';

// Invoices
export const getInvoices = async (req: Request, res: Response) => {
  try {
    const invoices = await prisma.invoice.findMany({
        include: {
            student: {
                select: { firstName: true, lastName: true, email: true }
            },
            items: {
                include: { fee: true }
            },
            payments: true
        }
    });
    res.json(invoices);
  } catch (err) {
    console.error("Failed to fetch invoices:", err);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
};

export const createInvoice = async (req: Request, res: Response) => {
  try {
    const { studentId, issueDate, dueDate, totalAmount, items } = req.body;
    const invoice = await prisma.invoice.create({
      data: {
        studentId,
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        totalAmount,
        items: {
            create: items // items should be array of { feeId, description, amount }
        }
      },
    });
    res.status(201).json(invoice);
  } catch (err) {
    console.error("Failed to create invoice:", err);
    res.status(500).json({ error: "Failed to create invoice" });
  }
};

// Fees
export const getFees = async (req: Request, res: Response) => {
    try {
        const fees = await prisma.fee.findMany();
        res.json(fees);
    } catch (err) {
        console.error("Failed to fetch fees:", err);
        res.status(500).json({ error: "Failed to fetch fees" });
    }
};

// Payments
export const createPayment = async (req: Request, res: Response) => {
    try {
        const { invoiceId, amount, paymentDate, paymentMethod, transactionId, notes } = req.body;
        const payment = await prisma.payment.create({
            data: {
                invoiceId,
                amount,
                paymentDate: new Date(paymentDate),
                paymentMethod,
                transactionId,
                notes
            }
        });
        
        // Update invoice status if fully paid? (Logic can be added here)
        
        res.status(201).json(payment);
    } catch (err) {
        console.error("Failed to create payment:", err);
        res.status(500).json({ error: "Failed to create payment" });
    }
};

// Expenses
export const getExpenses = async (req: Request, res: Response) => {
    try {
        const expenses = await prisma.expense.findMany({
            orderBy: { date: 'desc' }
        });
        res.json(expenses);
    } catch (err) {
        console.error("Failed to fetch expenses:", err);
        res.status(500).json({ error: "Failed to fetch expenses" });
    }
};

export const createExpense = async (req: Request, res: Response) => {
    try {
        const { category, description, amount, date } = req.body;
        const expense = await prisma.expense.create({
            data: {
                category,
                description,
                amount,
                date: new Date(date)
            }
        });
        res.status(201).json(expense);
    } catch (err) {
        console.error("Failed to create expense:", err);
        res.status(500).json({ error: "Failed to create expense" });
    }
};

export const deleteExpense = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.expense.delete({
            where: { id }
        });
        res.status(204).send();
    } catch (err) {
        console.error("Failed to delete expense:", err);
        res.status(500).json({ error: "Failed to delete expense" });
    }
};
