const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../utils/logger');
const supabase = require('../config/supabase');

class InvoiceService {
  constructor() {
    this.invoicesDir = path.join(__dirname, '../invoices');
    this.ensureDirectoryExists();
  }

  async ensureDirectoryExists() {
    try {
      await fs.access(this.invoicesDir);
    } catch (error) {
      await fs.mkdir(this.invoicesDir, { recursive: true });
    }
  }

  generateInvoiceNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const timestamp = now.getTime().toString().slice(-6);
    
    return `INV-${year}${month}${day}-${timestamp}`;
  }

  async createDepositInvoice(bookingData, paymentData) {
    try {
      const invoiceNumber = this.generateInvoiceNumber();
      const invoiceData = {
        invoiceNumber,
        type: 'deposit',
        bookingId: bookingData.bookingId,
        celebrityId: bookingData.celebrityId,
        celebrityName: bookingData.celebrityName,
        clientEmail: bookingData.clientEmail,
        clientName: bookingData.clientName,
        clientPhone: bookingData.clientPhone,
        company: bookingData.company,
        eventType: bookingData.eventType,
        eventDate: bookingData.eventDate,
        eventTime: bookingData.eventTime,
        location: bookingData.location,
        depositAmount: bookingData.depositAmount,
        paymentIntentId: paymentData.paymentIntent.id,
        status: 'paid',
        createdAt: new Date().toISOString(),
        dueDate: new Date().toISOString() // Deposit is due immediately
      };

      // Generate PDF
      const pdfPath = await this.generateInvoicePDF(invoiceData);

      // Save invoice to database
      const { data: invoice, error } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceData.invoiceNumber,
          booking_id: bookingData.bookingId,
          type: invoiceData.type,
          amount: invoiceData.depositAmount,
          status: invoiceData.status,
          client_email: invoiceData.clientEmail,
          client_name: invoiceData.clientName,
          payment_intent_id: invoiceData.paymentIntentId,
          pdf_path: pdfPath,
          invoice_data: invoiceData
        })
        .select()
        .single();

      if (error) {
        logger.error('Error saving invoice to database:', error);
        throw new Error('Failed to save invoice');
      }

      logger.info(`Deposit invoice created: ${invoiceNumber}`);
      return {
        invoice,
        pdfPath,
        invoiceData
      };

    } catch (error) {
      logger.error('Error creating deposit invoice:', error);
      throw error;
    }
  }

  async generateInvoicePDF(invoiceData) {
    return new Promise((resolve, reject) => {
      try {
        const filename = `${invoiceData.invoiceNumber}.pdf`;
        const pdfPath = path.join(this.invoicesDir, filename);
        
        const doc = new PDFDocument({ 
          size: 'A4',
          margin: 50 
        });
        
        const stream = require('fs').createWriteStream(pdfPath);
        doc.pipe(stream);

        // Header
        doc.fontSize(20)
           .fillColor('#1a365d')
           .text('CELEBRITY BOOKING INVOICE', 50, 50);

        doc.fontSize(12)
           .fillColor('#666666')
           .text(`Invoice #: ${invoiceData.invoiceNumber}`, 50, 80)
           .text(`Date: ${new Date(invoiceData.createdAt).toLocaleDateString()}`, 50, 95)
           .text(`Type: ${invoiceData.type.toUpperCase()}`, 50, 110);

        // Company Info
        doc.fontSize(10)
           .fillColor('#333333')
           .text('Celebrity Management Platform', 400, 50)
           .text('1234 Entertainment Blvd', 400, 65)
           .text('Los Angeles, CA 90210', 400, 80)
           .text('Phone: (555) 123-4567', 400, 95)
           .text('Email: billing@example.com', 400, 110);

        // Client Info
        doc.fontSize(14)
           .fillColor('#1a365d')
           .text('BILL TO:', 50, 160);

        doc.fontSize(11)
           .fillColor('#333333')
           .text(invoiceData.clientName, 50, 180)
           .text(invoiceData.clientEmail, 50, 195);

        if (invoiceData.company) {
          doc.text(invoiceData.company, 50, 210);
        }

        if (invoiceData.clientPhone) {
          doc.text(invoiceData.clientPhone, 50, invoiceData.company ? 225 : 210);
        }

        // Event Details
        doc.fontSize(14)
           .fillColor('#1a365d')
           .text('EVENT DETAILS:', 50, 270);

        doc.fontSize(11)
           .fillColor('#333333')
           .text(`Celebrity: ${invoiceData.celebrityName}`, 50, 290)
           .text(`Event Type: ${invoiceData.eventType}`, 50, 305)
           .text(`Event Date: ${invoiceData.eventDate}`, 50, 320)
           .text(`Event Time: ${invoiceData.eventTime}`, 50, 335)
           .text(`Location: ${invoiceData.location}`, 50, 350);

        // Invoice Items Table
        const tableTop = 400;
        doc.fontSize(12)
           .fillColor('#1a365d')
           .text('DESCRIPTION', 50, tableTop)
           .text('AMOUNT', 450, tableTop);

        // Table line
        doc.strokeColor('#cccccc')
           .lineWidth(1)
           .moveTo(50, tableTop + 15)
           .lineTo(550, tableTop + 15)
           .stroke();

        // Item
        doc.fontSize(11)
           .fillColor('#333333')
           .text(`Booking Deposit - ${invoiceData.celebrityName}`, 50, tableTop + 30)
           .text(`$${invoiceData.depositAmount.toLocaleString()}`, 450, tableTop + 30);

        // Total line
        doc.strokeColor('#cccccc')
           .lineWidth(1)
           .moveTo(400, tableTop + 60)
           .lineTo(550, tableTop + 60)
           .stroke();

        // Total
        doc.fontSize(14)
           .fillColor('#1a365d')
           .text('TOTAL:', 400, tableTop + 75)
           .text(`$${invoiceData.depositAmount.toLocaleString()}`, 450, tableTop + 75);

        // Payment Status
        doc.fontSize(12)
           .fillColor('#059669')
           .text('STATUS: PAID', 50, tableTop + 100)
           .fillColor('#666666')
           .fontSize(10)
           .text(`Payment ID: ${invoiceData.paymentIntentId}`, 50, tableTop + 115);

        // Terms
        doc.fontSize(10)
           .fillColor('#666666')
           .text('TERMS & CONDITIONS:', 50, 650)
           .fontSize(8)
           .text('• This deposit is non-refundable except as outlined in our cancellation policy.', 50, 670)
           .text('• Final payment is due 30 days before the event date.', 50, 685)
           .text('• All bookings are subject to celebrity availability and approval.', 50, 700)
           .text('• Thank you for choosing our celebrity booking platform!', 50, 715);

        doc.end();

        stream.on('finish', () => {
          resolve(pdfPath);
        });

        stream.on('error', reject);

      } catch (error) {
        reject(error);
      }
    });
  }

  async createFinalInvoice(bookingData) {
    try {
      const invoiceNumber = this.generateInvoiceNumber();
      const remainingBalance = bookingData.totalAmount - bookingData.depositAmount;
      
      const invoiceData = {
        invoiceNumber,
        type: 'final',
        bookingId: bookingData.bookingId,
        celebrityId: bookingData.celebrityId,
        celebrityName: bookingData.celebrityName,
        clientEmail: bookingData.clientEmail,
        clientName: bookingData.clientName,
        totalAmount: bookingData.totalAmount,
        depositAmount: bookingData.depositAmount,
        remainingBalance,
        status: 'pending',
        createdAt: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // Due in 30 days
      };

      const pdfPath = await this.generateFinalInvoicePDF(invoiceData);

      const { data: invoice, error } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceData.invoiceNumber,
          booking_id: bookingData.bookingId,
          type: invoiceData.type,
          amount: remainingBalance,
          status: invoiceData.status,
          client_email: invoiceData.clientEmail,
          client_name: invoiceData.clientName,
          pdf_path: pdfPath,
          invoice_data: invoiceData,
          due_date: invoiceData.dueDate
        })
        .select()
        .single();

      if (error) {
        logger.error('Error saving final invoice to database:', error);
        throw new Error('Failed to save final invoice');
      }

      return { invoice, pdfPath, invoiceData };

    } catch (error) {
      logger.error('Error creating final invoice:', error);
      throw error;
    }
  }

  async generateFinalInvoicePDF(invoiceData) {
    // Similar to deposit invoice but with different structure
    // Implementation would be similar to generateInvoicePDF but with final payment details
    // This is a placeholder - you can expand this based on your needs
    return this.generateInvoicePDF({
      ...invoiceData,
      depositAmount: invoiceData.remainingBalance
    });
  }

  async getInvoice(invoiceId, userId) {
    try {
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (error) {
        throw new Error('Invoice not found');
      }

      // Verify user has access to this invoice
      if (invoice.client_email !== userId) {
        // You might want to check this differently based on your user structure
        throw new Error('Unauthorized access to invoice');
      }

      return invoice;

    } catch (error) {
      logger.error('Error fetching invoice:', error);
      throw error;
    }
  }

  async updateInvoiceStatus(invoiceId, status, paymentIntentId = null) {
    try {
      const updateData = { status };
      if (paymentIntentId) {
        updateData.payment_intent_id = paymentIntentId;
        updateData.paid_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoiceId)
        .select()
        .single();

      if (error) {
        throw new Error('Failed to update invoice status');
      }

      return data;

    } catch (error) {
      logger.error('Error updating invoice status:', error);
      throw error;
    }
  }
}

module.exports = new InvoiceService();