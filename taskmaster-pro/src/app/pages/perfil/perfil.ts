import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil.html',
  styleUrls: ['./perfil.scss']
})
export class Perfil implements OnInit {
  usuario: any = null;
  email: string = 'usuario@taskmaster.com';
  nombre = '';
  telefono = '';
  rol: string = 'Administrador Pro';
  passwordActual = '';
  passwordNueva = '';
  confirmarPassword = '';
  mensajePassword = '';

  constructor(private dataService: DataService) {}

  ngOnInit() {
    this.usuario = this.dataService.getUsuario();
    this.email = this.usuario?.email || this.email;
    this.nombre = this.usuario?.nombre || '';
    this.telefono = this.usuario?.telefono || '';
  }

  guardarPerfil() {
    if (this.usuario) this.dataService.saveUsuario({ ...this.usuario, nombre: this.nombre.trim() || this.usuario.nombre, email: this.email.trim(), telefono: this.telefono.trim() });
  }

  cambiarPassword() {
    this.mensajePassword = '';
    if (this.passwordNueva !== this.confirmarPassword) {
      this.mensajePassword = 'Las contraseñas nuevas no coinciden.';
      return;
    }
    if (!this.dataService.cambiarPassword(this.passwordActual, this.passwordNueva)) {
      this.mensajePassword = 'La contraseña actual no es válida o la nueva tiene menos de 6 caracteres.';
      return;
    }
    this.passwordActual = '';
    this.passwordNueva = '';
    this.confirmarPassword = '';
    this.mensajePassword = 'Contraseña actualizada correctamente.';
  }

  eliminarAvatar() {
    if (!this.usuario) return;
    this.usuario = { ...this.usuario, avatar: '' };
    this.dataService.saveUsuario(this.usuario);
  }

  seleccionarAvatar(event: Event) {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo || !this.usuario) return;
    const lector = new FileReader();
    lector.onload = () => {
      this.usuario = { ...this.usuario, avatar: lector.result as string };
      this.dataService.saveUsuario(this.usuario);
    };
    lector.readAsDataURL(archivo);
  }

  get totalTareas() { return this.dataService.getTareas().length; }
  get tareasCompletadas() { return this.dataService.getTareas().filter(tarea => tarea.estado === 'Completada').length; }
  get porcentajeActividad() { return this.totalTareas ? Math.round((this.tareasCompletadas / this.totalTareas) * 100) : 0; }
}