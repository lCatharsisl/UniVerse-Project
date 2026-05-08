// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LoadingButton } from '../components/LoadingButton';

describe('LoadingButton interactions', () => {
  it('calls onClick when not loading', () => {
    const onClick = vi.fn();
    render(
      <LoadingButton loading={false} onClick={onClick}>
        Save
      </LoadingButton>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled and shows loading text when loading=true', () => {
    const onClick = vi.fn();
    render(
      <LoadingButton loading onClick={onClick}>
        Save
      </LoadingButton>
    );

    const button = screen.getByRole('button', { name: /Loading.../i });
    expect(button).toHaveProperty('disabled', true);
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
