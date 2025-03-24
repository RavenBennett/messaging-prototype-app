import { Injectable } from '@angular/core';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { ApiService } from './api.service';
import { environment } from '../../env/env.dev';

@Injectable({
    providedIn: 'root',
})
export class EchoService {
      public eventData: string = '';
      public echo!: Echo<'reverb'>;


    constructor(public api: ApiService) {
        (window as any).Pusher = Pusher;
        this.echo = new Echo({
            broadcaster: 'reverb',
            key: environment.reverb.key,
            wsHost: environment.reverb.host,
            wsPort: environment.reverb.port,
            wssPort: environment.reverb.port,
            forceTLS: true,
            encrypted: true,
            enabledTransports: ['ws', 'wss'],
            authorizer: (channel: any, options: any) => ({
                authorize: (socketId: any, callback: any) => {
                    this.api.authBroadcast(socketId, channel).subscribe({
                        next: (response: any) => {
                            console.log(response);
                            callback(false, response);
                        },
                        error(error) {
                            callback(true, error);
                        },
                    });
                },
            }),
        });
    }




    listen(channel: string, event: string, callback: Function) {
        return this.echo.channel(channel).listen(event, callback);
    }

    private(channel: string) {
        return this.echo.private(channel);
    }

    presence(channel: string)
    {
        return this.echo.join(channel);
    }

    disconnect(): void {
        this.echo.disconnect();
    }
}