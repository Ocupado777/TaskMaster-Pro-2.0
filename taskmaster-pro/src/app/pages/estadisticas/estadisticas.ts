import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data';

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './estadisticas.html',
  styleUrls: ['./estadisticas.scss']
})
export class Estadisticas implements OnInit {
  totalTareas: number = 0;
  completadas: number = 0;
  pendientes: number = 0;
  porcentaje: number = 0;
  alta = 0;
  media = 0;
  baja = 0;
  proximas: any[] = [];

  constructor(private dataService: DataService) {}

  ngOnInit() {
    const tareas = this.dataService.getTareas();
    this.totalTareas = tareas.length;
    this.completadas = tareas.filter((t: any) => t.estado === 'Completada' || t.completada === true).length;
    this.pendientes = this.totalTareas - this.completadas;
    
    this.porcentaje = this.totalTareas > 0 
      ? Math.round((this.completadas / this.totalTareas) * 100) 
      : 0;
    this.alta = tareas.filter((t: any) => t.prioridad === 'Alta' && t.estado !== 'Completada').length;
    this.media = tareas.filter((t: any) => t.prioridad === 'Media' && t.estado !== 'Completada').length;
    this.baja = tareas.filter((t: any) => t.prioridad === 'Baja' && t.estado !== 'Completada').length;
    this.proximas = tareas.filter((t: any) => t.estado !== 'Completada' && t.fechaLimite).sort((a: any, b: any) => a.fechaLimite.localeCompare(b.fechaLimite)).slice(0, 3);
  }
}