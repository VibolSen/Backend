import { Request, Response } from 'express';
import prisma from '../prisma';
import { KHQR, TAG, CURRENCY, COUNTRY } from 'ts-khqr';

// Invoices
export const getInvoices = async (req: any, res: Response) => {
  try {
    const { userId, role } = req.user;
    
    // If student, only show their own invoices. Otherwise (Admin/Finance), show all.
    const whereClause = role === 'STUDENT' ? { studentId: userId } : {};

    const invoices = await prisma.invoice.findMany({
        where: whereClause,
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

export const getInvoiceById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const invoice = await prisma.invoice.findUnique({
            where: { id: String(id) },
            include: {
                student: {
                    select: { id: true, firstName: true, lastName: true, email: true }
                },
                items: {
                    include: { fee: true }
                },
                payments: true
            }
        });

        if (!invoice) {
            return res.status(404).json({ error: "Invoice not found" });
        }

        res.json(invoice);
    } catch (err) {
        console.error("Failed to fetch invoice details:", err);
        res.status(500).json({ error: "Failed to fetch invoice details" });
    }
};

export const createInvoice = async (req: Request, res: Response) => {
  try {
    const { studentId, issueDate, dueDate, totalAmount, items } = req.body;
    
    // Validate items structure
    const formattedItems = items.map((item: any) => ({
      fee: { connect: { id: item.feeId } },
      description: item.description,
      amount: Number(item.amount) // Ensure amount is number
    }));

    // Calculate total from items to be safe, or use provided
    const calculatedTotal = formattedItems.reduce((acc: number, item: any) => acc + item.amount, 0);

    console.log("Creating Invoice with:", { studentId, issueDate, dueDate, calculatedTotal });

    const invoice = await prisma.invoice.create({
      data: {
        student: { connect: { id: studentId } },
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        totalAmount: calculatedTotal, // Use calculated total
        items: {
          create: formattedItems
        }
      },
      include: {
        items: true
      }
    });
    res.status(201).json(invoice);
  } catch (err: any) {
    console.error("Failed to create invoice:", err);
    res.status(500).json({ error: "Failed to create invoice", details: err.message });
  }
};

export const deleteInvoice = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const invoiceId = String(id); // Cast id to string

        if (!invoiceId) {
            return res.status(400).json({ error: "Invoice ID is required" });
        }

        // Before deleting the invoice, delete any associated invoice items
        await prisma.invoiceItem.deleteMany({
            where: {
                invoiceId: invoiceId
            }
        });

        // Also delete any associated payments
        await prisma.payment.deleteMany({
            where: {
                invoiceId: invoiceId
            }
        });

        await prisma.invoice.delete({
            where: { id: invoiceId }
        });
        res.status(204).send();
    } catch (err) {
        console.error("Failed to delete invoice:", err);
        res.status(500).json({ error: "Failed to delete invoice" });
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

export const createFee = async (req: Request, res: Response) => {
    try {
        const { name, description, amount } = req.body;
        const fee = await prisma.fee.create({
            data: {
                name,
                description,
                amount: parseFloat(amount)
            }
        });
        res.status(201).json(fee);
    } catch (err) {
        console.error("Failed to create fee:", err);
        res.status(500).json({ error: "Failed to create fee" });
    }
};

export const updateFee = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, amount } = req.body;
        const fee = await prisma.fee.update({
            where: { id: String(id) },
            data: {
                name,
                description,
                amount: parseFloat(amount)
            }
        });
        res.json(fee);
    } catch (err) {
        console.error("Failed to update fee:", err);
        res.status(500).json({ error: "Failed to update fee" });
    }
};

export const deleteFee = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.fee.delete({ where: { id: String(id) } });
        res.status(204).send();
    } catch (err) {
        console.error("Failed to delete fee:", err);
        res.status(500).json({ error: "Failed to delete fee" });
    }
};

// Payments
export const getPayments = async (req: Request, res: Response) => {
    try {
        const payments = await prisma.payment.findMany({
            include: { // Optionally include related data if needed
                invoice: {
                    include: {
                        student: true // Include student info through the invoice
                    }
                }
            },
            orderBy: {
                paymentDate: 'desc'
            }
        });
        res.json(payments);
    } catch (err) {
        console.error("Failed to fetch payments:", err);
        res.status(500).json({ error: "Failed to fetch payments" });
    }
};

