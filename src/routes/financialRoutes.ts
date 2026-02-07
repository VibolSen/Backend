import { Router } from 'express';
import { getInvoices, getInvoiceById, createInvoice, deleteInvoice, getFees, createFee, updateFee, deleteFee, getPayments, createPayment, updatePayment, deletePayment, getExpenses, createExpense, updateExpense, deleteExpense, generatePaymentQR, checkBakongStatus, bakongCallback } from '../controllers/financialController';

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
router.get('/invoices/:id', getInvoiceById);
router.post('/invoices', createInvoice);
router.delete('/invoices/:id', deleteInvoice); // New DELETE route for invoices
router.get('/fees', getFees);
router.post('/fees', createFee);
router.put('/fees/:id', updateFee);
router.delete('/fees/:id', deleteFee);
router.get('/payments', getPayments);
router.post('/payments', createPayment);
router.put('/payments/:id', updatePayment);
router.delete('/payments/:id', deletePayment);
router.get('/expenses', getExpenses);
router.post('/expenses', createExpense);
router.put('/expenses/:id', updateExpense);
router.delete('/expenses/:id', deleteExpense);
router.post('/bakong-qr', generatePaymentQR);
router.get('/bakong-status/:invoiceId', checkBakongStatus);
router.post('/bakong-callback', bakongCallback);

export default router;
