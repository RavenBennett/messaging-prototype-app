import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import {
  FormControl,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { AuthComponent } from '../auth.component';

@Component({
  selector: 'app-login',
  imports: [AuthComponent, CommonModule, RouterLink, MatCardModule, FormsModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule, MatDividerModule, MatButtonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  providers: [ApiService, Router],
})
export class LoginComponent implements OnInit {
  emailFormControl = new FormControl('', [Validators.required, Validators.email]);
  passwordFormControl = new FormControl('', [Validators.required]);
  apiErrors: string[] = [];

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.api.requestCsrfToken();
  }

  storeUserDetails(userId: number, username: string): void {
    sessionStorage.setItem('userId', userId.toString());
    sessionStorage.setItem('userName', username);
  }

  onLogin() {
    if(!this.emailFormControl.valid || !this.passwordFormControl.valid)
    {
      return;
    }
    this.apiErrors = [];
    const email = this.emailFormControl.value === null ? '' : this.emailFormControl.value ;
    const password = this.passwordFormControl.value === null ? '' : this.passwordFormControl.value;

      this.api.login(email, password)
        .subscribe({
          next: (response: {userId:number, userName: string}) => {
            console.log('Logged in successfully:', response);
            this.storeUserDetails(response.userId, response.userName);
            this.router.navigate(['/home']);
          },
          error: (err: HttpErrorResponse) => {
            switch(err.status)
            {
              case 422:
                // Validation failed
                this.apiErrors = Object.values(err.error.errors).map(value => String(value));
                break;
              case 401:
                // Invalid credentials
                this.apiErrors = ['Login details incorrect.'];
                break;
              case 419:
                // Probably a CSRF token mismatch but a refresh should fix it.
                this.apiErrors = ['Your session has expired. Please refresh the page and try again.'];
                break;
              default: 
                this.apiErrors = ['An unexpected error occurred. Please try again later.']
                break;
            }
            console.error('Login failed:', err);
          }
        });
  }

  hasApiErros(): boolean
  {
    return Object.keys(this.apiErrors).length !== 0;
  }
}
