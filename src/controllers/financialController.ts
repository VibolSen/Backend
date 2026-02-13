import { Request, Response } from 'express';
import prisma from '../prisma';
import { KHQR, TAG, CURRENCY, COUNTRY } from 'ts-khqr';

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
        
        console.log("Configuring KHQR...");
        const accountID = process.env.KHQR_ACCOUNT_ID?.trim() || "ishinvin@devb"; 
        const merchantName = process.env.KHQR_MERCHANT_NAME?.trim() || "Step Academy"; 
        console.log(`Using KHQR ID: ${accountID}, Merchant: ${merchantName}`);

        // Format a cleaner bill number (INV-LAST8)
        const shortId = invoiceId ? invoiceId.substring(invoiceId.length - 8) : Date.now().toString().substring(8);
        const validBillNumber = `INV-${shortId}`;

        const qrCurrency = currency === "KHR" ? CURRENCY.KHR : CURRENCY.USD;
        
        // Handle Currency Conversion
        // Assuming base invoice amount is always in USD.
        // If requesting KHR, convert USD to KHR (Rate: 4100)
        let finalAmount = Number(amount);
        if (qrCurrency === CURRENCY.KHR) {
             finalAmount = Math.ceil(finalAmount * 4100); 
        }
        
        // Extract basic ID for MerchantID field (e.g. 003128656 from 003128656@aba)
        const merchantID = accountID.split('@')[0];

        const payload = {
            tag: TAG.INDIVIDUAL, // Bakong Wallet is typically Individual
            accountID: accountID,
            currency: qrCurrency,
            amount: finalAmount,
            merchantName: merchantName,
            merchantCity: "Phnom Penh",
            countryCode: COUNTRY.KH,
            expirationTimestamp: Date.now() + 15 * 60 * 1000,
            additionalData: {
                billNumber: validBillNumber
            }
        };

        console.log("KHQR Payload:", JSON.stringify(payload, null, 2));

        const response = KHQR.generate(payload);

        if (response.status && response.status.code === 0 && response.data) {
             console.log("KHQR Success");
             res.status(200).json({ 
                 qrString: response.data.qr,
                 md5: response.data.md5 
             });
        } else {
             console.error("KHQR Failed:", response);
             // Safety check: if response doesn't have status, it might be a different structure, but from types it returns ResponseResult
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
        
        // Find the invoice and check if it has been paid
        const invoice = await prisma.invoice.findUnique({
            where: { id: String(invoiceId) },
            include: {
                payments: {
                    where: {
                        paymentMethod: "BANK_TRANSFER" // This represents KHQR payments
                    }
                }
            }
        });

        if (!invoice) {
            return res.status(404).json({ error: "Invoice not found" });
        }

        // Return the payment status
        res.json({
            status: invoice.status, // "PAID", "SENT", "OVERDUE"
            isPaid: invoice.status === "PAID", // Only trigger success if invoice is fully settled
            totalPaid: invoice.payments.reduce((sum: number, p) => sum + p.amount, 0) // Explicitly type sum
        });
    } catch (err) {
        console.error("Check status error:", err);
        res.status(500).json({ error: "Failed to check status" });
    }
};

export const bakongCallback = async (req: Request, res: Response) => {
    try {
        const { invoiceId, amount, transactionId, md5, senderAccount, senderName } = req.body;
        
        console.log("Bakong Callback Received:", { invoiceId, amount, transactionId, senderAccount });

        // 1. Find the invoice
        const invoice = await prisma.invoice.findUnique({
            where: { id: String(invoiceId) }, // Cast invoiceId to string
            include: { payments: true } // Ensure payments are included
        });

        if (!invoice) {
            return res.status(404).json({ error: "Invoice not found" });
        }

        // 2. Create the payment with sender details
        const payment = await prisma.payment.create({ // Removed as any
            data: {
                invoiceId: invoice.id,
                amount: Number(amount),
                paymentDate: new Date(),
                paymentMethod: "BANK_TRANSFER",
                transactionId: transactionId || `BK-${Date.now()}`,
                senderAccount: senderAccount || "N/A",
                senderName: senderName || "BAKONG_USER",
                notes: `Automatic detection via Bakong (MD5: ${md5 || 'N/A'})`
            }
        });

        // 3. Check if fully paid and update status
        const totalPaid = invoice.payments.reduce((sum: number, p) => sum + p.amount, 0) + Number(amount); // Explicitly type sum
        if (totalPaid >= invoice.totalAmount) {
            await prisma.invoice.update({
                where: { id: invoiceId },
                data: { status: "PAID" }
            });
        }

        res.json({ success: true, message: "Payment recorded successfully" });
    } catch (err) {
        console.error("Callback error:", err);
        res.status(500).json({ error: "Failed to process callback" });
    }
};
