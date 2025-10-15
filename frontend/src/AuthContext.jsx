import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        console.log('AuthContext useEffect triggered.');
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        console.log('AuthContext: Value of storedUser from localStorage:', storedUser);

        if (storedToken && storedUser) {
            setToken(storedToken);
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            console.log('AuthContext: User loaded from localStorage (with token):', parsedUser);
        } else {
            setToken(null);
            setUser(null);
            console.log('AuthContext: No token or user found, user and token set to null.');
        }
        console.log('AuthContext: Current token:', token);
        console.log('AuthContext: Current user state:', user);
    }, []); // Empty dependency array to run only once on mount

    const login = async (username, password) => {
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, { username, password });
            const { token: newToken, _id, name, email, role, jobTitle, contactNumber } = res.data;
            const userWithToken = { _id, name, email, role, jobTitle, contactNumber, token: newToken };
            localStorage.setItem('token', newToken);
            localStorage.setItem('user', JSON.stringify(userWithToken));
            setUser(userWithToken);
            setToken(newToken); // Update token state to trigger useEffect
            return { success: true, role };
        } catch (error) {
            console.error('Login failed:', error);
            return { success: false, message: error.response?.data?.msg || 'Login failed' };
        }
    };

    const sendVerificationCode = async (email, username) => {
        try {
            const url = `${import.meta.env.VITE_API_URL}/api/auth/send-verification`;
            const res = await axios.post(url, { email, username });
            return { success: true, devCode: res.data?.devCode };
        } catch (error) {
            console.error('Send verification failed:', error);
            alert(`Failed to send code: ${error.response?.data?.msg || error.message}`);
            return { success: false };
        }
    };

    const register = async (fullName, email, username, password, code) => {
        try {
            const registerUrl = `${import.meta.env.VITE_API_URL}/api/auth/register`;
            console.log('Register URL:', registerUrl);
            await axios.post(registerUrl, { fullName, email, username, password, code });
            return true;
        } catch (error) {
            console.error('Registration failed:', error);
            alert(`Registration failed: ${error.response?.data?.msg || error.message}`);
            return false;
        }
    };

    const logout = () => {
        console.log('AuthContext: Logout function called.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        console.log('AuthContext: User and token removed from localStorage, user state set to null.');
        navigate('/'); // Redirect to home page after logout
    };

    return (
        <AuthContext.Provider value={{ token, user, login, register, sendVerificationCode, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;