export const createPayment = async (req: Request, res: Response) => {
    try {
        const { invoiceId, amount, paymentDate, paymentMethod, transactionId, notes } = req.body;
        
        // Create the payment record
        const payment = await prisma.payment.create({
            data: {
                invoiceId,
                amount: Number(amount),
                paymentDate: new Date(paymentDate),
                paymentMethod,
                transactionId,
                notes
            }
        });
        
        // 1. Fetch the invoice with its current payments and totalAmount
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: { payments: true }
        });

        if (invoice) {
            // 2. Calculate total paid including the new payment
            const totalPaid = invoice.payments.reduce((sum: number, p) => sum + p.amount, 0);
            
            // 3. Update status if fully paid
            if (totalPaid >= invoice.totalAmount) {
                await prisma.invoice.update({
                    where: { id: invoiceId },
                    data: { status: "PAID" }
                });
            } else if (totalPaid > 0 && invoice.status !== "PAID") {
                 // Optional: Mark as partially paid if you have that status, or keep as SENT/OVERDUE
                 // For now, only marking PAID when full.
            }
        }
        
        res.status(201).json(payment);
    } catch (err) {
        console.error("Failed to create payment:", err);
        res.status(500).json({ error: "Failed to create payment" });
    }
};

export const updatePayment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { amount, paymentDate, paymentMethod, transactionId, notes } = req.body;
        const payment = await prisma.payment.update({
            where: { id: String(id) },
            data: {
                amount: Number(amount),
                paymentDate: new Date(paymentDate),
                paymentMethod,
                transactionId,
                notes
            }
        });
        res.json(payment);
    } catch (err) {
        console.error("Failed to update payment:", err);
        res.status(500).json({ error: "Failed to update payment" });
    }
};

export const deletePayment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // Optionally revert invoice status if needed, but for now simple delete
        await prisma.payment.delete({ where: { id: String(id) } });
        res.status(204).send();
    } catch (err) {
        console.error("Failed to delete payment:", err);
        res.status(500).json({ error: "Failed to delete payment" });
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

export const updateExpense = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { category, description, amount, date } = req.body;
        const expense = await prisma.expense.update({
            where: { id: String(id) },
            data: {
                category,
                description,
                amount: Number(amount),
                date: new Date(date)
            }
        });
        res.json(expense);
    } catch (err) {
        console.error("Failed to update expense:", err);
        res.status(500).json({ error: "Failed to update expense" });
    }
};

export const deleteExpense = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.expense.delete({
            where: { id: String(id) }
        });
        res.status(204).send();
    } catch (err) {
        console.error("Failed to delete expense:", err);
        res.status(500).json({ error: "Failed to delete expense" });
    }
};

export const generatePaymentQR = async (req: Request, res: Response) => {
    try {
        const { amount, currency = "USD", invoiceId } = req.body;
        
        console.log("Configuring KHQR for Invoice:", invoiceId);
        const accountID = process.env.KHQR_ACCOUNT_ID?.trim() || "ishinvin@devb"; 
        const merchantName = process.env.KHQR_MERCHANT_NAME?.trim() || "Step Academy"; 

        const qrCurrency = currency === "KHR" ? CURRENCY.KHR : CURRENCY.USD;
        
        let finalAmount = Number(amount);
        if (qrCurrency === CURRENCY.KHR) {
             finalAmount = Math.ceil(finalAmount * 4100); 
        }
        
        // IMPORTANT: KHQR Subtag 62.01 (Bill Number) has a strict length limit (usually 15 chars).
        // MongoDB ID (24 chars) is TOO LONG. We use the last 12 chars which is unique enough.
        const shortId = invoiceId.substring(invoiceId.length - 12);
        const validBillNumber = shortId;

        const payload = {
            tag: TAG.INDIVIDUAL,
            accountID: accountID,
            currency: qrCurrency,
            amount: finalAmount,
            merchantName: merchantName,
            merchantCity: "Phnom Penh",
            countryCode: COUNTRY.KH,
            expirationTimestamp: Date.now() + 15 * 60 * 1000,
            additionalData: {
                billNumber: validBillNumber // Max 15-20 chars for most banks
            }
        };

        const response = KHQR.generate(payload);

        if (response.status && response.status.code === 0 && response.data) {
             res.status(200).json({ 
                 qrString: response.data.qr,
                 md5: response.data.md5 
             });
        } else {
             res.status(400).json({ error: "Failed to generate QR code", details: response });
        }
    } catch (err: any) {
        console.error("KHQR Exception:", err);
        res.status(500).json({ error: "Failed to generate payment QR", details: err?.message || err });
    }
};

