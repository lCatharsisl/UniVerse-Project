// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import LanguageSwitch from '../components/LanguageSwitch';

const changeLanguage = vi.fn();
const i18nMock = { language: 'en', changeLanguage };

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: i18nMock }),
}));

vi.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ dimension: 'ground' }),
}));

describe('LanguageSwitch interactions', () => {
  it('opens menu and changes language to TR', () => {
    render(<LanguageSwitch />);

    const toggle = screen.getByRole('button', { name: "Türkçe'ye geç" });
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole('button', { name: 'TR' }));

    expect(changeLanguage).toHaveBeenCalledWith('tr');
  });
});
