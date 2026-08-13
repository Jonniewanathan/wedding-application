export interface FloorPlanSettings {
  id: string; // Added ID field
  width: number;
  height: number;
  unit: 'px' | 'm' | 'cm';
  scaleFactor: number; // Pixels per unit (e.g., 100 for 1m = 100px)
}
