// src/components/ThemeToggle.jsx
import React from 'react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = ({ compact = false }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      style={{
        width: 38,
        height: 38,
        borderRadius: '50%',
        border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
        background: 'var(--card-bg, rgba(255,255,255,0.05))',
        color: 'var(--text-primary, #e5e7eb)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1rem',
        transition: 'all 0.2s'
      }}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
};

export default ThemeToggle;