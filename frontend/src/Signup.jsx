import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from './AuthContext';
import './Signup.css';
import FormGroup from './FormGroup'; // Import the new FormGroup component

const Signup = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    // Assuming register function now takes username, password, confirmPassword
    const success = await register(username, password, confirmPassword);
    if (success) {
      navigate('/login');
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