import React, {createContext, useState, useContext, useEffect} from 'react';

const AccessibilityContext = createContext();

export const AccessibilityProvider = ({children}) => {
    const [highContrast, setHighContrast] = useState(false);
    const toggleHighContrast = () => {
        setHighContrast(prev => !prev);
    };
    useEffect(() => {
        if (highContrast) {
            document.body.classList.add('high-contrast-mode');
        } else {
            document.body.classList.remove('high-contrast-mode');
        }
    }, [highContrast]);

    return (
        <AccessibilityContext.Provider value={{highContrast, toggleHighContrast}}>
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