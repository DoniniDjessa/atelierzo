# Email Service Setup

This service uses Nodemailer with Gmail SMTP to send email notifications.

## Environment Variables

Add the following to your `.env.local` file:

```env
GMAIL_USER=doninidjessa@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password
```

Or use `GMAIL_PASSWORD` instead of `GMAIL_APP_PASSWORD` (less secure).

## Gmail App Password Setup

To generate a Gmail App Password:

1. Go to your Google Account settings: https://myaccount.google.com/
2. Navigate to **Security** → **2-Step Verification** (must be enabled)
3. Scroll down to **App passwords**
4. Generate a new app password for "Mail"
5. Copy the 16-character password and use it as `GMAIL_APP_PASSWORD`

## Configuration

- **SMTP Server**: `smtp.gmail.com`
- **Port**: `587` (TLS)
- **From Address**: `"Atelierzo" <doninidjessa@gmail.com>`
- **Admin Email**: `doninidjessa@gmail.com` (receives order notifications)

## Features

- Connection pooling (5 max connections, 100 max messages)
- Automatic retry logic (3 attempts with exponential backoff)
- Fallback to direct SMTP if Gmail service fails
- Non-blocking email sending (won't block order creation if email fails)

## Usage

The email service is now accessible via API route (`/api/email`) to avoid client-side issues with Node.js modules.

### Sending Order Notification Email

Order notifications are automatically sent when an order is created via the `createOrder` function in `app/lib/supabase/orders.ts`. The email is sent asynchronously using the API route:

```typescript
// This is already integrated in createOrder function
fetch('/api/email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    type: 'order_notification',
    orderId: '...',
    totalAmount: 0,
    clientName: '...',
    clientPhone: '...',
    deliveryAddress: '...',
    items: [...]
  }),
});
```

The API route handles all email sending server-side using Nodemailer.

