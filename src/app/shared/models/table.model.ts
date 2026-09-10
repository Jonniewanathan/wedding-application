import { Timestamp } from '@angular/fire/firestore';

export type TableShape = 'round' | 'rectangle';

export interface Table {
  id: string;
  name: string;
  shape: TableShape;
  capacity: number;
  positionX?: number | null;
  positionY?: number | null;
  notes?: string | null;
  createdAt: Timestamp;
  updatedAt?: Timestamp | null;
}