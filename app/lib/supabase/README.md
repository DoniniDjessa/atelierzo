# Supabase Setup Guide

## Environment Variables

Create a `.env.local` file in the root of your project with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these values in your Supabase project settings under API.

## Database Setup

1. Go to your Supabase project SQL Editor
2. Run the SQL script from `schema.sql` to create the `zo-users` table
3. The script includes:
   - Table creation with `zo-` prefix
   - Row Level Security (RLS) policies (allowing public inserts for registration)
   - Indexes for performance
   - Automatic timestamp updates

## User Registration and Login Flow

The authentication stores phone numbers directly in the database (no phone auth/OTP required):

1. **Registration**: User enters phone number and name → stored directly in `zo-users` table
2. **Login**: User enters phone number → system checks if it exists in `zo-users` table

No phone provider (Twilio) configuration needed!

## Table Structure

The `zo-users` table stores:
- `id` (UUID): Auto-generated unique identifier
- `phone` (TEXT): User's phone number in E.164 format (unique)
- `name` (TEXT): User's full name
- `created_at` (TIMESTAMPTZ): Account creation timestamp
- `updated_at` (TIMESTAMPTZ): Last update timestamp

## Notes

- All tables are prefixed with `zo-` as per project convention
- Phone numbers are stored in E.164 format (e.g., +2250123456789)
- No Supabase Auth required - direct database storage
- RLS policies allow public inserts for registration
- Phone numbers are unique - prevents duplicate registrations
