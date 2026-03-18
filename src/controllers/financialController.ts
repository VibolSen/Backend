import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../prisma';
import { KHQR, TAG, CURRENCY, COUNTRY } from 'ts-khqr';

// Invoices
export const getInvoices = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
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

export const getInvoiceById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        if (!req.user) return res.status(401).json({ error: "Unauthorized" });

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

        // IDOR Protection: Students can only view their own invoices
        if (req.user.role === 'STUDENT' && invoice.studentId !== req.user.userId) {
            return res.status(403).json({ error: "Access denied. You can only view your own invoices." });
        }

        res.json(invoice);
    } catch (err) {
        console.error("Failed to fetch invoice details:", err);
        res.status(500).json({ error: "Failed to fetch invoice details" });
    }
};

export const createInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, issueDate, dueDate, totalAmount, items, period, academicYear, semester } = req.body;
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const actorId = req.user.userId;
    
    // Validate items structure
    const formattedItems = items.map((item: any) => ({
      fee: { connect: { id: item.feeId } },
      description: item.description,
      amount: Number(item.amount) // Ensure amount is number
    }));

    // Calculate total from items to be safe, or use provided
    const calculatedTotal = formattedItems.reduce((acc: number, item: any) => acc + item.amount, 0);

    console.log("Creating Invoice with:", { studentId, issueDate, dueDate, calculatedTotal, period });

    const invoice = await prisma.invoice.create({
      data: {
        student: { connect: { id: studentId } },
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        totalAmount: calculatedTotal, 
        currency: req.body.currency || "USD",
        status: "SENT",
        period: period || "SEMESTER",
        academicYear: academicYear ? Number(academicYear) : null,
        semester: semester ? Number(semester) : null,
        items: {
          create: formattedItems
        }
      },
      include: {
        items: true,
        student: true
      }
    });

    // --- 1. Audit Trail Logging ---
    await prisma.auditLog.create({
        data: {
            action: "INVOICE_CREATED",
            actorId: actorId,
            target: "INVOICE",
            targetId: invoice.id,
            details: `Created new invoice for $${calculatedTotal} with ${formattedItems.length} items.`
        }
    });

    // --- 2. Student Notification ---
    await prisma.notification.create({
        data: {
            userId: studentId,
            title: "📜 New Invoice Issued",
            message: `A new invoice for $${calculatedTotal} has been issued for your account. Please settle by ${new Date(dueDate).toLocaleDateString()}.`,
            type: "PAYMENT",
            link: `/student/invoices/${invoice.id}`
        }
    });

    res.status(201).json(invoice);
  } catch (err: any) {
    console.error("Failed to create invoice:", err);
    res.status(500).json({ error: "Failed to create invoice", details: err.message });
  }
};

export const updateInvoice = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { studentId, issueDate, dueDate, items, period, academicYear, semester } = req.body;
        if (!req.user) return res.status(401).json({ error: "Unauthorized" });
        const actorId = req.user.userId;

        // 1. Delete existing items
        await prisma.invoiceItem.deleteMany({ where: { invoiceId: id as string } });

        // 2. Format new items
        const formattedItems = items.map((item: any) => ({
            description: item.description,
            amount: Number(item.amount),
            feeId: item.feeId
        }));

        const calculatedTotal = formattedItems.reduce((acc: number, item: any) => acc + item.amount, 0);

        // 3. Update Invoice
        const updatedInvoice = await prisma.invoice.update({
            where: { id: String(id) },
            data: {
                studentId,
                issueDate: new Date(issueDate),
                dueDate: new Date(dueDate),
                totalAmount: calculatedTotal,
                currency: req.body.currency || "USD",
                period: period || "SEMESTER",
                academicYear: academicYear ? Number(academicYear) : null,
                semester: semester ? Number(semester) : null,
                items: {
                    create: formattedItems
                }
            },
            include: { items: true }
        });

        // 4. Audit Trail
        await prisma.auditLog.create({
            data: {
                action: "INVOICE_UPDATED",
                actorId: actorId,
                target: "INVOICE",
                targetId: id as string,
                details: `Revised invoice total to $${calculatedTotal}.`
            }
        });

        res.json(updatedInvoice);
    } catch (err: any) {
        console.error("Failed to update invoice:", err);
        res.status(500).json({ error: "Failed to update invoice", details: err.message });
    }
};

