import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Alerta, DataService, Tarea } from '../../services/data';

@Component({
  imports: [CommonModule, RouterLink],
  selector: 'app-dashboard',
  styleUrl: './dashboard.scss',
  templateUrl: './dashboard.html',
})
export class Dashboard {
  tareas: Tarea[] = [];

  constructor(public dataService: DataService) {
    this.tareas = dataService.getTareas();
  }

  get pendientes() { return this.tareas.filter(tarea => tarea.estado !== 'Completada'); }
  get completadas() { return this.tareas.filter(tarea => tarea.estado === 'Completada'); }
  get progreso() { return this.tareas.length ? Math.round((this.completadas.length / this.tareas.length) * 100) : 0; }
  get usuario() { return this.dataService.usuario(); }
  get alertas(): Alerta[] { return this.dataService.getAlertas(); }
}
