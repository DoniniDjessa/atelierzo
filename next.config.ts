import type { NextConfig } from "next";

// Extract Supabase hostname from URL if available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseHostname: string | undefined;
if (supabaseUrl) {
  try {
    const url = new URL(supabaseUrl);
    supabaseHostname = url.hostname;
  } catch (e) {
    // Invalid URL, will skip adding Supabase pattern
  }
}

const remotePatterns: Array<{ protocol: 'https'; hostname: string; pathname?: string }> = [
  {
    protocol: 'https',
    hostname: 'placehold.co',
  },
  {
    protocol: 'https',
    hostname: 'images.unsplash.com',
  },
  {
    protocol: 'https',
    hostname: 'source.unsplash.com',
  },
  {
    protocol: 'https',
    hostname: 'i.pinimg.com',
  },
];

// Add Supabase hostname if available
if (supabaseHostname) {
  remotePatterns.push({
    protocol: 'https',
    hostname: supabaseHostname,
    pathname: '/storage/v1/object/public/**',
  });
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
