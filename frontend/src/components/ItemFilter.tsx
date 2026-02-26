import React, { useState } from 'react';
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
  const [filters, setFilters] = useState<FilterOptions>({
    location: '',
    dateFrom: '',
    dateTo: '',
    isResolved: '',
  });

  const handleChange = (field: keyof FilterOptions, value: any) => {
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
      <h3>Filters</h3>

      <div className="filter-group">
        <label>
          Location:
          <input
            type="text"
            value={filters.location}
            onChange={(e) => handleChange('location', e.target.value)}
            placeholder="e.g. Engineering Building"
          />
        </label>

        <label>
          From Date:
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleChange('dateFrom', e.target.value)}
          />
        </label>

        <label>
          To Date:
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleChange('dateTo', e.target.value)}
          />
        </label>

        <label>
          Status:
          <select
            value={filters.isResolved === true ? 'resolved' : filters.isResolved === false ? 'unresolved' : ''}
            onChange={(e) => {
              const value = e.target.value;
              handleChange('isResolved', value === '' ? '' : value === 'resolved');
            }}
          >
            <option value="">All</option>
            <option value="unresolved">Active/Unresolved</option>
            <option value="resolved">Resolved</option>
          </select>
        </label>
      </div>

      <div className="filter-actions">
        <button onClick={handleApply} className="btn btn-primary">
          Apply Filters
        </button>
        <button onClick={handleReset} className="btn btn-secondary">
          Reset
        </button>
      </div>
    </div>
  );
};
