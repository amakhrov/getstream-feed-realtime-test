import { Component, NgZone } from '@angular/core';
import { connect, NotificationActivity } from 'getstream';
import {
  runInZone,
  subscribeToFeed,
  withPushNotification,
} from './getstream.utils';
import { from, map, Observable, scan, startWith } from 'rxjs';
import getstreamConfig from '../../getstream-config.json';

type ObsValueType<T extends Observable<any>> = T extends Observable<infer P>
  ? P
  : never;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  feed = connect(getstreamConfig.apiKey, null, getstreamConfig.appId).feed(
    getstreamConfig.feedGroup,
    getstreamConfig.feedId,
    getstreamConfig.accessToken
  );

  initialFeedData$ = from(this.feed.get({ limit: 10 })).pipe(
    map((resp) => resp.results as NotificationActivity[])
  );

  realtimeData$ = subscribeToFeed(this.feed).pipe(
    runInZone(this.ngZone),
    scan((allItems, newItem) => [newItem, ...allItems], [] as unknown[]),
    startWith([])
  );

  public removedGroups = new Set<string>();

  constructor(private ngZone: NgZone) {}

  public onSubmit(): void {
    const randomId = Date.now() % 1000;
    this.feed.addActivity({
      text: `Notification ${randomId}`,
      verb: 'notification',
      actor: 'devtool',
      object: 'dummy',
    });
  }

  public markSeen(id: string): void {
    this.feed.get(withPushNotification({ mark_seen: [id], limit: 0 }));
  }

  public markRead(id: string): void {
    this.feed.get(withPushNotification({ mark_read: [id], limit: 0 }));
  }

  public remove(
    group: ObsValueType<typeof this.initialFeedData$>[number]
  ): void {
    this.removedGroups.add(group.id);
    group.activities.forEach((act) => {
      this.feed.removeActivity(act.id);
    });
  }
}
