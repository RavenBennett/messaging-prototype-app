import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-add-contact',
  imports: [MatDialogModule, CommonModule, MatIconModule],
  templateUrl: './add-contact.component.html',
  styleUrl: './add-contact.component.scss'
})
export class AddContactComponent {

  users: {name: string; id: number}[] = [];

  constructor(@Inject(MAT_DIALOG_DATA) public data: {name: string; id: number}[], private dialogRef: MatDialogRef<AddContactComponent>) {
    this.users = data;
  }

  addContact(user: {name: string; id: number})
  {
    this.dialogRef.close(user); 
  }
}
