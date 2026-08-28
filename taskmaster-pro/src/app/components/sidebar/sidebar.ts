import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { DataService } from '../../services/data';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.scss']
})
export class Sidebar {
  constructor(private router: Router, public dataService: DataService) {}

  get alertas() { return this.dataService.getAlertas(); }
  get solicitudesChat() {
    const usuario = this.dataService.usuario()?.usuario;
    return usuario ? this.dataService.getSolicitudesContacto().filter(solicitud => solicitud.receptor === usuario && solicitud.estado === 'pendiente').length : 0;
  }

  cerrarSesion() {
    this.dataService.cerrarSesion();
    this.router.navigate(['/login']);
  }
}