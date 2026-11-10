import { fireEvent, render, screen } from '@testing-library/react';
import { AppShell } from './AppShell';

const setup = () => {
  const onNavigate = vi.fn();
  const onSignOut = vi.fn();
  render(
    <AppShell
      navItems={[
        { key: 'search', label: 'Search' },
        { key: 'orders', label: 'Orders' },
      ]}
      currentKey="orders"
      onNavigate={onNavigate}
      user={{ name: 'Cy CSR', title: 'CSR' }}
      onSignOut={onSignOut}
    >
      <p>content</p>
    </AppShell>,
  );
  return { onNavigate, onSignOut };
};

describe('AppShell', () => {
  it('renders only the given nav items and marks the current one', () => {
    setup();
    expect(screen.getAllByRole('link').map((l) => l.textContent)).toEqual(['Search', 'Orders']);
    expect(screen.getByRole('link', { name: 'Orders' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Search' })).not.toHaveAttribute('aria-current');
  });

  it('reports the key of the clicked nav item', () => {
    const { onNavigate } = setup();
    fireEvent.click(screen.getByRole('link', { name: 'Search' }));
    expect(onNavigate).toHaveBeenCalledWith('search');
  });

  it('calls onSignOut from the top bar button', () => {
    const { onSignOut } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('toggles the mobile menu', () => {
    setup();
    const menu = screen.getByRole('button', { name: 'Menu' });
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(menu);
    expect(menu).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('navigation', { name: 'Main' })).toHaveClass('is-open');
  });
});

describe('AppShell header search', () => {
  const renderWith = (onSearch?: (q: string) => void) =>
    render(
      <AppShell
        navItems={[{ key: 'search', label: 'Search' }]}
        currentKey="search"
        onNavigate={() => {}}
        user={{ name: 'Cy CSR', title: 'CSR' }}
        onSignOut={() => {}}
        onSearch={onSearch}
      >
        <p>content</p>
      </AppShell>,
    );

  it('submits the typed query', () => {
    const onSearch = vi.fn();
    renderWith(onSearch);
    fireEvent.change(screen.getByLabelText('Search parts'), { target: { value: 'brake pad' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(onSearch).toHaveBeenCalledWith('brake pad');
  });

  it('is absent without an onSearch handler', () => {
    renderWith();
    expect(screen.queryByRole('search')).not.toBeInTheDocument();
  });
});
