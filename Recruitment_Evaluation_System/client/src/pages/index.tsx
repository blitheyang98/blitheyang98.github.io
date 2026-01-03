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
      // If user is on root path and not logged in, show portal selection page
      // Don't redirect immediately, let them choose
      if (typeof window !== 'undefined' && window.location.pathname === '/') {
        return; // Show portal selection page
      }
      // For other paths, redirect to appropriate login page based on portal
      if (isStaff) {
        router.push('/login?portal=staff');
      } else {
        router.push('/login');
      }
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
            router.push('/login');
          } else {
            alert('Staff access only. Please use the user portal.');
            // On GitHub Pages, redirect to user login (no query parameter)
            router.push('/login');
          }
        }
      } else {
        // User portal - redirect users to user page, staff/manager to staff login
        if (user?.role === 'staff' || user?.role === 'manager') {
          if (isLocalDev) {
            alert('Please use the staff portal at http://localhost:3001');
            router.push('/login');
          } else {
            // On GitHub Pages, redirect to staff login with query parameter
            router.push('/login?portal=staff');
          }
        } else {
          router.push('/user');
        }
      }
    } catch {
      router.push('/login');
    }
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      padding: '20px',
      textAlign: 'center'
    }}>
      <h1 style={{ marginBottom: '30px' }}>Recruitment Evaluation System</h1>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <a
          href="/login"
          style={{
            display: 'inline-block',
            padding: '15px 30px',
            backgroundColor: '#007bff',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '5px',
            fontSize: '16px',
            fontWeight: 'bold',
            transition: 'background-color 0.3s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
        >
          User Portal
        </a>
        <a
          href="/login?portal=staff"
          style={{
            display: 'inline-block',
            padding: '15px 30px',
            backgroundColor: '#28a745',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '5px',
            fontSize: '16px',
            fontWeight: 'bold',
            transition: 'background-color 0.3s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#218838'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#28a745'}
        >
          Staff Portal
        </a>
      </div>
    </div>
  );
}

