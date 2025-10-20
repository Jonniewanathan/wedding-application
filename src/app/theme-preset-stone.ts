// src/app/theme-preset-stone.ts

import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura'; // Make sure @primeng/themes is installed

// --- Define your color scales ---

// "Convent Stone" - Light Theme Palette
const lightPrimitivesStone = {
  primary: { // Based on Slate Blue (#465A75)
    50: '#f5f7f9',
    100: '#e1e5eb',
    200: '#cad4df',
    300: '#aab9cc',
    400: '#8498b5',
    500: '#465A75', // Your Primary
    600: '#3f516a',
    700: '#36445a',
    800: '#2e394c',
    900: '#293240',
    950: '#1a2029'
  },
  surface: { // Based on Stone Gray/White
    0: '#ffffff',    // White
    50: '#f9fafb',   // Very Light Gray
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#D3D3D3',  // Light Stone Gray (like surface-a/ground)
    400: '#9ca3af',
    500: '#6b7280',  // Mid Gray
    600: '#4b5563',
    700: '#36454F',  // Charcoal Gray (Text Color)
    800: '#1f2937',
    900: '#111827',
    950: '#000000'   // Black
  }
};

// "Muted Gold" - Dark Theme Palette (Using the same as the Earth theme for consistency)
const darkPrimitivesStone = {
  primary: { // Based on Muted Gold (#D4AF37)
    50: '#fefbeA', 100: '#fbf4c7', 200: '#f8ec9b', 300: '#f4e26a', 400: '#f0d73e',
    500: '#D4AF37', 600: '#c59f31', 700: '#a8852a', 800: '#8e6e25', 900: '#795b22', 950: '#4a3611'
  },
  surface: { // Dark Grays (Same as Earth dark theme)
    0: '#111827', 50: '#1f2937', 100: '#374151', 200: '#4b5563', 300: '#6b7280',
    400: '#9ca3af', 500: '#d1d5db', 600: '#e5e7eb', 700: '#f3f4f6', 800: '#f9fafb',
    900: '#ffffff', 950: '#ffffff'
  }
};

// --- Define the Stone Preset ---
export const StonePrimengPreset = definePreset(Aura, {
  primitive: {
    light: lightPrimitivesStone,
    dark: darkPrimitivesStone // Using the same dark palette as the Earth theme
  }
});
