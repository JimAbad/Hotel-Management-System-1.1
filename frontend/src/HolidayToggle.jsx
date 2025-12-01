import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthAdmin } from './AuthContextAdmin';

const HolidayToggle = ({ date }) => {
  const { token } = useAuthAdmin();
  const [isHoliday, setIsHoliday] = useState(false);
  const [loading, setLoading] = useState(false);
  const API_BASE = (() => {
    const fallback = 'https://hotel-management-system-1-1-backend.onrender.com';
    const env = import.meta.env.VITE_API_URL;
    const envNorm = String(env || '').replace(/\/+$/, '');
    const originNorm = typeof window !== 'undefined' ? window.location.origin.replace(/\/+$/, '') : '';
    const base = envNorm && envNorm !== originNorm ? envNorm : fallback;
    return base.replace(/\/+$/, '');
  })();

  useEffect(() => {
    checkHolidayStatus();
  }, [date]);

  const checkHolidayStatus = async () => {
    if (!date || !token) return;
    
    try {
      const response = await axios.get(
        `${API_BASE}/api/holidays/check/${date}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setIsHoliday(response.data.isHoliday);
    } catch (error) {
      console.error('Error checking holiday status:', error);
    }
  };

  const toggleHoliday = async () => {
    if (!date || !token) return;
    
    setLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE}/api/holidays/toggle`,
        { date },
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      setIsHoliday(response.data.isHoliday);
      
      // Show success message
      if (response.data.isHoliday) {
        alert('Holiday added successfully! Room prices will increase by 5% for this date.');
      } else {
        alert('Holiday removed successfully! Room prices will return to normal.');
      }
    } catch (error) {
      console.error('Error toggling holiday:', error);
      alert('Error toggling holiday status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (!date) return null;

  return (
    <div className="holiday-toggle" style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '10px',
      padding: '10px',
      backgroundColor: isHoliday ? '#fff3cd' : '#f8f9fa',
      border: `1px solid ${isHoliday ? '#ffc107' : '#dee2e6'}`,
      borderRadius: '5px',
      marginBottom: '10px'
    }}>
      <div style={{ flex: 1 }}>
        <strong>{formatDate(date)}</strong>
        {isHoliday && (
          <div style={{ fontSize: '12px', color: '#856404' }}>
            🎉 Holiday pricing active (5% increase)
          </div>
        )}
      </div>
      <button
        onClick={toggleHoliday}
        disabled={loading}
        style={{
          padding: '8px 16px',
          border: 'none',
          borderRadius: '4px',
          backgroundColor: isHoliday ? '#dc3545' : '#28a745',
          color: 'white',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: 'bold'
        }}
      >
        {loading ? 'Processing...' : isHoliday ? 'Undo Holiday' : 'Set Holiday'}
      </button>
    </div>
  );
};

export default HolidayToggle;