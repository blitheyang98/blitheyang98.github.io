import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import api from '../utils/api';
import { storage } from '../utils/storage';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isStaffPortal, setIsStaffPortal] = useState(false);
  const router = useRouter();
  
  // Check which portal we're on (client-side only)
  useEffect(() => {
    // For GitHub Pages, check query parameter
    const searchParams = new URLSearchParams(window.location.search);
    const portal = searchParams.get('portal');
    
    // For local development, check port
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isStaffPort = isLocalDev && window.location.port === '3001';
    
    // Staff portal if query param is 'staff' or port is 3001
    setIsStaffPortal(portal === 'staff' || isStaffPort);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/auth/login', { email, password });
      handleLoginSuccess(data);
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Login failed';
      alert(`Login failed: ${errorMsg}`);
    }
  };

  const handleLoginSuccess = (data: any) => {
    // Check if user is trying to access the wrong portal
    if (isStaffPortal && data.user.role !== 'staff' && data.user.role !== 'manager') {
      const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocalDev) {
        alert('This is the staff portal. Please use the user portal at http://localhost:3000');
      } else {
        alert('This is the staff portal. Please use the user portal.');
        router.push('/login');
      }
      return;
    }
    
    if (!isStaffPortal && (data.user.role === 'staff' || data.user.role === 'manager')) {
      const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocalDev) {
        alert('This is the user portal. Please use the staff portal at http://localhost:3001');
      } else {
        alert('This is the user portal. Please use the staff portal.');
        router.push('/login?portal=staff');
      }
      return;
    }
    
    storage.setItem('token', data.token);
    storage.setItem('role', data.user.role);
    storage.setItem('user', JSON.stringify(data.user));
    
    if (data.user.role === 'staff' || data.user.role === 'manager') {
      router.push('/staff');
    } else {
      router.push('/user');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
      <h1>{isStaffPortal ? 'Staff Login' : 'User Login / Sign Up'}</h1>
      {isStaffPortal ? (
        <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
          Staff Portal
        </p>
      ) : (
        <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
          User Portal<br />
          <span style={{ fontSize: '12px' }}>New users can sign up with email</span>
        </p>
      )}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '10px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '10px' }}
          />
        </div>
        <button type="submit" style={{ width: '100%', padding: '10px', marginBottom: '15px' }}>
          Login
        </button>
      </form>
      
      {!isStaffPortal && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Don't have an account?{' '}
            <a 
              href="/register" 
              style={{ color: '#007bff', textDecoration: 'none', fontWeight: 'bold' }}
              onClick={(e) => {
                e.preventDefault();
                router.push('/register');
              }}
            >
              Sign up with email
            </a>
          </p>
        </div>
      )}
    </div>
  );
}