export const getInvoiceLogs = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const logs = await prisma.auditLog.findMany({
            where: { targetId: String(id) },
            include: { actor: { select: { firstName: true, lastName: true, role: true } } },
            orderBy: { timestamp: 'desc' }
        });

        const safeLogs = logs.map(log => ({
            ...log,
            actor: log.actor || { firstName: "Deleted", lastName: "User", role: "UNKNOWN" }
        }));

        res.json(safeLogs);
    } catch (err) {
        console.error("Failed to fetch audit logs:", err);
        res.status(500).json({ error: "Failed to fetch logs" });
    }
};

export const deleteInvoice = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const invoiceId = String(id); 
        if (!req.user) return res.status(401).json({ error: "Unauthorized" });
        const actorId = req.user.userId;

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

        // Audit Trail
        await prisma.auditLog.create({
            data: {
                action: "INVOICE_DELETED",
                actorId: actorId,
                target: "INVOICE",
                targetId: invoiceId,
                details: `Permanently removed invoice record.`
            }
        });

        res.status(204).send();
    } catch (err) {
        console.error("Failed to delete invoice:", err);
        res.status(500).json({ error: "Failed to delete invoice" });
    }
};

// Fees
export const getFees = async (req: AuthRequest, res: Response) => {
    try {
        const fees = await prisma.fee.findMany();
        res.json(fees);
    } catch (err) {
        console.error("Failed to fetch fees:", err);
        res.status(500).json({ error: "Failed to fetch fees" });
    }
};

export const createFee = async (req: AuthRequest, res: Response) => {
    try {
        const { name, description, amount, currency } = req.body;
        const fee = await prisma.fee.create({
            data: {
                name,
                description,
                amount: parseFloat(amount),
                currency: currency || "USD"
            }
        });
        res.status(201).json(fee);
    } catch (err) {
        console.error("Failed to create fee:", err);
        res.status(500).json({ error: "Failed to create fee" });
    }
};

export const updateFee = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, amount, currency } = req.body;
        const fee = await prisma.fee.update({
            where: { id: String(id) },
            data: {
                name,
                description,
                amount: parseFloat(amount),
                currency: currency || "USD"
            }
        });
        res.json(fee);
    } catch (err) {
        console.error("Failed to update fee:", err);
        res.status(500).json({ error: "Failed to update fee" });
    }
};

export const deleteFee = async (req: AuthRequest, res: Response) => {
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
export const getPayments = async (req: AuthRequest, res: Response) => {
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

export const createPayment = async (req: AuthRequest, res: Response) => {
    try {
        const { invoiceId, amount, paymentDate, paymentMethod, transactionId, notes, currency } = req.body;
        
        // Fetch the invoice to get its default currency if none was provided
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: { payments: true }
        });

        if (!invoice) {
            return res.status(404).json({ error: "Invoice not found" });
        }

        // Create the payment record
        const payment = await prisma.payment.create({
            data: {
                invoiceId,
                amount: Number(amount),
                paymentDate: new Date(paymentDate),
                paymentMethod,
                transactionId,
                currency: currency || invoice.currency || "USD",
                notes
            }
        });
        
        // 2. Calculate total paid including the new payment
        const totalPaid = (invoice.payments.reduce((sum: number, p) => sum + p.amount, 0)) + Number(amount);
        
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
        res.status(201).json(payment);
    } catch (err) {
        console.error("Failed to create payment:", err);
        res.status(500).json({ error: "Failed to create payment" });
    }
};

export const updatePayment = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { amount, paymentDate, paymentMethod, transactionId, notes, currency } = req.body;
        const payment = await prisma.payment.update({
            where: { id: String(id) },
            data: {
                amount: Number(amount),
                paymentDate: new Date(paymentDate),
                paymentMethod,
                transactionId,
                currency,
                notes
            }
        });
        res.json(payment);
    } catch (err) {
        console.error("Failed to update payment:", err);
        res.status(500).json({ error: "Failed to update payment" });
    }
};

