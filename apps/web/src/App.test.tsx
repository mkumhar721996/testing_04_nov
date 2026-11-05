import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';

vi.mock('./api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api/client')>()),
  getMe: vi.fn().mockResolvedValue({ isLead: true }),
  listComponents: vi.fn().mockResolvedValue([]),
}));

describe('App', () => {
  it('renders the settings screen inside the app shell', async () => {
    render(<App />);
    await screen.findByText('No components yet');
    expect(screen.getByRole('heading', { name: 'Components' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('aria-current', 'page');
  });
});
