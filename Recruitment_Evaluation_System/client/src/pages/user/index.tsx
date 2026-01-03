import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import api from '../../utils/api';
import { storage } from '../../utils/storage';

export default function UserDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('virtual-run');
  const [runs, setRuns] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [formUrl, setFormUrl] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    email: '',
    newPassword: '',
    confirmPassword: '',
    currentPassword: '',
  });
  const [formData, setFormData] = useState({
    distance: '',
    duration: '',
    date: '',
    notes: '',
    image: null as File | null,
  });

  useEffect(() => {
    const token = storage.getItem('token');
    const userStr = storage.getItem('user');
    
    if (!token) {
      router.push('/login');
      return;
    }
    
    try {
      const user = userStr ? JSON.parse(userStr) : null;
      if (!user) {
        router.push('/login');
        return;
      }
      if (user.role === 'staff' || user.role === 'manager') {
        router.push('/staff');
        return;
      }
      setUserInfo(user);
      setEditForm({ ...editForm, email: user.email });
    } catch {
      router.push('/login');
      return;
    }
    
    loadData();
    
    // Cleanup EventSource on unmount or tab change
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [activeTab]);

  const loadData = async () => {
    try {
      if (activeTab === 'virtual-run') {
        const { data } = await api.get('/virtual-run/my-runs');
        setRuns(data.data);
      } else if (activeTab === 'quiz') {
        const { data: quizData } = await api.get('/quiz/questions');
        setQuizzes(quizData.data);
        const { data: attemptData } = await api.get('/quiz/my-attempts');
        // Load quiz details for each attempt to show answers
        const attemptsWithDetails = await Promise.all(
          attemptData.data.map(async (attempt: any) => {
            try {
              const { data: attemptWithAnswers } = await api.get(`/quiz/attempt-with-answers/${attempt.id}`);
              return { ...attempt, quizDetails: attemptWithAnswers.data };
            } catch (error) {
              console.error('Failed to load quiz details for attempt:', attempt.id);
              return attempt;
            }
          })
        );
        setAttempts(attemptsWithDetails);
      } else if (activeTab === 'google-form') {
        try {
          const [urlRes, submissionRes] = await Promise.all([
            api.get('/form-config/url'),
            api.get('/form/check-submission').catch(() => ({ data: { hasSubmitted: false } }))
          ]);
          setFormUrl(urlRes.data.data?.form_url || '');
          setHasSubmitted(submissionRes.data.hasSubmitted || false);
          setSubmittedAt(submissionRes.data.submittedAt || null);
          
          // If form is available and user hasn't submitted, connect to SSE for real-time updates
          if (urlRes.data.data?.form_url && !submissionRes.data.hasSubmitted) {
            // Close existing EventSource if any
            if (eventSourceRef.current) {
              eventSourceRef.current.close();
            }
            
            // Get token for SSE connection
            const token = storage.getItem('token');
            if (token) {
              // Get API base URL
              const getApiBaseUrl = () => {
                if (process.env.NEXT_PUBLIC_API_URL) {
                  return process.env.NEXT_PUBLIC_API_URL.replace('/api', '');
                }
                if (typeof window !== 'undefined') {
                  const origin = window.location.origin;
                  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
                    return 'http://localhost:5001';
                  }
                }
                return 'http://localhost:5001';
              };
              
              // Create SSE connection with token as query parameter
              // Note: EventSource doesn't support custom headers, so we use query parameter
              const eventSource = new EventSource(
                `${getApiBaseUrl()}/api/form/submission-status?token=${encodeURIComponent(token)}`
              );
              
              eventSource.onmessage = (event) => {
                try {
                  const data = JSON.parse(event.data);
                  if (data.hasSubmitted) {
                    // Immediately update UI when submission is detected
                    setHasSubmitted(true);
                    setSubmittedAt(data.submittedAt || null);
                    if (eventSourceRef.current) {
                      eventSourceRef.current.close();
                      eventSourceRef.current = null;
                    }
                  } else if (data.submissionDeleted) {
                    // Submission was deleted by staff/manager, allow user to resubmit
                    setHasSubmitted(false);
                    setSubmittedAt(null);
                    // Keep SSE connection open to monitor for new submissions
                    // No need to reconnect, connection is still active
                  }
                } catch (error) {
                  console.error('Error parsing SSE message:', error);
                }
              };
              
              eventSource.onerror = (error) => {
                console.error('SSE connection error:', error);
                eventSource.close();
                eventSourceRef.current = null;
              };
              
              eventSourceRef.current = eventSource;
            }
          } else {
            // If user has already submitted, close any existing EventSource
            if (eventSourceRef.current) {
              eventSourceRef.current.close();
              eventSourceRef.current = null;
            }
          }
        } catch (error) {
          console.error('Load form URL error:', error);
        }
      } else {
        // Close EventSource when switching to other tabs
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
      }
    } catch (error) {
      console.error('Load error:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData({ ...formData, image: e.target.files[0] });
    }
  };

  const handleSubmitRun = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('distance', formData.distance);
      formDataToSend.append('duration', formData.duration);
      formDataToSend.append('date', formData.date);
      formDataToSend.append('notes', formData.notes);
      if (formData.image) {
        formDataToSend.append('image', formData.image);
      }

      await api.post('/virtual-run/upload', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      alert('Virtual run uploaded successfully');
      setFormData({ distance: '', duration: '', date: '', notes: '', image: null });
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Upload failed');
    }
  };

  const handleQuizSubmit = async (quizId: number, answers: any) => {
    try {
      const response = await api.post('/quiz/submit', { quiz_id: quizId, answers });
      alert('Quiz submitted successfully! You can now view the answers below.');
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Submit failed');
    }
  };

  const handleLogout = () => {
    storage.clear();
    router.push('/login');
  };

  const handleOpenEditModal = () => {
    const userStr = storage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setEditForm({
        email: user.email || '',
        newPassword: '',
        confirmPassword: '',
        currentPassword: '',
      });
    }
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditForm({
      email: userInfo?.email || '',
      newPassword: '',
      confirmPassword: '',
      currentPassword: '',
    });
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (editForm.newPassword && editForm.newPassword.length < 6) {
      alert('New password must be at least 6 characters');
      return;
    }
    
    if (editForm.newPassword && editForm.newPassword !== editForm.confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    
    if (editForm.newPassword && !editForm.currentPassword) {
      alert('Current password is required to change password');
      return;
    }

    try {
      const updateData: any = {};
      if (editForm.email && editForm.email !== userInfo?.email) {
        updateData.email = editForm.email;
      }
      if (editForm.newPassword) {
        updateData.password = editForm.newPassword;
        updateData.currentPassword = editForm.currentPassword;
      }
      
      if (Object.keys(updateData).length === 0) {
        alert('No changes to save');
        return;
      }

      const { data } = await api.put('/auth/update-profile', updateData);
      
      // Update local storage
      if (data.token) {
        storage.setItem('token', data.token);
      }
      storage.setItem('user', JSON.stringify(data.user));
      setUserInfo(data.user);
      
      alert('Profile updated successfully!');
      handleCloseEditModal();
    } catch (error: any) {
      console.error('Update profile error:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Update failed';
      alert(`Update failed: ${errorMsg}`);
    }
  };

  return (
    <div style={{ padding: '20px', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
      <div style={{ 
        background: '#fff',
        borderRadius: '16px',
        padding: '30px',
        marginBottom: '30px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e0e0e0'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '24px',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                flexShrink: 0
              }}>
                {userInfo?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
        <div>
                <h1 style={{ 
                  margin: '0 0 8px 0', 
                  fontSize: '32px', 
                  fontWeight: '700',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  User Dashboard
                </h1>
          {userInfo && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      background: '#f8f9fa',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#495057'
                    }}>
                      <span>🆔</span>
                      <span><strong>ID:</strong> {userInfo.id}</span>
                    </div>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      background: '#f8f9fa',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#495057'
                    }}>
                      <span>✉️</span>
                      <span>{userInfo.email}</span>
                    </div>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      background: '#f8f9fa',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#495057'
                    }}>
                      <span>👤</span>
                      <span>{userInfo.name}</span>
                    </div>
                  </div>
          )}
        </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
            <button 
              onClick={handleOpenEditModal} 
              style={{ 
                padding: '12px 24px',
                backgroundColor: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#5568d3';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#667eea';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
              }}
            >
              <span>✏️</span>
            Edit Profile
          </button>
            <button 
              onClick={handleLogout}
              style={{ 
                padding: '12px 24px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(220, 53, 69, 0.3)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#c82333';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#dc3545';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(220, 53, 69, 0.3)';
              }}
            >
              <span>🚪</span>
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2>Edit Profile</h2>
              <button onClick={handleCloseEditModal} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>
                ×
              </button>
            </div>
            
            {userInfo && (
              <div style={{ marginBottom: '15px', padding: '10px', background: '#f5f5f5', borderRadius: '4px' }}>
                <p style={{ margin: '5px 0' }}><strong>User ID:</strong> {userInfo.id} (Never Change)</p>
                <p style={{ margin: '5px 0' }}><strong>Current Name:</strong> {userInfo.name}</p>
              </div>
            )}
            
            <form onSubmit={handleUpdateProfile}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email:</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Current Password (required to change password):</label>
                <input
                  type="password"
                  value={editForm.currentPassword}
                  onChange={(e) => setEditForm({ ...editForm, currentPassword: e.target.value })}
                  placeholder="Enter current password to change password"
                  style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>New Password (leave blank to keep current):</label>
                <input
                  type="password"
                  value={editForm.newPassword}
                  onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                  placeholder="Min 6 characters"
                  minLength={6}
                  style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Confirm New Password:</label>
                <input
                  type="password"
                  value={editForm.confirmPassword}
                  onChange={(e) => setEditForm({ ...editForm, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                  style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={handleCloseEditModal} style={{ padding: '10px 20px' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ 
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: '#fff',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '30px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e0e0e0',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setActiveTab('virtual-run')}
            style={{
              padding: '12px 24px',
              backgroundColor: activeTab === 'virtual-run' ? '#667eea' : '#f8f9fa',
              color: activeTab === 'virtual-run' ? 'white' : '#495057',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: activeTab === 'virtual-run' ? '0 2px 8px rgba(102, 126, 234, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'virtual-run') {
                e.currentTarget.style.backgroundColor = '#e9ecef';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseOut={(e) => {
              if (activeTab !== 'virtual-run') {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            <span>🏃</span>
            Virtual Run
          </button>
          <button 
            onClick={() => setActiveTab('quiz')}
            style={{
              padding: '12px 24px',
              backgroundColor: activeTab === 'quiz' ? '#667eea' : '#f8f9fa',
              color: activeTab === 'quiz' ? 'white' : '#495057',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: activeTab === 'quiz' ? '0 2px 8px rgba(102, 126, 234, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'quiz') {
                e.currentTarget.style.backgroundColor = '#e9ecef';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseOut={(e) => {
              if (activeTab !== 'quiz') {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            <span>📝</span>
            Quiz
          </button>
          <button 
            onClick={() => setActiveTab('google-form')}
            style={{
              padding: '12px 24px',
              backgroundColor: activeTab === 'google-form' ? '#667eea' : '#f8f9fa',
              color: activeTab === 'google-form' ? 'white' : '#495057',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: activeTab === 'google-form' ? '0 2px 8px rgba(102, 126, 234, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'google-form') {
                e.currentTarget.style.backgroundColor = '#e9ecef';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseOut={(e) => {
              if (activeTab !== 'google-form') {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            <span>📋</span>
            Google Form
          </button>
        </div>
      </div>

      {activeTab === 'virtual-run' && (
        <div style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '30px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e0e0e0'
        }}>
          <div style={{ 
            marginBottom: '30px', 
            paddingBottom: '20px', 
            borderBottom: '2px solid #e0e0e0' 
          }}>
            <h2 style={{ 
              margin: '0 0 10px 0', 
              fontSize: '28px', 
              fontWeight: '600', 
              color: '#2c3e50',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '32px' }}>🏃</span>
              Virtual Run
            </h2>
            <p style={{ margin: '0', color: '#7f8c8d', fontSize: '14px' }}>
              Upload and track your virtual running records
            </p>
          </div>

          <div style={{ 
            border: '1px solid #e0e0e0', 
            padding: '30px', 
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            marginBottom: '40px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
          }}>
            <h3 style={{ 
              margin: '0 0 20px 0', 
              fontSize: '22px', 
              fontWeight: '600',
              color: '#2c3e50',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span>📤</span>
              Upload New Run
            </h3>
            <form onSubmit={handleSubmitRun}>
              <div style={{ 
                marginBottom: '20px',
                padding: '20px',
                background: '#fff',
                borderRadius: '8px',
                border: '2px dashed #ddd',
                textAlign: 'center',
                transition: 'all 0.3s ease'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>📷</div>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                  style={{ 
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                />
                {formData.image && (
                  <p style={{ margin: '10px 0 0 0', fontSize: '14px', color: '#28a745' }}>
                    ✓ {formData.image.name}
                  </p>
                )}
            </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '15px',
                marginBottom: '20px'
              }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '600',
                    color: '#495057',
                    fontSize: '14px'
                  }}>
                    📏 Distance (km)
                  </label>
              <input
                type="number"
                    placeholder="e.g., 5.0"
                value={formData.distance}
                onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
                    step="0.1"
                    min="0"
                    style={{ 
                      width: '100%', 
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '14px',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#667eea';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#ddd';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
              />
            </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '600',
                    color: '#495057',
                    fontSize: '14px'
                  }}>
                    ⏱️ Duration (minutes)
                  </label>
              <input
                type="number"
                    placeholder="e.g., 30"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    min="0"
                    style={{ 
                      width: '100%', 
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '14px',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#667eea';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#ddd';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
              />
            </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '600',
                    color: '#495057',
                    fontSize: '14px'
                  }}>
                    📅 Date
                  </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    style={{ 
                      width: '100%', 
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '14px',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#667eea';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#ddd';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
              />
            </div>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  color: '#495057',
                  fontSize: '14px'
                }}>
                  📝 Notes (optional)
                </label>
              <textarea
                  placeholder="Add any notes about your run..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  style={{ 
                    width: '100%', 
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#667eea';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#ddd';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
              />
            </div>
              
              <button 
                type="submit"
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  backgroundColor: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#5568d3';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#667eea';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
                }}
              >
                <span>🚀</span>
                Upload Run
              </button>
          </form>
          </div>

          <div style={{ 
            marginTop: '40px',
            paddingTop: '30px',
            borderTop: '2px solid #e0e0e0'
          }}>
            <h3 style={{ 
              margin: '0 0 20px 0', 
              fontSize: '22px', 
              fontWeight: '600',
              color: '#2c3e50',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span>📊</span>
              My Virtual Runs ({runs.length})
            </h3>

            {runs.length === 0 ? (
              <div style={{ 
                padding: '60px 20px', 
                textAlign: 'center', 
                border: '2px dashed #ddd', 
                borderRadius: '12px', 
                background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{ fontSize: '64px', marginBottom: '20px' }}>🏃‍♂️</div>
                <p style={{ fontSize: '20px', color: '#2c3e50', fontWeight: '500', marginBottom: '10px' }}>
                  No runs yet
                </p>
                <p style={{ fontSize: '15px', color: '#7f8c8d', marginTop: '10px', maxWidth: '600px', margin: '10px auto' }}>
                  Upload your first virtual run to get started!
                </p>
              </div>
            ) : (
              <div style={{ 
                display: 'grid', 
                gap: '20px',
                gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))'
              }}>
            {runs.map((run: any) => (
                  <div 
                    key={run.id} 
                    style={{ 
                      border: '1px solid #e0e0e0', 
                      padding: '24px', 
                      borderRadius: '12px',
                      background: '#fff',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.12)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
                    }}></div>
                    
                    {run.image_url ? (
                      <div style={{
                        width: '100%',
                        height: '200px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        marginBottom: '16px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                        background: '#f0f0f0'
                      }}>
                        <img 
                          src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5001'}${run.image_url}`} 
                          alt="Run" 
                          style={{ 
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }} 
                        />
                      </div>
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '200px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '16px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                      }}>
                        <span style={{ fontSize: '64px' }}>🏃</span>
                      </div>
                )}

                    <div style={{
                      padding: '16px',
                      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                      borderRadius: '8px',
                      marginBottom: '16px',
                      border: '1px solid #e9ecef'
                    }}>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '12px'
                      }}>
                        <div>
                          <div style={{
                            fontSize: '12px',
                            color: '#6c757d',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '4px'
                          }}>
                            Distance
                          </div>
                          <div style={{
                            fontSize: '20px',
                            fontWeight: '600',
                            color: '#495057',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <span>📏</span>
                            {run.distance} km
                          </div>
                        </div>
                        <div>
                          <div style={{
                            fontSize: '12px',
                            color: '#6c757d',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '4px'
                          }}>
                            Duration
                          </div>
                          <div style={{
                            fontSize: '20px',
                            fontWeight: '600',
                            color: '#495057',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <span>⏱️</span>
                            {run.duration} min
                          </div>
                        </div>
                      </div>
                    </div>

                    {run.date && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '12px',
                        padding: '8px 12px',
                        background: '#fff',
                        borderRadius: '6px',
                        border: '1px solid #e9ecef'
                      }}>
                        <span style={{ fontSize: '16px' }}>📅</span>
                        <span style={{ fontSize: '14px', color: '#495057', fontWeight: '500' }}>
                          {run.date}
                        </span>
                      </div>
                    )}

                    {run.notes && (
                      <div style={{
                        marginBottom: '12px',
                        padding: '12px',
                        background: '#fff',
                        borderRadius: '6px',
                        border: '1px solid #e9ecef'
                      }}>
                        <div style={{
                          fontSize: '12px',
                          color: '#6c757d',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          marginBottom: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <span>📝</span>
                          Notes
                        </div>
                        <p style={{
                          margin: '0',
                          fontSize: '14px',
                          color: '#495057',
                          lineHeight: '1.6',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}>
                          {run.notes}
                        </p>
                      </div>
                    )}

                    <div style={{
                      paddingTop: '12px',
                      borderTop: '1px solid #f0f0f0',
                      fontSize: '12px',
                      color: '#95a5a6',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span>🕒</span>
                      Submitted: {new Date(run.created_at).toLocaleString()}
                    </div>
              </div>
            ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'quiz' && (
        <div style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '30px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e0e0e0'
        }}>
          <div style={{ 
            marginBottom: '30px', 
            paddingBottom: '20px', 
            borderBottom: '2px solid #e0e0e0' 
          }}>
            <h2 style={{ 
              margin: '0 0 10px 0', 
              fontSize: '28px', 
              fontWeight: '600', 
              color: '#2c3e50',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '32px' }}>📝</span>
              Quiz Practice
            </h2>
            <p style={{ margin: '0', color: '#7f8c8d', fontSize: '14px' }}>
              Take quizzes to test your knowledge and track your progress
            </p>
          </div>

          {quizzes.length === 0 ? (
            <div style={{ 
              padding: '60px 20px', 
              textAlign: 'center', 
              border: '2px dashed #ddd', 
              borderRadius: '12px', 
              background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
              marginBottom: '40px'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>📚</div>
              <p style={{ fontSize: '20px', color: '#2c3e50', fontWeight: '500', marginBottom: '10px' }}>
                No quizzes available
              </p>
              <p style={{ fontSize: '15px', color: '#7f8c8d', marginTop: '10px', maxWidth: '600px', margin: '10px auto' }}>
                Quizzes will appear here once they are created by administrators.
              </p>
            </div>
          ) : (
            quizzes.map((quiz: any) => (
              <div 
                key={quiz.id} 
                style={{ 
                  border: '1px solid #e0e0e0', 
                  padding: '30px', 
                  marginBottom: '30px',
                  borderRadius: '12px',
                  background: '#fff',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
                }}></div>

                <div style={{ marginBottom: '25px' }}>
                  <h3 style={{ 
                    margin: '0 0 5px 0', 
                    fontSize: '24px', 
                    fontWeight: '600',
                    color: '#2c3e50',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <span>📋</span>
                    {quiz.title || `Quiz ${quiz.id}`}
                  </h3>
                  <p style={{ margin: '0', color: '#7f8c8d', fontSize: '14px' }}>
                    {quiz.questions?.length || 0} question{quiz.questions?.length !== 1 ? 's' : ''}
                  </p>
                </div>

                <div style={{ marginBottom: '25px' }}>
              {quiz.questions?.map((q: any, idx: number) => (
                    <div 
                      key={idx} 
                      style={{ 
                        marginBottom: '25px',
                        padding: '20px',
                        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                        borderRadius: '8px',
                        border: '1px solid #e9ecef'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        marginBottom: '15px'
                      }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '600',
                          fontSize: '14px',
                          flexShrink: 0
                        }}>
                          {idx + 1}
                        </div>
                        <p style={{ 
                          margin: '0', 
                          fontSize: '16px', 
                          fontWeight: '600',
                          color: '#2c3e50',
                          flex: 1
                        }}>
                          {q.question}
                        </p>
                      </div>

                  {q.type === 'text' ? (
                    <input
                      type="text"
                      name={`quiz-${quiz.id}-q-${idx}`}
                          placeholder="Enter your answer..."
                          style={{ 
                            width: '100%', 
                            padding: '12px',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            fontSize: '14px',
                            transition: 'all 0.2s ease'
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = '#667eea';
                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = '#ddd';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                    />
                  ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {q.options?.map((opt: string, optIdx: number) => (
                            <label 
                              key={optIdx} 
                              style={{ 
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px',
                                background: '#fff',
                                border: '2px solid #e9ecef',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#667eea';
                                e.currentTarget.style.background = '#f8f9ff';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#e9ecef';
                                e.currentTarget.style.background = '#fff';
                              }}
                            >
                              <input 
                                type="radio" 
                                name={`quiz-${quiz.id}-q-${idx}`} 
                                value={optIdx}
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  cursor: 'pointer'
                                }}
                              />
                              <span style={{ fontSize: '14px', color: '#495057' }}>{opt}</span>
                      </label>
                          ))}
                        </div>
                  )}
                </div>
              ))}
                </div>

                <button 
                  onClick={() => {
                const answers: any = {};
                quiz.questions?.forEach((q: any, idx: number) => {
                  if (q.type === 'text') {
                    const input = document.querySelector(`input[name="quiz-${quiz.id}-q-${idx}"]`) as HTMLInputElement;
                    if (input && input.value) {
                      answers[idx] = { answer: input.value, correct: false };
                    }
                  } else {
                    const selected = document.querySelector(`input[name="quiz-${quiz.id}-q-${idx}"]:checked`) as HTMLInputElement;
                    if (selected) {
                      answers[idx] = { answer: parseInt(selected.value), correct: parseInt(selected.value) === q.correct };
                    }
                  }
                });
                handleQuizSubmit(quiz.id, answers);
                  }}
                  style={{
                    width: '100%',
                    padding: '14px 24px',
                    backgroundColor: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#5568d3';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#667eea';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
                  }}
                >
                  <span>🚀</span>
                  Submit Quiz
                </button>
            </div>
            ))
          )}

          <div style={{ 
            marginTop: '50px',
            paddingTop: '30px',
            borderTop: '2px solid #e0e0e0'
          }}>
            <h3 style={{ 
              margin: '0 0 20px 0', 
              fontSize: '22px', 
              fontWeight: '600',
              color: '#2c3e50',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span>📊</span>
              My Quiz Attempts ({attempts.length})
            </h3>

            {attempts.length === 0 ? (
              <div style={{ 
                padding: '60px 20px', 
                textAlign: 'center', 
                border: '2px dashed #ddd', 
                borderRadius: '12px', 
                background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{ fontSize: '64px', marginBottom: '20px' }}>📝</div>
                <p style={{ fontSize: '20px', color: '#2c3e50', fontWeight: '500', marginBottom: '10px' }}>
                  No attempts yet
                </p>
                <p style={{ fontSize: '15px', color: '#7f8c8d', marginTop: '10px', maxWidth: '600px', margin: '10px auto' }}>
                  Complete a quiz to see your results here!
                </p>
              </div>
            ) : (
              <div style={{ 
                display: 'grid', 
                gap: '20px',
                gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))'
              }}>
                {attempts.map((attempt: any) => {
                  const scoreColor = attempt.score >= 70 ? '#28a745' : attempt.score >= 50 ? '#ffc107' : '#dc3545';
                  const scoreBg = attempt.score >= 70 ? '#d4edda' : attempt.score >= 50 ? '#fff3cd' : '#f8d7da';
                  
                  return (
                    <div 
                      key={attempt.id} 
                      style={{ 
                        border: '1px solid #e0e0e0', 
                        padding: '24px', 
                        borderRadius: '12px',
                        background: '#fff',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.12)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: `linear-gradient(90deg, ${scoreColor} 0%, ${scoreColor}dd 100%)`
                      }}></div>

                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '20px'
                      }}>
          <div>
                          <div style={{
                            fontSize: '12px',
                            color: '#6c757d',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '6px'
                          }}>
                            Quiz ID
              </div>
                          <div style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            color: '#2c3e50'
                          }}>
                            #{attempt.quiz_id}
                          </div>
                        </div>
                        <div style={{
                          padding: '12px 20px',
                          background: scoreBg,
                          borderRadius: '8px',
                          border: `2px solid ${scoreColor}`
                        }}>
                          <div style={{
                            fontSize: '12px',
                            color: '#6c757d',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '4px'
                          }}>
                            Score
                          </div>
                          <div style={{
                            fontSize: '28px',
                            fontWeight: '700',
                            color: scoreColor
                          }}>
                            {attempt.score}%
                          </div>
                        </div>
                      </div>

                      <div style={{
                        paddingTop: '16px',
                        borderTop: '1px solid #f0f0f0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        color: '#95a5a6'
                      }}>
                        <span>🕒</span>
                        Completed: {new Date(attempt.completed_at).toLocaleString()}
                      </div>

                      {attempt.quizDetails && attempt.quizDetails.quiz_questions && (
                        <div style={{
                          marginTop: '20px',
                          paddingTop: '20px',
                          borderTop: '2px solid #e0e0e0'
                        }}>
                          <h4 style={{
                            margin: '0 0 16px 0',
                            fontSize: '18px',
                            fontWeight: '600',
                            color: '#2c3e50',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <span>💬</span>
                            Answers & Results
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {attempt.quizDetails.quiz_questions.map((q: any, qIdx: number) => {
                              const answerData = attempt.answers[qIdx];
                              const isCorrect = answerData?.correct || false;
                              const answerValue = answerData?.answer;

                              let displayAnswer = '';
                              if (q.type === 'text') {
                                displayAnswer = String(answerValue || 'No answer');
                              } else if (q.type === 'choice' && Array.isArray(q.options)) {
                                const optionIdx = typeof answerValue === 'number' ? answerValue : parseInt(answerValue);
                                displayAnswer = q.options[optionIdx] || `Option ${optionIdx}`;
                              } else {
                                displayAnswer = String(answerValue || 'No answer');
                              }

                              // Get correct answer
                              let correctAnswer = '';
                              let hasCorrectAnswer = false;
                              if (q.type === 'choice' && Array.isArray(q.options)) {
                                correctAnswer = q.options[q.correct] || `Option ${q.correct}`;
                                hasCorrectAnswer = true;
                              } else if (q.type === 'text' && q.correctAnswer) {
                                // Text type with stored correct answer
                                correctAnswer = q.correctAnswer;
                                hasCorrectAnswer = true;
                              } else if (q.type === 'text' && q.correct && typeof q.correct === 'string') {
                                // Text type with correct answer stored in correct field
                                correctAnswer = q.correct;
                                hasCorrectAnswer = true;
                              }

                              return (
                                <div 
                                  key={qIdx} 
                                  style={{ 
                                    padding: '16px', 
                                    background: isCorrect ? '#d4edda' : '#f8d7da',
                                    border: `2px solid ${isCorrect ? '#c3e6cb' : '#f5c6cb'}`,
                                    borderRadius: '8px',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateX(4px)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateX(0)';
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '16px' }}>
                                    <div style={{ flex: 1 }}>
                                      <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        marginBottom: '10px'
                                      }}>
                                        <div style={{
                                          width: '28px',
                                          height: '28px',
                                          borderRadius: '50%',
                                          background: isCorrect ? '#28a745' : '#dc3545',
                                          color: 'white',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontWeight: '600',
                                          fontSize: '12px',
                                          flexShrink: 0
                                        }}>
                                          {qIdx + 1}
                                        </div>
                                        <p style={{ margin: '0', fontWeight: '600', fontSize: '15px', color: '#2c3e50' }}>
                                          {q.question}
                                        </p>
                                      </div>
                                      {!isCorrect && (
                                        <p style={{ margin: '8px 0 0 0', color: '#495057', fontSize: '14px' }}>
                                          <strong>Your Answer:</strong> {displayAnswer}
                                        </p>
                                      )}
                                      {!isCorrect && hasCorrectAnswer && (
                                        <p style={{ margin: '6px 0 0 0', color: '#721c24', fontSize: '13px', fontWeight: '500' }}>
                                          <strong>Correct Answer:</strong> {correctAnswer}
                                        </p>
                                      )}
                                    </div>
                                    <div style={{ 
                                      padding: '6px 12px', 
                                      borderRadius: '6px',
                                      background: isCorrect ? '#28a745' : '#dc3545',
                                      color: 'white',
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      whiteSpace: 'nowrap',
                                      flexShrink: 0
                                    }}>
                                      {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'google-form' && (
        <div style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '30px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e0e0e0'
        }}>
          <div style={{ 
            marginBottom: '30px', 
            paddingBottom: '20px', 
            borderBottom: '2px solid #e0e0e0' 
          }}>
            <h2 style={{ 
              margin: '0 0 10px 0', 
              fontSize: '28px', 
              fontWeight: '600', 
              color: '#2c3e50',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '32px' }}>📋</span>
              Google Form
            </h2>
            <p style={{ margin: '0', color: '#7f8c8d', fontSize: '14px' }}>
              Complete the form below to submit your information
            </p>
          </div>
          {hasSubmitted ? (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              color: 'white',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              marginTop: '20px'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>✅</div>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '24px', fontWeight: '600' }}>
                Form Already Submitted
              </h3>
              <p style={{ margin: '0 0 10px 0', fontSize: '16px', opacity: 0.9 }}>
                You have already submitted this form.
              </p>
              {submittedAt && (
                <p style={{ margin: '0', fontSize: '14px', opacity: 0.8 }}>
                  Submitted on: {new Date(submittedAt).toLocaleString()}
                </p>
              )}
              <p style={{ margin: '20px 0 0 0', fontSize: '14px', opacity: 0.8 }}>
                If you need to make changes, please contact the administrator.
              </p>
            </div>
          ) : formUrl ? (
            <div style={{ marginTop: '20px' }}>
              <div style={{ 
                padding: '15px', 
                background: '#fff3cd', 
                border: '1px solid #ffc107', 
                borderRadius: '8px',
                marginBottom: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span style={{ fontSize: '20px' }}>⚠️</span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 5px 0', fontWeight: '600', color: '#856404' }}>
                    Important Notice
                  </p>
                  <p style={{ margin: '0', fontSize: '14px', color: '#856404' }}>
                    After submitting the form, the page will automatically detect your submission. 
                    You will not be able to submit again.
                  </p>
                </div>
              </div>
              <div style={{ width: '100%', height: '800px' }}>
              <iframe
                src={formUrl}
                width="100%"
                height="100%"
                frameBorder="0"
                marginHeight={0}
                marginWidth={0}
                style={{ border: '1px solid #ccc', borderRadius: '4px' }}
                title="Google Form"
              >
                Loading…
              </iframe>
              </div>
            </div>
          ) : (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center',
              background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
              marginTop: '20px'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>📋</div>
              <p style={{ fontSize: '18px', color: '#2c3e50', fontWeight: '500', margin: '0' }}>
                No Google Form configured. Please contact administrator.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

