import React, { useState, useContext } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from './AuthContext';
import './Signup.css';
import FormGroup from './FormGroup'; // Import the new FormGroup component

const Signup = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [verificationMsg, setVerificationMsg] = useState('');
  const [isEmailVerified, setEmailVerified] = useState(false);
  const [isRequesting, setRequesting] = useState(false);
  const [isVerifying, setVerifying] = useState(false);
  const [isSigningUp, setSigningUp] = useState(false);
  
  // Error popup states
  const [errorPopup, setErrorPopup] = useState({
    isOpen: false,
    type: '', // 'email-exists', 'username-exists', 'password-mismatch'
    message: ''
  });
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const apiBase = import.meta.env.VITE_API_URL;

  // Helper function to capitalize first letter of each word
  const capitalizeWords = (str) => {
    return str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Function to validate full name (must have at least 2 words)
  const validateFullName = (name) => {
    const trimmedName = name.trim();
    const words = trimmedName.split(/\s+/).filter(word => word.length > 0);
    return words.length >= 2;
  };

  // Handle full name change with auto-capitalization
  const handleFullNameChange = (e) => {
    const value = e.target.value;
    // Allow typing but capitalize on blur or when space is added
    if (value.endsWith(' ') || value.length === 0) {
      setFullName(capitalizeWords(value));
    } else {
      setFullName(value);
    }
  };

  // Helper function to show error popup
  const showErrorPopup = (type, message) => {
    setErrorPopup({
      isOpen: true,
      type,
      message
    });
  };

  // Helper function to close error popup
  const closeErrorPopup = () => {
    setErrorPopup({
      isOpen: false,
      type: '',
      message: ''
    });
  };

  const requestCode = async () => {
    setVerificationMsg('');
    setRequesting(true);
    try {
      await axios.post(`${apiBase}/api/auth/request-verification-code`, { email });
      setModalOpen(true);
      setVerificationMsg('We sent a 6-digit code to your email.');
    } catch (error) {
      const errorMsg = error.response?.data?.msg || 'Failed to send code';
      setVerificationMsg(errorMsg);
      // Show error in popup if it's a validation error (email already exists)
      if (errorMsg.includes('already exists')) {
        showErrorPopup('email-exists', errorMsg);
        setSigningUp(false); // Reset signup state
      }
    } finally {
      setRequesting(false);
    }
  };

  const verifyCode = async () => {
    setVerifying(true);
    setVerificationMsg('');
    try {
      await axios.post(`${apiBase}/api/auth/verify-code`, { email, code });
      setEmailVerified(true);
      setVerificationMsg('Email verified. Proceeding with signup...');
      
      // Automatically proceed with registration after verification
      setTimeout(async () => {
        setModalOpen(false);
        const success = await register(fullName, email, username, password);
        if (success) {
          navigate('/login');
        }
        setSigningUp(false);
      }, 1000);
    } catch (error) {
      setVerificationMsg('Invalid code');
      setSigningUp(false);
    } finally {
      setVerifying(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (password !== confirmPassword) {
      showErrorPopup('password-mismatch', 'Passwords do not match. Please make sure both password fields are identical.');
      return;
    }
    
    if (!fullName || !email || !username || !password) {
      showErrorPopup('empty-fields', 'Please fill in all fields to continue with your registration.');
      return;
    }

    // Validate full name format (must have at least 2 words)
    if (!validateFullName(fullName)) {
      showErrorPopup('invalid-fullname', 'Please enter your full name with at least two words (e.g., "John Doe"). Single names like "Red" are not allowed.');
      return;
    }

    setSigningUp(true);
    
    // Check if username already exists
    try {
      const checkResponse = await axios.get(`${apiBase}/api/auth/checkuser?username=${username}`);
      if (checkResponse.data.exists) {
        showErrorPopup('username-exists', 'Username already exists. Please choose a different username.');
        setSigningUp(false);
        return;
      }
    } catch (error) {
      console.error('Error checking username:', error);
      showErrorPopup('validation-error', 'Error validating username. Please try again.');
      setSigningUp(false);
      return;
    }
    
    // Send verification code and show modal
    await requestCode();
  };

  return (
    <div className="signup-page">
      <div className="login-left">
        <img src="../src/img/lumine login.png" alt="Logo" className="login-logo" />
      </div>
      <div className="signup-container">
        <div className="signup-form-card">
          <h2>Sign up Now</h2>
          <form className="signup-form" onSubmit={onSubmit}>
            <FormGroup
              label="Full Name"
              type="text"
              value={fullName}
              onChange={handleFullNameChange}
              onBlur={(e) => setFullName(capitalizeWords(e.target.value))}
              required
              icon="fa-solid fa-user"
              placeholder="e.g., John Doe"
            />
            <FormGroup
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              icon="fa-solid fa-envelope"
            />
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
            <FormGroup
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              icon="fa-solid fa-lock"
            />
            <button type="submit" disabled={isSigningUp}>
              {isSigningUp ? 'Processing...' : 'Sign up'}
            </button>
            <p className="back-to-login-link">
              <Link to="/login">Back to Login</Link>
            </p>
          </form>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <button className="modal-close-btn" onClick={() => {
          setModalOpen(false);
          setSigningUp(false);
          setVerificationMsg('');
          setCode('');
        }} aria-label="Close modal">
          <i className="fa-solid fa-times"></i>
        </button>
            <i className="fa-solid fa-envelope-open-text verify-icon" aria-hidden="true"></i>
            <h3>Verify it's you.</h3>
            <p>We sent verification code to <strong>{email}</strong>. Please check your inbox and enter the code below.</p>
            <label className="code-label">6-digits code *</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              className="code-input"
              placeholder="Enter 6-digits code"
            />
            {verificationMsg && <p className="modal-message">{verificationMsg}</p>}
            <div className="modal-actions">
              <button type="button" onClick={verifyCode} disabled={!code || isVerifying}>
                {isVerifying ? 'Verifying...' : 'Verify Code'}
              </button>
            </div>
            <p className="resend-line">
              Didn't receive an email? <button type="button" className="link-button" onClick={requestCode} disabled={isRequesting}>Try again</button>
            </p>
          </div>
        </div>
      )}

      {/* Error Popup Modal */}
      {errorPopup.isOpen && (
        <div className="error-modal-overlay">
          <div className="error-modal">
            <button className="error-modal-close-btn" onClick={closeErrorPopup} aria-label="Close error modal">
              <i className="fa-solid fa-times"></i>
            </button>
            <div className="error-modal-icon">
              {errorPopup.type === 'password-mismatch' && <i className="fa-solid fa-lock"></i>}
              {errorPopup.type === 'email-exists' && <i className="fa-solid fa-envelope"></i>}
              {errorPopup.type === 'username-exists' && <i className="fa-solid fa-user"></i>}
              {errorPopup.type === 'empty-fields' && <i className="fa-solid fa-exclamation-triangle"></i>}
              {errorPopup.type === 'validation-error' && <i className="fa-solid fa-exclamation-circle"></i>}
              {errorPopup.type === 'invalid-fullname' && <i className="fa-solid fa-id-card"></i>}
            </div>
            <h3 className="error-modal-title">
              {errorPopup.type === 'password-mismatch' && 'Password Mismatch'}
              {errorPopup.type === 'email-exists' && 'Email Already Exists'}
              {errorPopup.type === 'username-exists' && 'Username Already Exists'}
              {errorPopup.type === 'empty-fields' && 'Missing Information'}
              {errorPopup.type === 'validation-error' && 'Validation Error'}
              {errorPopup.type === 'invalid-fullname' && 'Invalid Full Name'}
            </h3>
            <p className="error-modal-message">{errorPopup.message}</p>
            <div className="error-modal-actions">
              <button type="button" onClick={closeErrorPopup} className="error-modal-ok-btn">
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Signup;