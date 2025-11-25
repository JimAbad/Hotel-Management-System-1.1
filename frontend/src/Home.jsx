import React from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-hero">
      <div className="hero-content">
        <h1>Find your perfect room, anytime, with ease.</h1>
        <button className="reserve-now-btn" onClick={() => navigate('/rooms')}>Reserve Now</button>
        <div className="hero-features">
          <div className="feature-item">
            <span className="star-rating">★★★★★</span> 5 STAR
          </div>
          <div className="feature-item">
            Best Price Guarantee
          </div>
          <div className="feature-item">
            Low Cancellation fee
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;