import React from 'react';
import '../styles/components.css';

interface LoadingButtonProps {
  loading: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  className?: string;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading,
  children,
  onClick,
  type = 'button',
  disabled,
  className = '',
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={loading || disabled}
    className={`btn ${loading ? 'btn-loading' : ''} ${className}`}
  >
    {loading ? (
      <>
        <span className="spinner-small"></span>
        <span>Loading...</span>
      </>
    ) : (
      children
    )}
  </button>
);
