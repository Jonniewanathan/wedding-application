import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, query, where, orderBy, limit,
  getDocs, collectionData, doc, setDoc,
  deleteDoc, updateDoc, writeBatch, serverTimestamp,
  addDoc, DocumentReference, getDoc, arrayRemove, arrayUnion, FieldValue, Timestamp
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Invitation, InvitationOutreachStage } from '../../../shared/models/invitation.model';
import { Guest } from '../../../shared/models/guest.model';
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

  /**
   * Append one entry to the activity_log collection. The timestamp is
   * always serverTimestamp() so feed ordering is consistent regardless
   * of admin clock skew.
   */
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

  /**
   * Real-time stream of the most recent N activity log entries, newest
   * first. Bound directly to the admin Activity tab.
   */
  getRecentActivity(max = 100): Observable<ActivityLogEntry[]> {
    const collectionRef = collection(this.firestore, 'activity_log');
    const q = query(collectionRef, orderBy('timestamp', 'desc'), limit(max));
    return collectionData(q, { idField: 'id' }) as Observable<ActivityLogEntry[]>;
  }

  /**
   * Resolve the currently signed-in admin into an ActivityActor record.
   * Falls back to a 'system' actor when nobody is signed in (e.g. when
   * an automated migration runs).
   */
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

  /** Fire-and-forget logging helper used inside mutating methods. */
  private logSilently(entry: Parameters<FirestoreService['logActivity']>[0]): void {
    this.logActivity(entry).catch(err =>
      // Logging must never fail the parent mutation. If Firestore won't
      // accept the log entry we surface in console for the developer but
      // swallow for the caller.
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

    // Update payload: each key is a Guest field name; each value is either a
    // Guest field value or a FieldValue sentinel (e.g. serverTimestamp()).
    type UpdateValue = Guest[keyof Guest] | FieldValue;
    const updateData: Record<string, UpdateValue> = {
      updatedAt: serverTimestamp()
    };

    // Dynamically add fields to update object to avoid overwriting with undefined
    const fields: (keyof Guest)[] = ['firstName', 'lastName', 'countryOfResidence', 'notes', 'isAttending', 'needsBus', 'busPickupLocation', 'dietaryPreferences', 'allergies', 'dietaryNotes', 'tableName'];

    fields.forEach(field => {
      const value = guest[field];
      if (value !== undefined) {
        updateData[field] = value;
      }
    });

    await updateDoc(docRef, updateData);

    // Best-effort logging: emit a single "guest_updated" entry per call,
    // plus a more specific entry if attendance flipped. Other fields are
    // small typo-style edits that would noise up the feed.
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
      message: null, // Initialize message field
      createdAt: serverTimestamp(),
      updatedAt: null
    })) as DocumentReference<Invitation>;

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
    // Only include contact fields when the caller provided them — passing
    // undefined would otherwise write Firestore's `undefined` sentinel error.
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

  /**
   * One-shot migration: copy a historical Timestamp into the
   * rsvpSubmittedAt field for invitations that responded before that
   * field was introduced. Caller supplies the {id, rsvpSubmittedAt}
   * pairs (typically built from each invitation's existing updatedAt).
   *
   * Important: we deliberately write the historical Timestamp value,
   * NOT serverTimestamp(), so the backfilled record reflects when the
   * RSVP actually happened — not when the backfill ran.
   */
  backfillRsvpSubmittedAt(updates: { id: string; rsvpSubmittedAt: Timestamp }[]): Promise<void> {
    if (updates.length === 0) return Promise.resolve();
    const batch = writeBatch(this.firestore);
    for (const u of updates) {
      const ref = doc(this.firestore, `invitations/${u.id}`);
      batch.update(ref, { rsvpSubmittedAt: u.rsvpSubmittedAt });
    }
    return batch.commit();
  }

  /**
   * Set or clear a single outreach milestone on an invitation. Writes a
   * server-side Timestamp when activating; writes null when clearing
   * (so the stats page can rely on truthiness to mean "this stage has
   * happened").
   */
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

    // 1. Update the Invitation Document (Overwrite the array to maintain the exact order provided)
    const invitationRef = doc(this.firestore, `invitations/${invitationId}`);
    batch.update(invitationRef, {
      guestIds: guestIds,
      updatedAt: serverTimestamp()
    });

    // 2. Update each Guest Document (if they aren't already assigned to this invitation)
    // In a real app, you might want to optimize this to only update guests whose invitationId changed,
    // but for re-ordering, it's safer to just ensure they all have the correct ID.
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
    const invitationsCollection = collection(this.firestore, 'invitations');
    const q = query(invitationsCollection, where('invitationCode', '==', code));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) return null;

    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as (Invitation & { id: string });
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

    await batch.commit();

    const name = invitationDisplayName ?? `invitation ${invitationId}`;
    this.logSilently({
      action: 'invitation_deleted',
      subject: { type: 'invitation', id: invitationId, name },
      summary: `Deleted invitation "${name}"; returned ${unassignedCount} guest${unassignedCount === 1 ? '' : 's'} to the pool.`,
      details: { unassignedCount }
    });
  }

  /**
   * Convenience setter for the per-guest day-of seating field. Pass
   * null to clear the assignment ("unseat" the guest). Doesn't go
   * through updateGuestDetails so we don't need to construct a full
   * partial guest object at the call site.
   */
  async setGuestTable(
    guestId: string,
    tableName: string | null,
    guestDisplayName?: string
  ): Promise<void> {
    const docRef = doc(this.firestore, `guests/${guestId}`);
    await updateDoc(docRef, {
      tableName,
      updatedAt: serverTimestamp()
    });

    const name = guestDisplayName ?? `guest ${guestId}`;
    this.logSilently({
      action: tableName ? 'guest_seated' : 'guest_unseated',
      subject: { type: 'guest', id: guestId, name },
      summary: tableName
        ? `Seated ${name} at "${tableName}".`
        : `Unseated ${name}.`,
      details: { tableName }
    });
  }

  /**
   * Atomically move one guest from a source invitation to a target
   * invitation. Three doc updates in a single batch:
   *  - the guest's invitationId switches to the target
   *  - the source invitation's guestIds[] loses the guest
   *  - the target invitation's guestIds[] gains the guest
   *
   * Avoids the intermediate "unassigned" state that the
   * unassign-then-assign path would expose.
   */
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
      message: message, // Save the message
      rsvpSubmittedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    await batch.commit();

    // RSVP submissions are guest-initiated, not admin. Record the
    // invitation itself as the actor so the feed reads naturally.
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
}
