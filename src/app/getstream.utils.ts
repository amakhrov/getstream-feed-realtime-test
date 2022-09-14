import { Observable, OperatorFunction } from 'rxjs';
import { DefaultGenerics, RealTimeMessage, StreamFeed } from 'getstream';
import { GetFeedOptions } from 'getstream/src/feed';
import { NgZone } from '@angular/core';

/**
 * Wraps Stream Feed realtime subscription logic into an Observable
 * Handles data updates and unsubscribing/cancellation
 */
export function subscribeToFeed<T extends DefaultGenerics>(
  feed: StreamFeed<T>
): Observable<RealTimeMessage<T>> {
  return new Observable<RealTimeMessage<T>>((subscriber) => {
    const fayeClient = feed.getFayeClient() as any;
    fayeClient.on('transport:down', (...args: any[]) =>
      console.log(new Date().toISOString(), 'Faye transport down', args)
    );
    fayeClient.on('transport:up', (...args: any[]) =>
      console.log(new Date().toISOString(), 'Faye transport up', args)
    );

    const cancelPromise = feed
      .subscribe((data) => {
        subscriber.next(data);
      })
      .then((s) => () => s.cancel())
      .catch((error) => {
        subscriber.error(error);
        return () => undefined;
      });

    return () => {
      cancelPromise.then((cancel) => cancel());
    };
  });
}
// Add a `send_push_notification` param while reading notification feeds with mark_read or mark_seen params.
// If there is a subscription on the feed, it will send an realtime update.
// This parameter is available mostly for enterprise, hence not marketed or documented.
// See https://crunchbase.slack.com/archives/CHCS4G0J1/p1660235638707249
export function withPushNotification(options: GetFeedOptions): GetFeedOptions {
  return {
    send_push_notification: true,
    ...options,
  } as GetFeedOptions;
}

/**
 * Makes sure all observable events are re-emitted inside Angular Zone
 * Use it to wrap observables that emit outside zone (e.g. JSONP callbacks in a 3rd party lib)
 */
export function runInZone<T>(zone: NgZone): OperatorFunction<T, T> {
  return (source) =>
    new Observable((observer) => {
      return source.subscribe({
        next: (value) => zone.run(() => observer.next(value)),
        error: (error) => zone.run(() => observer.error(error)),
        complete: () => zone.run(() => observer.complete()),
      });
    });
}
