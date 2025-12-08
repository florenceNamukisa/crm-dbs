import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState({
    primaryColor: '#ff8c00',
    sidebarStyle: 'expanded',
    mode: 'light' // light or dark
  });

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('crm_theme');
    if (savedTheme) {
      try {
        const parsedTheme = JSON.parse(savedTheme);
        setTheme(parsedTheme);
        applyTheme(parsedTheme);
      } catch (error) {
        console.error('Failed to parse saved theme:', error);
      }
    }
  }, []);

  // Apply theme to CSS variables and document
  const applyTheme = (themeConfig) => {
    const root = document.documentElement;

    // Set CSS custom properties for primary color
    root.style.setProperty('--primary-color', themeConfig.primaryColor);
    root.style.setProperty('--primary-hover', adjustColor(themeConfig.primaryColor, -20));

    // Apply dark mode if needed
    if (themeConfig.mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Apply primary color to specific elements
    const primaryElements = document.querySelectorAll('.bg-orange-500, .text-orange-500, .border-orange-500, .hover\\:bg-orange-600, .hover\\:text-orange-600');
    primaryElements.forEach(element => {
      if (element.classList.contains('bg-orange-500')) {
        element.style.backgroundColor = themeConfig.primaryColor;
      }
      if (element.classList.contains('text-orange-500')) {
        element.style.color = themeConfig.primaryColor;
      }
      if (element.classList.contains('border-orange-500')) {
        element.style.borderColor = themeConfig.primaryColor;
      }
    });
  };

  // Helper function to adjust color brightness
  const adjustColor = (color, amount) => {
    const usePound = color[0] === '#';
    const col = usePound ? color.slice(1) : color;

    const num = parseInt(col, 16);
    let r = (num >> 16) + amount;
    let g = (num >> 8 & 0x00FF) + amount;
    let b = (num & 0x0000FF) + amount;

    r = r > 255 ? 255 : r < 0 ? 0 : r;
    g = g > 255 ? 255 : g < 0 ? 0 : g;
    b = b > 255 ? 255 : b < 0 ? 0 : b;

    return (usePound ? '#' : '') + (r << 16 | g << 8 | b).toString(16);
  };

  // Update theme and save to localStorage
  const updateTheme = (newTheme) => {
    const updatedTheme = { ...theme, ...newTheme };
    setTheme(updatedTheme);
    localStorage.setItem('crm_theme', JSON.stringify(updatedTheme));
    applyTheme(updatedTheme);
  };

  // Reset theme to default
  const resetTheme = () => {
    const defaultTheme = {
      primaryColor: '#ff8c00',
      sidebarStyle: 'expanded',
      mode: 'light'
    };
    updateTheme(defaultTheme);
  };

  const value = {
    theme,
    updateTheme,
    resetTheme,
    applyTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};


