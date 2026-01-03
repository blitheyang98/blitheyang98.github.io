import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { storage } from '../utils/storage';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check portal type from path or query parameter
    // For GitHub Pages, we use path or query param instead of port
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const portal = searchParams?.get('portal') || (path.includes('/staff') ? 'staff' : null);
    
    // For local development, still check port
    const isLocalDev = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const isStaffPort = isLocalDev && typeof window !== 'undefined' && window.location.port === '3001';
    const isStaff = portal === 'staff' || isStaffPort;
    
    const token = storage.getItem('token');
    const userStr = storage.getItem('user');
    
    if (!token) {
      // Allow access to register page on user portal
      if (!isStaff && typeof window !== 'undefined' && window.location.pathname === '/register') {
        return; // Don't redirect, allow registration
      }
      router.push('/login');
      return;
    }
    
    try {
      const user = userStr ? JSON.parse(userStr) : null;
      
      // If staff portal, redirect staff/manager to staff page, others to login
      if (isStaff) {
        if (user?.role === 'staff' || user?.role === 'manager') {
          router.push('/staff');
        } else {
          // Non-staff users on staff portal should be redirected
          if (isLocalDev) {
            alert('Staff access only. Please use the user portal at http://localhost:3000');
          } else {
            alert('Staff access only. Please use the user portal.');
          }
          router.push('/login');
        }
      } else {
        // User portal - redirect users to user page, staff/manager to login
        if (user?.role === 'staff' || user?.role === 'manager') {
          if (isLocalDev) {
            alert('Please use the staff portal at http://localhost:3001');
          } else {
            alert('Please use the staff portal.');
          }
          router.push('/login');
        } else {
          router.push('/user');
        }
      }
    } catch {
      router.push('/login');
    }
  }, []);

  return <div>Loading...</div>;
}

