import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { LayoutDraftService } from '../../services/layout-draft/layout-draft.service';
import { SeatingDraftService } from '../../services/seating-draft/seating-draft.service';

export const pendingChangesGuard: CanDeactivateFn<unknown> = () => {
  const layoutDraft  = inject(LayoutDraftService);
  const seatingDraft = inject(SeatingDraftService);

  if (!layoutDraft.hasPendingChanges() && !seatingDraft.hasPendingChanges()) return true;

  const what = [
    layoutDraft.hasPendingChanges()  && 'floor plan positions',
    seatingDraft.hasPendingChanges() && 'guest seating assignments'
  ].filter(Boolean).join(' and ');

  return window.confirm(`You have unsaved ${what}. Leave this page and discard them?`);
};