export const checkBakongStatus = async (req: Request, res: Response) => {
    try {
        const { invoiceId } = req.params;
        const { md5 } = req.query; 

        console.log(`[Status Check] Polling Invoice: ${invoiceId} | MD5: ${md5 || 'Missing'}`);

        const invoice = await prisma.invoice.findUnique({
            where: { id: String(invoiceId) },
            include: { payments: true }
        });

        if (!invoice) return res.status(404).json({ error: "Invoice not found" });

        // 1. If already paid in our DB, return success immediately
        if (invoice.status === "PAID") {
            return res.json({ status: "PAID", isPaid: true });
        }

        // 2. If we have an MD5, check the REAL Bakong API
        if (md5 && process.env.BAKONG_API_TOKEN) {
            try {
                // Feature Check: Support older Node.js without native fetch
                if (typeof fetch === 'undefined') {
                    console.warn(" WARNING: native fetch not available. Skipping real-time Bakong check.");
                } else {
                    const bakongResponse = await fetch(`${process.env.BAKONG_API_URL || 'https://api-bakong.nbc.gov.kh/v1'}/check_transaction_by_md5`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${process.env.BAKONG_API_TOKEN}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ md5 })
                    });

                    const data = await bakongResponse.json();
                    
                    // If Bakong confirms the payment is successful
                    if (data.responseCode === 0 && data.data && data.data.status === "SUCCESS") {
                        const txData = data.data;
                        console.log(` ✅ Bank Verified via MD5: ${md5}`);
                        
                        // Create the payment record in our DB
                        await (prisma as any).payment.create({
                            data: {
                                invoiceId: invoice.id,
                                amount: Number(txData.amount),
                                currency: txData.currency || "USD",
                                md5: String(md5),
                                paymentDate: new Date(),
                                paymentMethod: "BANK_TRANSFER",
                                transactionId: txData.hash || txData.externalRef || `NB-${Date.now()}`,
                                senderAccount: txData.senderAccount || "N/A",
                                senderName: txData.senderName || "BAKONG_USER",
                                receiverAccount: process.env.KHQR_ACCOUNT_ID || "vibol_sen@bkrt",
                                notes: `Verified via Bakong Open API`
                            }
                        });

                        // Update Invoice to PAID
                        await prisma.invoice.update({
                            where: { id: invoice.id },
                            data: { status: "PAID" }
                        });

                        return res.json({ status: "PAID", isPaid: true });
                    }
                }
            } catch (apiErr) {
                console.error(" ❌ Bakong API Error:", apiErr);
            }
        }

        // 3. Otherwise return current local status
        res.json({
            status: invoice.status,
            isPaid: false,
            totalPaid: invoice.payments.reduce((sum: number, p) => sum + p.amount, 0)
        });
    } catch (err) {
        console.error("Status Check Error:", err);
        res.status(500).json({ error: "Failed to check status" });
    }
};

