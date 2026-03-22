import React from 'react';
import {useAccessibility} from '../context/AccessibilityContext';
import './AccessibilityToggle.css';

const AccessibilityToggle = () => {
    const {highContrast, toggleHighContrast, fontSize, increaseFontSize, decreaseFontSize, boldText, toggleBold} = useAccessibility();

    return (
        <div className="accessibility-controls">
            <button
                className="accessibility-toggle"
                onClick={toggleHighContrast}
                aria-label="Toggle high contrast mode"
            >
                <span className="toggle-icon">{highContrast ? '🌙' : '🌞'}</span>
                <span className="toggle-text">{highContrast ? 'Disable' : 'Enable'} High Contrast</span>
            </button>

            <div className="font-controls">
                <button onClick={decreaseFontSize} aria-label="Decrease font size">A-</button>
                <span>{fontSize}px</span>
                <button onClick={increaseFontSize} aria-label="Increase font size">A+</button>
                <button onClick={toggleBold} aria-label="Toggle bold text" style={{ fontWeight: boldText ? 'bold' : 'normal' }}>
                    B
                </button>
            </div>
        </div>
    );
};

export default AccessibilityToggle;
