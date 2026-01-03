import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import api from '../utils/api';
import { storage } from '../utils/storage';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isStaffPort, setIsStaffPort] = useState(false);
  const router = useRouter();
  
  // Check which port we're on (client-side only)
  useEffect(() => {
    setIsStaffPort(window.location.port === '3001');
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
    if (isStaffPort && data.user.role !== 'staff' && data.user.role !== 'manager') {
      alert('This is the staff portal. Please use the user portal at http://localhost:3000');
      return;
    }
    
    if (!isStaffPort && (data.user.role === 'staff' || data.user.role === 'manager')) {
      alert('This is the user portal. Please use the staff portal at http://localhost:3001');
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
      <h1>{isStaffPort ? 'Staff Login' : 'User Login / Sign Up'}</h1>
      {isStaffPort ? (
        <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
          Staff Portal - Port 3001
        </p>
      ) : (
        <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
          User Portal - Port 3000<br />
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
      
      {!isStaffPort && (
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

