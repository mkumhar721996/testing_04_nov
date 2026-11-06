import { fireEvent, render, screen } from '@testing-library/react';
import { ReasonForm } from './ReasonForm';

describe('ReasonForm', () => {
  it('refuses a spaces-only reason without submitting (AC2, AC21)', () => {
    const onSubmit = vi.fn();
    render(<ReasonForm kind="reject" pending={false} onSubmit={onSubmit} onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reject defect' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter a reason to reject this defect. The defect stays Triaged.',
    );
    const field = screen.getByLabelText('Reason');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveClass('is-invalid');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('refuses an empty reopen reason (AC6, AC22)', () => {
    const onSubmit = vi.fn();
    render(<ReasonForm kind="reopen" pending={false} onSubmit={onSubmit} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reopen defect' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter a reason to reopen this defect. The defect stays Closed.',
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the trimmed reason', () => {
    const onSubmit = vi.fn();
    render(<ReasonForm kind="reject" pending={false} onSubmit={onSubmit} onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: ' Duplicate of DEF-12 ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reject defect' }));
    expect(onSubmit).toHaveBeenCalledWith('Duplicate of DEF-12');
  });

  it('disables submit with a pending label while submitting', () => {
    render(<ReasonForm kind="reopen" pending onSubmit={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole('button', { name: /Reopening…/ })).toBeDisabled();
  });

  it('cancels', () => {
    const onCancel = vi.fn();
    render(<ReasonForm kind="reject" pending={false} onSubmit={() => {}} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
