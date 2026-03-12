import React from 'react';
import {useAccessibility} from '../context/AccessibilityContext';
import './AccessibilityToggle.css';

const AccessibilityToggle = () => {
    const {highContrast, toggleHighContrast} = useAccessibility();

    return (
    <button 
      className="accessibility-toggle"
      onClick={toggleHighContrast}
      aria-label="Toggle high contrast mode"
    >
      <span className="toggle-icon">
        {highContrast ? '🌙' : '🌞'}
      </span>
      <span className="toggle-text">
        {highContrast ? 'Disable' : 'Enable'} High Contrast
      </span>
    </button>
    );
};

export default AccessibilityToggle;