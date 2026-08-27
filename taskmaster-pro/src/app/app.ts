import { Component } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { Sidebar } from './components/sidebar/sidebar'; // Ajustado sin el sufijo Component
import { CommonModule } from '@angular/common';
import { DataService } from './services/data';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Sidebar, CommonModule],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {
  mostrarSidebar = true;
  menuUsuarioAbierto = false;

  constructor(private router: Router, public dataService: DataService) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).forEach((event: any) => {
      const url = event.urlAfterRedirects;
      if (url.includes('/login') || url.includes('/register')) {
        this.mostrarSidebar = false;
      } else {
        this.mostrarSidebar = true;
      }
    });
  }

  get inicialesUsuario() {
    const nombre = this.dataService.usuario()?.nombre || 'Usuario';
    return nombre.split(' ').filter(Boolean).slice(0, 2).map(parte => parte[0]).join('').toUpperCase();
  }

  cerrarMenuUsuario() {
    this.menuUsuarioAbierto = false;
  }

  irAPerfil() {
    this.cerrarMenuUsuario();
    this.router.navigate(['/perfil']);
  }

  cerrarSesion() {
    this.dataService.cerrarSesion();
    this.cerrarMenuUsuario();
    this.router.navigate(['/login']);
  }
}