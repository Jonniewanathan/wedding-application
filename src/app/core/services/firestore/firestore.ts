import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, query, where,
  getDocs, collectionData, doc, setDoc,
  deleteDoc, updateDoc, writeBatch, serverTimestamp,
  addDoc, DocumentReference, getDoc // Added getDoc
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Invitation } from '../../../shared/models/invitation.model'; // Keep Invitation model
import { Guest } from '../../../shared/models/guest.model';      // Use the unified Guest model
import { v4 as uuidv4 } from 'uuid';

// Removed UnassignedGuest import
// Removed firebase/compat import

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private firestore: Firestore = inject(Firestore);

  constructor() { }

  // --- Core Guest Management ---

  /**
   * Adds a new guest to the main guests collection as 'unassigned'.
   */
  addGuest(firstName: string, lastName: string, country: string, notes: string): Promise<void> {
    const collectionRef = collection(this.firestore, 'guests');
    const newDocRef = doc(collectionRef); // Auto-generate ID
    return setDoc(newDocRef, {
      firstName,
      lastName,
      countryOfResidence: country || '',
      notes: notes || '',
      invitationId: null, // Explicitly set as unassigned
      isAttending: null,
      dietaryRestrictions: '',
      type: 'primary',    // Default type
      createdAt: serverTimestamp(),
      updatedAt: null
    } as Omit<Guest, 'id'>);
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
      return true; // Successfully deleted unassigned guest
    } else {
      console.warn(`Guest ${guestId} not found or is already assigned.`);
      return false; // Did not delete (either not found or assigned)
    }
  }

  /**
   * Updates general details (name, country, notes) of any guest.
   */
  updateGuestDetails(guest: Partial<Guest> & { id: string }): Promise<void> {
    const docRef = doc(this.firestore, `guests/${guest.id}`);
    // Only update fields relevant to general details
    return updateDoc(docRef, {
      firstName: guest.firstName,
      lastName: guest.lastName,
      countryOfResidence: guest.countryOfResidence,
      notes: guest.notes,
      updatedAt: serverTimestamp()
    });
  }

  // --- Invitation Management ---

  /**
   * Creates a new, empty invitation document.
   */
  createInvitation(details: { displayName: string; }): Promise<DocumentReference<Invitation>> {
    const collectionRef = collection(this.firestore, 'invitations');
    const uniqueCode = uuidv4(); // Generate a unique ID

    return addDoc(collectionRef, {
      invitationCode: uniqueCode, // Use the generated GUID
      displayName: details.displayName,
      hasResponded: false,
      respondedAt: null
    }) as Promise<DocumentReference<Invitation>>;
  }

  /**
   * Assigns multiple guests (by ID) to a specific invitation ID.
   */
  assignGuestsToInvitation(invitationId: string, guestIds: string[]): Promise<void> {
    const batch = writeBatch(this.firestore);
    guestIds.forEach(guestId => {
      const guestRef = doc(this.firestore, `guests/${guestId}`);
      batch.update(guestRef, {
        invitationId: invitationId,
        isAttending: null,
        updatedAt: serverTimestamp()
      });
    });
    return batch.commit();
  }

  /**
   * Unassigns a single guest, moving them back to the 'pool'.
   * Clears their RSVP-specific details.
   */
  unassignGuest(guestId: string): Promise<void> {
    const guestRef = doc(this.firestore, `guests/${guestId}`);
    return updateDoc(guestRef, {
      invitationId: null,
      isAttending: null,
      dietaryRestrictions: '',
      type: 'primary', // Reset type
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Gets a real-time stream of all finalized invitations.
   */
  getInvitations(): Observable<Invitation[]> {
    const collectionRef = collection(this.firestore, 'invitations');
    return collectionData(collectionRef, { idField: 'id' }) as Observable<Invitation[]>;
  }

  /**
   * Deletes an invitation document AND unassigns all its associated guests.
   */
  async deleteInvitationAndUnassignGuests(invitationId: string): Promise<void> {
    const batch = writeBatch(this.firestore);

    // 1. Find all guests assigned to this invitation
    const guestsCollectionRef = collection(this.firestore, 'guests');
    const q = query(guestsCollectionRef, where('invitationId', '==', invitationId));
    const guestsSnapshot = await getDocs(q);

    // 2. Add an update operation for each guest to unassign them
    guestsSnapshot.forEach(guestDoc => {
      batch.update(guestDoc.ref, {
        invitationId: null,
        isAttending: null,
        dietaryRestrictions: '',
        type: 'primary',
        updatedAt: serverTimestamp()
      });
    });

    // 3. Add the delete operation for the invitation document
    const invitationRef = doc(this.firestore, `invitations/${invitationId}`);
    batch.delete(invitationRef);

    // 4. Commit all operations
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
   * Can also update name/country if needed (e.g., for plus ones).
   */
  updateGuestRsvpDetails(guest: Guest): Promise<void> {
    if (!guest.invitationId) {
      return Promise.reject("Cannot update RSVP for an unassigned guest.");
    }
    const docRef = doc(this.firestore, `guests/${guest.id}`);
    // Update relevant fields
    return updateDoc(docRef, {
      firstName: guest.firstName, // Allow updating names, e.g. for plus ones
      lastName: guest.lastName,
      countryOfResidence: guest.countryOfResidence,
      isAttending: guest.isAttending,
      dietaryRestrictions: guest.dietaryRestrictions,
      type: guest.type, // Allow changing type if needed
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Assigns multiple guests (by ID) to a specific invitation ID.
   */

  /**
   * Finds a single invitation document by its unique code.
   */
  async getInvitationByCode(code: string): Promise<(Invitation & { id: string }) | null> {
    const invitationsCollection = collection(this.firestore, 'invitations');
    const q = query(invitationsCollection, where('invitationCode', '==', code));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log('No matching invitation found.');
      return null;
    }
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as (Invitation & { id: string });
  }

  /**
   * Submits RSVP details for multiple guests belonging to one invitation.
   * Also updates the main invitation's 'hasResponded' status.
   */
  submitRsvpForGuests(invitationId: string, guests: Guest[]): Promise<void> {
    const batch = writeBatch(this.firestore);

    // Update each guest document
    guests.forEach(guest => {
      const guestRef = doc(this.firestore, `guests/${guest.id}`);
      batch.update(guestRef, {
        firstName: guest.firstName, // Allow updating names (e.g., for plus ones)
        lastName: guest.lastName,
        isAttending: guest.isAttending,
        dietaryRestrictions: guest.dietaryRestrictions,
        updatedAt: serverTimestamp()
      });
    });

    // Update the parent invitation document
    const invitationRef = doc(this.firestore, `invitations/${invitationId}`);
    batch.update(invitationRef, {
      hasResponded: true,
      respondedAt: serverTimestamp()
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
