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
  AbstractControl,
  FormBuilder,
  FormGroup,
} from '@angular/forms';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { AuthComponent } from '../auth.component';
import { ValidationErrors } from '@angular/forms';

@Component({
  selector: 'app-register',
  imports: [AuthComponent, CommonModule, RouterLink, MatCardModule, FormsModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule, MatDividerModule, MatButtonModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  providers: [ApiService, Router],
})
export class RegisterComponent implements OnInit {

  registrationForm: FormGroup;
  apiErrors: string[] = [];

  constructor(private api: ApiService, private router: Router, private fb: FormBuilder) {
    this.registrationForm = this.fb.group(
      {
        name: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        confirmEmail: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]],
      },
      {
        validators: [
          this.matchingFieldsValidator('email', 'confirmEmail', 'emailMismatch'),
          this.matchingFieldsValidator('password', 'confirmPassword', 'passwordMismatch'),
        ],
      }
    );
  }

  ngOnInit(): void {
    this.api.requestCsrfToken();
  }

  matchingFieldsValidator(field1: string, field2: string, errorName: string) {
    return (formGroup: AbstractControl): ValidationErrors | null => {
      const value1 = formGroup.get(field1)?.value;
      const value2 = formGroup.get(field2)?.value;
  
      return value1 && value2 && value1 !== value2 ? { [errorName]: true } : null;
    };
  }

  storeUserDetails(userId: number, username: string): void {
    sessionStorage.setItem('userId', userId.toString());
    sessionStorage.setItem('userName', username);
  }

  onLogin() {
    if(!this.registrationForm.valid)
    {
      return;
    }

    const data = {
      name: this.registrationForm.get('name')?.value,
      email: this.registrationForm.get('email')?.value,
      password: this.registrationForm.get('password')?.value,
      password_confirmation: this.registrationForm.get('confirmPassword')?.value
    }

    this.apiErrors = [];

      this.api.register(data)
        .subscribe({
          next: (response: {userId:number, userName: string}) => {
            console.log('Registered in successfully:', response);
            this.storeUserDetails(response.userId, response.userName);
            this.router.navigate(['/home']);
          },
          error: (err: HttpErrorResponse) => {
            switch(err.status)
            {
              case 422:
                // Validation failed - Should really only be email already taken for this route
                this.apiErrors = Object.values(err.error.errors).map(value => String(value));
                break;
              case 419:
                // Probably a CSRF token mismatch but a refresh should fix it.
                this.apiErrors = ['Your session has expired. Please refresh the page and try again.'];
                break;
              default: 
                this.apiErrors = ['An unexpected error occurred. Please try again later.']
                break;
            }
            console.error('Registered failed:', err);
          }
        });
  }

  hasApiErros(): boolean
  {
    return Object.keys(this.apiErrors).length !== 0;
  }

}
