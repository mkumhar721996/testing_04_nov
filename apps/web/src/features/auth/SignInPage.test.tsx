import { fireEvent, render, screen } from '@testing-library/react';
import { SessionProvider } from './SessionProvider';
import { SignInPage } from './SignInPage';

const mount = () =>
  render(
    <SessionProvider>
      <SignInPage />
    </SessionProvider>,
  );

const submit = (email: string, password: string) => {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
};

describe('SignInPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it('asks for missing values without calling the API', () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Enter your email address.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(f).not.toHaveBeenCalled();
  });

  it('shows an alert for wrong credentials and stays on the page', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('{}', { status: 401 }))));
    mount();
    submit('buyer@poc.example', 'wrong');
    expect(await screen.findByRole('alert')).toHaveTextContent('The email or password is incorrect');
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('shows a retry message when the API is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('down'))));
    mount();
    submit('buyer@poc.example', 'test-password');
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't sign you in");
  });
});
