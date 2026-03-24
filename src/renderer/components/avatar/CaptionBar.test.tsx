// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CaptionBar } from './CaptionBar';

describe('CaptionBar', () => {
  it('renders text when visible', () => {
    render(<CaptionBar text="Hello world" visible={true} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders nothing when text is null', () => {
    const { container } = render(<CaptionBar text={null} visible={true} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when text is empty', () => {
    const { container } = render(<CaptionBar text="" visible={true} />);
    expect(container.firstChild).toBeNull();
  });
});
