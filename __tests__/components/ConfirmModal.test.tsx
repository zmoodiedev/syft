/**
 * Tests for <ConfirmModal />
 *
 * Verifies that the modal renders correctly, responds to user
 * interaction, and calls the right callbacks.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmModal from '@/app/components/ConfirmModal';

// headlessui Dialog uses portals, which jest-dom handles fine with jsdom

describe('ConfirmModal', () => {
  const baseProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    title: 'Delete recipe',
    message: 'This will permanently delete this recipe.',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title and message when open', () => {
    render(<ConfirmModal {...baseProps} />);
    expect(screen.getByText('Delete recipe')).toBeInTheDocument();
    expect(screen.getByText('This will permanently delete this recipe.')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<ConfirmModal {...baseProps} isOpen={false} />);
    expect(screen.queryByText('Delete recipe')).not.toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', () => {
    render(<ConfirmModal {...baseProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
    expect(baseProps.onConfirm).not.toHaveBeenCalled();
  });

  it('calls onConfirm when the confirm button is clicked', () => {
    render(<ConfirmModal {...baseProps} confirmLabel="Delete" />);
    fireEvent.click(screen.getByText('Delete'));
    expect(baseProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('uses a custom confirmLabel', () => {
    render(<ConfirmModal {...baseProps} confirmLabel="Remove" />);
    expect(screen.getByText('Remove')).toBeInTheDocument();
  });

  it('defaults confirmLabel to "Delete"', () => {
    render(<ConfirmModal {...baseProps} />);
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('disables both buttons and shows loading state when loading=true', () => {
    render(<ConfirmModal {...baseProps} confirmLabel="Delete" loading={true} />);
    const cancelBtn = screen.getByText('Cancel');
    const deleteBtn = screen.getByText('Deleting...');
    expect(cancelBtn).toBeDisabled();
    expect(deleteBtn).toBeDisabled();
  });

  it('calls onClose when the X icon button is clicked', () => {
    render(<ConfirmModal {...baseProps} />);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
  });
});
