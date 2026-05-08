// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SharedPostMessageCard from './SharedPostMessageCard';

describe('SharedPostMessageCard', () => {
  it('preview mode shows content and does not require router for navigation target', () => {
    render(
      <SharedPostMessageCard
        variant="preview"
        sharedPostId={42}
        authorFirst="Ada"
        authorLast="Lovelace"
        contentPreview="Hello campus"
        badgeLabel="HUB POST"
        openLabel="Open post"
        emptyContentLabel="(No text)"
      />
    );
    expect(screen.getByText('Hello campus')).toBeTruthy();
    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
    expect(screen.getByText('HUB POST')).toBeTruthy();
  });

  it('mine variant links to post detail', () => {
    const { container } = render(
      <MemoryRouter>
        <SharedPostMessageCard
          variant="mine"
          sharedPostId={7}
          contentPreview="X"
          badgeLabel="B"
          openLabel="O"
          emptyContentLabel="E"
        />
      </MemoryRouter>
    );
    const a = container.querySelector('a[href="/post/7"]');
    expect(a).not.toBeNull();
  });
});
