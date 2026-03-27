import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the chantier console heading', () => {
  render(<App />);
  expect(screen.getByText(/gestion chantier/i)).toBeInTheDocument();
});
