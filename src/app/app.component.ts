import { Component, NgZone, OnInit } from '@angular/core';
import { connect, NotificationActivity } from 'getstream';
import { from, map, Observable } from 'rxjs';
import getstreamConfig from '../../getstream-config.json';
import { GetFeedOptions } from 'getstream/src/feed';

type ObsValueType<T extends Observable<any>> = T extends Observable<infer P>
  ? P
  : never;

function withPushNotification(options: GetFeedOptions): GetFeedOptions {
  return {
    send_push_notification: true,
    ...options,
  } as GetFeedOptions;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  feed = connect(getstreamConfig.apiKey, null, getstreamConfig.appId).feed(
    getstreamConfig.feedGroup,
    getstreamConfig.feedId,
    getstreamConfig.accessToken
  );

  initialFeedData$ = from(this.feed.get({ limit: 10 })).pipe(
    map((resp) => resp.results as NotificationActivity[])
  );

  realtimeItems: unknown[] = [];

  public removedGroups = new Set<string>();

  constructor(private ngZone: NgZone) {}

  ngOnInit(): void {
    this.feed.subscribe((data) => {
      console.log(new Date().toISOString(), 'Reatime event:', data);
      this.ngZone.run(() => this.realtimeItems.unshift(data));
    });

    const fayeClient = this.feed.getFayeClient() as any;
    fayeClient.on('transport:down', (...args: any[]) =>
      console.log(new Date().toISOString(), 'Faye transport down', args)
    );
    fayeClient.on('transport:up', (...args: any[]) =>
      console.log(new Date().toISOString(), 'Faye transport up', args)
    );
  }

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
