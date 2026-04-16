import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, query, where,
  getDocs, collectionData, doc, setDoc,
  deleteDoc, updateDoc, writeBatch, serverTimestamp,
  addDoc, DocumentReference, getDoc, arrayUnion, arrayRemove
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Invitation } from '../../../shared/models/invitation.model';
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

    return setDoc(newDocRef, newGuestData as unknown as Omit<Guest, 'id'>);
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
    const updateData: any = { updatedAt: serverTimestamp() };

    if (guest.firstName !== undefined) updateData.firstName = guest.firstName;
    if (guest.lastName !== undefined) updateData.lastName = guest.lastName;
    if (guest.countryOfResidence !== undefined) updateData.countryOfResidence = guest.countryOfResidence;
    if (guest.notes !== undefined) updateData.notes = guest.notes;
    if (guest.isAttending !== undefined) updateData.isAttending = guest.isAttending;
    if (guest.needsBus !== undefined) updateData.needsBus = guest.needsBus;
    if (guest.busPickupLocation !== undefined) updateData.busPickupLocation = guest.busPickupLocation;
    if (guest.dietaryPreferences !== undefined) updateData.dietaryPreferences = guest.dietaryPreferences;
    if (guest.allergies !== undefined) updateData.allergies = guest.allergies;
    if (guest.dietaryNotes !== undefined) updateData.dietaryNotes = guest.dietaryNotes;

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

  async assignGuestsToInvitation(invitationId: string, guestIds: string[]): Promise<void> {
    const batch = writeBatch(this.firestore);
    guestIds.forEach(guestId => {
      const guestRef = doc(this.firestore, `guests/${guestId}`);
      batch.update(guestRef, {
        invitationId: invitationId,
        isAttending: null,
        updatedAt: serverTimestamp()
      });
    });

    const invitationRef = doc(this.firestore, `invitations/${invitationId}`);
    batch.update(invitationRef, {
      guestIds: arrayUnion(...guestIds),
      updatedAt: serverTimestamp()
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
        dietaryRestrictions: '',
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
