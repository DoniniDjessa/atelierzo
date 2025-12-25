# Setup Guide

## Environment Variables

Create a `.env.local` file in the root directory with the following:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these values in your Supabase project dashboard under Settings > API.

## Database Setup

1. Go to your Supabase project SQL Editor
2. Run the SQL script from `app/lib/supabase/schema.sql` to create the `zo-users` table
3. Make sure Row Level Security (RLS) is enabled and policies are created

## Features Implemented

✅ **Fade-out animation** - Modal closes with smooth fade-out effect  
✅ **Phone number authentication** - Users register/login with phone number only  
✅ **Country flag selector** - Phone input includes country flags and country codes  
✅ **Supabase integration** - Full authentication flow with OTP  
✅ **Database schema** - `zo-users` table with proper RLS policies  
✅ **Table naming** - All tables prefixed with `zo-` convention

## Authentication Flow

1. User enters phone number (and name for registration)
2. System sends OTP via SMS
3. User enters OTP code (you'll need to implement OTP verification UI)
4. User is authenticated/registered
5. User data is synced to `zo-users` table

## Next Steps

- Implement OTP verification UI in the AuthModal
- Set up SMS provider in Supabase (Twilio, etc.)
- Add user profile management
- Handle authentication state throughout the app

