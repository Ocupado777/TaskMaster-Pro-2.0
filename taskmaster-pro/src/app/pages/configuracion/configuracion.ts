import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configuracion.html',
  styleUrls: ['./configuracion.scss']
})
export class Configuracion {
  temaOscuro: boolean;
  premiumActivo: boolean;
  colorPrincipal: string;
  tamanioLetra: 'Pequeña' | 'Mediana' | 'Grande';
  notificacionesActivas: boolean;
  sonidoAlertas: boolean;
  animacionesActivas: boolean;

  coloresDisponibles = [
    { nombre: 'Verde esmeralda', valor: '#2e7d32' },
    { nombre: 'Coral', valor: '#c86d5d' },
    { nombre: 'Azul eléctrico', valor: '#2575fc' },
    { nombre: 'Ciruela', valor: '#7b4b8f' },
    { nombre: 'Rojo', valor: '#c62828' },
    { nombre: 'Rosa', valor: '#ec407a' }
  ];

  // Modal de Restablecer cuenta
  mostrarModalRestablecer: boolean = false;
  mensajeToast: string = '';

  constructor(private dataService: DataService) {
    this.temaOscuro = dataService.tema() === 'dark';
    const preferencias = dataService.preferencias();
    this.premiumActivo = preferencias.premiumActivo;
    this.colorPrincipal = preferencias.colorPrincipal;
    this.tamanioLetra = preferencias.tamanioLetra;
    this.notificacionesActivas = preferencias.notificacionesActivas;
    this.sonidoAlertas = preferencias.sonidoAlertas;
    this.animacionesActivas = preferencias.animacionesActivas;
  }

  sincronizarTema() {
    if (this.temaOscuro !== (this.dataService.tema() === 'dark')) this.dataService.cambiarTema();
  }

  cambiarColor(color: string) {
    this.colorPrincipal = color;
    this.dataService.guardarPreferencias({ colorPrincipal: color });
  }

  cambiarPremium() {
    this.dataService.guardarPreferencias({ premiumActivo: this.premiumActivo });
    this.mostrarToast(this.premiumActivo ? 'Experiencia Premium activada' : 'Experiencia Premium desactivada');
  }

  cambiarTamanio() {
    this.dataService.guardarPreferencias({ tamanioLetra: this.tamanioLetra });
  }

  guardarCambios() {
    this.dataService.guardarPreferencias({
      premiumActivo: this.premiumActivo,
      colorPrincipal: this.colorPrincipal,
      tamanioLetra: this.tamanioLetra,
      notificacionesActivas: this.notificacionesActivas,
      sonidoAlertas: this.sonidoAlertas,
      animacionesActivas: this.animacionesActivas
    });
    this.mostrarToast('Configuración guardada exitosamente');
  }

  confirmarRestablecer() {
    this.mostrarModalRestablecer = true;
  }

  ejecutarRestablecer() {
    this.dataService.restablecerCuenta();
    this.mostrarModalRestablecer = false;
    window.location.href = '/login';
  }

  cancelarRestablecer() {
    this.mostrarModalRestablecer = false;
  }

  mostrarToast(mensaje: string) {
    this.mensajeToast = mensaje;
    setTimeout(() => {
      this.mensajeToast = '';
    }, 3000);
  }
}