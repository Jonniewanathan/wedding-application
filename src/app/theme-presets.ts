// "Terracotta Earth" - Light Theme Palette
import {definePreset} from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

const lightPrimitives = {
  primary: { // Based on Muted Terracotta (#B87333)
    50: '#fdf8f4', 100: '#fbece2', 200: '#f7dbc1', 300: '#f1c59c', 400: '#eaad74',
    500: '#B87333', 600: '#a7672d', 700: '#8f5626', 800: '#7a4922', 900: '#683f1f', 950: '#3e2511'
  },
  surface: { // Based on Cream/Beige/White
    0: '#ffffff', 50: '#FFFBF5', 100: '#F7F2E9', 200: '#EBE5D9', 300: '#D3CBBF',
    400: '#b7ada1', 500: '#9b9084', 600: '#7f7569', 700: '#655d52', 800: '#4e463e',
    900: '#5D4037', 950: '#2a2521'
  }
};

// "Muted Gold" - Dark Theme Palette
const darkPrimitives = {
  primary: { // Based on Muted Gold (#D4AF37)
    50: '#fefbeA', 100: '#fbf4c7', 200: '#f8ec9b', 300: '#f4e26a', 400: '#f0d73e',
    500: '#D4AF37', 600: '#c59f31', 700: '#a8852a', 800: '#8e6e25', 900: '#795b22', 950: '#4a3611'
  },
  surface: { // Dark Grays
    0: '#111827', 50: '#1f2937', 100: '#374151', 200: '#4b5563', 300: '#6b7280',
    400: '#9ca3af', 500: '#d1d5db', 600: '#e5e7eb', 700: '#f3f4f6', 800: '#f9fafb',
    900: '#ffffff', 950: '#ffffff'
  }
};

// Define the Custom Preset
export const CustomPrimengPreset = definePreset(Aura, {
  primitive: {
    light: lightPrimitives,
    dark: darkPrimitives
  }
});
