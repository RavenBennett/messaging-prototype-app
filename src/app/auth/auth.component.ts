import { Component, Input, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';

@Component({
  selector: 'app-auth',
  imports: [CommonModule, MatCardModule, MatFormFieldModule, MatInputModule, MatDividerModule, MatButtonModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss',
  providers: [],
})
export class AuthComponent {

  @Input() title!: TemplateRef<any>;
  @Input() subTitle!: TemplateRef<any>;
  @Input() content!: TemplateRef<any>;
  @Input() footer!: TemplateRef<any>;

  constructor() {}


}
