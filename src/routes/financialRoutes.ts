import { Router } from 'express';
import { getInvoices, getInvoiceById, createInvoice, deleteInvoice, getFees, createFee, updateFee, deleteFee, getPayments, createPayment, updatePayment, deletePayment, getExpenses, createExpense, updateExpense, deleteExpense, generatePaymentQR, checkBakongStatus, bakongCallback } from '../controllers/financialController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

// Apply authentication to all financial routes
router.use(authenticateToken);

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
// Management Routes (Admin & Finance)
router.get('/invoices', authorizeRoles('ADMIN', 'FINANCE'), getInvoices);
router.get('/invoices/:id', authorizeRoles('ADMIN', 'FINANCE', 'STUDENT'), getInvoiceById);
router.post('/invoices', authorizeRoles('ADMIN', 'FINANCE'), createInvoice);
router.delete('/invoices/:id', authorizeRoles('ADMIN', 'FINANCE'), deleteInvoice);

router.get('/fees', authorizeRoles('ADMIN', 'FINANCE', 'STUDENT'), getFees);
router.post('/fees', authorizeRoles('ADMIN', 'FINANCE'), createFee);
router.put('/fees/:id', authorizeRoles('ADMIN', 'FINANCE'), updateFee);
router.delete('/fees/:id', authorizeRoles('ADMIN', 'FINANCE'), deleteFee);

router.get('/payments', authorizeRoles('ADMIN', 'FINANCE'), getPayments);
router.post('/payments', authorizeRoles('ADMIN', 'FINANCE'), createPayment);
router.put('/payments/:id', authorizeRoles('ADMIN', 'FINANCE'), updatePayment);
router.delete('/payments/:id', authorizeRoles('ADMIN', 'FINANCE'), deletePayment);

router.get('/expenses', authorizeRoles('ADMIN', 'FINANCE'), getExpenses);
router.post('/expenses', authorizeRoles('ADMIN', 'FINANCE'), createExpense);
router.put('/expenses/:id', authorizeRoles('ADMIN', 'FINANCE'), updateExpense);
router.delete('/expenses/:id', authorizeRoles('ADMIN', 'FINANCE'), deleteExpense);

// Public/Student Financial Interaction
router.post('/bakong-qr', authorizeRoles('ADMIN', 'FINANCE', 'STUDENT'), generatePaymentQR);
router.get('/bakong-status/:invoiceId', authorizeRoles('ADMIN', 'FINANCE', 'STUDENT'), checkBakongStatus);
router.post('/bakong-callback', bakongCallback); // Callback is usually semi-public or uses specific signature validation


export default router;
