import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DataService } from '../../services/data';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrls: ['./register.scss']
})
export class Register {
  nombre: string = '';
  usuario: string = '';
  email: string = '';
  password: string = '';
  mensajeToast: string = '';

  constructor(private router: Router, private dataService: DataService) {}

  async registrarUsuario() {
    if (!this.nombre || !this.usuario || !this.email || !this.password) {
      this.mostrarToast('Por favor completa todos los campos');
      return;
    }

    const usuarioNuevo = { nombre: this.nombre.trim(), usuario: this.usuario.trim().toLowerCase(), email: this.email.trim(), password: this.password };
    if (!await this.dataService.registrarUsuario(usuarioNuevo)) {
      this.mostrarToast('Ya existe una cuenta registrada.');
      return;
    }

    this.mostrarToast('¡Cuenta creada con éxito! Redirigindo al Login...');
    
    setTimeout(() => {
      this.router.navigate(['/login']);
    }, 2000);
  }

  mostrarToast(mensaje: string) {
    this.mensajeToast = mensaje;
    setTimeout(() => { this.mensajeToast = ''; }, 3000);
  }
}