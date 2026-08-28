import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, Tarea } from '../../services/data';

interface TareaCalendario extends Tarea {
  id: number;
}

@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendario.html',
  styleUrls: ['./calendario.scss']
})
export class Calendario {
  mesActual = 'Agosto 2026';
  diaSeleccionado = 20;
  tareas: Tarea[] = [];
  nuevaTareaTitulo = '';
  nuevaTareaHora = '09:00';
  nuevaTareaPrioridad: 'Alta' | 'Media' | 'Baja' = 'Media';
  soloPendientes = false;

  diasMes = Array.from({ length: 31 }, (_, i) => i + 1);

  constructor(private dataService: DataService) {
    this.tareas = dataService.getTareas();
  }

  get tareasPorDia(): { [key: number]: Tarea[] } {
    return this.tareas.reduce((dias, tarea) => {
      if (!tarea.fechaLimite.startsWith('2026-08-')) return dias;
      const dia = Number(tarea.fechaLimite.slice(-2));
      dias[dia] = [...(dias[dia] || []), tarea];
      return dias;
    }, {} as { [key: number]: Tarea[] });
  }

  get tareasDelDiaSeleccionado(): TareaCalendario[] {
    const tareas = this.tareasPorDia[this.diaSeleccionado] || [];
    return this.soloPendientes ? tareas.filter(tarea => tarea.estado !== 'Completada') : tareas;
  }

  seleccionarDia(dia: number) {
    this.diaSeleccionado = dia;
  }

  irAHoy() {
    this.diaSeleccionado = new Date().getDate();
  }

  cambiarEstadoTarea(tarea: TareaCalendario) {
    tarea.estado = tarea.estado === 'Completada' ? 'Pendiente' : 'Completada';
    this.dataService.saveTareas(this.tareas);
    if (tarea.estado === 'Completada') this.dataService.reproducirSonido();
  }

  crearTarea() {
    if (!this.nuevaTareaTitulo.trim()) return;
    this.tareas.push({
      id: Date.now(), titulo: this.nuevaTareaTitulo.trim(), descripcion: '',
      prioridad: this.nuevaTareaPrioridad, estado: 'Pendiente',
      fechaLimite: `2026-08-${String(this.diaSeleccionado).padStart(2, '0')}`,
      horaLimite: this.nuevaTareaHora, subtareas: []
    });
    this.dataService.saveTareas(this.tareas);
    this.nuevaTareaTitulo = '';
  }

  eliminarTarea(tarea: Tarea) {
    this.tareas = this.tareas.filter(item => item.id !== tarea.id);
    this.dataService.saveTareas(this.tareas);
  }
}