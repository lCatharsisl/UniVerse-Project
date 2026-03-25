import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/components.css';

interface SearchBarProps {
  onSearch: (searchTerm: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder,
  className = '',
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchTerm);
  };

  const handleClear = () => {
    setSearchTerm('');
    onSearch('');
  };

  return (
    <form onSubmit={handleSubmit} className={`search-bar ${className}`}>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder={placeholder ?? t('searchBar.placeholder')}
        className="search-input"
      />
      {searchTerm && (
        <button
          type="button"
          onClick={handleClear}
          className="search-clear"
          aria-label={t('searchBar.clearSearch')}
        >
          ✕
        </button>
      )}
      <button type="submit" className="search-button">
        🔍 {t('searchBar.search')}
      </button>
    </form>
  );
};
