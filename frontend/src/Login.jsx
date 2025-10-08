import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useAuthAdmin } from './AuthContextAdmin';
import './Login.css';
import './App.css';
import FormGroup from './FormGroup';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login: customerLogin } = useAuth();
  const { login: adminLogin } = useAuthAdmin();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      let loginSuccess = false;
      let userRole = null;

      // Attempt admin login first
      const adminResult = await adminLogin(username, password);
      if (adminResult.success) {
        loginSuccess = true;
        userRole = adminResult.role;
      }

      // If admin login failed, attempt customer login
      if (!loginSuccess) {
        const customerResult = await customerLogin(username, password);
        if (customerResult.success) {
          loginSuccess = true;
          userRole = customerResult.role;
        }
      }

      if (loginSuccess) {
        if (userRole === 'admin') {
          navigate('/admin/dashboard');
        } else if (userRole === 'user') {
          navigate('/');
        }
      } else {
        setError('Invalid Credentials');
      }

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
            <p className="signup-link">
              Don't have an account? <Link to="/signup">Sign up</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;