import { useState } from 'react';
import { useRouter } from 'next/router';
import api from '../utils/api';
import { storage } from '../utils/storage';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  // Check which port we're on
  const isStaffPort = typeof window !== 'undefined' && window.location.port === '3001';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    if (!name.trim()) {
      alert('Name is required');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        email,
        password,
        name: name.trim(),
      });
      
      // Auto login after registration
      storage.setItem('token', data.token);
      storage.setItem('role', data.user.role);
      storage.setItem('user', JSON.stringify(data.user));
      
      alert('Account created successfully!');
      
      // Redirect based on port
      if (isStaffPort) {
        alert('New users should use the user portal at http://localhost:3000');
        router.push('/login');
      } else {
        router.push('/user');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Registration failed';
      alert(`Registration failed: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
      <h1>Create New Account</h1>
      {isStaffPort && (
        <div style={{ padding: '10px', background: '#fff3cd', borderRadius: '4px', marginBottom: '20px', color: '#856404' }}>
          <p style={{ margin: '0', fontSize: '14px' }}>
            ⚠️ Staff accounts cannot be created here. Please use the user portal at http://localhost:3000 to create a new account.
          </p>
        </div>
      )}
      {!isStaffPort && (
        <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
          Create a new account with your email address
        </p>
      )}
      
      {!isStaffPort && (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: '100%', padding: '10px' }}
            />
            <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#999' }}>After registration, name cannot be modified.</p>
          </div>
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
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{ width: '100%', padding: '10px' }}
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '10px' }}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '10px', 
              marginBottom: '15px',
              backgroundColor: loading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      )}
      
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <p style={{ fontSize: '14px', color: '#666' }}>
          Already have an account?{' '}
          <a 
            href="/login" 
            style={{ color: '#007bff', textDecoration: 'none' }}
            onClick={(e) => {
              e.preventDefault();
              router.push('/login');
            }}
          >
            Login here
          </a>
        </p>
      </div>
    </div>
  );
}

