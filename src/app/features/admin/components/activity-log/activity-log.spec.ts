import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Timestamp } from '@angular/fire/firestore';
import { of } from 'rxjs';
import { ActivityLog } from './activity-log';
import { FirestoreService } from '../../../../core/services/firestore/firestore';
import { ActivityLogEntry } from '../../../../shared/models/activity-log.model';

function ts(secondsAgo: number): Timestamp {
  return { seconds: Math.floor(Date.now() / 1000) - secondsAgo, nanoseconds: 0 } as unknown as Timestamp;
}

function makeEntry(overrides: Partial<ActivityLogEntry>): ActivityLogEntry {
  return {
    id: 'e',
    action: 'guest_updated',
    actor: { role: 'admin', label: 'admin@example.com' },
    subject: { type: 'guest', id: 'g1', name: 'Alice Smith' },
    summary: 'Edited details for Alice Smith.',
    timestamp: ts(60),
    ...overrides
  };
}

describe('ActivityLog', () => {
  let component: ActivityLog;
  let fixture: ComponentFixture<ActivityLog>;
  let firestoreSpy: jasmine.SpyObj<FirestoreService>;

  function build(entries: ActivityLogEntry[]) {
    firestoreSpy.getRecentActivity.and.returnValue(of(entries));
    fixture = TestBed.createComponent(ActivityLog);
    component = fixture.componentInstance;
  }

  beforeEach(() => {
    firestoreSpy = jasmine.createSpyObj<FirestoreService>('FirestoreService', ['getRecentActivity']);
    firestoreSpy.getRecentActivity.and.returnValue(of([]));
    TestBed.configureTestingModule({
      imports: [ActivityLog],
      providers: [{ provide: FirestoreService, useValue: firestoreSpy }]
    });
  });

  it('should create', () => {
    build([]);
    expect(component).toBeTruthy();
  });

  it('should request the feed at the configured limit', () => {
    build([]);
    expect(firestoreSpy.getRecentActivity).toHaveBeenCalledWith(component.FEED_LIMIT);
  });

  it('should pass through every entry from the stream', () => {
    build([
      makeEntry({ id: '1' }),
      makeEntry({ id: '2' }),
      makeEntry({ id: '3' })
    ]);
    expect(component.feed().length).toBe(3);
  });

  it('should alternate isShaded as the actor identity changes', () => {
    build([
      makeEntry({ id: '1', actor: { role: 'admin', label: 'a@example.com' } }),
      makeEntry({ id: '2', actor: { role: 'admin', label: 'a@example.com' } }),
      makeEntry({ id: '3', actor: { role: 'guest', label: 'The Smiths' } }),
      makeEntry({ id: '4', actor: { role: 'admin', label: 'a@example.com' } })
    ]);
    const rows = component.feed();
    expect(rows[0].isShaded).toBe(rows[1].isShaded);
    expect(rows[1].isShaded).not.toBe(rows[2].isShaded);
    expect(rows[2].isShaded).not.toBe(rows[3].isShaded);
  });

  it('should format recent timestamps in relative form', () => {
    build([makeEntry({ id: '1', timestamp: ts(30) })]);
    expect(component.feed()[0].relativeTime).toBe('just now');
  });

  it('should describe hour-scale timestamps with the hour count', () => {
    build([makeEntry({ id: '1', timestamp: ts(60 * 60 * 3) })]);
    expect(component.feed()[0].relativeTime).toBe('3 hours ago');
  });

  it('should pick a sensible icon class for each action', () => {
    build([]);
    expect(component.iconForAction('rsvp_submitted')).toContain('pi-envelope');
    expect(component.iconForAction('outreach_marked')).toContain('pi-send');
    expect(component.iconForAction('guest_seated')).toContain('pi-tag');
    expect(component.iconForAction('invitation_deleted')).toContain('pi-trash');
  });

  it('should assign a distinct colour band per actor role', () => {
    build([]);
    const adminCls = component.actorColorClass('admin');
    const guestCls = component.actorColorClass('guest');
    const systemCls = component.actorColorClass('system');
    expect(adminCls).not.toBe(guestCls);
    expect(guestCls).not.toBe(systemCls);
  });
});