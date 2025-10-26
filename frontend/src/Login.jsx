import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useAuthAdmin } from './AuthContextAdmin';
import './Login.css';
import './App.css';
import FormGroup from './FormGroup';

const Login = () => {
  const apiBase = import.meta.env.VITE_API_URL;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  // Forgot password states
  const [forgotPasswordModal, setForgotPasswordModal] = useState({
    isOpen: false,
    step: 'email', // 'email', 'verification', 'newPassword'
    email: '',
    verificationCode: '',
    newPassword: '',
    confirmPassword: '',
    message: '',
    isLoading: false
  });
  
  const { login: customerLogin } = useAuth();
  const { login: adminLogin } = useAuthAdmin();
  const navigate = useNavigate();

  // Forgot password helper functions
  const openForgotPasswordModal = () => {
    setForgotPasswordModal({
      isOpen: true,
      step: 'email',
      email: '',
      verificationCode: '',
      newPassword: '',
      confirmPassword: '',
      message: '',
      isLoading: false
    });
  };

  const closeForgotPasswordModal = () => {
    setForgotPasswordModal(prev => ({ ...prev, isOpen: false }));
  };

  const updateForgotPasswordField = (field, value) => {
    setForgotPasswordModal(prev => ({ ...prev, [field]: value }));
  };

  const setForgotPasswordMessage = (message) => {
    setForgotPasswordModal(prev => ({ ...prev, message }));
  };

  const setForgotPasswordLoading = (isLoading) => {
    setForgotPasswordModal(prev => ({ ...prev, isLoading }));
  };

  const nextForgotPasswordStep = (step) => {
    setForgotPasswordModal(prev => ({ ...prev, step, message: '' }));
  };

  // API call functions for forgot password
  const sendResetCode = async () => {
    if (!forgotPasswordModal.email) {
      setForgotPasswordMessage('Please enter your email address');
      return;
    }

    setForgotPasswordLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: forgotPasswordModal.email }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setForgotPasswordMessage('Verification code sent to your email');
        nextForgotPasswordStep('verification');
      } else {
        setForgotPasswordMessage(data.message || 'Failed to send reset code');
      }
    } catch (error) {
      setForgotPasswordMessage('Network error. Please try again.');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const verifyResetCode = async () => {
    if (!forgotPasswordModal.verificationCode) {
      setForgotPasswordMessage('Please enter the verification code');
      return;
    }

    setForgotPasswordLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/auth/verify-reset-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: forgotPasswordModal.email,
          code: forgotPasswordModal.verificationCode 
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setForgotPasswordMessage('Code verified successfully');
        nextForgotPasswordStep('newPassword');
      } else {
        setForgotPasswordMessage('Invalid code');
      }
    } catch (error) {
      setForgotPasswordMessage('Network error. Please try again.');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const updatePassword = async () => {
    if (!forgotPasswordModal.newPassword || !forgotPasswordModal.confirmPassword) {
      setForgotPasswordMessage('Please fill in both password fields');
      return;
    }

    if (forgotPasswordModal.newPassword !== forgotPasswordModal.confirmPassword) {
      setForgotPasswordMessage('Passwords do not match');
      return;
    }

    if (forgotPasswordModal.newPassword.length < 6) {
      setForgotPasswordMessage('Password must be at least 6 characters long');
      return;
    }

    setForgotPasswordLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: forgotPasswordModal.email,
          code: forgotPasswordModal.verificationCode,
          newPassword: forgotPasswordModal.newPassword 
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setForgotPasswordMessage('Password updated successfully!');
        setTimeout(() => {
          closeForgotPasswordModal();
        }, 2000);
      } else {
        setForgotPasswordMessage(data.message || 'Failed to update password');
      }
    } catch (error) {
      setForgotPasswordMessage('Network error. Please try again.');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      // Attempt admin login first
      const adminResult = await adminLogin(username, password);
      if (adminResult.success) {
        navigate('/admin/dashboard');
        return;
      }

      // If admin login failed, attempt customer login
      const customerResult = await customerLogin(username, password);
      if (customerResult.success) {
        navigate('/');
        return;
      }

      // Show specific error message if available
      const message = customerResult.message || adminResult.message || 'Invalid Credentials';
      setError(message);
    } catch (err) {
      setError('An error occurred during login.');
      console.error('Login error:', err);
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <img src="../src/img/lumine login.png" alt="Logo" className="login-logo" />
       
      </div>
      <div className="login-container">
        <div className="login-form-card">
          <h2>Login Now</h2>
          {error && <p className="error-message">{error}</p>}
          <form onSubmit={handleSubmit} className="login-form">
            <FormGroup
              label="Username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              icon="fa-solid fa-user"
            />
            <FormGroup
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              icon="fa-solid fa-lock"
            />
            <button type="submit" className="login-button">Login</button>
            <p className="forgot-password-link">
              <span onClick={openForgotPasswordModal} className="forgot-link">
                Forgot Password?
              </span>
            </p>
            <p className="signup-link">
              Don't have an account? <Link to="/signup">Sign up</Link>
            </p>
          </form>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotPasswordModal.isOpen && (
        <div className="forgot-password-overlay" onClick={closeForgotPasswordModal}>
          <div className="forgot-password-modal" onClick={(e) => e.stopPropagation()}>
            <button className="forgot-password-close" onClick={closeForgotPasswordModal}>
              <i className="fa-solid fa-times"></i>
            </button>

            {/* Step 1: Email Input */}
            {forgotPasswordModal.step === 'email' && (
              <div className="forgot-password-content">
                <div className="forgot-password-icon">
                  <i className="fa-solid fa-envelope"></i>
                </div>
                <h3 className="forgot-password-title">Reset Password</h3>
                <p className="forgot-password-subtitle">
                  Enter your email address and we'll send you a verification code
                </p>
                <FormGroup
                  label="Email Address"
                  type="email"
                  value={forgotPasswordModal.email}
                  onChange={(e) => updateForgotPasswordField('email', e.target.value)}
                  required
                  icon="fa-solid fa-envelope"
                  placeholder="Enter your email"
                />
                {forgotPasswordModal.message && (
                  <p className={`forgot-password-message ${forgotPasswordModal.message.includes('sent') ? 'success' : 'error'}`}>
                    {forgotPasswordModal.message}
                  </p>
                )}
                <button 
                  className="forgot-password-button"
                  onClick={sendResetCode}
                  disabled={forgotPasswordModal.isLoading}
                >
                  {forgotPasswordModal.isLoading ? 'Sending...' : 'Send Reset Code'}
                </button>
              </div>
            )}

            {/* Step 2: Verification Code */}
            {forgotPasswordModal.step === 'verification' && (
              <div className="forgot-password-content">
                <div className="forgot-password-icon">
                  <i className="fa-solid fa-shield-halved"></i>
                </div>
                <h3 className="forgot-password-title">Enter Verification Code</h3>
                <p className="forgot-password-subtitle">
                  We've sent a 6-digit code to {forgotPasswordModal.email}
                </p>
                <FormGroup
                  label="Verification Code"
                  type="text"
                  value={forgotPasswordModal.verificationCode}
                  onChange={(e) => updateForgotPasswordField('verificationCode', e.target.value)}
                  required
                  icon="fa-solid fa-key"
                  placeholder="Enter 6-digit code"
                  maxLength="6"
                />
                {forgotPasswordModal.message && (
                  <p className={`forgot-password-message ${forgotPasswordModal.message.includes('successfully') ? 'success' : 'error'}`}>
                    {forgotPasswordModal.message}
                  </p>
                )}
                <button 
                  className="forgot-password-button"
                  onClick={verifyResetCode}
                  disabled={forgotPasswordModal.isLoading}
                >
                  {forgotPasswordModal.isLoading ? 'Verifying...' : 'Verify Code'}
                </button>
                <button 
                  className="forgot-password-back"
                  onClick={() => nextForgotPasswordStep('email')}
                >
                  Back to Email
                </button>
              </div>
            )}

            {/* Step 3: New Password */}
            {forgotPasswordModal.step === 'newPassword' && (
              <div className="forgot-password-content">
                <div className="forgot-password-icon">
                  <i className="fa-solid fa-lock"></i>
                </div>
                <h3 className="forgot-password-title">Create New Password</h3>
                <p className="forgot-password-subtitle">
                  Enter your new password below
                </p>
                <FormGroup
                  label="New Password"
                  type="password"
                  value={forgotPasswordModal.newPassword}
                  onChange={(e) => updateForgotPasswordField('newPassword', e.target.value)}
                  required
                  icon="fa-solid fa-lock"
                  placeholder="Enter new password"
                />
                <FormGroup
                  label="Confirm Password"
                  type="password"
                  value={forgotPasswordModal.confirmPassword}
                  onChange={(e) => updateForgotPasswordField('confirmPassword', e.target.value)}
                  required
                  icon="fa-solid fa-lock"
                  placeholder="Confirm new password"
                />
                {forgotPasswordModal.message && (
                  <p className={`forgot-password-message ${forgotPasswordModal.message.includes('successfully') ? 'success' : 'error'}`}>
                    {forgotPasswordModal.message}
                  </p>
                )}
                <button 
                  className="forgot-password-button"
                  onClick={updatePassword}
                  disabled={forgotPasswordModal.isLoading}
                >
                  {forgotPasswordModal.isLoading ? 'Updating...' : 'Update Password'}
                </button>
                <button 
                  className="forgot-password-back"
                  onClick={() => nextForgotPasswordStep('verification')}
                >
                  Back to Verification
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;