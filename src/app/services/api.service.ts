import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class ApiService {
    constructor(private http: HttpClient) {
        this.http.get(`${this.apiUrl}/sanctum/csrf-cookie`, { withCredentials: true });
    }

    // Must use relative path or XSRF Token header will not be set.
    // If an absolute path is needed create own interceptor to set token
    // or use axios and set withXSRFToken & withCredentials to true
    private apiUrl = '//api.messaging-prototype.test';
    private apiPrefix = '/api';

    public requestCsrfToken()
    {
        console.log('getting cookies');
        this.http.get(`${this.apiUrl}/sanctum/csrf-cookie`, { withCredentials: true }).subscribe({
            next: () => {
              console.log('CSRF token set');
            },
            error: (err) => {
                console.error('Error fetching CSRF token:', err);
            },
        });
    }

    login(email: string, password: string): Observable<any>
    { 
        return this.http.post(`${this.apiUrl}${this.apiPrefix}/login`,{'email': email, 'password': password}, { withCredentials: true });
    }

    logout(): Observable<any>
    {
        return this.http.post(`${this.apiUrl}${this.apiPrefix}/logout`,{}, { withCredentials: true });
    }
    
    register(data:{name: string, email: string, password: string, password_confirmation: string}): Observable<any>
    {
        return this.http.post(`${this.apiUrl}${this.apiPrefix}/register`, data, { withCredentials: true });
    }

    postMessage(content: string, recipientId: number): Observable<any>
    { 
        return this.http.post(`${this.apiUrl}${this.apiPrefix}/user/message`,{'content': content, 'recipient_id': recipientId}, { withCredentials: true });
    }

    authBroadcast(socketId: any, channel: any): Observable<any>
    {
        return this.http.post(`${this.apiUrl}${this.apiPrefix}/broadcasting/auth`, 
            {
                socket_id: socketId,
                channel_name: channel.name
            }, 
            { 
                withCredentials: true 
            }
        );
    }

    getUsers(): Observable<any>
    {
        return this.http.get(`${this.apiUrl}${this.apiPrefix}/users`,{ withCredentials: true });
    }

    requestMissedBroadcasts(): Observable<any>
    {
        return this.http.post(`${this.apiUrl}${this.apiPrefix}/user/events/missed`, {}, { withCredentials: true });
    }

}