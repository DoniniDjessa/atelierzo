'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

export default function ConditionalNavbar() {
  const pathname = usePathname();
  
  // Don't show Navbar on admin pages
  if (pathname?.startsWith('/pilotage')) {
    return null;
  }
  
  return <Navbar />;
}

