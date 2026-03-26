import React from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/components.css';

interface LoadingProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

export const Loading: React.FC<LoadingProps> = ({ 
  message, 
  size = 'medium' 
}) => {
  const { t } = useTranslation();
  const displayMessage = message ?? t('loading.default');
  return (
  <div className="loading-container">
    <div className={`spinner spinner-${size}`}></div>
    {displayMessage && <p className="loading-message">{displayMessage}</p>}
  </div>
  );
};
