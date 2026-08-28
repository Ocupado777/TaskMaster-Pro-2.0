import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class Login {
  email = '';
  password = '';
  mensaje = '';

  constructor(private router: Router, private dataService: DataService) {}

  async onLogin() {
    if (!this.email.trim() || !this.password) {
      this.mensaje = 'Ingresa tu correo y contraseña.';
      return;
    }

    if (!await this.dataService.iniciarSesion(this.email.trim(), this.password)) {
      this.mensaje = 'Los datos no coinciden. Revisa tu cuenta o regístrate.';
      return;
    }

    this.router.navigate(['/dashboard']);
  }
}