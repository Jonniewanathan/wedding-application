import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, query, where,
  getDocs, collectionData, doc, setDoc,
  deleteDoc, updateDoc, writeBatch, serverTimestamp,
  addDoc, DocumentReference, getDoc, arrayRemove, arrayUnion, FieldValue, Timestamp
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Invitation, InvitationOutreachStage } from '../../../shared/models/invitation.model';
import { Guest } from '../../../shared/models/guest.model';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private firestore: Firestore = inject(Firestore);

  constructor() { }

  addGuest(firstName: string, lastName: string, country: string, notes: string): Promise<void> {
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

    return setDoc(newDocRef, newGuestData);
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

  updateGuestDetails(guest: Partial<Guest> & { id: string }): Promise<void> {
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

    return updateDoc(docRef, updateData);
  }

  createInvitation(details: { displayName: string; }): Promise<DocumentReference<Invitation>> {
    const collectionRef = collection(this.firestore, 'invitations');
    const uniqueCode = self.crypto.randomUUID();

    return addDoc(collectionRef, {
      invitationCode: uniqueCode,
      displayName: details.displayName,
      hasResponded: false,
      status: 'sent',
      guestIds: [],
      message: null, // Initialize message field
      createdAt: serverTimestamp(),
      updatedAt: null
    }) as Promise<DocumentReference<Invitation>>;
  }

  updateInvitation(invitationId: string, details: { displayName: string }): Promise<void> {
    const docRef = doc(this.firestore, `invitations/${invitationId}`);
    return updateDoc(docRef, {
      displayName: details.displayName,
      updatedAt: serverTimestamp()
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
  setInvitationOutreachStage(
    invitationId: string,
    stage: InvitationOutreachStage,
    isActive: boolean
  ): Promise<void> {
    const docRef = doc(this.firestore, `invitations/${invitationId}`);
    return updateDoc(docRef, {
      [stage]: isActive ? serverTimestamp() : null,
      updatedAt: serverTimestamp()
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

  async deleteInvitationAndUnassignGuests(invitationId: string): Promise<void> {
    const batch = writeBatch(this.firestore);
    const guestsCollectionRef = collection(this.firestore, 'guests');
    const q = query(guestsCollectionRef, where('invitationId', '==', invitationId));
    const guestsSnapshot = await getDocs(q);

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

    return batch.commit();
  }

  /**
   * Convenience setter for the per-guest day-of seating field. Pass
   * null to clear the assignment ("unseat" the guest). Doesn't go
   * through updateGuestDetails so we don't need to construct a full
   * partial guest object at the call site.
   */
  setGuestTable(guestId: string, tableName: string | null): Promise<void> {
    const docRef = doc(this.firestore, `guests/${guestId}`);
    return updateDoc(docRef, {
      tableName,
      updatedAt: serverTimestamp()
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
  moveGuestToInvitation(
    guestId: string,
    fromInvitationId: string,
    toInvitationId: string
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

    return batch.commit();
  }

  getGuestsForInvitation(invitationId: string): Observable<Guest[]> {
    const collectionRef = collection(this.firestore, 'guests');
    const q = query(collectionRef, where('invitationId', '==', invitationId));
    return collectionData(q, { idField: 'id' }) as Observable<Guest[]>;
  }

  submitRsvpForGuests(invitationId: string, guests: Guest[], message: string | null): Promise<void> {
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

    return batch.commit();
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
