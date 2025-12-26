/**
 * SMS Service for sending notifications
 * Based on MonSMS API format
 */

const MONSMS_API_KEY = process.env.MONSMS_API_KEY || process.env.SMS_API_KEY;
const MONSMS_BASE_URL = process.env.MONSMS_BASE_URL || process.env.SMS_API_URL || 'https://rest.monsms.pro';

const ADMIN_PHONE = '2250777489119';

/**
 * Normalize phone number
 * - Removes all non-digit characters
 * - Strips country code 225 if present
 * - Returns normalized number (8-10 digits)
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let normalized = phone.replace(/\D/g, '');
  
  // Remove country code 225 if present
  if (normalized.startsWith('225')) {
    normalized = normalized.substring(3);
  }
  
  // Validate length (8-10 digits)
  if (normalized.length < 8 || normalized.length > 10) {
    throw new Error('Numéro de téléphone invalide');
  }
  
  return normalized;
}

/**
 * Send SMS notification using MonSMS API
 * @param phoneNumber - Phone number (any format, will be normalized)
 * @param message - SMS message content
 */
export async function sendSMS(phoneNumber: string, message: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    if (!MONSMS_API_KEY) {
      console.error('SMS API configuration missing: MONSMS_API_KEY');
      return { success: false, error: 'SMS API configuration missing' };
    }

    if (!message || message.trim().length === 0) {
      return { success: false, error: 'Message cannot be empty' };
    }

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    
    // Construct API endpoint
    const apiUrl = `${MONSMS_BASE_URL}/v1/campaign/create`;
    
    // Prepare request body according to MonSMS API format
    const requestBody = {
      apiKey: MONSMS_API_KEY,
      senderId: 'LEKONAMS',
      contacts: [normalizedPhone],
      text: message,
      type: 'SMS'
    };

    console.log('Sending SMS request to:', apiUrl);
    console.log('Request body:', { ...requestBody, apiKey: '***' }); // Hide API key in logs

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseData = await response.json().catch(() => ({ error: 'Failed to parse response' }));

    if (!response.ok) {
      console.error('SMS API error response:', responseData);
      throw new Error(responseData.error || responseData.message || 'Failed to send SMS');
    }

    // Check if the API response indicates success
    if (responseData.success === true || responseData.data?.success === true) {
      console.log('SMS sent successfully:', responseData);
      return { success: true, message: responseData.message || 'SMS envoyé avec succès' };
    } else {
      throw new Error(responseData.error || responseData.message || 'Failed to send SMS');
    }
  } catch (error: any) {
    console.error('Error sending SMS:', error);
    return { 
      success: false, 
      error: error.message === 'Numéro de téléphone invalide' 
        ? error.message 
        : 'Erreur lors de l\'envoi du SMS. Veuillez réessayer.' 
    };
  }
}

/**
 * Send SMS notification to admin when a new order is created
 * @param orderId - Order ID
 * @param totalAmount - Total order amount
 * @param clientName - Client name
 * @param clientPhone - Client phone number
 */
export async function sendNewOrderNotification(
  orderId: string,
  totalAmount: number,
  clientName: string,
  clientPhone: string
): Promise<void> {
  try {
    const message = `Nouvelle commande #${orderId.substring(0, 8)}!\nClient: ${clientName} (${clientPhone})\nMontant: ${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(totalAmount)} FCFA`;
    
    console.log('Sending SMS to:', ADMIN_PHONE);
    console.log('SMS message:', message);
    
    const result = await sendSMS(ADMIN_PHONE, message);
    
    if (result.success) {
      console.log('SMS notification sent successfully to', ADMIN_PHONE, result.message);
    } else {
      console.error('Failed to send SMS notification:', result.error);
    }
  } catch (error: any) {
    // Non-blocking: log error but don't fail the order creation
    console.error('Failed to send new order notification SMS:', error.message || error);
  }
}

