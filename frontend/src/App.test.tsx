import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders NASA Weather Analyzer title', () => {
  render(<App />);
  const titleElement = screen.getByText(/NASA Weather Analyzer/i);
  expect(titleElement).toBeInTheDocument();
});
