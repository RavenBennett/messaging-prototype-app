import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { message, messageWithName, UserDbService } from '../services/user-db.service';
import { Router } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { FormsModule  } from '@angular/forms';
import {CdkVirtualScrollViewport, ScrollingModule} from '@angular/cdk/scrolling';
import { ApiService } from '../services/api.service';
import { DomSanitizer } from '@angular/platform-browser';
import {MatTooltipModule} from '@angular/material/tooltip';
import { EchoService } from '../services/echo.service';
import { AddContactComponent } from './add-contact/add-contact.component';
import { MatDialog } from '@angular/material/dialog';
import { CdkMenuModule } from '@angular/cdk/menu';

export interface contact {
  name: string,
  id: number
};

@Component({
  selector: 'app-home',
  imports: [CommonModule, MatSidenavModule, MatButtonModule, MatIconModule, FormsModule, ScrollingModule, MatTooltipModule, CdkMenuModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  providers: [UserDbService, ApiService]
})

export class HomeComponent implements OnInit {
  @ViewChild(CdkVirtualScrollViewport) viewport!: CdkVirtualScrollViewport;

  userId = sessionStorage.getItem('userId') ?? '-1';
  username = sessionStorage.getItem('userName') ?? '';
  loading = false;

  contacts: contact[] = []
  users: contact[] = [];

  messages: messageWithName[] = [];
  activeContact: contact = {name: '', id: -1};

  text: string = '';

  constructor(private userDb: UserDbService, private router: Router, private api: ApiService, private echoService: EchoService, public dialog: MatDialog) {
    const iconRegistry = inject(MatIconRegistry);
    const sanitizer = inject(DomSanitizer);

    // Set up status icons
    iconRegistry.addSvgIcon('processing', sanitizer.bypassSecurityTrustResourceUrl('../../assets/icons/circle-dashed.svg'));
    iconRegistry.addSvgIcon('delivered', sanitizer.bypassSecurityTrustResourceUrl('../../assets/icons/circle-dot-dashed.svg'));
    iconRegistry.addSvgIcon('viewed', sanitizer.bypassSecurityTrustResourceUrl('../../assets/icons/circle-dot.svg'));

    // Listen to private cahnnel for status updates
    this.echoService.private(`user.${this.userId}`).listen('MessageProcessed', (data: {message: {userId: string, messageId: string}}) => {
      this.handleMessageProcessed(data.message);
    }).error((error: any) => {
      console.error('Error subscribing to the channel:', error);
      this.router.navigate(['/']);
    });

    this.echoService.presence('online').here((data: any) => {
      this.api.requestMissedBroadcasts().subscribe({
        next: () => {},
        error: (error) => { console.error('Error requesting missed broadcasts'); }
      });
    }).error((error: any) => {
      console.error('Error subscribing to the channel:', error);
    })
  }

  ngOnInit(): void {
    // Set up db and get all data
    if(this.userId === '-1')
    {
      this.router.navigate(['/']);
    } else {
      this.userDb.initUserDb({name: this.username ?? '', id: this.userId}).subscribe({
        next: () => {
          this.getAllContacts();
          this.api.getUsers().subscribe({
            next: (response: contact[]) => {
              this.users = response.filter(r => r.id !== Number.parseInt(this.userId));
            },
            error: (error) => {
              this.router.navigate(['/']);
              console.error(error);
            }
          });
        },
        error: (error) => {
          console.error(error);
        }
      });
    }
  }

  async getAllContacts() {
    const storedUsers = await this.userDb.getUsers();
    this.contacts = storedUsers.filter(u => u.id !== Number.parseInt(this.userId));
  }

  // New contact Dialog
  onAddContactClick() {
    const dialogRef = this.dialog.open(AddContactComponent, {
        data: this.users.filter(u => this.contacts.findIndex(c => c.id === u.id) === -1),
    });

    dialogRef.afterClosed().subscribe( async (result: {name: string; id: number}) => {
      if(result !== undefined) {
        await this.userDb.addUser(this.userId, result);
        this.contacts.unshift(result);
      }
    });
  }

  async addUser(contact: {id: number, name: string}) {
    await this.userDb.addUser(this.userId, {name: contact.name, id: contact.id});
    this.contacts.unshift(contact);
  }


  // Update message status to Viewed
  async handleMessageProcessed(message: {userId: string, messageId: string}) {
    await this.userDb.updateMessageStatus(this.userId, message.messageId, 'Viewed');
    if(this.activeContact.id !== -1) {
      this.getMessages();
    }
  }

  // select new active contact
  async switchChatContact(recipient: contact)
  {
    if(recipient.id === this.activeContact.id) 
    {
      return;
    }
    this.loading = true;
    this.activeContact = recipient;
    this.getMessages();
  }


  async getMessages() {
    try 
    {
      this.messages = await this.userDb.getMessages(this.activeContact.id, Number.parseInt(this.userId));
      this.viewport.scrollToIndex(this.messages.length - 1);
      setTimeout(() => {
        const items = document.getElementsByClassName("message-container");
        if(items.length > 1) {
          items[items.length - 1].scrollIntoView();
        }
        this.loading = false;
      }, 2);
    } 
    catch(error: unknown) 
    {
      console.log((error as Error).message);
    }
  }

  // dynamicly resize the text-area
  onInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';  
    textarea.style.height = `${textarea.scrollHeight - 4}px`; 
  }

  // hit  enter on text-area
  onEnterKey(event: any): void {
    event.preventDefault();
    this.sendMessage();
  }

  escapeSpecialChars(input: string): string {
    return input.replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/'/g, "&#39;")
                .replace(/"/g, "&quot;");
  }

  sendMessage(): void
  {
    const sanitizedInput = this.escapeSpecialChars(this.text);
    this.text = '';
    this.api.postMessage(sanitizedInput, this.activeContact.id).subscribe({
      next: (response) => {
        const message: message = {
          messageId: response.uuid,
          senderId: Number.parseInt(this.userId),
          timeStamp: response.timestamp,
          content: sanitizedInput,
          status: 'Processing',
        };
        this.saveMessage(message);
      },
      error: (error) => {
        console.log(error);
      }
    });
  }

  async saveMessage(message: message) {
    try 
    {
      await this.userDb.storeMessage(message, [this.activeContact.id]);
    }
    catch(error: unknown)
    {
      console.log((error as Error).message);
    }

    this.getMessages();
  }

  logout(): void {
    this.api.logout().subscribe({
      next: () => {
        sessionStorage.clear();
        this.router.navigate(['/']);
      },
      error: (error) => {
        console.error(error);
      }
    });
  }

  isToday(unixTimestamp: number): boolean {
    const givenDate = new Date(unixTimestamp * 1000);
    const today = new Date();

    return (
        givenDate.getDate() === today.getDate() &&
        givenDate.getMonth() === today.getMonth() &&
        givenDate.getFullYear() === today.getFullYear()
    );
  }

  // show full date for messages older than today
  dateFormat(unixTimestamp: number): string {
    return this.isToday(unixTimestamp) ? 'HH:mm' : 'dd/MM/yyyy HH:mm';
  }

}
