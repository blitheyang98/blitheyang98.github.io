import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import api from '../../utils/api';
import { storage } from '../../utils/storage';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Pie, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function StaffDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('virtual-runs');
  const [virtualRuns, setVirtualRuns] = useState<any[]>([]);
  const [formSubmissions, setFormSubmissions] = useState<any[]>([]);
  const [allFormSubmissions, setAllFormSubmissions] = useState<any[]>([]);
  const [activeFormTab, setActiveFormTab] = useState<string | null>(null);
  const [previewFormUrl, setPreviewFormUrl] = useState<string | null>(null);
  const [quizAttempts, setQuizAttempts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [editingQuiz, setEditingQuiz] = useState<any>(null);
  const [quizForm, setQuizForm] = useState({ title: '', questions: [] as any[] });
  const [formConfig, setFormConfig] = useState<any>(null);
  const [allFormConfigs, setAllFormConfigs] = useState<any[]>([]);
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formId, setFormId] = useState('');
  const [tunnelmoleUrl, setTunnelmoleUrl] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    email: '',
    newPassword: '',
    confirmPassword: '',
    currentPassword: '',
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
      if (!user || (user.role !== 'staff' && user.role !== 'manager')) {
        router.push('/user');
        return;
      }
      setCurrentUser(user);
    } catch {
      router.push('/login');
      return;
    }
    
    loadData();
  }, [activeTab]);
  
  useEffect(() => {
    if (activeTab === 'forms' && allFormSubmissions.length > 0 && allFormConfigs.length > 0) {
      if (activeFormTab && activeFormTab !== 'all') {
        // Find the config that matches activeFormTab (using config.id as identifier)
        const config = allFormConfigs.find((c: any) => c.id.toString() === activeFormTab);
        if (config) {
          setFormSubmissions(allFormSubmissions.filter((s: any) => matchesFormConfig(s, config)));
        } else {
          setFormSubmissions([]);
        }
      } else {
        setFormSubmissions(allFormSubmissions);
      }
    }
  }, [activeFormTab, allFormSubmissions, activeTab, allFormConfigs]);

  const loadData = async () => {
    try {
      if (activeTab === 'virtual-runs') {
        const { data } = await api.get('/staff/virtual-runs');
        setVirtualRuns(data.data);
      } else if (activeTab === 'forms') {
        try {
          const [submissionsRes, configsRes] = await Promise.all([
            api.get('/form/submissions'),
            api.get('/form-config/all-configs')
          ]);
          const allSubmissions = submissionsRes.data.data || [];
          const allConfigs = configsRes.data.data || [];
          
          setAllFormSubmissions(allSubmissions);
          setAllFormConfigs(allConfigs);
          
          // Set active tab to 'all' if not set (show all submissions by default)
          if (!activeFormTab) {
            setActiveFormTab('all');
          }
          
          // Filter submissions by active form tab
          if (activeFormTab && activeFormTab !== 'all') {
            const config = allConfigs.find((c: any) => c.id.toString() === activeFormTab);
            if (config) {
              setFormSubmissions(allSubmissions.filter((s: any) => matchesFormConfig(s, config)));
            } else {
              setFormSubmissions([]);
            }
          } else {
            // Show all submissions when activeFormTab is 'all' or null
            setFormSubmissions(allSubmissions);
          }
        } catch (error: any) {
          console.error('Load form submissions error:', error);
          setFormSubmissions([]);
          setAllFormSubmissions([]);
        }
      } else if (activeTab === 'quizzes') {
        try {
          const [attemptsRes, quizzesRes] = await Promise.all([
            api.get('/quiz/all-attempts'),
            api.get('/quiz/questions')
          ]);
          setQuizAttempts(attemptsRes.data.data || []);
          setQuizzes(quizzesRes.data.data || []);
        } catch (error: any) {
          console.error('Load quiz attempts error:', error);
          setQuizAttempts([]);
        }
      } else if (activeTab === 'users') {
        const { data } = await api.get('/staff/users');
        setUsers(data.data);
        
        // Update currentUser if their info is in the users list
        if (currentUser) {
          const updatedUserInfo = data.data.find((u: any) => u.id === currentUser.id);
          if (updatedUserInfo && updatedUserInfo.role !== currentUser.role) {
            const updatedUser = { ...currentUser, role: updatedUserInfo.role };
            storage.setItem('user', JSON.stringify(updatedUser));
            storage.setItem('role', updatedUserInfo.role);
            setCurrentUser(updatedUser);
          }
        }
      } else if (activeTab === 'manage-quizzes') {
        const { data } = await api.get('/quiz/questions');
        setQuizzes(data.data);
      } else if (activeTab === 'form-config') {
        const [configRes, allConfigsRes, runtimeConfigRes] = await Promise.all([
          api.get('/form-config/config'),
          api.get('/form-config/all-configs'),
          api.get('/form-config/runtime-config').catch(() => ({ data: { success: false } })) // Optional, don't fail if unavailable
        ]);
        setFormConfig(configRes.data.data);
        setAllFormConfigs(allConfigsRes.data.data || []);
        if (runtimeConfigRes.data.success && runtimeConfigRes.data.data?.tunnelmole_url) {
          setTunnelmoleUrl(runtimeConfigRes.data.data.tunnelmole_url);
        }
        if (configRes.data.data) {
          setFormName(configRes.data.data.form_name || '');
          setFormUrl(configRes.data.data.form_url || '');
          setFormId(configRes.data.data.google_form_id || '');
        } else {
          setFormName('');
          setFormUrl('');
          setFormId('');
        }
      }
    } catch (error) {
      console.error('Load error:', error);
    }
  };

  const handleLogout = () => {
    storage.clear();
    router.push('/login');
  };

  const validateGoogleFormUrl = (url: string): boolean => {
    if (!url || !url.trim()) {
      return false;
    }
    
    // Google Form URL patterns
    const patterns = [
      /^https:\/\/forms\.gle\/[a-zA-Z0-9_-]+$/i,  // https://forms.gle/xxxxx
      /^https:\/\/docs\.google\.com\/forms\/d\/e\/[a-zA-Z0-9_-]+\/viewform(\?.*)?$/i,  // https://docs.google.com/forms/d/e/xxxxx/viewform
      /^https:\/\/docs\.google\.com\/forms\/d\/[a-zA-Z0-9_-]+\/edit(\?.*)?$/i,  // https://docs.google.com/forms/d/xxxxx/edit
      /^https:\/\/docs\.google\.com\/forms\/d\/e\/[a-zA-Z0-9_-]+\/viewform\?embedded=true$/i,  // https://docs.google.com/forms/d/e/xxxxx/viewform?embedded=true
    ];
    
    return patterns.some(pattern => pattern.test(url.trim()));
  };

  const matchesFormConfig = (submission: any, config: any): boolean => {
    // Simple match: compare google_form_id from submission with google_form_id from config
    if (submission.google_form_id && config.google_form_id && 
        submission.google_form_id === config.google_form_id) {
      return true;
    }
    
    return false;
  };

  const downloadFormSubmissionsAsCSV = (submissions: any[], formName: string = 'All Forms') => {
    if (submissions.length === 0) {
      alert('No submissions to download');
      return;
    }

    // Collect all unique keys from all submissions
    const allKeys = new Set<string>();
    submissions.forEach((submission: any) => {
      const submissionData = typeof submission.submission_data === 'string' 
        ? JSON.parse(submission.submission_data) 
        : submission.submission_data;
      Object.keys(submissionData).forEach(key => allKeys.add(key));
    });

    // Standard fields
    const standardFields = ['User Name', 'User Email', 'Form ID', 'Submitted At'];
    const dataFields = Array.from(allKeys).sort();
    const headers = [...standardFields, ...dataFields];

    // Build CSV rows
    const rows = submissions.map((submission: any) => {
      const submissionData = typeof submission.submission_data === 'string' 
        ? JSON.parse(submission.submission_data) 
        : submission.submission_data;
      
      const row = [
        submission.name || '',
        submission.email || '',
        submission.google_form_id || '',
        new Date(submission.submitted_at).toLocaleString()
      ];
      
      dataFields.forEach(key => {
        const value = submissionData[key];
        // Escape CSV values (handle commas, quotes, newlines)
        const escapedValue = value != null ? String(value).replace(/"/g, '""') : '';
        row.push(`"${escapedValue}"`);
      });
      
      return row.join(',');
    });

    // Combine headers and rows
    const csvContent = [headers.join(','), ...rows].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${formName}_submissions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      email: currentUser?.email || '',
      newPassword: '',
      confirmPassword: '',
      currentPassword: '',
    });
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Staff cannot change password & email
    if (currentUser?.role === 'staff') {
      if (editForm.newPassword) {
        alert('Staff cannot change password');
        return;
      }
      if (editForm.email && editForm.email !== currentUser?.email) {
        alert('Staff cannot change email');
        return;
      }
    }
    
    // Validation for manager
    if (currentUser?.role === 'manager') {
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
    }

    try {
      const updateData: any = {};
      if (editForm.email && editForm.email !== currentUser?.email) {
        updateData.email = editForm.email;
      }
      if (editForm.newPassword && currentUser?.role !== 'staff') {
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
      setCurrentUser(data.user);
      
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
                background: currentUser?.role === 'manager' 
                  ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                  : 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '24px',
                boxShadow: currentUser?.role === 'manager'
                  ? '0 4px 12px rgba(245, 87, 108, 0.3)'
                  : '0 4px 12px rgba(168, 237, 234, 0.3)',
                flexShrink: 0
              }}>
                {currentUser?.name?.charAt(0)?.toUpperCase() || 'S'}
              </div>
              <div>
                <h1 style={{ 
                  margin: '0 0 8px 0', 
                  fontSize: '32px', 
                  fontWeight: '700',
                  background: currentUser?.role === 'manager'
                    ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                    : 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  Staff Dashboard
                </h1>
                {currentUser && (
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
                      <span><strong>ID:</strong> {currentUser.id} (Never Change)</span>
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
                      <span>{currentUser.email}</span>
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
                      <span>{currentUser.name}</span>
                    </div>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      background: currentUser.role === 'manager' ? '#fff3cd' : '#d1ecf1',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: currentUser.role === 'manager' ? '#856404' : '#0c5460',
                      fontWeight: '600'
                    }}>
                      <span>{currentUser.role === 'manager' ? '👑' : '👨‍💼'}</span>
                      <span>{currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}</span>
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
            
            {currentUser && (
              <div style={{ marginBottom: '15px', padding: '10px', background: '#f5f5f5', borderRadius: '4px' }}>
                <p style={{ margin: '5px 0' }}><strong>User ID:</strong> {currentUser.id} (Never Change)</p>
                <p style={{ margin: '5px 0' }}><strong>Current Name:</strong> {currentUser.name}</p>
                <p style={{ margin: '5px 0' }}><strong>Current Role:</strong> {currentUser.role}</p>
                {currentUser.role === 'staff' && (
                  <p style={{ margin: '5px 0', color: '#856404', fontSize: '12px' }}>
                    ⚠️ Staff cannot change email or password
                  </p>
                )}
              </div>
            )}
            
            <form onSubmit={handleUpdateProfile}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email:</label>
                {currentUser?.role === 'staff' ? (
                  <input
                    type="email"
                    value={editForm.email}
                    disabled
                    style={{ width: '100%', padding: '10px', boxSizing: 'border-box', backgroundColor: '#f5f5f5', color: '#666' }}
                  />
                ) : (
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}
                  />
                )}
                {currentUser?.role === 'staff' && (
                  <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#856404' }}>
                    Staff cannot change email
                  </p>
                )}
              </div>
              
              {currentUser?.role !== 'staff' && (
                <>
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
                </>
              )}
              
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
            onClick={() => setActiveTab('virtual-runs')}
            style={{
              padding: '12px 24px',
              backgroundColor: activeTab === 'virtual-runs' ? '#667eea' : '#f8f9fa',
              color: activeTab === 'virtual-runs' ? 'white' : '#495057',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: activeTab === 'virtual-runs' ? '0 2px 8px rgba(102, 126, 234, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'virtual-runs') {
                e.currentTarget.style.backgroundColor = '#e9ecef';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseOut={(e) => {
              if (activeTab !== 'virtual-runs') {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            <span>🏃</span>
            Virtual Runs
          </button>
          <button 
            onClick={() => setActiveTab('forms')}
            style={{
              padding: '12px 24px',
              backgroundColor: activeTab === 'forms' ? '#667eea' : '#f8f9fa',
              color: activeTab === 'forms' ? 'white' : '#495057',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: activeTab === 'forms' ? '0 2px 8px rgba(102, 126, 234, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'forms') {
                e.currentTarget.style.backgroundColor = '#e9ecef';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseOut={(e) => {
              if (activeTab !== 'forms') {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            <span>📋</span>
            Form Submissions
          </button>
          <button 
            onClick={() => setActiveTab('quizzes')}
            style={{
              padding: '12px 24px',
              backgroundColor: activeTab === 'quizzes' ? '#667eea' : '#f8f9fa',
              color: activeTab === 'quizzes' ? 'white' : '#495057',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: activeTab === 'quizzes' ? '0 2px 8px rgba(102, 126, 234, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'quizzes') {
                e.currentTarget.style.backgroundColor = '#e9ecef';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseOut={(e) => {
              if (activeTab !== 'quizzes') {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            <span>📊</span>
            Quiz Attempts
          </button>
          <button 
            onClick={() => setActiveTab('manage-quizzes')}
            style={{
              padding: '12px 24px',
              backgroundColor: activeTab === 'manage-quizzes' ? '#667eea' : '#f8f9fa',
              color: activeTab === 'manage-quizzes' ? 'white' : '#495057',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: activeTab === 'manage-quizzes' ? '0 2px 8px rgba(102, 126, 234, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'manage-quizzes') {
                e.currentTarget.style.backgroundColor = '#e9ecef';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseOut={(e) => {
              if (activeTab !== 'manage-quizzes') {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            <span>⚙️</span>
            Manage Quizzes
          </button>
          <button 
            onClick={() => setActiveTab('form-config')}
            style={{
              padding: '12px 24px',
              backgroundColor: activeTab === 'form-config' ? '#667eea' : '#f8f9fa',
              color: activeTab === 'form-config' ? 'white' : '#495057',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: activeTab === 'form-config' ? '0 2px 8px rgba(102, 126, 234, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'form-config') {
                e.currentTarget.style.backgroundColor = '#e9ecef';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseOut={(e) => {
              if (activeTab !== 'form-config') {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            <span>🔧</span>
            Google Form Config
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            style={{
              padding: '12px 24px',
              backgroundColor: activeTab === 'users' ? '#667eea' : '#f8f9fa',
              color: activeTab === 'users' ? 'white' : '#495057',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: activeTab === 'users' ? '0 2px 8px rgba(102, 126, 234, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'users') {
                e.currentTarget.style.backgroundColor = '#e9ecef';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseOut={(e) => {
              if (activeTab !== 'users') {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            <span>👥</span>
            Users
          </button>
        </div>
      </div>

      {activeTab === 'virtual-runs' && (
        <div>
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
              All Virtual Runs
            </h2>
            <p style={{ margin: '0', color: '#7f8c8d', fontSize: '14px' }}>
              View and manage all virtual run submissions from users
            </p>
          </div>

          {virtualRuns.length === 0 ? (
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
                No virtual runs found
              </p>
              <p style={{ fontSize: '15px', color: '#7f8c8d', marginTop: '10px', maxWidth: '600px', margin: '10px auto' }}>
                Virtual runs will appear here once users submit their running records.
              </p>
            </div>
          ) : (
            <div style={{ 
              display: 'grid', 
              gap: '20px',
              gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))'
            }}>
            {virtualRuns.map((run: any) => (
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
                  
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start',
                    gap: '16px',
                    marginBottom: '20px'
                  }}>
                    {run.image_url ? (
                      <div style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        flexShrink: 0,
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
                        width: '120px',
                        height: '120px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                      }}>
                        <span style={{ fontSize: '48px' }}>🏃</span>
                      </div>
                    )}
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px',
                        flexWrap: 'wrap'
                      }}>
                        <h3 style={{ 
                          margin: '0', 
                          fontSize: '20px', 
                          fontWeight: '600',
                          color: '#2c3e50'
                        }}>
                          {run.name || 'Unknown User'}
                        </h3>
                      </div>
                      
                      <p style={{ 
                        margin: '0 0 8px 0', 
                        fontSize: '14px', 
                        color: '#7f8c8d',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        wordBreak: 'break-word'
                      }}>
                        ✉️ {run.email}
                      </p>
                    </div>
                  </div>

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
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{
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
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {activeTab === 'forms' && (
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
              Google Form Submissions
            </h2>
            <p style={{ margin: '0', color: '#7f8c8d', fontSize: '14px' }}>
              View and manage all Google Form submissions from users
            </p>
          </div>
          
          {allFormConfigs.length > 0 && (
            <div style={{ 
              marginBottom: '30px', 
              padding: '20px', 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ 
                display: 'flex', 
                gap: '12px', 
                flexWrap: 'wrap', 
                alignItems: 'center' 
              }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => {
                    setActiveFormTab('all');
                    setFormSubmissions(allFormSubmissions);
                  }}
                  style={{
                      padding: '10px 20px',
                    border: 'none',
                      borderRadius: '8px',
                    cursor: 'pointer',
                      backgroundColor: activeFormTab === 'all' ? '#fff' : 'rgba(255, 255, 255, 0.2)',
                      color: activeFormTab === 'all' ? '#667eea' : '#fff',
                      fontWeight: activeFormTab === 'all' ? '600' : '400',
                      fontSize: '14px',
                      transition: 'all 0.3s ease',
                      boxShadow: activeFormTab === 'all' ? '0 2px 8px rgba(0, 0, 0, 0.15)' : 'none'
                  }}
                >
                    📊 All Forms ({allFormSubmissions.length})
                </button>
                  {activeFormTab === 'all' && formSubmissions.length > 0 && (
                    <button
                      onClick={() => downloadFormSubmissionsAsCSV(formSubmissions, 'All Forms')}
                      style={{
                        padding: '10px 16px',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor: '#28a745',
                        color: 'white',
                        fontSize: '13px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 4px rgba(40, 167, 69, 0.3)',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#218838';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = '#28a745';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                      title="Download all form submissions as CSV"
                    >
                      📥 Download CSV
                    </button>
                  )}
                </div>
                {allFormConfigs.map((config: any) => {
                  const formSubmissionsCount = allFormSubmissions.filter((s: any) => matchesFormConfig(s, config)).length;
                  const tabName = config.form_name;
                  const configId = config.id.toString();
                  const isActive = activeFormTab === configId;
                  const currentSubmissions = allFormSubmissions.filter((s: any) => matchesFormConfig(s, config));
                  return (
                    <div key={config.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={() => {
                        setActiveFormTab(configId);
                          setFormSubmissions(currentSubmissions);
                      }}
                      style={{
                          padding: '10px 20px',
                        border: 'none',
                          borderRadius: '8px',
                        cursor: 'pointer',
                          backgroundColor: isActive ? '#fff' : 'rgba(255, 255, 255, 0.2)',
                          color: isActive ? '#667eea' : '#fff',
                          fontWeight: isActive ? '600' : '400',
                          fontSize: '14px',
                          transition: 'all 0.3s ease',
                          boxShadow: isActive ? '0 2px 8px rgba(0, 0, 0, 0.15)' : 'none',
                          whiteSpace: 'nowrap'
                      }}
                    >
                      {tabName} ({formSubmissionsCount})
                    </button>
                      {isActive && currentSubmissions.length > 0 && (
                        <button
                          onClick={() => downloadFormSubmissionsAsCSV(currentSubmissions, config.form_name)}
                          style={{
                            padding: '10px 16px',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            backgroundColor: '#28a745',
                            color: 'white',
                            fontSize: '13px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 4px rgba(40, 167, 69, 0.3)',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = '#218838';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = '#28a745';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                          title={`Download ${config.form_name} submissions as CSV`}
                        >
                          📥 CSV
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {formSubmissions.length === 0 ? (
            <div style={{ 
              padding: '60px 20px', 
              textAlign: 'center', 
              border: '2px dashed #ddd', 
              borderRadius: '12px', 
              background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>📭</div>
              <p style={{ fontSize: '20px', color: '#2c3e50', fontWeight: '500', marginBottom: '10px' }}>
                No form submissions found
              </p>
              <p style={{ fontSize: '15px', color: '#7f8c8d', marginTop: '10px', maxWidth: '600px', margin: '10px auto' }}>
                Form submissions will appear here once users submit the Google Form and the data is synced to the database.
              </p>
              <p style={{ fontSize: '13px', color: '#95a5a6', marginTop: '15px' }}>
                💡 Make sure Google Apps Script is configured and the trigger is set up.
              </p>
            </div>
          ) : (
            <div style={{ 
              display: 'grid', 
              gap: '20px',
              gridTemplateColumns: 'repeat(auto-fill, minmax(500px, 1fr))'
            }}>
              {formSubmissions.map((submission: any, index: number) => {
                const submissionData = typeof submission.submission_data === 'string' 
                  ? JSON.parse(submission.submission_data) 
                  : submission.submission_data;
                
                return (
                  <div 
                    key={submission.id} 
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
                    
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      marginBottom: '20px', 
                      paddingBottom: '16px', 
                      borderBottom: '2px solid #f0f0f0' 
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '10px',
                          marginBottom: '8px'
                        }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: '600',
                            fontSize: '16px'
                          }}>
                            {submission.name ? submission.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                      <div>
                            <p style={{ 
                              margin: '0 0 4px 0', 
                              fontSize: '18px', 
                              fontWeight: '600',
                              color: '#2c3e50'
                            }}>
                              {submission.name || 'Unknown User'}
                            </p>
                            <p style={{ 
                              margin: '0', 
                              fontSize: '13px', 
                              color: '#7f8c8d',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              ✉️ {submission.email}
                            </p>
                      </div>
                        </div>
                        {submission.google_form_id && (
                          <p style={{ 
                            margin: '8px 0 0 0', 
                            fontSize: '12px', 
                            color: '#95a5a6',
                            fontFamily: 'monospace',
                            background: '#f8f9fa',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            display: 'inline-block'
                          }}>
                            ID: {submission.google_form_id.substring(0, 20)}...
                        </p>
                        )}
                      </div>
                      <div style={{ 
                        textAlign: 'right',
                        paddingLeft: '16px',
                        borderLeft: '1px solid #f0f0f0',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: '10px'
                      }}>
                        <div>
                          <div style={{
                            fontSize: '12px',
                            color: '#95a5a6',
                            marginBottom: '4px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            Submitted
                    </div>
                          <p style={{ 
                            margin: '0', 
                            fontSize: '14px', 
                            color: '#2c3e50',
                            fontWeight: '500'
                          }}>
                            {new Date(submission.submitted_at).toLocaleDateString()}
                          </p>
                          <p style={{ 
                            margin: '4px 0 0 0', 
                            fontSize: '12px', 
                            color: '#7f8c8d'
                          }}>
                            {new Date(submission.submitted_at).toLocaleTimeString()}
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            if (confirm(`Are you sure you want to delete this submission?\n\nUser: ${submission.name} (${submission.email})\nSubmitted: ${new Date(submission.submitted_at).toLocaleString()}\n\nThis action is irreversible!`)) {
                              try {
                                await api.delete(`/form/submissions/${submission.id}`);
                                alert('Submission deleted successfully');
                                loadData();
                              } catch (error: any) {
                                alert(error.response?.data?.error || 'Failed to delete submission');
                                console.error('Delete submission error:', error);
                              }
                            }
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 4px rgba(220, 53, 69, 0.3)',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#c82333';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(220, 53, 69, 0.4)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = '#dc3545';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(220, 53, 69, 0.3)';
                          }}
                          title="Delete this submission"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                    
                    <div style={{ marginTop: '16px' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '16px',
                        paddingBottom: '12px',
                        borderBottom: '1px solid #f0f0f0'
                      }}>
                        <span style={{ fontSize: '18px' }}>📝</span>
                        <strong style={{ 
                          fontSize: '16px', 
                          color: '#2c3e50',
                          fontWeight: '600'
                        }}>
                          Form Answers
                        </strong>
                        <span style={{
                          marginLeft: 'auto',
                          fontSize: '12px',
                          color: '#7f8c8d',
                          background: '#f0f0f0',
                          padding: '2px 8px',
                          borderRadius: '12px'
                        }}>
                          {Object.keys(submissionData).length} {Object.keys(submissionData).length === 1 ? 'answer' : 'answers'}
                        </span>
                      </div>
                      <div style={{ 
                        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', 
                        padding: '20px', 
                        borderRadius: '8px',
                        border: '1px solid #e9ecef'
                      }}>
                        {Object.keys(submissionData).map((key: string, idx: number) => (
                          <div 
                            key={key} 
                            style={{ 
                              marginBottom: idx < Object.keys(submissionData).length - 1 ? '16px' : '0', 
                              paddingBottom: idx < Object.keys(submissionData).length - 1 ? '16px' : '0', 
                              borderBottom: idx < Object.keys(submissionData).length - 1 ? '1px solid #dee2e6' : 'none'
                            }}
                          >
                            <p style={{ 
                              margin: '0 0 8px 0', 
                              fontWeight: '600', 
                              color: '#495057',
                              fontSize: '14px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <span style={{ color: '#667eea' }}>▸</span>
                              {key}
                            </p>
                            <p style={{ 
                              margin: '0', 
                              color: '#6c757d', 
                              fontSize: '14px',
                              paddingLeft: '20px',
                              lineHeight: '1.6',
                              wordBreak: 'break-word'
                            }}>
                              {String(submissionData[key])}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'quizzes' && (
        <div style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '30px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e0e0e0'
        }}>
          {(() => {
        // Calculate chart data
        const userScores = quizAttempts.reduce((acc: any, attempt: any) => {
          const key = `${attempt.name} (${attempt.email})`;
          if (!acc[key]) {
            acc[key] = { scores: [], total: 0, count: 0 };
          }
          acc[key].scores.push(attempt.score);
          acc[key].total += attempt.score;
          acc[key].count += 1;
          return acc;
        }, {});

        const userLabels = Object.keys(userScores);
        const avgScores = userLabels.map(user => 
          parseFloat((userScores[user].total / userScores[user].count).toFixed(1))
        );

        const scoreRanges = {
          '0-20': 0,
          '21-40': 0,
          '41-60': 0,
          '61-80': 0,
          '81-100': 0,
        };

        quizAttempts.forEach((attempt: any) => {
          const score = attempt.score;
          if (score <= 20) scoreRanges['0-20']++;
          else if (score <= 40) scoreRanges['21-40']++;
          else if (score <= 60) scoreRanges['41-60']++;
          else if (score <= 80) scoreRanges['61-80']++;
          else scoreRanges['81-100']++;
        });

        return (
          <div>
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
                <span style={{ fontSize: '32px' }}>📊</span>
                Quiz Attempts Analytics
              </h2>
              <p style={{ margin: '0', color: '#7f8c8d', fontSize: '14px' }}>
                View detailed analytics and performance metrics for all quiz attempts
              </p>
            </div>

            {quizAttempts.length === 0 ? (
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
                  No quiz attempts found
                </p>
                <p style={{ fontSize: '15px', color: '#7f8c8d', marginTop: '10px', maxWidth: '600px', margin: '10px auto' }}>
                  Quiz attempts will appear here once users complete quizzes.
                </p>
              </div>
            ) : (
              <div>
                {/* Overall Statistics */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
                  gap: '24px', 
                  marginBottom: '40px' 
                }}>
                  {/* User Performance Chart */}
                  <div style={{ 
                    border: '1px solid #e0e0e0', 
                    padding: '24px', 
                    borderRadius: '12px',
                    background: '#fff',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
                    }}></div>
                    <h3 style={{ 
                      margin: '0 0 20px 0',
                      fontSize: '20px',
                      fontWeight: '600',
                      color: '#2c3e50',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <span>📈</span>
                      User Average Scores
                    </h3>
                    <Bar
                      data={{
                        labels: userLabels,
                        datasets: [{
                          label: 'Average Score',
                          data: avgScores,
                          backgroundColor: 'rgba(102, 126, 234, 0.6)',
                          borderColor: 'rgba(102, 126, 234, 1)',
                          borderWidth: 2,
                          borderRadius: 6,
                        }],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                          legend: {
                            display: false
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                              callback: function(value) {
                                return value + '%';
                              }
                            }
                          },
                        },
                      }}
                    />
                  </div>

                  {/* Score Distribution */}
                  <div style={{ 
                    border: '1px solid #e0e0e0', 
                    padding: '24px', 
                    borderRadius: '12px',
                    background: '#fff',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
                    }}></div>
                    <h3 style={{ 
                      margin: '0 0 20px 0',
                      fontSize: '20px',
                      fontWeight: '600',
                      color: '#2c3e50',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <span>🥧</span>
                      Score Distribution
                    </h3>
                    <Doughnut
                      data={{
                        labels: Object.keys(scoreRanges),
                        datasets: [{
                          data: Object.values(scoreRanges),
                          backgroundColor: [
                            'rgba(220, 53, 69, 0.8)',
                            'rgba(255, 193, 7, 0.8)',
                            'rgba(54, 162, 235, 0.8)',
                            'rgba(75, 192, 192, 0.8)',
                            'rgba(102, 126, 234, 0.8)',
                          ],
                          borderColor: [
                            'rgba(220, 53, 69, 1)',
                            'rgba(255, 193, 7, 1)',
                            'rgba(54, 162, 235, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(102, 126, 234, 1)',
                          ],
                          borderWidth: 2,
                        }],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                          legend: {
                            position: 'bottom'
                          }
                        }
                      }}
                    />
                  </div>
                </div>

              {/* Individual Attempt Details */}
                <div style={{ marginTop: '40px', paddingTop: '30px', borderTop: '2px solid #e0e0e0' }}>
                  <h3 style={{ 
                    margin: '0 0 25px 0',
                    fontSize: '22px',
                    fontWeight: '600',
                    color: '#2c3e50',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <span>📋</span>
                    Individual Attempts ({quizAttempts.length})
                  </h3>
                  <div style={{ display: 'grid', gap: '24px' }}>
                {quizAttempts.map((attempt: any) => {
                  const quiz = quizzes.find((q: any) => q.id === attempt.quiz_id);
                  const quizTitle = quiz?.title || `Quiz ${attempt.quiz_id}`;
                  const questions = quiz?.questions || [];
                      const scoreColor = attempt.score >= 70 ? '#28a745' : attempt.score >= 50 ? '#ffc107' : '#dc3545';
                      const scoreBg = attempt.score >= 70 ? '#d4edda' : attempt.score >= 50 ? '#fff3cd' : '#f8d7da';

                  return (
                        <div 
                          key={attempt.id} 
                          style={{ 
                            border: '1px solid #e0e0e0', 
                            padding: '28px', 
                            borderRadius: '12px', 
                            background: '#fff',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                            position: 'relative',
                            overflow: 'hidden',
                            transition: 'all 0.3s ease'
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
                            marginBottom: '20px', 
                            paddingBottom: '20px', 
                            borderBottom: '2px solid #f0f0f0' 
                          }}>
                            <div style={{ flex: 1 }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                marginBottom: '10px'
                              }}>
                                <div style={{
                                  width: '48px',
                                  height: '48px',
                                  borderRadius: '50%',
                                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                  color: 'white',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: '600',
                                  fontSize: '18px',
                                  flexShrink: 0
                                }}>
                                  {attempt.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                                <div>
                                  <p style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '600', color: '#2c3e50' }}>
                                    {attempt.name || 'Unknown User'}
                                  </p>
                                  <p style={{ margin: '0', fontSize: '14px', color: '#7f8c8d' }}>
                                    ✉️ {attempt.email}
                                  </p>
                                </div>
                              </div>
                              <div style={{ marginTop: '12px' }}>
                                <div style={{
                                  fontSize: '12px',
                                  color: '#6c757d',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                  marginBottom: '4px'
                                }}>
                                  Quiz
                                </div>
                                <div style={{
                                  fontSize: '16px',
                                  fontWeight: '600',
                                  color: '#495057',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}>
                                  <span>📝</span>
                                  {quizTitle}
                                </div>
                              </div>
                            </div>
                            <div style={{ 
                              textAlign: 'right',
                              padding: '16px 24px',
                              background: scoreBg,
                              borderRadius: '10px',
                              border: `2px solid ${scoreColor}`,
                              minWidth: '120px'
                            }}>
                              <div style={{
                                fontSize: '12px',
                                color: '#6c757d',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '6px'
                              }}>
                                Score
                              </div>
                              <div style={{
                                fontSize: '32px',
                                fontWeight: '700',
                                color: scoreColor,
                                marginBottom: '8px'
                              }}>
                                {attempt.score}%
                              </div>
                              <div style={{
                                fontSize: '12px',
                                color: '#95a5a6',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                justifyContent: 'flex-end'
                              }}>
                                <span>🕒</span>
                                {new Date(attempt.completed_at).toLocaleDateString()}
                              </div>
                        </div>
                      </div>

                          <div style={{ marginTop: '20px' }}>
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
                              Answers ({questions.length} questions)
                            </h4>
                        {questions.length > 0 ? (
                              <div style={{ display: 'grid', gap: '12px' }}>
                            {questions.map((q: any, qIdx: number) => {
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
                                          <p style={{ margin: '8px 0 0 0', color: '#495057', fontSize: '14px' }}>
                                        <strong>Answer:</strong> {displayAnswer}
                                      </p>
                                      {q.type === 'choice' && q.options && (
                                            <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#6c757d' }}>
                                          Options: {q.options.join(', ')}
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
                        ) : (
                              <p style={{ 
                                color: '#6c757d', 
                                fontStyle: 'italic',
                                padding: '20px',
                                textAlign: 'center',
                                background: '#f8f9fa',
                                borderRadius: '8px'
                              }}>
                                Quiz questions not available
                              </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                  </div>
              </div>
            </div>
          )}
          </div>
        );
      })()}
        </div>
      )}

      {activeTab === 'manage-quizzes' && (
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
              <span style={{ fontSize: '32px' }}>⚙️</span>
              Manage Quizzes
            </h2>
            <p style={{ margin: '0', color: '#7f8c8d', fontSize: '14px' }}>
              Create, edit, and manage quiz questions and configurations
            </p>
          </div>

          {editingQuiz === null && (
            <div>
              <div style={{ 
                marginBottom: '30px', 
                padding: '24px', 
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                borderRadius: '12px',
                border: '1px solid #e0e0e0',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
              }}>
                <h3 style={{ 
                  margin: '0 0 16px 0',
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#2c3e50',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span>⚡</span>
                  Quick Actions
                </h3>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button 
                    onClick={() => {
                  setEditingQuiz('new');
                  setQuizForm({ title: '', questions: [] });
                    }}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
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
                    <span>➕</span>
                    Create New Quiz
                  </button>
                </div>
              </div>

              <div style={{ marginTop: '30px' }}>
                <h3 style={{ 
                  margin: '0 0 20px 0',
                  fontSize: '22px',
                  fontWeight: '600',
                  color: '#2c3e50',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span>📚</span>
                  All Quizzes ({quizzes.length})
                </h3>
                {quizzes.length === 0 ? (
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
                      No quizzes found
                    </p>
                    <p style={{ fontSize: '15px', color: '#7f8c8d', marginTop: '10px', maxWidth: '600px', margin: '10px auto' }}>
                      Create your first quiz to get started!
                    </p>
                  </div>
                ) : (
                  <div style={{ 
                    display: 'grid', 
                    gap: '20px',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))'
                  }}>
              {quizzes.map((quiz: any) => (
                      <div 
                        key={quiz.id} 
                        style={{ 
                          border: '1px solid #e0e0e0', 
                          padding: '24px', 
                          marginBottom: '0',
                          borderRadius: '12px',
                          background: '#fff',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                          position: 'relative',
                          overflow: 'hidden',
                          transition: 'all 0.3s ease'
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

                        <div style={{ marginBottom: '20px' }}>
                          <h3 style={{ 
                            margin: '0 0 8px 0',
                            fontSize: '20px',
                            fontWeight: '600',
                            color: '#2c3e50',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                          }}>
                            <span>📋</span>
                            {quiz.title || `Quiz ${quiz.id}`}
                          </h3>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            flexWrap: 'wrap'
                          }}>
                            <div style={{
                              fontSize: '12px',
                              color: '#6c757d',
                              padding: '4px 10px',
                              background: '#f8f9fa',
                              borderRadius: '4px'
                            }}>
                              ID: {quiz.id}
                            </div>
                            <div style={{
                              fontSize: '12px',
                              color: '#6c757d',
                              padding: '4px 10px',
                              background: '#f8f9fa',
                              borderRadius: '4px'
                            }}>
                              {quiz.questions?.length || 0} questions
                            </div>
                          </div>
                        </div>

                        <div style={{
                          display: 'flex',
                          gap: '10px',
                          flexWrap: 'wrap'
                        }}>
                          <button 
                            onClick={() => {
                    setEditingQuiz(quiz.id);
                    setQuizForm({ title: quiz.title || '', questions: quiz.questions || [] });
                            }}
                            style={{
                              flex: 1,
                              padding: '10px 16px',
                              backgroundColor: '#667eea',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '14px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#5568d3';
                              e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.backgroundColor = '#667eea';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                          >
                            <span>✏️</span>
                            Edit
                          </button>
                          <button 
                            onClick={async () => {
                              try {
                                if (quiz.published) {
                                  await api.put(`/quiz/unpublish/${quiz.id}`);
                                  alert('Quiz unpublished successfully');
                                } else {
                                  await api.put(`/quiz/publish/${quiz.id}`);
                                  alert('Quiz published successfully');
                                }
                                loadData();
                              } catch (error: any) {
                                alert(error.response?.data?.error || 'Failed to update quiz status');
                              }
                            }}
                            style={{
                              flex: 1,
                              padding: '10px 16px',
                              backgroundColor: quiz.published ? '#ffc107' : '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '14px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              boxShadow: quiz.published ? '0 2px 4px rgba(255, 193, 7, 0.3)' : '0 2px 4px rgba(40, 167, 69, 0.3)',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = quiz.published ? '#e0a800' : '#218838';
                              e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.backgroundColor = quiz.published ? '#ffc107' : '#28a745';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                          >
                            <span>{quiz.published ? '📢' : '🔒'}</span>
                            {quiz.published ? 'Unpublish' : 'Publish'}
                          </button>
                          <button 
                            onClick={async () => {
                              if (confirm('Delete this quiz? This action cannot be undone.')) {
                      try {
                        await api.delete(`/quiz/delete/${quiz.id}`);
                        loadData();
                      } catch (error) {
                        alert('Delete failed');
                      }
                    }
                            }}
                            style={{
                              flex: 1,
                              padding: '10px 16px',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '14px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              boxShadow: '0 2px 4px rgba(220, 53, 69, 0.3)',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#c82333';
                              e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.backgroundColor = '#dc3545';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                          >
                            <span>🗑️</span>
                            Delete
                          </button>
                        </div>
                </div>
              ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {editingQuiz !== null && (
            <div style={{ 
              border: '1px solid #e0e0e0', 
              padding: '30px', 
              borderRadius: '12px',
              background: '#fff',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
              position: 'relative',
              overflow: 'hidden'
            }}>
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
                  margin: '0 0 15px 0',
                  fontSize: '22px',
                  fontWeight: '600',
                  color: '#2c3e50',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span>✏️</span>
                  {editingQuiz === 'new' ? 'Create New Quiz' : 'Edit Quiz'}
                </h3>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  color: '#495057',
                  fontSize: '14px'
                }}>
                  Quiz Title
                </label>
                <input
                  type="text"
                  placeholder="Enter quiz title..."
                  value={quizForm.title}
                  onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
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

              <div style={{ marginBottom: '25px' }}>
                <div style={{
                  marginBottom: '16px'
                }}>
                  <h4 style={{ 
                    margin: '0',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#2c3e50',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>❓</span>
                    Questions ({quizForm.questions.length})
                  </h4>
                </div>

                {quizForm.questions.length === 0 ? (
                  <div style={{ 
                    padding: '40px 20px', 
                    textAlign: 'center', 
                    border: '2px dashed #ddd', 
                    borderRadius: '8px',
                    background: '#f8f9fa'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>❓</div>
                    <p style={{ margin: '0', color: '#6c757d', fontSize: '14px', marginBottom: '20px' }}>
                      No questions yet. Click "Add Question" to get started.
                    </p>
                    <button 
                      onClick={() => {
                        setQuizForm({ ...quizForm, questions: [...quizForm.questions, { question: '', options: [], correct: 0 }] });
                      }}
                      style={{
                        padding: '12px 24px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(40, 167, 69, 0.3)',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        margin: '0 auto'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#218838';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(40, 167, 69, 0.4)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = '#28a745';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(40, 167, 69, 0.3)';
                      }}
                    >
                      <span>➕</span>
                      Add Question
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {quizForm.questions.map((q: any, idx: number) => (
                      <div 
                        key={idx} 
                        style={{ 
                          border: '1px solid #e0e0e0', 
                          padding: '20px', 
                          marginBottom: '0',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                          position: 'relative'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '12px'
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
                          <button 
                            onClick={() => {
                              setQuizForm({ ...quizForm, questions: quizForm.questions.filter((_, i) => i !== idx) });
                            }}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#c82333';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.backgroundColor = '#dc3545';
                            }}
                          >
                            <span>🗑️</span>
                            Remove
                          </button>
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ 
                            display: 'block', 
                            marginBottom: '6px', 
                            fontWeight: '600',
                            color: '#495057',
                            fontSize: '13px'
                          }}>
                            Question
                          </label>
                  <input
                    type="text"
                            placeholder="Enter question..."
                    value={q.question || ''}
                    onChange={(e) => {
                      const newQuestions = [...quizForm.questions];
                      newQuestions[idx] = { ...q, question: e.target.value };
                      setQuizForm({ ...quizForm, questions: newQuestions });
                    }}
                            style={{ 
                              width: '100%', 
                              padding: '10px',
                              border: '1px solid #ddd',
                              borderRadius: '6px',
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

                        <div style={{ marginBottom: '12px' }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '10px'
                          }}>
                            <label style={{ 
                              margin: '0',
                              fontWeight: '600',
                              color: '#495057',
                              fontSize: '13px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <span>📋</span>
                              Options {Array.isArray(q.options) && q.options.length > 0 && `(${q.options.length})`}
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                        const newQuestions = [...quizForm.questions];
                                const currentOptions = Array.isArray(q.options) ? q.options : [];
                                newQuestions[idx] = { ...q, options: [...currentOptions, ''] };
                        setQuizForm({ ...quizForm, questions: newQuestions });
                      }}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#218838';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = '#28a745';
                                e.currentTarget.style.transform = 'translateY(0)';
                              }}
                            >
                              <span>➕</span>
                              Add Option
                            </button>
                  </div>

                          {(!Array.isArray(q.options) || q.options.length === 0) ? (
                            <div style={{
                              padding: '20px',
                              textAlign: 'center',
                              border: '2px dashed #ddd',
                              borderRadius: '6px',
                              background: '#f8f9fa'
                            }}>
                              <p style={{ margin: '0', color: '#6c757d', fontSize: '13px' }}>
                                No options yet. Click "Add Option" to add choices.
                              </p>
                              <p style={{ margin: '8px 0 0 0', color: '#95a5a6', fontSize: '12px' }}>
                                Leave empty for text-based questions.
                              </p>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {q.options.map((option: string, optIdx: number) => (
                                <div 
                                  key={optIdx}
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.effectAllowed = 'move';
                                    e.dataTransfer.setData('text/html', optIdx.toString());
                                    e.currentTarget.style.opacity = '0.5';
                                  }}
                                  onDragEnd={(e) => {
                                    e.currentTarget.style.opacity = '1';
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'move';
                                    e.currentTarget.style.borderTop = '3px solid #667eea';
                                  }}
                                  onDragLeave={(e) => {
                                    e.currentTarget.style.borderTop = '';
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.style.borderTop = '';
                                    const draggedIdx = parseInt(e.dataTransfer.getData('text/html'));
                                    const dropIdx = optIdx;
                                    
                                    if (draggedIdx !== dropIdx) {
                                      const newQuestions = [...quizForm.questions];
                                      const newOptions = [...(Array.isArray(q.options) ? q.options : [])];
                                      
                                      // Swap options
                                      const [draggedOption] = newOptions.splice(draggedIdx, 1);
                                      newOptions.splice(dropIdx, 0, draggedOption);
                                      
                                      // Adjust correct answer index
                                      let newCorrect = q.correct || 0;
                                      if (draggedIdx === newCorrect) {
                                        newCorrect = dropIdx;
                                      } else if (dropIdx === newCorrect) {
                                        newCorrect = draggedIdx;
                                      } else if (draggedIdx < newCorrect && dropIdx >= newCorrect) {
                                        newCorrect = newCorrect - 1;
                                      } else if (draggedIdx > newCorrect && dropIdx <= newCorrect) {
                                        newCorrect = newCorrect + 1;
                                      }
                                      
                                      newQuestions[idx] = { ...q, options: newOptions, correct: newCorrect };
                                      setQuizForm({ ...quizForm, questions: newQuestions });
                                    }
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '12px',
                                    background: '#fff',
                                    border: q.correct === optIdx ? '2px solid #28a745' : '1px solid #ddd',
                                    borderRadius: '8px',
                                    transition: 'all 0.2s ease',
                                    cursor: 'move'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (q.correct !== optIdx) {
                                      e.currentTarget.style.borderColor = '#667eea';
                                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (q.correct !== optIdx) {
                                      e.currentTarget.style.borderColor = '#ddd';
                                      e.currentTarget.style.boxShadow = 'none';
                                    }
                                  }}
                                >
                                  <div style={{
                                    width: '24px',
                                    height: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    cursor: 'grab',
                                    color: '#6c757d',
                                    fontSize: '16px'
                                  }}
                                  onMouseDown={(e) => {
                                    e.currentTarget.style.cursor = 'grabbing';
                                  }}
                                  onMouseUp={(e) => {
                                    e.currentTarget.style.cursor = 'grab';
                                  }}
                                  >
                                    ⋮⋮
                                  </div>
                                  <div style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    background: q.correct === optIdx ? '#28a745' : '#e9ecef',
                                    color: q.correct === optIdx ? 'white' : '#6c757d',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: '600',
                                    fontSize: '12px',
                                    flexShrink: 0,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    userSelect: 'none'
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newQuestions = [...quizForm.questions];
                                    newQuestions[idx] = { ...q, correct: optIdx };
                                    setQuizForm({ ...quizForm, questions: newQuestions });
                                  }}
                                  onMouseEnter={(e) => {
                                    if (q.correct !== optIdx) {
                                      e.currentTarget.style.background = '#667eea';
                                      e.currentTarget.style.color = 'white';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (q.correct !== optIdx) {
                                      e.currentTarget.style.background = '#e9ecef';
                                      e.currentTarget.style.color = '#6c757d';
                                    }
                                  }}
                                  >
                                    {q.correct === optIdx ? '✓' : String.fromCharCode(65 + optIdx)}
                                  </div>
                    <input
                                    type="text"
                                    placeholder={`Option ${String.fromCharCode(65 + optIdx)}...`}
                                    value={option || ''}
                      onChange={(e) => {
                        const newQuestions = [...quizForm.questions];
                                      const newOptions = [...(Array.isArray(q.options) ? q.options : [])];
                                      newOptions[optIdx] = e.target.value;
                                      newQuestions[idx] = { ...q, options: newOptions };
                        setQuizForm({ ...quizForm, questions: newQuestions });
                      }}
                                    onDragStart={(e) => {
                                      e.preventDefault();
                                    }}
                                    style={{ 
                                      flex: 1,
                                      padding: '10px',
                                      border: 'none',
                                      borderRadius: '6px',
                                      fontSize: '14px',
                                      background: 'transparent',
                                      outline: 'none'
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newQuestions = [...quizForm.questions];
                                      const newOptions = [...(Array.isArray(q.options) ? q.options : [])];
                                      newOptions.splice(optIdx, 1);
                                      // Adjust correct answer index if needed
                                      let newCorrect = q.correct || 0;
                                      if (optIdx < newCorrect) {
                                        newCorrect = Math.max(0, newCorrect - 1);
                                      } else if (optIdx === newCorrect) {
                                        newCorrect = 0; // Reset if correct answer was deleted
                                      }
                                      newQuestions[idx] = { ...q, options: newOptions, correct: newCorrect };
                                      setQuizForm({ ...quizForm, questions: newQuestions });
                                    }}
                                    onDragStart={(e) => {
                                      e.preventDefault();
                                    }}
                                    style={{
                                      padding: '6px 10px',
                                      backgroundColor: '#dc3545',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease',
                                      flexShrink: 0
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = '#c82333';
                                      e.currentTarget.style.transform = 'scale(1.05)';
                                    }}
                                    onMouseOut={(e) => {
                                      e.currentTarget.style.backgroundColor = '#dc3545';
                                      e.currentTarget.style.transform = 'scale(1)';
                                    }}
                                  >
                                    🗑️
                                  </button>
                  </div>
                              ))}
                            </div>
                          )}

                          {Array.isArray(q.options) && q.options.length > 0 && (
                            <div style={{
                              marginTop: '12px',
                              padding: '10px',
                              background: q.correct !== undefined && q.correct >= 0 && q.correct < q.options.length ? '#d4edda' : '#fff3cd',
                              border: `1px solid ${q.correct !== undefined && q.correct >= 0 && q.correct < q.options.length ? '#c3e6cb' : '#ffeaa7'}`,
                              borderRadius: '6px',
                              fontSize: '12px',
                              color: q.correct !== undefined && q.correct >= 0 && q.correct < q.options.length ? '#155724' : '#856404',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              {q.correct !== undefined && q.correct >= 0 && q.correct < q.options.length ? (
                                <>
                                  <span>✅</span>
                                  <span>Correct answer: <strong>{q.options[q.correct] || `Option ${String.fromCharCode(65 + q.correct)}`}</strong></span>
                                </>
                              ) : (
                                <>
                                  <span>⚠️</span>
                                  <span>Click the circle next to an option to mark it as the correct answer</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                </div>
              ))}
                  </div>
                )}

                {quizForm.questions.length > 0 && (
                  <div style={{ marginTop: '20px' }}>
                    <button 
                      onClick={() => {
                        setQuizForm({ ...quizForm, questions: [...quizForm.questions, { question: '', options: [], correct: 0 }] });
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 20px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(40, 167, 69, 0.3)',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#218838';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(40, 167, 69, 0.4)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = '#28a745';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(40, 167, 69, 0.3)';
                      }}
                    >
                      <span>➕</span>
                      Add Question
                    </button>
                  </div>
                )}
              </div>

              <div style={{
                display: 'flex',
                gap: '12px',
                paddingTop: '20px',
                borderTop: '2px solid #f0f0f0'
              }}>
                <button 
                  onClick={async () => {
                  try {
                    if (editingQuiz === 'new') {
                      await api.post('/quiz/create', quizForm);
                    } else {
                      await api.put(`/quiz/update/${editingQuiz}`, quizForm);
                    }
                    setEditingQuiz(null);
                    loadData();
                  } catch (error) {
                    alert('Save failed');
                  }
                  }}
                  style={{
                    flex: 1,
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
                  <span>💾</span>
                  Save Quiz
                </button>
                <button 
                  onClick={() => {
                  setEditingQuiz(null);
                  setQuizForm({ title: '', questions: [] });
                  }}
                  style={{
                    flex: 1,
                    padding: '14px 24px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(108, 117, 125, 0.3)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#5a6268';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#6c757d';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <span>❌</span>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'form-config' && (
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
              <span style={{ fontSize: '32px' }}>🔧</span>
              Google Form Configuration
            </h2>
            <p style={{ margin: '0', color: '#7f8c8d', fontSize: '14px' }}>
              Configure and manage Google Forms integration
            </p>
          </div>
          
          {tunnelmoleUrl && (
            <div style={{ marginBottom: '20px', padding: '15px', background: '#e7f3ff', borderRadius: '4px', border: '1px solid #b3d9ff' }}>
              <p style={{ margin: '0 0 15px 0', fontSize: '14px', fontWeight: 'bold' }}>📡 Google Apps Script Configuration:</p>
              
              <div style={{ marginBottom: '15px' }}>
                <p style={{ margin: '0 0 5px 0', fontSize: '13px', fontWeight: 'bold' }}>API_URL:</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <code style={{ 
                    background: '#fff', 
                    padding: '8px 12px', 
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    flex: 1,
                    minWidth: '200px',
                    wordBreak: 'break-all'
                  }}>
                    {tunnelmoleUrl}/api/form/submit
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${tunnelmoleUrl}/api/form/submit`);
                      alert('API_URL copied to clipboard!');
                    }}
                    style={{
                      padding: '8px 15px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Copy URL
                  </button>
                </div>
              </div>

              {allFormConfigs.length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                  <p style={{ margin: '0 0 5px 0', fontSize: '13px', fontWeight: 'bold' }}>FORM_ID (select a form):</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <select
                      id="form-id-select"
                      style={{
                        flex: 1,
                        minWidth: '200px',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontFamily: 'monospace',
                        background: '#fff',
                        border: '1px solid #ccc'
                      }}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        if (selectedId) {
                          navigator.clipboard.writeText(selectedId);
                          alert('FORM_ID copied to clipboard!');
                        }
                      }}
                    >
                      <option value="">Select a form...</option>
                      {allFormConfigs
                        .filter((config: any) => config.google_form_id)
                        .map((config: any) => (
                          <option key={config.id} value={config.google_form_id}>
                            {config.form_name} ({config.google_form_id})
                          </option>
                        ))}
                    </select>
                    <button
                      onClick={() => {
                        const select = document.getElementById('form-id-select') as HTMLSelectElement;
                        if (select && select.value) {
                          navigator.clipboard.writeText(select.value);
                          alert('FORM_ID copied to clipboard!');
                        } else {
                          alert('Please select a form first');
                        }
                      }}
                      style={{
                        padding: '8px 15px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Copy ID
                    </button>
                  </div>
                </div>
              )}

              <div style={{ marginTop: '15px', padding: '10px', background: '#fff', borderRadius: '4px', border: '1px solid #ddd' }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 'bold' }}>Complete CONFIG_MANUAL code:</p>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
                  <code style={{ 
                    background: '#f5f5f5', 
                    padding: '10px', 
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    flex: 1,
                    minWidth: '300px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all'
                  }}>
{`const CONFIG_MANUAL = {
  API_URL: '${tunnelmoleUrl}/api/form/submit',
  FORM_ID: 'SELECT_FORM_ID_ABOVE',
};`}
                  </code>
                  <button
                    onClick={() => {
                      const select = document.getElementById('form-id-select') as HTMLSelectElement;
                      const formId = select && select.value ? select.value : 'YOUR_FORM_ID_HERE';
                      const code = `const CONFIG_MANUAL = {
  API_URL: '${tunnelmoleUrl}/api/form/submit',
  FORM_ID: '${formId}',
};`;
                      navigator.clipboard.writeText(code);
                      alert('CONFIG_MANUAL code copied to clipboard!');
                    }}
                    style={{
                      padding: '8px 15px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      whiteSpace: 'nowrap',
                      alignSelf: 'flex-start'
                    }}
                  >
                    Copy Code
                  </button>
                </div>
              </div>

              <p style={{ margin: '15px 0 0 0', fontSize: '12px', color: '#666' }}>
                Copy the code above and replace <code style={{ background: '#fff', padding: '2px 4px', borderRadius: '2px' }}>CONFIG_MANUAL</code> in your Google Apps Script <code style={{ background: '#fff', padding: '2px 4px', borderRadius: '2px' }}>Code.gs</code> file.
              </p>
            </div>
          )}
          
          <div style={{ border: '1px solid #ccc', padding: '20px', marginBottom: '20px' }}>
            <h3>Create New Form</h3>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}><strong>Form Name (required):</strong></label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Enter form name (e.g., 'Application Form 2024')"
                style={{ width: '100%', padding: '8px' }}
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}><strong>Google Form URL:</strong></label>
              <input
                type="text"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://forms.gle/xxxxx or https://docs.google.com/forms/d/e/xxxxx/viewform?embedded=true"
                style={{ 
                  width: '100%', 
                  padding: '8px',
                  border: formUrl && !validateGoogleFormUrl(formUrl) ? '2px solid #dc3545' : '1px solid #ccc'
                }}
              />
              {formUrl && !validateGoogleFormUrl(formUrl) && (
                <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#dc3545' }}>
                  Invalid Google Form URL. Must be a valid Google Forms URL (e.g., https://forms.gle/xxxxx or https://docs.google.com/forms/d/e/xxxxx/viewform)
                </p>
              )}
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                <strong>Actual Form ID (required for trigger setup):</strong>
                <span style={{ fontSize: '11px', color: '#666', marginLeft: '5px', fontWeight: 'normal' }}>
                  (Optional, will be auto-detected from submissions if not provided)
                </span>
              </label>
              <input
                type="text"
                value={formId}
                onChange={(e) => setFormId(e.target.value)}
                placeholder="e.g., 1MW-56aoEWSO8slPNnqgBQohW5Ahp-b6IHE4O7589kuU"
                style={{ 
                  width: '100%', 
                  padding: '8px',
                  fontFamily: 'monospace',
                  fontSize: '12px'
                }}
              />
              <p style={{ margin: '5px 0 0 0', fontSize: '11px', color: '#666' }}>
                <strong>How to get Actual Form ID:</strong>
                <br />
                1. Open your Google Form in Google Forms
                <br />
                2. Go to <strong>Extensions → Apps Script</strong>
                <br />
                3. Copy the script from <code>google-apps-script/Code.gs</code> to the Apps Script editor
                <br />
                4. Run the <code>getFormId()</code> function
                <br />
                5. Copy the Form ID from the execution log
                <br />
                <strong>Note:</strong> The Form ID in the URL (Entry ID) is different from the actual Form ID needed for triggers.
              </p>
            </div>
            <button onClick={async () => {
              try {
                if (!formName.trim()) {
                  alert('Form name is required');
                  return;
                }
                if (!formUrl.trim()) {
                  alert('Form URL is required');
                  return;
                }
                if (!validateGoogleFormUrl(formUrl)) {
                  alert('Invalid Google Form URL. Please enter a valid Google Forms URL (e.g., https://forms.gle/xxxxx or https://docs.google.com/forms/d/e/xxxxx/viewform)');
                  return;
                }
                const response = await api.post('/form-config/config', { 
                  form_name: formName, 
                  form_url: formUrl,
                  google_form_id: formId.trim() || undefined
                });
                if (response.data.synced) {
                  alert(`Form configuration created successfully!\n\nForm ID automatically synced from submissions:\n${response.data.data.google_form_id}`);
                } else if (response.data.data.google_form_id) {
                  alert(`Form configuration created successfully!\n\nForm ID: ${response.data.data.google_form_id}`);
                } else {
                  alert('Form configuration created successfully!\n\nNote: Form ID will be automatically set after first submission.');
                }
                setFormName('');
                setFormUrl('');
                setFormId('');
                loadData();
              } catch (error: any) {
                alert(error.response?.data?.error || 'Create failed');
              }
            }}>Create New Form Configuration</button>
          </div>
          
          {allFormConfigs.length > 0 && (
            <div style={{ marginTop: '30px' }}>
              <h3>All Form Configurations</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                {allFormConfigs.map((config: any) => (
                  <div key={config.id} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 
                      style={{ 
                          margin: '0', 
                        cursor: 'pointer', 
                        color: '#007bff',
                          textDecoration: 'underline',
                          flex: 1
                      }}
                      onClick={() => setPreviewFormUrl(config.form_url)}
                    >
                      {config.form_name}
                        {config.published && (
                          <span style={{ 
                            marginLeft: '8px', 
                            padding: '2px 6px', 
                            backgroundColor: '#28a745', 
                            color: 'white', 
                            borderRadius: '3px', 
                            fontSize: '10px',
                            fontWeight: 'normal'
                          }}>
                            Published
                          </span>
                        )}
                    </h4>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                          onClick={async () => {
                            try {
                              if (config.published) {
                                await api.put(`/form-config/config/${config.id}/unpublish`);
                                alert('Form unpublished successfully');
                              } else {
                                await api.put(`/form-config/config/${config.id}/publish`);
                                alert('Form published successfully. Other forms have been unpublished.');
                              }
                              loadData();
                            } catch (error: any) {
                              alert(error.response?.data?.error || 'Failed to update form publish status');
                              console.error('Publish form config error:', error);
                            }
                          }}
                          style={{
                            padding: '5px 10px',
                            backgroundColor: config.published ? '#6c757d' : '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          {config.published ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`Are you sure you want to delete "${config.form_name}"?\n\nThis will permanently delete:\n- Form configuration\n- All form submissions for this form\n\nThis action is irreversible!`)) {
                              try {
                                await api.delete(`/form-config/config/${config.id}`);
                                alert('Form configuration and related submissions deleted successfully');
                                loadData();
                              } catch (error: any) {
                                alert(error.response?.data?.error || 'Failed to delete form configuration');
                                console.error('Delete form config error:', error);
                              }
                            }
                          }}
                          style={{
                            padding: '5px 10px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p style={{ margin: '5px 0', fontSize: '12px', color: '#666' }}>
                      <strong>Created:</strong> {new Date(config.created_at).toLocaleString()}
                    </p>
                    <p style={{ margin: '5px 0', fontSize: '12px', color: '#666', wordBreak: 'break-all' }}>
                      <strong>URL:</strong> {config.form_url}
                    </p>
                    {config.google_form_id && (
                      <p style={{ margin: '5px 0', fontSize: '12px', color: '#666', wordBreak: 'break-all' }}>
                        <strong>Google Form ID:</strong> {config.google_form_id}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'users' && (
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
              <span style={{ fontSize: '32px' }}>👥</span>
              All Users
            </h2>
            <p style={{ margin: '0', color: '#7f8c8d', fontSize: '14px' }}>
              Manage user accounts, roles, and permissions
            </p>
          </div>

          {users.length === 0 ? (
            <div style={{ 
              padding: '60px 20px', 
              textAlign: 'center', 
              border: '2px dashed #ddd', 
              borderRadius: '12px', 
              background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>👤</div>
              <p style={{ fontSize: '20px', color: '#2c3e50', fontWeight: '500', marginBottom: '10px' }}>
                No users found
              </p>
              <p style={{ fontSize: '15px', color: '#7f8c8d', marginTop: '10px', maxWidth: '600px', margin: '10px auto' }}>
                Users will appear here once they register in the system.
              </p>
            </div>
          ) : (
            <div style={{ 
              display: 'grid', 
              gap: '20px',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))'
            }}>
              {users.map((user: any) => {
                const roleColors: { [key: string]: string } = {
                  'staff': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  'manager': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  'user': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
                };
                
                const roleIcons: { [key: string]: string } = {
                  'staff': '👔',
                  'manager': '👨‍💼',
                  'user': '👤'
                };

                return (
                  <div 
                    key={user.id} 
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
                      background: roleColors[user.role] || roleColors['user']
                    }}></div>
                    
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start',
                      gap: '16px',
                      marginBottom: '20px'
                    }}>
                      <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: roleColors[user.role] || roleColors['user'],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '24px',
                        flexShrink: 0,
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                      }}>
                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '8px',
                          flexWrap: 'wrap'
                        }}>
                          <h3 style={{ 
                            margin: '0', 
                            fontSize: '20px', 
                            fontWeight: '600',
                            color: '#2c3e50'
                          }}>
                            {user.name || 'Unknown User'}
                          </h3>
                          <span style={{
                            fontSize: '18px'
                          }}>
                            {roleIcons[user.role] || '👤'}
                          </span>
                        </div>
                        
                        <p style={{ 
                          margin: '0 0 8px 0', 
                          fontSize: '14px', 
                          color: '#7f8c8d',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          wordBreak: 'break-word'
                        }}>
                          ✉️ {user.email}
                        </p>
                        
                        <div style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          background: user.role === 'staff' ? '#e3f2fd' : 
                                     user.role === 'manager' ? '#fce4ec' : '#e0f2f1',
                          color: user.role === 'staff' ? '#1976d2' : 
                                 user.role === 'manager' ? '#c2185b' : '#00695c',
                          textTransform: 'capitalize'
                        }}>
                          {user.role}
                        </div>
                      </div>
                    </div>

                    <div style={{
                      padding: '16px',
                      background: '#f8f9fa',
                      borderRadius: '8px',
                      marginBottom: '16px',
                      border: '1px solid #e9ecef'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px'
                      }}>
                        <span style={{
                          fontSize: '12px',
                          color: '#6c757d',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          User ID
                        </span>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#495057',
                          fontFamily: 'monospace'
                        }}>
                          #{user.id}
                        </span>
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{
                          fontSize: '12px',
                          color: '#6c757d',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Created
                        </span>
                        <span style={{
                          fontSize: '13px',
                          color: '#495057'
                        }}>
                          {new Date(user.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      gap: '10px',
                      flexWrap: 'wrap'
                    }}>
                      {currentUser?.role === 'staff' && user.email !== 'staff@test.com' && (
                      <select
                        value={user.role}
                        onChange={async (e) => {
                          const newRole = e.target.value;
                          if (newRole === user.role) return;
                          
                          if (confirm(`Change role from "${user.role}" to "${newRole}"?`)) {
                            try {
                              await api.put(`/staff/users/${user.id}/role`, { role: newRole });
                              alert('Role updated successfully');
                              
                              // If the updated user is the current logged-in user, update their info
                              if (currentUser && currentUser.id === user.id) {
                                const updatedUser = { ...currentUser, role: newRole };
                                storage.setItem('user', JSON.stringify(updatedUser));
                                storage.setItem('role', newRole);
                                setCurrentUser(updatedUser);
                              }
                              
                              loadData();
                            } catch (error: any) {
                              alert(error.response?.data?.error || 'Failed to update role');
                              console.error('Update role error:', error);
                              e.target.value = user.role;
                            }
                          } else {
                            e.target.value = user.role;
                          }
                        }}
                          style={{
                            flex: 1,
                            minWidth: '120px',
                            padding: '10px 12px',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            fontSize: '14px',
                            background: '#fff',
                            color: '#495057',
                            cursor: 'pointer',
                            fontWeight: '500',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#667eea';
                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#ddd';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                      >
                          <option value="user">👤 User</option>
                          <option value="manager">👨‍💼 Manager</option>
                      </select>
                    )}
                      
                    {currentUser?.email === 'staff@test.com' && user.email !== 'staff@test.com' && (
                      <button
                        onClick={async () => {
                            if (confirm(`Are you sure you want to delete user "${user.name}" (${user.email})?\n\nThis will permanently delete:\n- User account\n- All virtual runs\n- All form submissions\n- All quiz attempts\n\nThis action is irreversible!`)) {
                            try {
                              await api.delete(`/staff/users/${user.id}`);
                              alert('User and all related data deleted successfully');
                              loadData();
                            } catch (error: any) {
                              alert(error.response?.data?.error || 'Failed to delete user');
                              console.error('Delete user error:', error);
                            }
                          }
                        }}
                        style={{
                            flex: currentUser?.role === 'staff' && user.email !== 'staff@test.com' ? '0 0 auto' : 1,
                            padding: '10px 16px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                            borderRadius: '8px',
                          cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 4px rgba(220, 53, 69, 0.3)',
                            transition: 'all 0.2s ease'
                        }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#c82333';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(220, 53, 69, 0.4)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = '#dc3545';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(220, 53, 69, 0.3)';
                          }}
                        >
                          🗑️ Delete
                      </button>
                    )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Form Preview Modal */}
      {previewFormUrl && (
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
          zIndex: 2000,
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '900px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>Form Preview</h2>
              <button 
                onClick={() => setPreviewFormUrl(null)} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  fontSize: '28px', 
                  cursor: 'pointer',
                  color: '#666',
                  padding: '0',
                  width: '30px',
                  height: '30px',
                  lineHeight: '30px'
                }}
              >
                ×
              </button>
            </div>
            <div style={{ 
              width: '100%', 
              height: '70vh', 
              border: '1px solid #ccc', 
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <iframe
                src={previewFormUrl}
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 'none' }}
                title="Google Form Preview"
              >
                Loading…
              </iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

