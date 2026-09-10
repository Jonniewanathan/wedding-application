export interface FloorPlanSettings {
  id: string;
  /** Canvas width in px — always px regardless of `unit`. */
  width: number;
  /** Canvas height in px — always px regardless of `unit`. */
  height: number;
  /** Display unit shown in the settings panel; the canvas itself always works in px. */
  unit: 'px' | 'm' | 'cm';
  /** Pixels per *meter*, always — cm is derived from meters via the fixed 100:1 ratio (e.g. 100 means 1m = 100px). */
  scaleFactor: number;
}
