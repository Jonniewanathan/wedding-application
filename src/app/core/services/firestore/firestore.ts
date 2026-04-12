import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, query, where,
  getDocs, collectionData, doc, setDoc,
  deleteDoc, updateDoc, writeBatch, serverTimestamp,
  addDoc, DocumentReference, getDoc, arrayUnion, arrayRemove
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Invitation } from '../../../shared/models/invitation.model'; // Keep Invitation model
import { Guest } from '../../../shared/models/guest.model';      // Use the unified Guest model

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private firestore: Firestore = inject(Firestore);

  constructor() { }

  // --- Core Guest Management ---

  /**
   * Adds a new guest to the main guests collection as 'unassigned'.
   * UPDATED: Initializes the new dietary array fields.
   */
  addGuest(firstName: string, lastName: string, country: string, notes: string): Promise<void> {
    const collectionRef = collection(this.firestore, 'guests');
    const newDocRef = doc(collectionRef);

    const newGuestData = {
      firstName,
      lastName,
      countryOfResidence: country || '',
      notes: notes || '',

      // Explicitly set null for unassigned
      invitationId: null,
      isAttending: null,

      // Initialize empty arrays for the new features
      dietaryPreferences: [],
      allergies: [],
      dietaryNotes: '',

      type: 'primary',
      createdAt: serverTimestamp(),
      updatedAt: null
    };

    // FIX: Cast to unknown first to bypass the "Overlap" error
    return setDoc(newDocRef, newGuestData as unknown as Omit<Guest, 'id'>);
  }

  /**
   * Gets a real-time stream of all UNASSIGNED guests.
   * Requires a Firestore index on 'invitationId'.
   */
  getUnassignedGuests(): Observable<Guest[]> {
    const collectionRef = collection(this.firestore, 'guests');
    const q = query(collectionRef, where('invitationId', '==', null));
    return collectionData(q, { idField: 'id' }) as Observable<Guest[]>;
  }

  /**
   * Deletes a guest document ONLY if they are unassigned.
   * Returns a boolean indicating if deletion occurred.
   */
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

    // We construct the update object dynamically to ensure we don't accidentally wipe data
    // if we pass a partial object.
    const updateData: any = {
      updatedAt: serverTimestamp()
    };

    // Helper to only add fields if they are defined in the incoming object
    if (guest.firstName !== undefined) updateData.firstName = guest.firstName;
    if (guest.lastName !== undefined) updateData.lastName = guest.lastName;
    if (guest.countryOfResidence !== undefined) updateData.countryOfResidence = guest.countryOfResidence;
    if (guest.notes !== undefined) updateData.notes = guest.notes;

    // RSVP Fields
    if (guest.isAttending !== undefined) updateData.isAttending = guest.isAttending;
    if (guest.dietaryPreferences !== undefined) updateData.dietaryPreferences = guest.dietaryPreferences;
    if (guest.allergies !== undefined) updateData.allergies = guest.allergies;
    if (guest.dietaryNotes !== undefined) updateData.dietaryNotes = guest.dietaryNotes;

    return updateDoc(docRef, updateData);
  }

  // --- Invitation Management ---

  /**
   * Creates a new, empty invitation document with a secure UUID.
   */
  createInvitation(details: { displayName: string; }): Promise<DocumentReference<Invitation>> {
    const collectionRef = collection(this.firestore, 'invitations');

    // Use native crypto UUID for security (no external library needed)
    const uniqueCode = self.crypto.randomUUID();

    return addDoc(collectionRef, {
      invitationCode: uniqueCode, // Secure UUID
      displayName: details.displayName,
      hasResponded: false,
      status: 'sent', // Default status
      guestIds: [],   // Initialize empty array
      createdAt: serverTimestamp(),
      updatedAt: null
    }) as Promise<DocumentReference<Invitation>>;
  }

  /**
   * Assigns guests to an invitation.
   * UPDATED: Now updates BOTH the Guest documents (with invitationId)
   * AND the Invitation document (with guestIds array).
   */
  async assignGuestsToInvitation(invitationId: string, guestIds: string[]): Promise<void> {
    const batch = writeBatch(this.firestore);

    // 1. Update each Guest Document
    guestIds.forEach(guestId => {
      const guestRef = doc(this.firestore, `guests/${guestId}`);
      batch.update(guestRef, {
        invitationId: invitationId,
        isAttending: null, // Reset RSVP status if they are moved
        updatedAt: serverTimestamp()
      });
    });

    // 2. Update the Invitation Document (Add these IDs to the array)
    // We use arrayUnion to prevent duplicates
    const invitationRef = doc(this.firestore, `invitations/${invitationId}`);
    batch.update(invitationRef, {
      guestIds: arrayUnion(...guestIds),
      updatedAt: serverTimestamp()
    });

    return batch.commit();
  }

  /**
   * Unassigns a single guest.
   * UPDATED: Clears new dietary fields and removes ID from Invitation array.
   */
  async unassignGuest(guestId: string, currentInvitationId: string): Promise<void> {
    const batch = writeBatch(this.firestore);

    // 1. Reset Guest Data
    const guestRef = doc(this.firestore, `guests/${guestId}`);
    batch.update(guestRef, {
      invitationId: null,
      isAttending: null,
      dietaryPreferences: [],
      allergies: [],
      dietaryNotes: '',
      updatedAt: serverTimestamp()
    });

    // 2. Remove Guest ID from the Invitation's array
    if (currentInvitationId) {
      const invitationRef = doc(this.firestore, `invitations/${currentInvitationId}`);
      batch.update(invitationRef, {
        guestIds: arrayRemove(guestId)
      });
    }

    return batch.commit();
  }

  /**
   * Gets a real-time stream of all finalized invitations.
   */
  getInvitations(): Observable<Invitation[]> {
    const collectionRef = collection(this.firestore, 'invitations');
    return collectionData(collectionRef, { idField: 'id' }) as Observable<Invitation[]>;
  }

  /**
   * Finds a single invitation document by its unique code.
   */
  async getInvitationByCode(code: string): Promise<(Invitation & { id: string }) | null> {
    const invitationsCollection = collection(this.firestore, 'invitations');
    const q = query(invitationsCollection, where('invitationCode', '==', code));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) return null;

    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as (Invitation & { id: string });
  }

  /**
   * Deletes an invitation.
   * UPDATED: Clears new dietary fields on guests.
   */
  async deleteInvitationAndUnassignGuests(invitationId: string): Promise<void> {
    const batch = writeBatch(this.firestore);

    // 1. Find all guests assigned to this invitation
    const guestsCollectionRef = collection(this.firestore, 'guests');
    const q = query(guestsCollectionRef, where('invitationId', '==', invitationId));
    const guestsSnapshot = await getDocs(q);

    // 2. Unassign them
    guestsSnapshot.forEach(guestDoc => {
      batch.update(guestDoc.ref, {
        invitationId: null,
        isAttending: null,
        dietaryPreferences: [], // Clear data
        allergies: [],         // Clear data
        dietaryNotes: '',
        updatedAt: serverTimestamp()
      });
    });

    // 3. Delete the invitation
    const invitationRef = doc(this.firestore, `invitations/${invitationId}`);
    batch.delete(invitationRef);

    return batch.commit();
  }

  // --- Guest Management within an Invitation ---

  /**
   * Gets a real-time stream of all guests ASSIGNED to a specific invitation ID.
   * Requires a Firestore index on 'invitationId'.
   */
  getGuestsForInvitation(invitationId: string): Observable<Guest[]> {
    const collectionRef = collection(this.firestore, 'guests');
    const q = query(collectionRef, where('invitationId', '==', invitationId));
    return collectionData(q, { idField: 'id' }) as Observable<Guest[]>;
  }

  /**
   * Updates RSVP-specific details for an assigned guest.
   * UPDATED: Now handles the new dietary arrays instead of the old string.
   */
  updateGuestRsvpDetails(guest: Guest): Promise<void> {
    if (!guest.invitationId) {
      return Promise.reject("Cannot update RSVP for an unassigned guest.");
    }

    const docRef = doc(this.firestore, `guests/${guest.id}`);

    return updateDoc(docRef, {
      firstName: guest.firstName,
      lastName: guest.lastName,
      countryOfResidence: guest.countryOfResidence || '',
      isAttending: guest.isAttending,

      // --- FIXED: Use new dietary fields ---
      dietaryPreferences: guest.dietaryPreferences || [],
      allergies: guest.allergies || [],
      dietaryNotes: guest.dietaryNotes || '',
      // -------------------------------------

      type: guest.type || 'primary',
      updatedAt: serverTimestamp()
    });
  }

  // --- RSVP Actions ---

  /**
   * Submits RSVP.
   * UPDATED: Saves the new array fields (Preferences & Allergies).
   */
  submitRsvpForGuests(invitationId: string, guests: Guest[]): Promise<void> {
    const batch = writeBatch(this.firestore);

    // Update each guest document
    guests.forEach(guest => {
      const guestRef = doc(this.firestore, `guests/${guest.id}`);
      batch.update(guestRef, {
        firstName: guest.firstName,
        lastName: guest.lastName,
        isAttending: guest.isAttending,

        // Save the chips data
        dietaryPreferences: guest.dietaryPreferences || [],
        allergies: guest.allergies || [],
        dietaryNotes: guest.dietaryNotes || '',

        updatedAt: serverTimestamp()
      });
    });

    // Update Invitation Status
    const invitationRef = doc(this.firestore, `invitations/${invitationId}`);
    batch.update(invitationRef, {
      hasResponded: true,
      status: 'responded',
      updatedAt: serverTimestamp()
    });

    return batch.commit();
  }

  // --- Bulk Upload Method (Refactored for unified 'guests' collection) ---

  /**
   * Creates multiple guests in the main collection as 'unassigned' using a batch write.
   */
  addGuestsBatch(guestsData: Partial<Guest>[]): Promise<void> {
    const batch = writeBatch(this.firestore);
    const collectionRef = collection(this.firestore, 'guests');

    guestsData.forEach(guest => {
      const docRef = doc(collectionRef); // Auto-generate ID
      batch.set(docRef, {
        firstName: guest.firstName || '',
        lastName: guest.lastName || '',
        countryOfResidence: guest.countryOfResidence || '',
        notes: guest.notes || '',
        invitationId: null, // Set as unassigned
        isAttending: null,
        dietaryRestrictions: '',
        type: 'primary',
        createdAt: serverTimestamp(),
        updatedAt: null
      });
    });
    return batch.commit();
  }
}