export const deletePayment = async (req: AuthRequest, res: Response) => {
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
export const getExpenses = async (req: AuthRequest, res: Response) => {
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

export const createExpense = async (req: AuthRequest, res: Response) => {
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

export const updateExpense = async (req: AuthRequest, res: Response) => {
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

export const deleteExpense = async (req: AuthRequest, res: Response) => {
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

export const generatePaymentQR = async (req: AuthRequest, res: Response) => {
    console.log(">>>>>>>>>> [INCOMING REQUEST] generatePaymentQR <<<<<<<<<<");
    try {
        const { amount, currency = "USD", invoiceId } = req.body;
        
        console.log("Configuring KHQR for Invoice:", invoiceId);
        
        // Fetch invoice to determine base currency
        const invoice = await prisma.invoice.findUnique({
            where: { id: String(invoiceId) }
        });

        if (!invoice) {
            return res.status(404).json({ error: "Invoice not found" });
        }

        const accountID = process.env.KHQR_ACCOUNT_ID?.trim() || "ishinvin@devb"; 
        const merchantName = process.env.KHQR_MERCHANT_NAME?.trim() || "Step Academy"; 

        const targetCurrency = currency === "KHR" ? CURRENCY.KHR : CURRENCY.USD;
        const baseCurrency = invoice.currency === "KHR" ? CURRENCY.KHR : CURRENCY.USD;
        
        let finalAmount = Number(amount);

        const exchangeRate = Number(process.env.EXCHANGE_RATE_USD_KHR || 4100);

        // Logic: Convert from Base Currency to Target QR Currency
        if (baseCurrency === CURRENCY.USD && targetCurrency === CURRENCY.KHR) {
            finalAmount = Math.ceil(finalAmount * exchangeRate); 
        } else if (baseCurrency === CURRENCY.KHR && targetCurrency === CURRENCY.USD) {
            finalAmount = Number((finalAmount / exchangeRate).toFixed(2));
        }
        
        // IMPORTANT: KHQR Subtag 62.01 (Bill Number) has a strict length limit (usually 15 chars).
        // MongoDB ID (24 chars) is TOO LONG. We use the last 12 chars which is unique enough.
        const shortId = (invoiceId as string).substring((invoiceId as string).length - 12);
        const validBillNumber = shortId;

        const payload = {
            tag: TAG.INDIVIDUAL,
            accountID: accountID,
            currency: targetCurrency,
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

export const checkBakongStatus = async (req: AuthRequest, res: Response) => {
    console.log(">>>>>>>>>> [INCOMING REQUEST] checkBakongStatus <<<<<<<<<<");
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

        const exchangeRate = Number(process.env.EXCHANGE_RATE_USD_KHR || 4100);

        // 2. If we have an MD5, check the REAL Bakong API
        if (md5 && process.env.BAKONG_API_TOKEN) {
            try {
                let data: any;
                if (typeof fetch === 'undefined') {
                    // Fallback using native https module for Node.js < 18
                    data = await new Promise((resolve, reject) => {
                        const https = require('https');
                        const url = new URL(`${process.env.BAKONG_API_URL || 'https://api-bakong.nbc.gov.kh/v1'}/check_transaction_by_md5`);
                        const body = JSON.stringify({ md5 });
                        const req = https.request({
                            hostname: url.hostname,
                            path: url.pathname,
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${process.env.BAKONG_API_TOKEN}`,
                                'Content-Type': 'application/json',
                                'Content-Length': Buffer.byteLength(body)
                            }
                        }, (res: any) => {
                            let rawData = '';
                            res.on('data', (chunk: any) => rawData += chunk);
                            res.on('end', () => {
                                try { resolve(JSON.parse(rawData)); }
                                catch (e) { reject(e); }
                            });
                        });
                        req.on('error', (e: any) => reject(e));
                        req.write(body);
                        req.end();
                    });
                } else {
                    const bakongResponse = await fetch(`${process.env.BAKONG_API_URL || 'https://api-bakong.nbc.gov.kh/v1'}/check_transaction_by_md5`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${process.env.BAKONG_API_TOKEN}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ md5 })
                    });
                    data = await bakongResponse.json();
                }

                console.log(`[Bakong API] Response for MD5 ${md5}:`, JSON.stringify(data));
                
                const statusStr = data.data?.status?.toUpperCase();
                if (data.responseCode === 0 && data.data && (statusStr === "SUCCESS" || statusStr === "PAID")) {
                    const txData = data.data;

                    // --- SECURITY: Prevent Duplicate MD5 Processing ---
                    const existingPayment = await (prisma as any).payment.findFirst({
                        where: { md5: String(md5) }
                    });

                    if (existingPayment) {
                        console.log(` ⚠️ Ignore double processing: Payment MD5 ${md5} already confirmed.`);
                        return res.json({ status: invoice.status, isPaid: false });
                    }

                    console.log(` ✅ Bank Verified via MD5: ${md5}. Amount: ${txData.amount} ${txData.currency}. Hash: ${txData.hash || 'N/A'}`);
                    
                    // Create the payment record in our DB
                    await (prisma as any).payment.create({
                        data: {
                            invoiceId: invoice.id,
                            amount: Number(txData.amount),
                            currency: txData.currency || "USD",
                            md5: String(md5),
                            paymentDate: new Date(),
                            paymentMethod: "BANK_TRANSFER",
                            senderAccount: txData.fromAccountId || txData.senderAccount || "N/A",
                            senderName: txData.senderName || "BAKONG_USER",
                            receiverAccount: txData.toAccountId || process.env.KHQR_ACCOUNT_ID || "vibol_sen@bkrt",
                            notes: `Verified via Bakong Open API`
                        }
                    });

                    // SECURITY: Validate Total Paid vs Invoice Amount
                    const updatedInvoice = await prisma.invoice.findUnique({
                        where: { id: invoice.id },
                        include: { payments: true }
                    });

                    const totalPaid = (updatedInvoice?.payments || []).reduce((sum: number, p: any) => {
                        let normalizedAmount = p.amount;
                        if (p.currency === "KHR" && updatedInvoice!.currency === "USD") {
                            normalizedAmount = normalizedAmount / exchangeRate;
                        } else if (p.currency === "USD" && updatedInvoice!.currency === "KHR") {
                            normalizedAmount = normalizedAmount * exchangeRate;
                        }
                        return sum + normalizedAmount;
                    }, 0);

                    if (totalPaid >= (updatedInvoice!.totalAmount - 0.01)) {
                        await prisma.invoice.update({
                            where: { id: invoice.id },
                            data: { status: "PAID" }
                        });
                        return res.json({ status: "PAID", isPaid: true });
                    } else {
                        console.log(` INFO: Partial payment for ${invoice.id}, Total Paid (Normalized): ${totalPaid}. Required: ${updatedInvoice!.totalAmount}`);
                        return res.json({ status: invoice.status, isPaid: false, totalPaid });
                    }
                }
            } catch (apiErr) {
                console.error(" ❌ Bakong API Error:", apiErr);
            }
        }

        // 3. Otherwise return current local status (normalized)
        const currentTotalPaid = invoice.payments.reduce((sum: number, p: any) => {
            let normalizedAmount = p.amount;
            if (p.currency === "KHR" && invoice.currency === "USD") {
                normalizedAmount = normalizedAmount / exchangeRate;
            } else if (p.currency === "USD" && invoice.currency === "KHR") {
                normalizedAmount = normalizedAmount * exchangeRate;
            }
            return sum + normalizedAmount;
        }, 0);

        res.json({
            status: invoice.status,
            isPaid: false,
            totalPaid: currentTotalPaid
        });
    } catch (err) {
        console.error("Status Check Error:", err);
        res.status(500).json({ error: "Failed to check status" });
    }
};

export const bakongCallback = async (req: AuthRequest, res: Response) => {
    try {
        console.log(" [Webhook] Bakong Callback Payload:", JSON.stringify(req.body, null, 2));
        
        // --- PRODUCTION SECURITY MEASURE ---
        // Verify this request actually came from the National Bank of Cambodia (Bakong API)
        const authHeader = req.headers.authorization;
        if (process.env.BAKONG_WEBHOOK_SECRET) {
            if (!authHeader || authHeader !== `Bearer ${process.env.BAKONG_WEBHOOK_SECRET}`) {
                console.warn(` 🚨 UNAUTHORIZED BAKONG WEBHOOK ATTEMPT FROM IP: ${req.ip}`);
                return res.status(401).json({ error: "Unauthorized webhook signature" });
            }
        }

        const { invoiceId, billNumber, billNo, externalRef, amount, transactionId, hash, md5, senderAccount, senderName, currency } = req.body;
        
        // Identify the actual invoice ID - Check all common bank field names
        let targetInvoiceId = invoiceId || billNumber || billNo || externalRef;
        
        if (!targetInvoiceId) {
            console.error(" Error: No invoice identifier in callback");
            return res.status(400).json({ error: "Missing invoice identifier" });
        }

        console.log(` ✅ Processing Bakong Callback for Invoice: ${targetInvoiceId}. Hash: ${hash || transactionId || 'N/A'}`);

        // Lookup: If it's a short ID (12 chars), find by suffix. If 24, find direct.
        let invoice;
        if ((targetInvoiceId as string).length === 24) {
            invoice = await prisma.invoice.findUnique({
                where: { id: targetInvoiceId as string },
                include: { payments: true }
            });
        } else {
            // Find invoice where ID ends with this shortId
            // In Prisma/MongoDB, we might need a raw query or fetch multiple
            const allInvoices = await prisma.invoice.findMany({
                where: { id: { endsWith: targetInvoiceId as string } },
                include: { payments: true }
            });
            invoice = allInvoices[0];
        }

        if (!invoice) {
            console.error("Invoice not found for ID:", targetInvoiceId);
            return res.status(404).json({ error: "Invoice not found" });
        }

        // --- SECURITY: Duplicate MD5 Check ---
        if (md5) {
            const existingPayment = await (prisma as any).payment.findFirst({
                where: { md5: String(md5) }
            });
            if (existingPayment) {
                console.log(` ⚠️ Ignore double webhook: Payment MD5 ${md5} already processed.`);
                return res.json({ success: true, message: "Already processed" });
            }
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
                transactionId: transactionId || hash || externalRef || `BK-${Date.now()}`,
                senderAccount: senderAccount || req.body.fromAccountId || "N/A",
                senderName: senderName || "BAKONG_USER",
                receiverAccount: req.body.toAccountId || process.env.KHQR_ACCOUNT_ID || "vibol_sen@bkrt",
                notes: `Bakong Notification Received`
            }
        });

        // 3. Update Status
        const currentInvoices = await prisma.invoice.findUnique({
            where: { id: invoice.id },
            include: { payments: true }
        });

        const exchangeRate = Number(process.env.EXCHANGE_RATE_USD_KHR || 4100);
        
        const totalPaid = (currentInvoices?.payments || []).reduce((sum: number, p: any) => {
            let normalizedAmount = p.amount;
            if (p.currency === "KHR" && currentInvoices!.currency === "USD") {
                normalizedAmount = normalizedAmount / exchangeRate;
            } else if (p.currency === "USD" && currentInvoices!.currency === "KHR") {
                normalizedAmount = normalizedAmount * exchangeRate;
            }
            return sum + normalizedAmount;
        }, 0);
        
        if (totalPaid >= (invoice.totalAmount - 0.01)) {
            await prisma.invoice.update({
                where: { id: invoice.id },
                data: { status: "PAID" }
            });
            console.log(` SUCCESS: Invoice ${invoice.id} marked as PAID (Normalized total: ${totalPaid})`);
        } else {
            console.log(` INFO: Partial payment for ${invoice.id}, Total Paid (Normalized): ${totalPaid}`);
        }
        
        res.json({ success: true, message: "OK" });
    } catch (err) {
        console.error("Callback crash:", err);
        res.status(500).json({ error: "Internal Error" });
    }
};

// --- User Benefits & Payroll ---

export const getUserBenefits = async (req: AuthRequest, res: Response) => {
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

export const updateUserBenefit = async (req: AuthRequest, res: Response) => {
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

export const getPayrolls = async (req: AuthRequest, res: Response) => {
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

export const generatePayrolls = async (req: AuthRequest, res: Response) => {
    try {
        const { period } = req.body; // e.g., "2024-03"
        
        // 1. Get all users with benefits
        const usersWithBenefits = await (prisma as any).userBenefit.findMany({
            include: { user: true }
        });
        
        const generatedPayrolls: any[] = [];
        
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

export const updatePayrollStatus = async (req: AuthRequest, res: Response) => {
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

export const getBudgets = async (req: AuthRequest, res: Response) => {
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

export const createBudget = async (req: AuthRequest, res: Response) => {
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

export const addBudgetItem = async (req: AuthRequest, res: Response) => {
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

export const getBudgetById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const budget = await (prisma as any).budget.findUnique({
            where: { id },
            include: {
                department: true,
                items: { orderBy: { date: 'desc' } }
            }
        });
        if (!budget) return res.status(404).json({ error: "Budget not found" });
        res.json(budget);
    } catch (err) {
        console.error("Failed to fetch budget details:", err);
        res.status(500).json({ error: "Failed to fetch budget details" });
    }
};
export const sendReminders = async (req: AuthRequest, res: Response) => {
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

        const notifications: any[] = [];

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

// --- Reports ---

export const getStudentPaymentReport = async (req: AuthRequest, res: Response) => {
    try {
        const { status, academicYear, period, semester } = req.query;
        
        // 1. Fetch all ACTIVE students, optionally filtered by academic year
        const studentWhereClause: any = { role: 'STUDENT', isActive: true };
        if (academicYear) {
            studentWhereClause.profile = { academicYear: Number(academicYear) };
        }

        const students = await prisma.user.findMany({
            where: studentWhereClause,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                profile: {
                    select: {
                        studentId: true,
                        academicYear: true,
                        batch: { select: { name: true } }
                    }
                },
                invoices: {
                    include: { payments: true },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        let reportData: any[] = [];

        // 2. Process each student
        for (const student of students) {
            let matchingInvoices = student.invoices;

            // Apply invoice-level filters if they exist
            if (period) {
                matchingInvoices = matchingInvoices.filter(inv => inv.period === period);
            }
            if (semester) {
                matchingInvoices = matchingInvoices.filter(inv => inv.semester === Number(semester));
            }

            // If the student has matching invoices, add them to the report
            if (matchingInvoices.length > 0) {
                for (const inv of matchingInvoices) {
                    const totalPaid = inv.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
                    reportData.push({
                        invoiceId: inv.id,
                        studentId: student.profile?.studentId || "N/A",
                        studentName: `${student.firstName} ${student.lastName}`,
                        email: student.email,
                        academicYear: inv.academicYear || student.profile?.academicYear || 1,
                        batch: student.profile?.batch?.name || "N/A",
                        period: inv.period,
                        semester: inv.semester || null,
                        totalAmount: inv.totalAmount,
                        totalPaid: totalPaid,
                        balance: inv.totalAmount - totalPaid,
                        currency: inv.currency,
                        status: inv.status,
                        dueDate: inv.dueDate,
                        issueDate: inv.issueDate
                    });
                }
            } else {
                // IMPORTANT: If student has ZERO matching invoices, they are UNBILLED
                // We only add UNBILLED if there wasn't a strict invoice-only filter 
                // (like filtering by a specific semester might exclude an unbilled student if they just joined)
                // But generally, unbilled students should always show up if they match the academic year.
                reportData.push({
                    invoiceId: `unbilled-${student.id}`, // Mock ID for React key
                    studentId: student.profile?.studentId || "N/A",
                    studentName: `${student.firstName} ${student.lastName}`,
                    email: student.email,
                    academicYear: student.profile?.academicYear || 1,
                    batch: student.profile?.batch?.name || "N/A",
                    period: "N/A",
                    semester: null,
                    totalAmount: 0,
                    totalPaid: 0,
                    balance: 0,
                    currency: "USD",
                    status: "UNBILLED",
                    dueDate: null,
                    issueDate: null
                });
            }
        }

        // 3. Finally, apply the in-memory status filter
        if (status) {
            reportData = reportData.filter(row => row.status === status);
        }

        res.json(reportData);
    } catch (err: any) {
        console.error("Failed to generate student payment report:", err);
        res.status(500).json({ error: "Failed to generate report", details: err.message });
    }
};
