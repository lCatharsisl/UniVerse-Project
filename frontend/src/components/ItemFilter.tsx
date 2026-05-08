import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/components.css';

export interface FilterOptions {
  location?: string;
  dateFrom?: string;
  dateTo?: string;
  isResolved?: boolean | '';
}

interface ItemFilterProps {
  onFilter: (filters: FilterOptions) => void;
  onReset?: () => void;
}

export const ItemFilter: React.FC<ItemFilterProps> = ({ onFilter, onReset }) => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<FilterOptions>({
    location: '',
    dateFrom: '',
    dateTo: '',
    isResolved: '',
  });

  const handleChange = (field: keyof FilterOptions, value: FilterOptions[keyof FilterOptions]) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleApply = () => {
    // Remove empty filters
    const cleanFilters = Object.entries(filters).reduce((acc, [key, value]) => {
      if (value !== '' && value !== undefined) {
        acc[key as keyof FilterOptions] = value;
      }
      return acc;
    }, {} as FilterOptions);

    onFilter(cleanFilters);
  };

  const handleReset = () => {
    setFilters({
      location: '',
      dateFrom: '',
      dateTo: '',
      isResolved: '',
    });
    onReset?.();
  };

  return (
    <div className="filter-panel">
      <h3>{t('itemFilter.filters')}</h3>

      <div className="filter-group">
        <label>
          {t('itemFilter.location')}:
          <input
            type="text"
            value={filters.location}
            onChange={(e) => handleChange('location', e.target.value)}
            placeholder={t('itemFilter.locationPlaceholder')}
          />
        </label>

        <label>
          {t('itemFilter.fromDate')}:
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleChange('dateFrom', e.target.value)}
          />
        </label>

        <label>
          {t('itemFilter.toDate')}:
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleChange('dateTo', e.target.value)}
          />
        </label>

        <label>
          {t('itemFilter.status')}:
          <select
            value={filters.isResolved === true ? 'resolved' : filters.isResolved === false ? 'unresolved' : ''}
            onChange={(e) => {
              const value = e.target.value;
              handleChange('isResolved', value === '' ? '' : value === 'resolved');
            }}
          >
            <option value="">{t('itemFilter.all')}</option>
            <option value="unresolved">{t('itemFilter.activeUnresolved')}</option>
            <option value="resolved">{t('itemFilter.resolved')}</option>
          </select>
        </label>
      </div>

      <div className="filter-actions">
        <button onClick={handleApply} className="btn btn-primary">
          {t('itemFilter.applyFilters')}
        </button>
        <button onClick={handleReset} className="btn btn-secondary">
          {t('common.reset')}
        </button>
      </div>
    </div>
  );
};
