import React from 'react';
import '../styles/components.css';

interface LoadingProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

export const Loading: React.FC<LoadingProps> = ({ 
  message = 'Loading...', 
  size = 'medium' 
}) => (
  <div className="loading-container">
    <div className={`spinner spinner-${size}`}></div>
    {message && <p className="loading-message">{message}</p>}
  </div>
);
