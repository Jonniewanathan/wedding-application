import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, query, where, orderBy, limit,
  getDocs, collectionData, doc, setDoc, docData,
  deleteDoc, updateDoc, writeBatch, serverTimestamp,
  addDoc, DocumentReference, getDoc, arrayRemove, arrayUnion, FieldValue, Timestamp
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Invitation, InvitationOutreachStage } from '../../../shared/models/invitation.model';
import { Guest } from '../../../shared/models/guest.model';
import { Table } from '../../../shared/models/table.model';
import { FloorPlanSettings } from '../../../shared/models/floor-plan-settings.model';
import { AuthService } from '../auth/auth';
import {
  ActivityAction,
  ActivityActor,
  ActivityLogEntry,
  ActivitySubject
} from '../../../shared/models/activity-log.model';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private firestore: Firestore = inject(Firestore);
  private authService = inject(AuthService);

  constructor() { }

  // -------------------------------------------------------------------------
  // Activity log — see shared/models/activity-log.model.ts.
  // -------------------------------------------------------------------------

  logActivity(entry: {
    action: ActivityAction;
    subject: ActivitySubject;
    summary: string;
    actor?: ActivityActor;
    details?: Record<string, unknown> | null;
  }): Promise<DocumentReference> {
    const collectionRef = collection(this.firestore, 'activity_log');
    return addDoc(collectionRef, {
      action: entry.action,
      subject: entry.subject,
      summary: entry.summary,
      actor: entry.actor ?? this.currentAdminActor(),
      details: entry.details ?? null,
      timestamp: serverTimestamp()
    });
  }

  getRecentActivity(max = 100): Observable<ActivityLogEntry[]> {
    const collectionRef = collection(this.firestore, 'activity_log');
    const q = query(collectionRef, orderBy('timestamp', 'desc'), limit(max));
    return collectionData(q, { idField: 'id' }) as Observable<ActivityLogEntry[]>;
  }

  private currentAdminActor(): ActivityActor {
    const user = this.authService.currentUser();
    if (user) {
      return {
        role: 'admin',
        label: user.email ?? user.displayName ?? user.uid ?? 'admin'
      };
    }
    return { role: 'system', label: 'system' };
  }

  private logSilently(entry: Parameters<FirestoreService['logActivity']>[0]): void {
    this.logActivity(entry).catch(err =>
      console.warn('activity log write failed', entry.action, err)
    );
  }

  async addGuest(firstName: string, lastName: string, country: string, notes: string): Promise<void> {
    const collectionRef = collection(this.firestore, 'guests');
    const newDocRef = doc(collectionRef);

    const newGuestData = {
      firstName,
      lastName,
      countryOfResidence: country || '',
      notes: notes || '',
      invitationId: null,
      isAttending: null,
      needsBus: null,
      busPickupLocation: null,
      dietaryPreferences: [],
      allergies: [],
      dietaryNotes: '',
      type: 'primary',
      createdAt: serverTimestamp(),
      updatedAt: null
    };

    await setDoc(newDocRef, newGuestData);
    this.logSilently({
      action: 'guest_added',
      subject: { type: 'guest', id: newDocRef.id, name: `${firstName} ${lastName}` },
      summary: `Added guest ${firstName} ${lastName} to the unassigned pool.`
    });
  }

  getUnassignedGuests(): Observable<Guest[]> {
    const collectionRef = collection(this.firestore, 'guests');
    const q = query(collectionRef, where('invitationId', '==', null));
    return collectionData(q, { idField: 'id' }) as Observable<Guest[]>;
  }

  async deleteUnassignedGuest(guestId: string): Promise<boolean> {
    const docRef = doc(this.firestore, `guests/${guestId}`);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists() && docSnap.data()['invitationId'] === null) {
      await deleteDoc(docRef);
      return true;
    }
    return false;
  }

  async updateGuestDetails(guest: Partial<Guest> & { id: string }): Promise<void> {
    const docRef = doc(this.firestore, `guests/${guest.id}`);
    type UpdateValue = Guest[keyof Guest] | FieldValue;
    const updateData: Record<string, UpdateValue> = {
      updatedAt: serverTimestamp()
    };

    const fields: (keyof Guest)[] = ['firstName', 'lastName', 'countryOfResidence', 'notes', 'isAttending', 'needsBus', 'busPickupLocation', 'dietaryPreferences', 'allergies', 'dietaryNotes', 'tableId', 'seatNumber'];

    fields.forEach(field => {
      const value = guest[field];
      if (value !== undefined) {
        updateData[field] = value;
      }
    });

    await updateDoc(docRef, updateData);

    const guestDisplay = [guest.firstName, guest.lastName].filter(Boolean).join(' ') || guest.id;
    if (guest.isAttending !== undefined) {
      this.logSilently({
        action: 'guest_attendance_changed',
        subject: { type: 'guest', id: guest.id, name: guestDisplay },
        summary:
          guest.isAttending === true
            ? `Marked ${guestDisplay} as attending.`
            : guest.isAttending === false
              ? `Marked ${guestDisplay} as declined.`
              : `Reset attendance for ${guestDisplay} to pending.`,
        details: { isAttending: guest.isAttending }
      });
    } else {
      this.logSilently({
        action: 'guest_updated',
        subject: { type: 'guest', id: guest.id, name: guestDisplay },
        summary: `Edited details for ${guestDisplay}.`
      });
    }
  }

  async createInvitation(details: {
    displayName: string;
    email?: string | null;
    phoneNumber?: string | null;
  }): Promise<DocumentReference<Invitation>> {
    const collectionRef = collection(this.firestore, 'invitations');
    const uniqueCode = self.crypto.randomUUID();

    const ref = (await addDoc(collectionRef, {
      invitationCode: uniqueCode,
      displayName: details.displayName,
      email: details.email ?? null,
      phoneNumber: details.phoneNumber ?? null,
      hasResponded: false,
      status: 'sent',
      guestIds: [],
      message: null,
      createdAt: serverTimestamp(),
      updatedAt: null
    })) as DocumentReference<Invitation>;

    try {
      await setDoc(doc(this.firestore, `invitation_codes/${uniqueCode}`), {
        invitationId: ref.id,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.warn('invitation_codes lookup write failed', uniqueCode, err);
    }

    this.logSilently({
      action: 'invitation_created',
      subject: { type: 'invitation', id: ref.id, name: details.displayName },
      summary: `Created invitation group "${details.displayName}".`
    });

    return ref;
  }

  async updateInvitation(invitationId: string, details: {
    displayName: string;
    email?: string | null;
    phoneNumber?: string | null;
  }): Promise<void> {
    const docRef = doc(this.firestore, `invitations/${invitationId}`);
    type UpdateValue = string | null | FieldValue;
    const payload: Record<string, UpdateValue> = {
      displayName: details.displayName,
      updatedAt: serverTimestamp()
    };
    if (details.email !== undefined) payload['email'] = details.email;
    if (details.phoneNumber !== undefined) payload['phoneNumber'] = details.phoneNumber;
    await updateDoc(docRef, payload);

    this.logSilently({
      action: 'invitation_updated',
      subject: { type: 'invitation', id: invitationId, name: details.displayName },
      summary: `Updated invitation group "${details.displayName}".`
    });
  }

  backfillRsvpSubmittedAt(updates: { id: string; rsvpSubmittedAt: Timestamp }[]): Promise<void> {
    if (updates.length === 0) return Promise.resolve();
    const batch = writeBatch(this.firestore);
    for (const u of updates) {
      const ref = doc(this.firestore, `invitations/${u.id}`);
      batch.update(ref, { rsvpSubmittedAt: u.rsvpSubmittedAt });
    }
    return batch.commit();
  }

  async setInvitationOutreachStage(
    invitationId: string,
    stage: InvitationOutreachStage,
    isActive: boolean,
    invitationDisplayName?: string
  ): Promise<void> {
    const docRef = doc(this.firestore, `invitations/${invitationId}`);
    await updateDoc(docRef, {
      [stage]: isActive ? serverTimestamp() : null,
      updatedAt: serverTimestamp()
    });

    const stageLabel: Record<InvitationOutreachStage, string> = {
      sentAt: 'sent',
      firstReminderAt: '1st reminder',
      secondReminderAt: '2nd reminder'
    };
    const name = invitationDisplayName ?? `invitation ${invitationId}`;
    this.logSilently({
      action: isActive ? 'outreach_marked' : 'outreach_cleared',
      subject: { type: 'invitation', id: invitationId, name },
      summary: isActive
        ? `Marked ${stageLabel[stage]} sent for "${name}".`
        : `Cleared ${stageLabel[stage]} on "${name}".`,
      details: { stage }
    });
  }

  async assignGuestsToInvitation(invitationId: string, guestIds: string[]): Promise<void> {
    const batch = writeBatch(this.firestore);
    const invitationRef = doc(this.firestore, `invitations/${invitationId}`);
    batch.update(invitationRef, {
      guestIds: guestIds,
      updatedAt: serverTimestamp()
    });

    guestIds.forEach(guestId => {
      const guestRef = doc(this.firestore, `guests/${guestId}`);
      batch.update(guestRef, {
        invitationId: invitationId,
        updatedAt: serverTimestamp()
      });
    });

    return batch.commit();
  }

  async unassignGuest(guestId: string, currentInvitationId: string): Promise<void> {
    const batch = writeBatch(this.firestore);
    const guestRef = doc(this.firestore, `guests/${guestId}`);
    batch.update(guestRef, {
      invitationId: null,
      isAttending: null,
      needsBus: null,
      busPickupLocation: null,
      dietaryPreferences: [],
      allergies: [],
      dietaryNotes: '',
      updatedAt: serverTimestamp()
    });

    if (currentInvitationId) {
      const invitationRef = doc(this.firestore, `invitations/${currentInvitationId}`);
      batch.update(invitationRef, {
        guestIds: arrayRemove(guestId)
      });
    }

    return batch.commit();
  }

  getInvitations(): Observable<Invitation[]> {
    const collectionRef = collection(this.firestore, 'invitations');
    return collectionData(collectionRef, { idField: 'id' }) as Observable<Invitation[]>;
  }

  async getInvitationByCode(code: string): Promise<(Invitation & { id: string }) | null> {
    const lookupRef = doc(this.firestore, `invitation_codes/${code}`);
    const lookupSnap = await getDoc(lookupRef);

    if (lookupSnap.exists()) {
      const invitationId = lookupSnap.data()['invitationId'] as string | undefined;
      if (invitationId) {
        const inviteRef = doc(this.firestore, `invitations/${invitationId}`);
        const inviteSnap = await getDoc(inviteRef);
        if (inviteSnap.exists()) {
          return { id: inviteSnap.id, ...inviteSnap.data() } as Invitation & { id: string };
        }
      }
    }

    const invitationsCollection = collection(this.firestore, 'invitations');
    const q = query(invitationsCollection, where('invitationCode', '==', code));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) return null;

    const legacyDoc = querySnapshot.docs[0];
    return { id: legacyDoc.id, ...legacyDoc.data() } as (Invitation & { id: string });
  }

  async deleteInvitationAndUnassignGuests(
    invitationId: string,
    invitationDisplayName?: string
  ): Promise<void> {
    const batch = writeBatch(this.firestore);
    const guestsCollectionRef = collection(this.firestore, 'guests');
    const q = query(guestsCollectionRef, where('invitationId', '==', invitationId));
    const guestsSnapshot = await getDocs(q);

    const unassignedCount = guestsSnapshot.size;
    guestsSnapshot.forEach(guestDoc => {
      batch.update(guestDoc.ref, {
        invitationId: null,
        isAttending: null,
        needsBus: null,
        busPickupLocation: null,
        dietaryPreferences: [],
        allergies: [],
        dietaryNotes: '',
        updatedAt: serverTimestamp()
      });
    });

    const invitationRef = doc(this.firestore, `invitations/${invitationId}`);
    batch.delete(invitationRef);

    const invitationSnap = await getDoc(invitationRef);
    const invitationCode = invitationSnap.exists()
      ? (invitationSnap.data()['invitationCode'] as string | undefined)
      : undefined;
    if (invitationCode) {
      batch.delete(doc(this.firestore, `invitation_codes/${invitationCode}`));
    }

    await batch.commit();

    const name = invitationDisplayName ?? `invitation ${invitationId}`;
    this.logSilently({
      action: 'invitation_deleted',
      subject: { type: 'invitation', id: invitationId, name },
      summary: `Deleted invitation "${name}"; returned ${unassignedCount} guest${unassignedCount === 1 ? '' : 's'} to the pool.`,
      details: { unassignedCount }
    });
  }

  getTables(): Observable<Table[]> {
    const ref = collection(this.firestore, 'tables');
    return collectionData(ref, { idField: 'id' }) as Observable<Table[]>;
  }

  async setSeatNumber(
    guestId: string,
    seatNumber: number | null,
    hints?: { guestName?: string; tableName?: string }
  ): Promise<void> {
    const docRef = doc(this.firestore, `guests/${guestId}`);
    await updateDoc(docRef, { seatNumber, updatedAt: serverTimestamp() });
    const guestName = hints?.guestName ?? `guest ${guestId}`;
    const tableName = hints?.tableName;
    this.logSilently({
      action: 'guest_seat_assigned',
      subject: { type: 'guest', id: guestId, name: guestName },
      summary: seatNumber
        ? `Assigned ${guestName} to seat ${seatNumber}${tableName ? ` at "${tableName}"` : ''}.`
        : `Cleared seat assignment for ${guestName}.`,
      details: { seatNumber }
    });
  }

  async saveSeatingChanges(
    changes: { guestId: string; tableId: string | null; seatNumber: number | null }[]
  ): Promise<void> {
    const batch = writeBatch(this.firestore);
    for (const { guestId, tableId, seatNumber } of changes) {
      const ref = doc(this.firestore, `guests/${guestId}`);
      batch.update(ref, { tableId, seatNumber: seatNumber ?? null, updatedAt: serverTimestamp() });
    }
    await batch.commit();
    this.logSilently({
      action: 'seating_saved',
      subject: { type: 'guest', id: 'seating_plan', name: 'Seating Plan' },
      summary: `Seating plan saved — ${changes.length} guest assignment${changes.length === 1 ? '' : 's'} updated.`,
      details: { guestCount: changes.length }
    });
  }

  async saveTablePositions(
    updates: { tableId: string; name: string; x: number; y: number }[]
  ): Promise<void> {
    const batch = writeBatch(this.firestore);
    for (const { tableId, x, y } of updates) {
      const ref = doc(this.firestore, `tables/${tableId}`);
      batch.update(ref, { positionX: x, positionY: y, updatedAt: serverTimestamp() });
    }
    await batch.commit();
    this.logSilently({
      action: 'layout_saved',
      subject: { type: 'table', id: 'floor_plan', name: 'Floor Plan' },
      summary: `Seating chart layout saved — ${updates.length} table position${updates.length === 1 ? '' : 's'} updated.`
    });
  }

  async createTable(data: Omit<Table, 'id' | 'createdAt' | 'updatedAt'>): Promise<DocumentReference> {
    const ref = collection(this.firestore, 'tables');
    const docRef = await addDoc(ref, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: null
    });
    this.logSilently({
      action: 'table_created',
      subject: { type: 'table', id: docRef.id, name: data.name },
      summary: `Created table "${data.name}" (${data.shape}, capacity ${data.capacity}).`
    });
    return docRef;
  }

  async updateTable(
    tableId: string,
    data: Partial<Omit<Table, 'id' | 'createdAt'>>,
    tableName?: string
  ): Promise<void> {
    const docRef = doc(this.firestore, `tables/${tableId}`);
    await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
    const name = tableName ?? data.name ?? `table ${tableId}`;
    this.logSilently({
      action: 'table_updated',
      subject: { type: 'table', id: tableId, name },
      summary: `Updated table "${name}".`
    });
  }

  async deleteTable(tableId: string, tableName?: string): Promise<void> {
    const batch = writeBatch(this.firestore);
    const guestsRef = collection(this.firestore, 'guests');
    const q = query(guestsRef, where('tableId', '==', tableId));
    const snap = await getDocs(q);
    snap.forEach(guestDoc => {
      batch.update(guestDoc.ref, { tableId: null, updatedAt: serverTimestamp() });
    });

    batch.delete(doc(this.firestore, `tables/${tableId}`));
    await batch.commit();

    const name = tableName ?? `table ${tableId}`;
    this.logSilently({
      action: 'table_deleted',
      subject: { type: 'table', id: tableId, name },
      summary: `Deleted table "${name}"; ${snap.size} guest${snap.size === 1 ? '' : 's'} unseated.`,
      details: { unseatedCount: snap.size }
    });
  }

  async setGuestTableById(
    guestId: string,
    tableId: string | null,
    hints?: { guestName?: string; tableName?: string }
  ): Promise<void> {
    const docRef = doc(this.firestore, `guests/${guestId}`);
    await updateDoc(docRef, { tableId, updatedAt: serverTimestamp() });

    const guestName = hints?.guestName ?? `guest ${guestId}`;
    const tableName = hints?.tableName;
    this.logSilently({
      action: tableId ? 'guest_seated' : 'guest_unseated',
      subject: { type: 'guest', id: guestId, name: guestName },
      summary: tableId
        ? `Assigned ${guestName} to table "${tableName}".`
        : `Cleared seat assignment for ${guestName}.`,
      details: { tableId }
    });
  }

  async moveGuestToInvitation(
    guestId: string,
    fromInvitationId: string,
    toInvitationId: string,
    hints?: { guestName?: string; fromName?: string; toName?: string }
  ): Promise<void> {
    if (fromInvitationId === toInvitationId) {
      return Promise.resolve();
    }
    const batch = writeBatch(this.firestore);

    const guestRef = doc(this.firestore, `guests/${guestId}`);
    batch.update(guestRef, {
      invitationId: toInvitationId,
      updatedAt: serverTimestamp()
    });

    const fromRef = doc(this.firestore, `invitations/${fromInvitationId}`);
    batch.update(fromRef, {
      guestIds: arrayRemove(guestId),
      updatedAt: serverTimestamp()
    });

    const toRef = doc(this.firestore, `invitations/${toInvitationId}`);
    batch.update(toRef, {
      guestIds: arrayUnion(guestId),
      updatedAt: serverTimestamp()
    });

    await batch.commit();

    const guestName = hints?.guestName ?? `guest ${guestId}`;
    const fromName = hints?.fromName ?? fromInvitationId;
    const toName = hints?.toName ?? toInvitationId;
    this.logSilently({
      action: 'guest_moved',
      subject: { type: 'guest', id: guestId, name: guestName },
      summary: `Moved ${guestName} from "${fromName}" to "${toName}".`,
      details: { fromInvitationId, toInvitationId }
    });
  }

  getGuestsForInvitation(invitationId: string): Observable<Guest[]> {
    const collectionRef = collection(this.firestore, 'guests');
    const q = query(collectionRef, where('invitationId', '==', invitationId));
    return collectionData(q, { idField: 'id' }) as Observable<Guest[]>;
  }

  async getGuestsForInvitationByIds(guestIds: string[]): Promise<Guest[]> {
    if (guestIds.length === 0) return [];
    const snaps = await Promise.all(
      guestIds.map(id => getDoc(doc(this.firestore, `guests/${id}`)))
    );
    return snaps
      .filter(snap => snap.exists())
      .map(snap => ({ id: snap.id, ...snap.data() } as Guest));
  }

  async submitRsvpForGuests(
    invitationId: string,
    guests: Guest[],
    message: string | null,
    invitationDisplayName?: string
  ): Promise<void> {
    const batch = writeBatch(this.firestore);
    guests.forEach(guest => {
      const guestRef = doc(this.firestore, `guests/${guest.id}`);
      batch.update(guestRef, {
        firstName: guest.firstName,
        lastName: guest.lastName,
        isAttending: guest.isAttending,
        needsBus: guest.needsBus,
        busPickupLocation: guest.busPickupLocation,
        dietaryPreferences: guest.dietaryPreferences || [],
        allergies: guest.allergies || [],
        dietaryNotes: guest.dietaryNotes || '',
        updatedAt: serverTimestamp()
      });
    });

    const invitationRef = doc(this.firestore, `invitations/${invitationId}`);
    batch.update(invitationRef, {
      hasResponded: true,
      status: 'responded',
      message: message,
      rsvpSubmittedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    await batch.commit();

    const name = invitationDisplayName ?? `invitation ${invitationId}`;
    const attending = guests.filter(g => g.isAttending === true).length;
    const declined = guests.filter(g => g.isAttending === false).length;
    this.logSilently({
      action: 'rsvp_submitted',
      actor: { role: 'guest', label: name },
      subject: { type: 'invitation', id: invitationId, name },
      summary: `RSVP submitted for "${name}" — ${attending} attending, ${declined} declined.`,
      details: { attending, declined, hasMessage: !!message?.trim() }
    });
  }

  addGuestsBatch(guestsData: Partial<Guest>[]): Promise<void> {
    const batch = writeBatch(this.firestore);
    const collectionRef = collection(this.firestore, 'guests');

    guestsData.forEach(guest => {
      const docRef = doc(collectionRef);
      batch.set(docRef, {
        firstName: guest.firstName || '',
        lastName: guest.lastName || '',
        countryOfResidence: guest.countryOfResidence || '',
        notes: guest.notes || '',
        invitationId: null,
        isAttending: null,
        needsBus: null,
        busPickupLocation: null,
        dietaryPreferences: [],
        allergies: [],
        dietaryNotes: '',
        type: 'primary',
        createdAt: serverTimestamp(),
        updatedAt: null
      });
    });
    return batch.commit();
  }

  getAllGuests(): Observable<Guest[]> {
    const collectionRef = collection(this.firestore, 'guests');
    return collectionData(collectionRef, { idField: 'id' }) as Observable<Guest[]>;
  }

  async backfillInvitationCodes(): Promise<{
    scanned: number;
    created: number;
    skipped: number;
    failed: number;
  }> {
    const invitationsSnapshot = await getDocs(collection(this.firestore, 'invitations'));
    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const invitationDoc of invitationsSnapshot.docs) {
      const code = invitationDoc.data()['invitationCode'] as string | undefined;
      if (!code) {
        skipped++;
        continue;
      }

      const lookupRef = doc(this.firestore, `invitation_codes/${code}`);
      const lookupSnap = await getDoc(lookupRef);
      if (lookupSnap.exists()) {
        skipped++;
        continue;
      }

      try {
        await setDoc(lookupRef, {
          invitationId: invitationDoc.id,
          createdAt: serverTimestamp()
        });
        created++;
      } catch (err) {
        console.warn('backfill failed for', code, err);
        failed++;
      }
    }

    const result = {
      scanned: invitationsSnapshot.size,
      created,
      skipped,
      failed
    };

    this.logSilently({
      action: 'invitation_codes_backfilled',
      subject: { type: 'invitation', id: 'all', name: 'invitation_codes lookup collection' },
      summary: `Backfilled invitation_codes — scanned ${result.scanned}, created ${result.created}, skipped ${result.skipped}, failed ${result.failed}.`,
      details: result
    });

    return result;
  }

  getFloorPlanSettings(): Observable<FloorPlanSettings> {
    const docRef = doc(this.firestore, 'floorPlanSettings/floorPlan');
    return docData(docRef, { idField: 'id' }) as Observable<FloorPlanSettings>;
  }

  async updateFloorPlanSettings(settings: FloorPlanSettings): Promise<void> {

    const docRef = doc(this.firestore, 'floorPlanSettings/floorPlan');
    await setDoc(docRef, { ...settings, updatedAt: serverTimestamp() });
    this.logSilently({
      action: 'floor_plan_settings_updated',
      subject: { type: 'floor_plan', id: 'floorPlan', name: 'Floor Plan Settings' },
      summary: `Updated floor plan settings (width: ${settings.width}, height: ${settings.height}, unit: ${settings.unit}, scaleFactor: ${settings.scaleFactor}).`
    });
  }
}
