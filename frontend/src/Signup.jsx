import React, { useState, useContext } from 'react';
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
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [devCodeHint, setDevCodeHint] = useState('');
  const { register, sendVerificationCode } = useContext(AuthContext);
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    // If we haven't sent a code yet, trigger email verification and show code input
    if (!verificationSent) {
      const res = await sendVerificationCode(email, username);
      if (res.success) {
        setVerificationSent(true);
        if (res.devCode) setDevCodeHint(res.devCode);
        alert('Verification code sent to your email. Please enter the code to complete signup.');
      }
      return; // Wait for user to enter code
    }

    // Second submit: verify code & register
    if (!verificationCode) {
      alert('Please enter the email verification code.');
      return;
    }
    const success = await register(fullName, email, username, password, verificationCode);
    if (success) navigate('/login');
  };

  const onSendCode = async () => {
    if (!email) {
      alert('Please enter email first');
      return;
    }
    const res = await sendVerificationCode(email, username);
    if (res.success) {
      setVerificationSent(true);
      if (res.devCode) setDevCodeHint(res.devCode);
      alert('Verification code has been sent to your email.');
    }
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
              onChange={(e) => setFullName(e.target.value)}
              required
              icon="fa-solid fa-user"
            />
            <FormGroup
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              icon="fa-solid fa-envelope"
            />
            {verificationSent && (
              <FormGroup
                label="Verification Code"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                required
                icon="fa-solid fa-shield-check"
              />
            )}
          
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
            <button type="submit">Sign up</button>
            <p className="back-to-login-link">
              <Link to="/login">Back to Login</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;