// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SearchBar } from '../components/SearchBar';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('SearchBar interactions', () => {
  it('submits entered text and clears correctly', () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'campus map' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);

    expect(onSearch).toHaveBeenCalledWith('campus map');

    const clearBtn = screen.getByRole('button', { name: 'searchBar.clearSearch' });
    fireEvent.click(clearBtn);
    expect(onSearch).toHaveBeenCalledWith('');
  });
});
