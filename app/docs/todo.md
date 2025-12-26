# SMS & Email Sending Flow Guide

This document explains how to use the SMS and Email sending services in Konams Selection. This guide focuses specifically on the **sending flow** for external applications.

---

## Table of Contents

1. [SMS Sending Flow](#sms-sending-flow)
2. [Email Sending Flow](#email-sending-flow)
3. [Common Patterns](#common-patterns)
4. [Error Handling](#error-handling)
5. [Examples](#examples)

---

## SMS Sending Flow

### Overview

The SMS service uses the **MonSMS API** to send text messages to phone numbers. The system automatically normalizes phone numbers and handles the API communication.

### Phone Number Format

The system accepts phone numbers in various formats and automatically normalizes them:

- **Accepted formats:**
  - `+2250712345678` (with country code)
  - `2250712345678` (with country code, no plus)
  - `0712345678` (local format)
  - `07 12 34 56 78` (with spaces)
  - `07-12-34-56-78` (with dashes)

- **Normalization process:**
  1. All non-digit characters are removed
  2. If the number starts with `225`, the country code is removed
  3. The resulting number must be 8-10 digits (local format)
  4. Invalid numbers will throw an error

**Example transformations:**
- `+2250712345678` → `0712345678`
- `2250712345678` → `0712345678`
- `07 12 34 56 78` → `0712345678`

### Function Signature

```typescript
async function sendSMS(to: string, message: string): Promise<SMSResponse>
```

### Parameters

| Parameter | Type   | Required | Description                                    |
|-----------|--------|----------|------------------------------------------------|
| `to`      | string | Yes      | Phone number (any format, will be normalized)  |
| `message` | string | Yes      | SMS message content                            |

### Return Value

```typescript
interface SMSResponse {
  success: boolean
  message?: string  // Success message: "SMS envoyé avec succès"
  error?: string    // Error message if failed
}
```

### SMS Sending Process

1. **Phone Number Normalization**
   - Removes all non-digit characters
   - Strips country code `225` if present
   - Validates length (8-10 digits)

2. **API Request Preparation**
   - Constructs request body with:
     - `apiKey`: From environment variable `MONSMS_API_KEY`
     - `senderId`: Fixed value `"LEKONAMS"`
     - `contacts`: Array with normalized phone number
     - `text`: Message content
     - `type`: `"SMS"`

3. **API Call**
   - Endpoint: `${MONSMS_BASE_URL}/v1/campaign/create` (default: `https://rest.monsms.pro/v1/campaign/create`)
   - Method: `POST`
   - Headers: `Content-Type: application/json`
   - Body: JSON with above structure

4. **Response Handling**
   - Returns success response if `data.success === true`
   - Returns error response for any failures

### Environment Variables Required

```bash
MONSMS_BASE_URL=https://rest.monsms.pro  # Optional, has default
MONSMS_API_KEY=your_api_key_here         # Required
```

### Validation Rules

- Phone number must result in 8-10 digits after normalization
- Message cannot be empty
- API key must be configured

### Special Notes

- **Moov numbers**: Some Moov numbers (starting with `01` or `02`) may have known issues and might be blocked in certain flows (like password reset)
- **Sender ID**: All SMS are sent with sender ID `"LEKONAMS"`
- **Error messages**: Generic error messages are returned to users to avoid exposing technical details

---

## Email Sending Flow

### Overview

The Email service uses **Nodemailer with Gmail SMTP** to send emails. The system includes automatic retry logic and connection management.

### Function Signature

There are two main email functions:

#### 1. Generic Email Function

```typescript
async function sendEmail(params: {
  to: string
  subject: string
  html: string
}): Promise<boolean>
```

#### 2. Deposit/Withdrawal Notification Function

```typescript
async function sendDepotRetraitNotification(
  data: EmailNotificationData
): Promise<boolean>
```

### Generic Email Parameters

| Parameter | Type   | Required | Description                      |
|-----------|--------|----------|----------------------------------|
| `to`      | string | Yes      | Recipient email address          |
| `subject` | string | Yes      | Email subject line               |
| `html`    | string | Yes      | HTML content of the email        |

### Notification Email Parameters

```typescript
interface EmailNotificationData {
  type: 'depot' | 'retrait'              // Required: Transaction type
  userId: string                          // Required: User identifier
  userPseudo: string                      // Required: User display name
  amount: number                          // Required: Transaction amount
  status: 'pending' | 'approved' | 'rejected'  // Required: Transaction status
  requestId?: string                      // Optional: Request identifier
  timestamp: Date                         // Required: Transaction timestamp
  userEmail?: string                      // Optional: User email (for display)
  additionalInfo?: string                 // Optional: Additional details
  paymentType?: string                    // Optional: Payment method (WAVE, ORANGE, MOOV, etc.)
}
```

### Email Sending Process

1. **Connection Verification**
   - Verifies SMTP transporter connection
   - Automatically recreates transporter if verification fails
   - Falls back to direct SMTP if Gmail service fails

2. **Email Preparation**
   - For generic emails: Uses provided `to`, `subject`, and `html`
   - For notifications: Generates formatted HTML template with transaction details

3. **Email Delivery** (with retry logic)
   - Attempts to send email up to 3 times
   - Uses exponential backoff between retries (1s, 2s, 3s)
   - Returns `true` on success, `false` on failure after all attempts

4. **Transporter Configuration**
   - Primary: Gmail service with connection pooling
   - Fallback: Direct SMTP to `smtp.gmail.com:587`
   - Connection pooling: 5 max connections, 100 max messages
   - Rate limiting: 5 messages per 20 seconds

### Email Configuration

**Sender Details:**
- **From**: `"Konams Selection" <doninidjessa@gmail.com>`
- **SMTP Server**: `smtp.gmail.com`
- **Port**: `587` (TLS)
- **Service**: Gmail

**Note**: The email service is configured to send all notification emails to `doninidjessa@gmail.com` regardless of the `userEmail` field (which is only displayed in the email content).

### Google App ID

**Google App ID**: `[YOUR_GOOGLE_APP_ID]`

This is the Google application identifier used for Gmail API integration and authentication. External applications may need this ID for:
- Gmail API OAuth configuration
- Google Cloud Platform service integration
- App-specific authentication flows

**How to find your Google App ID:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to "APIs & Services" > "Credentials"
4. Your App ID (Client ID) will be listed in the OAuth 2.0 Client IDs section

**Note**: If you're using Gmail App Passwords (current implementation), the App ID may not be required for the basic sending functionality but is recommended for future OAuth-based integrations.

### Return Value

Both email functions return:
- `true`: Email sent successfully
- `false`: Email failed after all retry attempts

### Environment Variables Required

Email configuration is hardcoded in the service. No environment variables are required for basic operation, but the Gmail app password must be configured.

### Retry Logic

The email service implements robust retry logic:

1. **Connection verification** before each send attempt
2. **3 retry attempts** if sending fails
3. **Exponential backoff**: Waits 1s, 2s, 3s between retries
4. **Automatic transporter recreation** if connection fails

### Email Template (Notifications)

The notification email uses a formatted HTML template with:
- Color-coded header (blue for deposits, orange for withdrawals)
- Transaction details table
- Status badge with appropriate styling
- Timestamp in French locale format
- Additional information section (if provided)

---

## Common Patterns

### Sending a Simple SMS

```typescript
import { sendSMS } from '@/lib/sms'

const result = await sendSMS(
  '+2250712345678',
  'Your verification code is: 123456'
)

if (result.success) {
  console.log('SMS sent:', result.message)
} else {
  console.error('SMS failed:', result.error)
}
```

### Sending a Password Reset SMS

```typescript
import { sendPasswordResetCode } from '@/lib/sms'

const result = await sendPasswordResetCode(
  '0712345678',
  '123456'  // 6-digit code
)

// Message automatically formatted as:
// "Konams Selection - Code de réinitialisation: 123456. 
//  Ce code expire dans 10 minutes. Ne partagez jamais ce code."
```

### Sending a Generic Email

```typescript
import { sendEmail } from '@/lib/email-service'

const success = await sendEmail({
  to: 'user@example.com',
  subject: 'Welcome to Konams Selection',
  html: '<h1>Welcome!</h1><p>Thank you for joining.</p>'
})

if (success) {
  console.log('Email sent successfully')
} else {
  console.error('Failed to send email')
}
```

### Sending a Transaction Notification Email

```typescript
import { sendDepotRetraitNotification } from '@/lib/email-service'

const success = await sendDepotRetraitNotification({
  type: 'depot',
  userId: 'user123',
  userPseudo: 'John Doe',
  amount: 5000,
  status: 'pending',
  requestId: 'req_123456',
  timestamp: new Date(),
  userEmail: 'user@example.com',
  additionalInfo: 'Payment method: Wave | Phone: +2250712345678',
  paymentType: 'WAVE'
})
```

---

## Error Handling

### SMS Errors

```typescript
try {
  const result = await sendSMS(phoneNumber, message)
  
  if (!result.success) {
    // Handle error
    console.error('SMS error:', result.error)
    // Error message: "Erreur lors de l'envoi du SMS. Veuillez réessayer."
  }
} catch (error) {
  // Handle exception (e.g., invalid phone number)
  if (error.message === "Numéro de téléphone invalide") {
    // Phone number validation failed
  }
}
```

### Email Errors

```typescript
const success = await sendEmail({
  to: 'user@example.com',
  subject: 'Test',
  html: '<p>Test</p>'
})

if (!success) {
  // Email failed after all retry attempts
  // Check server logs for detailed error information
  console.error('Email sending failed')
}
```

### Common Error Scenarios

**SMS:**
- Invalid phone number format (must result in 8-10 digits)
- Missing API key configuration
- API service unavailable
- Rate limiting

**Email:**
- SMTP connection failure (handled with retries)
- Invalid email address format
- Gmail authentication failure
- Network timeouts

---

## Examples

### Complete SMS Example

```typescript
import { sendSMS } from '@/lib/sms'

async function sendVerificationCode(phone: string, code: string) {
  const message = `Konams Selection - Votre code de vérification est: ${code}. Ne partagez jamais ce code.`
  
  const result = await sendSMS(phone, message)
  
  if (result.success) {
    return { 
      success: true, 
      message: 'Code sent successfully' 
    }
  } else {
    return { 
      success: false, 
      error: result.error || 'Failed to send SMS' 
    }
  }
}

// Usage
const response = await sendVerificationCode('+2250712345678', '123456')
```

### Complete Email Example

```typescript
import { sendEmail } from '@/lib/email-service'

async function sendWelcomeEmail(userEmail: string, userName: string) {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Bienvenue sur Konams Selection!</h2>
      <p>Bonjour ${userName},</p>
      <p>Merci de nous avoir rejoint. Nous sommes ravis de vous avoir parmi nous.</p>
      <p>Bonne chance dans vos prédictions!</p>
      <hr>
      <p style="color: #9ca3af; font-size: 12px;">
        Konams Selection - Jeu de prédiction sportive
      </p>
    </div>
  `
  
  const success = await sendEmail({
    to: userEmail,
    subject: 'Bienvenue sur Konams Selection',
    html: htmlContent
  })
  
  return success
}

// Usage
const sent = await sendWelcomeEmail('user@example.com', 'John Doe')
```

### Integration Example

```typescript
import { sendSMS } from '@/lib/sms'
import { sendEmail } from '@/lib/email-service'

async function notifyUser(
  phone: string | null, 
  email: string | null, 
  message: string
) {
  const results = {
    sms: null as boolean | null,
    email: null as boolean | null
  }
  
  // Send SMS if phone provided
  if (phone) {
    const smsResult = await sendSMS(phone, message)
    results.sms = smsResult.success
  }
  
  // Send Email if email provided
  if (email) {
    results.email = await sendEmail({
      to: email,
      subject: 'Notification Konams Selection',
      html: `<p>${message}</p>`
    })
  }
  
  return results
}
```

---

## Notes for External Applications

### Integration Requirements

1. **Import the functions** from their respective modules:
   - `@/lib/sms` for SMS functions
   - `@/lib/email-service` for email functions

2. **Ensure environment variables are set** (for SMS):
   - `MONSMS_API_KEY` must be configured

3. **Handle responses appropriately**:
   - SMS returns an object with `success`, `message`, and `error` fields
   - Email returns a boolean (`true`/`false`)

4. **Phone number validation**: The system handles normalization, but ensure your phone numbers are valid

5. **Email format**: Use HTML for email content to ensure proper formatting

### Best Practices

- **Always check success status** before proceeding
- **Log errors** for debugging but don't expose technical details to end users
- **Implement your own retry logic** if needed (especially for critical notifications)
- **Validate phone numbers and emails** before calling the functions
- **Handle timeouts** appropriately in your application

---

## Support

For issues or questions regarding SMS or Email sending:
1. Check server logs for detailed error messages
2. Verify environment variables are configured correctly
3. Ensure phone numbers and email addresses are valid formats
4. Contact the development team for API key issues

---

**Last Updated**: 2024
**Version**: 1.0

