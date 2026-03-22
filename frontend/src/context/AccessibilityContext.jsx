import React, {createContext, useState, useContext, useEffect} from 'react';

const AccessibilityContext = createContext();

export const AccessibilityProvider = ({children}) => {
    const [highContrast, setHighContrast] = useState(false);
    const [fontSize, setFontSize] = useState(16);
    const [boldText, setBoldText] = useState(false);

    const toggleHighContrast = () => setHighContrast(prev => !prev);
    const toggleBold = () => setBoldText(prev => !prev);
    const increaseFontSize = () => setFontSize(prev => Math.min(prev + 2, 24));
    const decreaseFontSize = () => setFontSize(prev => Math.max(prev - 2, 12));

    useEffect(() => {
        if (highContrast) {
            document.body.classList.add('high-contrast-mode');
        } else {
            document.body.classList.remove('high-contrast-mode');
        }
    }, [highContrast]);

    useEffect(() => {
        document.documentElement.style.setProperty('--app-font-size', `${fontSize}px`);
    }, [fontSize]);

    useEffect(() => {
        document.documentElement.style.setProperty('--app-font-weight', boldText ? 'bold' : 'normal');
    }, [boldText]);

    return (
        <AccessibilityContext.Provider value={{highContrast, toggleHighContrast, fontSize, increaseFontSize, decreaseFontSize, boldText, toggleBold}}>
        {children}
        </AccessibilityContext.Provider>
    );
};

export const useAccessibility = () => {
    const context = useContext(AccessibilityContext);
    if (!context) {
        throw new Error('useAccessibility must be used within an AccessibilityProvider');
    }
    return context;
};
