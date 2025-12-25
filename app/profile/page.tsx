'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/app/contexts/UserContext';

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useUser();

  useEffect(() => {
    // Redirect to profile details if user is logged in, otherwise redirect to home
    if (user) {
      router.replace('/profile/details');
    } else {
      router.replace('/');
    }
  }, [user, router]);

  return null;
}

