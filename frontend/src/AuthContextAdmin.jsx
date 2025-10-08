import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContextAdmin = createContext();

export const AuthProviderAdmin = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('tokenAdmin'));
    const [user, setUser] = useState(null);

     useEffect(() => {
        const storedToken = localStorage.getItem('tokenAdmin');
        const storedUser = localStorage.getItem('userAdmin');

        if (storedToken && storedUser) {
            setToken(storedToken);
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
        } else {
            setToken(null);
            setUser(null);
        }
    }, []); // Empty dependency array to run only once on mount

    const login = async (username, password) => {
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, { username, password });
            const { token: newToken, email, role } = res.data;

            if (role !== 'admin') {
                return { success: false, message: 'Not authorized as admin' };
            }

            localStorage.setItem('tokenAdmin', newToken);
            localStorage.setItem('userAdmin', JSON.stringify({ username, email, role }));
            setUser({ username, email, role });
            setToken(newToken); // Update token state to trigger useEffect
            return { success: true, role };
        } catch (error) {
            console.error('Login failed:', error);
            return { success: false, message: error.response?.data?.msg || 'Login failed' };
        }
    };

    const register = async (fullName, email, username, password) => {
        try {
            const registerUrl = `${import.meta.env.VITE_API_URL}/api/auth/register`;
            console.log('Register URL:', registerUrl);
            await axios.post(registerUrl, { fullName, email, username, password });
            return true;
        } catch (error) {
            console.error('Registration failed:', error);
            return false;
        }
    };

    const logout = () => {
        localStorage.removeItem('tokenAdmin');
        localStorage.removeItem('userAdmin');
        setUser(null);
    };

    return (
        <AuthContextAdmin.Provider value={{ token, user, login, register, logout }}>
            {children}
        </AuthContextAdmin.Provider>
    );
};

export const useAuthAdmin = () => {
    const context = useContext(AuthContextAdmin);
    if (!context) {
        throw new Error('useAuthAdmin must be used within an AuthProviderAdmin');
    }
    return context;
};

export default AuthContextAdmin;