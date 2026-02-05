import { Router } from 'express';
import { getInvoices, createInvoice, getFees, createPayment, getExpenses, createExpense, deleteExpense } from '../controllers/financialController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Financial
 *   description: Invoices, Fees, and Payments management API
 */
/**
 * @swagger
 * /api/financial/invoices:
 *   get:
 *     summary: Get all invoices
 *     tags: [Financial]
 *     responses:
 *       200:
 *         description: List of invoices
 *   post:
 *     summary: Create an invoice
 *     tags: [Financial]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Invoice created
 *
 * /api/financial/fees:
 *   get:
 *     summary: Get all fees
 *     tags: [Financial]
 *     responses:
 *       200:
 *         description: List of fees
 *
 * /api/financial/payments:
 *   post:
 *     summary: Record a payment
 *     tags: [Financial]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Payment recorded
 *
 * /api/financial/expenses:
 *   get:
 *     summary: Get all expenses
 *     tags: [Financial]
 *     responses:
 *       200:
 *         description: List of expenses
 *   post:
 *     summary: Create an expense
 *     tags: [Financial]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Expense created
 *
 * /api/financial/expenses/{id}:
 *   delete:
 *     summary: Delete an expense
 *     tags: [Financial]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Expense deleted
 */
router.get('/invoices', getInvoices);
router.post('/invoices', createInvoice);
router.get('/fees', getFees);
router.post('/payments', createPayment);
router.get('/expenses', getExpenses);
router.post('/expenses', createExpense);
router.delete('/expenses/:id', deleteExpense);

export default router;
