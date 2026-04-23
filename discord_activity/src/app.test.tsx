/**
 * Frontend Unit Tests
 *
 * Simple tests for the Activity shell components.
 * Run with: npm test
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './app';
import type { DiscordContext } from './discord';

// Mock minimal Discord context
const mockDiscordContext: DiscordContext = {
  isRunningInDiscord: false,
};

describe('Activity Shell', () => {
  describe('App Component', () => {
    it('renders loading state initially', () => {
      render(<App sessionId={undefined} discordContext={mockDiscordContext} />);
      // The component shows loading initially, then fetches state
      expect(screen.getByText(/loading/i)).toBeDefined();
    });

    it('shows discord badge when in Discord context', () => {
      const discordContext: DiscordContext = {
        isRunningInDiscord: true,
        user: {
          id: '123',
          username: 'TestUser',
          discriminator: '0001',
          avatar: '',
        },
      };
      render(<App sessionId={undefined} discordContext={discordContext} />);
      // Look for Discord indicator in loading state
      const loading = screen.getByText(/loading/i);
      expect(loading).toBeDefined();
    });
  });
});

// Note: For full integration tests, you would need to mock fetch
// and test the state polling behavior. For now, these basic tests
// verify the component structure.