export const bakongCallback = async (req: Request, res: Response) => {
    try {
        console.log(" Bakong Callback Inbound Payload:", JSON.stringify(req.body, null, 2));
        
        const { invoiceId, billNumber, billNo, externalRef, amount, transactionId, md5, senderAccount, senderName, currency } = req.body;
        
        // Identify the actual invoice ID - Check all common bank field names
        let targetInvoiceId = invoiceId || billNumber || billNo || externalRef;
        
        if (!targetInvoiceId) {
            console.error(" Error: No invoice identifier in callback");
            return res.status(400).json({ error: "Missing invoice identifier" });
        }

        console.log(" ✅ Processing Bakong Callback for Invoice:", targetInvoiceId);

        // Lookup: If it's a short ID (12 chars), find by suffix. If 24, find direct.
        let invoice;
        if (targetInvoiceId.length === 24) {
            invoice = await prisma.invoice.findUnique({
                where: { id: targetInvoiceId },
                include: { payments: true }
            });
        } else {
            // Find invoice where ID ends with this shortId
            // In Prisma/MongoDB, we might need a raw query or fetch multiple
            const allInvoices = await prisma.invoice.findMany({
                where: { id: { endsWith: targetInvoiceId } },
                include: { payments: true }
            });
            invoice = allInvoices[0];
        }

        if (!invoice) {
            console.error("Invoice not found for ID:", targetInvoiceId);
            return res.status(404).json({ error: "Invoice not found" });
        }

        // 2. Create the payment
        await (prisma as any).payment.create({ 
            data: {
                invoiceId: invoice.id,
                amount: Number(amount),
                currency: req.body.currency || "USD", 
                md5: md5 || "N/A",
                paymentDate: new Date(),
                paymentMethod: "BANK_TRANSFER",
                transactionId: transactionId || `BK-${Date.now()}`,
                senderAccount: senderAccount || "N/A",
                senderName: senderName || "BAKONG_USER",
                receiverAccount: process.env.KHQR_ACCOUNT_ID || "vibol_sen@bkrt",
                notes: `Bakong Notification Received`
            }
        });

        // 3. Update Status
        const currentInvoices = await prisma.invoice.findUnique({
            where: { id: invoice.id },
            include: { payments: true }
        });

        const totalPaid = (currentInvoices?.payments || []).reduce((sum: number, p: any) => sum + p.amount, 0);
        
        if (totalPaid >= (invoice.totalAmount - 0.01)) {
            await prisma.invoice.update({
                where: { id: invoice.id },
                data: { status: "PAID" }
            });
            console.log(` SUCCESS: Invoice ${invoice.id} marked as PAID`);
        } else {
            console.log(` INFO: Partial payment for ${invoice.id}, Total Paid: ${totalPaid}`);
        }
        
        res.json({ success: true, message: "OK" });
    } catch (err) {
        console.error("Callback crash:", err);
        res.status(500).json({ error: "Internal Error" });
    }
};

// --- User Benefits & Payroll ---

export const getUserBenefits = async (req: Request, res: Response) => {
    try {
        const benefits = await (prisma as any).userBenefit.findMany({
            include: {
                user: {
                    select: { firstName: true, lastName: true, email: true, role: true }
                }
            }
        });
        res.json(benefits);
    } catch (err) {
        console.error("Failed to fetch benefits:", err);
        res.status(500).json({ error: "Failed to fetch benefits" });
    }
};

export const updateUserBenefit = async (req: Request, res: Response) => {
    try {
        const { userId, baseSalary, bonus, allowance, deduction, currency } = req.body;
        
        const benefit = await (prisma as any).userBenefit.upsert({
            where: { userId },
            update: { baseSalary, bonus, allowance, deduction, currency },
            create: { userId, baseSalary, bonus, allowance, deduction, currency }
        });
        
        res.json(benefit);
    } catch (err) {
        console.error("Failed to update benefit:", err);
        res.status(500).json({ error: "Failed to update benefit" });
    }
};

