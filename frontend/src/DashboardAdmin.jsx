import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Line, Doughnut } from 'react-chartjs-2';
import './DashboardAdmin.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend
);

const DashboardAdmin = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('tokenAdmin');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await axios.get('/api/dashboard', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = response.data;
        setDashboardData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <div>Loading dashboard data...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  const { totalBookings, occupancyRate, availableRooms, pendingPayments, bookingTrend, occupancyByRoomType, reviews } = dashboardData || {};

  const bookingTrendLabels = bookingTrend?.map(item => `Week ${item._id}`) || ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'];
  const bookingTrendValues = bookingTrend?.map(item => item.count) || [15, 38, 28, 60, 75];

  const bookingTrendData = {
    labels: bookingTrendLabels,
    datasets: [
      {
        label: 'Booking Trend - Last 5 Weeks',
        data: bookingTrendValues,
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
  };

  const occupancyByRoomTypeLabels = occupancyByRoomType?.map(item => item.type) || ['Deluxe', 'Family Suite', 'Solo', 'Available'];
  const occupancyByRoomTypeValues = occupancyByRoomType?.map(item => item.occupied) || [40, 20, 10, 30];

  const occupancyByRoomTypeData = {
    labels: occupancyByRoomTypeLabels,
    datasets: [
      {
        data: occupancyByRoomTypeValues,
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'],
        hoverBackgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'],
      },
    ],
  };

  return (
    <div className="admin-dashboard">
      <div className="header">
        <h1>Dashboard</h1>
      </div>

      <div className="dashboard-cards">
        <div className="card">
          <h3>Total Bookings</h3>
          <p>{totalBookings || 0}</p>
        </div>
        <div className="card">
          <h3>Occupancy Rate</h3>
          <p>{occupancyRate || 0}%</p>
        </div>
        <div className="card">
          <h3>Available Rooms</h3>
          <p>{availableRooms || 0}</p>
        </div>
        <div className="card">
          <h3>Pending Payments</h3>
          <p>{pendingPayments || 0}</p>
        </div>
      </div>

      <div className="chart-section">
        <div className="chart-container">
          <h3>Booking Trend - Last 5 Weeks</h3>
          <Line data={bookingTrendData} />
        </div>
        <div className="chart-container">
          <h3>Occupancy by Room Type</h3>
          <Doughnut data={occupancyByRoomTypeData} />
        </div>
      </div>

      <div className="reviews-section">
        <div className="review-card">
          <h3>Reviews - this Month</h3>
          <p>{reviews?.averageRating || '0.0'} ★★★★★</p>
        </div>
        <div className="review-card">
          <h3>New</h3>
          <p>{reviews?.newReviews || 0}</p>
        </div>
        <div className="review-card">
          <h3>Feedbacks</h3>
          <p>{reviews?.feedbacks || 0}</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardAdmin;