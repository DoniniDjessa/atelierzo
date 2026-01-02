/**
 * Email Service for sending notifications
 * Uses Nodemailer with Gmail SMTP
 */

import nodemailer from 'nodemailer';

const ADMIN_EMAIL = 'doninidjessa@gmail.com';

// Gmail SMTP configuration
const SMTP_CONFIG = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.GMAIL_USER || 'doninidjessa@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASSWORD, // Use App Password
  },
};

// Transporter instance (with connection pooling)
let transporter: nodemailer.Transporter | null = null;

/**
 * Create or get email transporter
 */
function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: SMTP_CONFIG.auth.user,
        pass: SMTP_CONFIG.auth.pass,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateLimit: 5, // 5 messages per second
    });
  }
  return transporter;
}

/**
 * Verify transporter connection
 */
async function verifyConnection(): Promise<boolean> {
  try {
    const trans = getTransporter();
    await trans.verify();
    return true;
  } catch (error) {
    console.error('Email transporter verification failed:', error);
    // Recreate transporter on failure
    transporter = null;
    return false;
  }
}

/**
 * Send email with retry logic
 * @param params - Email parameters
 * @returns true if sent successfully, false otherwise
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      // Verify connection before sending
      const isConnected = await verifyConnection();
      if (!isConnected) {
        // Fallback to direct SMTP if service fails
        transporter = nodemailer.createTransport({
          host: SMTP_CONFIG.host,
          port: SMTP_CONFIG.port,
          secure: SMTP_CONFIG.secure,
          auth: SMTP_CONFIG.auth,
        });
        await transporter.verify();
      }

      const trans = getTransporter();

      const mailOptions = {
        from: `"Les Ateliers Zo" <${SMTP_CONFIG.auth.user}>`,
        to: params.to,
        subject: params.subject,
        html: params.html,
      };

      const info = await trans.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);
      return true;
    } catch (error: any) {
      attempt++;
      console.error(`Email send attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 3s
        const delay = attempt * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error('Email sending failed after all retries:', error);
        return false;
      }
    }
  }

  return false;
}

/**
 * Send order notification email to admin
 * @param orderId - Order ID
 * @param totalAmount - Total order amount
 * @param clientName - Client name
 * @param clientPhone - Client phone number
 * @param deliveryAddress - Delivery address
 * @param items - Order items
 */





export async function sendOrderNotificationEmail(
  orderId: string,
  totalAmount: number,
  clientName: string,
  clientPhone: string,
  deliveryAddress: string,
  items: Array<{ title: string; quantity: number; price: number; size?: string; color?: string }>
): Promise<void> {
  try {
    const formattedDate = new Date().toLocaleString('fr-FR', {
      dateStyle: 'long',
      timeStyle: 'short',
    });

    const itemsHtml = items
      .map(
        (item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.title}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.price.toLocaleString('fr-FR')} XOF</td>
        ${item.size ? `<td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Taille: ${item.size}</td>` : '<td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">-</td>'}
        ${item.color ? `<td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.color}</td>` : '<td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">-</td>'}
      </tr>
    `
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Nouvelle Commande Reçue</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #667eea; margin-top: 0; font-size: 18px; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
                📋 Détails de la Commande
              </h2>
              <table style="width: 100%; margin-top: 15px;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Numéro de commande:</td>
                  <td style="padding: 8px 0; color: #111827;">#${orderId.substring(0, 8)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Date:</td>
                  <td style="padding: 8px 0; color: #111827;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Montant total:</td>
                  <td style="padding: 8px 0; color: #111827; font-size: 18px; font-weight: bold; color: #059669;">
                    ${totalAmount.toLocaleString('fr-FR')} XOF
                  </td>
                </tr>
              </table>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #667eea; margin-top: 0; font-size: 18px; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
                👤 Informations Client
              </h2>
              <table style="width: 100%; margin-top: 15px;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Nom:</td>
                  <td style="padding: 8px 0; color: #111827;">${clientName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Téléphone:</td>
                  <td style="padding: 8px 0; color: #111827;">${clientPhone}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Adresse de livraison:</td>
                  <td style="padding: 8px 0; color: #111827;">${deliveryAddress}</td>
                </tr>
              </table>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #667eea; margin-top: 0; font-size: 18px; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
                🛍️ Articles Commandés
              </h2>
              <table style="width: 100%; margin-top: 15px; border-collapse: collapse;">
                <thead>
                  <tr style="background: #f3f4f6;">
                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb; font-weight: bold;">Produit</th>
                    <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e5e7eb; font-weight: bold;">Qté</th>
                    <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb; font-weight: bold;">Prix</th>
                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb; font-weight: bold;">Taille</th>
                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb; font-weight: bold;">Couleur</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="4" style="padding: 12px 8px; text-align: right; font-weight: bold; font-size: 16px; border-top: 2px solid #e5e7eb;">Total:</td>
                    <td style="padding: 12px 8px; text-align: right; font-weight: bold; font-size: 16px; color: #059669; border-top: 2px solid #e5e7eb;">
                      ${totalAmount.toLocaleString('fr-FR')} XOF
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div style="margin-top: 30px; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                ⚠️ <strong>Action requise:</strong> Veuillez traiter cette commande et mettre à jour son statut dans le panneau d'administration.
              </p>
            </div>
          </div>

          <div style="margin-top: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
            <p>Les Ateliers Zo - E-commerce de mode</p>
            <p>Cet email a été généré automatiquement par le système.</p>
          </div>
        </body>
      </html>
    `;

    const success = await sendEmail({
      to: ADMIN_EMAIL,
      subject: `Nouvelle commande #${orderId.substring(0, 8)} - ${totalAmount.toLocaleString('fr-FR')} XOF`,
      html: htmlContent,
    });

    if (success) {
      console.log('Order notification email sent successfully to', ADMIN_EMAIL);
    } else {
      console.error('Failed to send order notification email to', ADMIN_EMAIL);
    }
  } catch (error: any) {
    // Non-blocking: log error but don't fail the order creation
    console.error('Failed to send order notification email:', error.message || error);
  }
}