export const getPayrolls = async (req: Request, res: Response) => {
    try {
        const payrolls = await (prisma as any).payroll.findMany({
            include: {
                user: {
                    select: { firstName: true, lastName: true, email: true, role: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(payrolls);
    } catch (err) {
        console.error("Failed to fetch payrolls:", err);
        res.status(500).json({ error: "Failed to fetch payrolls" });
    }
};

export const generatePayrolls = async (req: Request, res: Response) => {
    try {
        const { period } = req.body; // e.g., "2024-03"
        
        // 1. Get all users with benefits
        const usersWithBenefits = await (prisma as any).userBenefit.findMany({
            include: { user: true }
        });
        
        const generatedPayrolls = [];
        
        for (const benefit of usersWithBenefits) {
            // Check if payroll already exists for this user and period
            const existing = await (prisma as any).payroll.findFirst({
                where: { userId: benefit.userId, period }
            });
            
            if (existing) continue;
            
            const amount = benefit.baseSalary + benefit.allowance;
            const netSalary = amount + benefit.bonus - benefit.deduction;
            
            const payroll = await (prisma as any).payroll.create({
                data: {
                    userId: benefit.userId,
                    amount: amount,
                    bonus: benefit.bonus,
                    deduction: benefit.deduction,
                    netSalary: netSalary,
                    period: period,
                    status: "PENDING"
                }
            });
            generatedPayrolls.push(payroll);
        }
        
        res.status(201).json({ 
            message: `Generated ${generatedPayrolls.length} payroll records for ${period}`,
            payrolls: generatedPayrolls 
        });
    } catch (err) {
        console.error("Failed to generate payrolls:", err);
        res.status(500).json({ error: "Failed to generate payrolls" });
    }
};

export const updatePayrollStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, paymentDate, transactionHash } = req.body;
        
        const payroll = await (prisma as any).payroll.update({
            where: { id },
            data: { 
                status, 
                paymentDate: paymentDate ? new Date(paymentDate) : undefined,
                transactionHash 
            }
        });
        
        res.json(payroll);
    } catch (err) {
        console.error("Failed to update payroll:", err);
        res.status(500).json({ error: "Failed to update payroll" });
    }
};

// --- Budgeting ---

export const getBudgets = async (req: Request, res: Response) => {
    try {
        const budgets = await (prisma as any).budget.findMany({
            include: {
                department: true,
                items: true
            }
        });
        res.json(budgets);
    } catch (err) {
        console.error("Failed to fetch budgets:", err);
        res.status(500).json({ error: "Failed to fetch budgets" });
    }
};

export const createBudget = async (req: Request, res: Response) => {
    try {
        const { departmentId, amount, period } = req.body;
        
        const budget = await (prisma as any).budget.create({
            data: {
                departmentId,
                amount,
                period,
                spent: 0,
                status: "ACTIVE"
            }
        });
        
        res.status(201).json(budget);
    } catch (err) {
        console.error("Failed to create budget:", err);
        res.status(500).json({ error: "Failed to create budget" });
    }
};

export const addBudgetItem = async (req: Request, res: Response) => {
    try {
        const { budgetId, description, amount } = req.body;
        
        // 1. Create budget item
        const item = await (prisma as any).budgetItem.create({
            data: {
                budgetId,
                description,
                amount
            }
        });
        
        // 2. Update spent amount in budget
        await (prisma as any).budget.update({
            where: { id: budgetId },
            data: {
                spent: { increment: amount }
            }
        });
        
        res.status(201).json(item);
    } catch (err) {
        console.error("Failed to add budget item:", err);
        res.status(500).json({ error: "Failed to add budget item" });
    }
};

export const getBudgetById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const budget = await (prisma as any).budget.findUnique({
            where: { id },
            include: {
                department: true,
                items: { orderBy: { date: 'desc' } }
            }
        });
        res.json(budget);
    } catch (err) {
        console.error("Failed to fetch budget details:", err);
        res.status(500).json({ error: "Failed to fetch budget details" });
    }
};
export const sendReminders = async (req: Request, res: Response) => {
    try {
        // 1. Get all invoices that are "SENT" or "OVERDUE"
        const pendingInvoices = await prisma.invoice.findMany({
            where: {
                status: { in: ["SENT", "OVERDUE"] }
            },
            include: {
                student: true
            }
        });

        const notifications = [];

        for (const invoice of pendingInvoices) {
            // Create notification for student
            const notification = await prisma.notification.create({
                data: {
                    userId: invoice.studentId,
                    title: "Payment Reminder",
                    message: `Reminder: You have a pending invoice (${invoice.id.slice(-8)}) for $${invoice.totalAmount}. Please ensure payment is made by ${invoice.dueDate.toLocaleDateString()}.`,
                    type: "PAYMENT",
                    isRead: false
                }
            });
            notifications.push(notification);
        }

        res.json({ 
            success: true, 
            message: `Sent ${notifications.length} payment reminders successfully.` 
        });
    } catch (err) {
        console.error("Failed to send reminders:", err);
        res.status(500).json({ error: "Failed to send reminders" });
    }
};
