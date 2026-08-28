import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, Tarea } from '../../services/data';

@Component({
  selector: 'app-tareas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tareas.html',
  styleUrls: ['./tareas.scss']
})
export class Tareas implements OnInit {
  busqueda: string = '';
  filtroPrioridad: string = 'Todas';
  filtroEstado: string = 'Todos';

  tareas: Tarea[] = [];

  // Estado del Modal
  mostrarModal: boolean = false;
  modoEdicion: boolean = false;
  tareaActual: Tarea = this.crearTareaVacia();
  nuevaSubtareaTexto: string = '';
  mostrarDetalle: boolean = false;
  tareaDetalle: Tarea | null = null;

  // Estado de Confirmación de Eliminación
  mostrarModalEliminar: boolean = false;
  tareaAEliminar: Tarea | null = null;
  mensajeToast: string = '';

  constructor(private dataService: DataService) {
    this.tareas = dataService.getTareas();
  }

  async ngOnInit() {
    await this.dataService.cargarTareas();
    this.tareas = this.dataService.getTareas();
  }

  crearTareaVacia(): Tarea {
    return {
      id: 0,
      titulo: '',
      descripcion: '',
      prioridad: 'Media',
      estado: 'Pendiente',
      fechaLimite: '',
      horaLimite: '',
      subtareas: []
    };
  }

  abrirModalNuevo() {
    this.modoEdicion = false;
    this.tareaActual = this.crearTareaVacia();
    this.mostrarModal = true;
  }

  abrirModalEditar(tarea: Tarea) {
    this.mostrarDetalle = false;
    this.modoEdicion = true;
    // Clonamos para evitar modificar directamente en la tabla antes de guardar
    this.tareaActual = JSON.parse(JSON.stringify(tarea));
    this.mostrarModal = true;
  }

  cerrarModal() {
    this.mostrarModal = false;
  }

  abrirDetalle(tarea: Tarea) {
    this.tareaDetalle = tarea;
    this.mostrarDetalle = true;
  }

  cerrarDetalle() {
    this.mostrarDetalle = false;
    this.tareaDetalle = null;
  }

  contarSubtareasCompletadas(tarea: Tarea): number {
    return tarea.subtareas.filter(subtarea => subtarea.completada).length;
  }

  cambiarSubtarea(subtarea: { texto: string; completada: boolean }) {
    if (!this.tareaDetalle) return;

    const todasCompletadas = this.tareaDetalle.subtareas.length > 0 &&
      this.tareaDetalle.subtareas.every(subtareaActual => subtareaActual.completada);
    this.tareaDetalle.estado = todasCompletadas ? 'Completada' : 'Pendiente';
    this.dataService.saveTareas(this.tareas);
    this.mostrarToast(todasCompletadas ? 'Tarea completada' : 'Subtarea actualizada');
  }

  completarTarea(tarea: Tarea) {
    tarea.estado = 'Completada';
    tarea.subtareas.forEach(subtarea => subtarea.completada = true);
    this.dataService.saveTareas(this.tareas);
    this.mostrarToast('Tarea completada');
  }

  agregarSubtarea() {
    if (this.nuevaSubtareaTexto.trim()) {
      this.tareaActual.subtareas.push({ texto: this.nuevaSubtareaTexto.trim(), completada: false });
      this.nuevaSubtareaTexto = '';
    }
  }

  eliminarSubtarea(index: number) {
    this.tareaActual.subtareas.splice(index, 1);
  }

  guardarTarea() {
    if (!this.tareaActual.titulo.trim()) {
      alert('El título de la tarea es obligatorio.');
      return;
    }

    if (this.modoEdicion) {
      const index = this.tareas.findIndex(t => t.id === this.tareaActual.id);
      if (index !== -1) {
        this.tareas[index] = { ...this.tareaActual };
      }
      this.mostrarToast('Tarea actualizada');
    } else {
      this.tareaActual.id = Date.now();
      this.tareas.push({ ...this.tareaActual });
      this.mostrarToast('Nueva tarea creada');
    }

    this.dataService.saveTareas(this.tareas);

    this.cerrarModal();
  }

  confirmarEliminar(tarea: Tarea) {
    this.tareaAEliminar = tarea;
    this.mostrarModalEliminar = true;
  }

  ejecutarEliminacion() {
    if (this.tareaAEliminar) {
      this.tareas = this.tareas.filter(t => t.id !== this.tareaAEliminar?.id);
      this.mostrarModalEliminar = false;
      this.tareaAEliminar = null;
      this.dataService.saveTareas(this.tareas);
      this.mostrarToast('Tarea eliminada');
    }
  }

  cancelarEliminacion() {
    this.mostrarModalEliminar = false;
    this.tareaAEliminar = null;
  }

  mostrarToast(mensaje: string) {
    this.mensajeToast = mensaje;
    setTimeout(() => {
      this.mensajeToast = '';
    }, 3000);
  }

  get tareasFiltradas() {
    return this.tareas.filter(t => {
      const coincideBusqueda = t.titulo.toLowerCase().includes(this.busqueda.toLowerCase());
      const coincidePrioridad = this.filtroPrioridad === 'Todas' || t.prioridad === this.filtroPrioridad;
      const coincideEstado = this.filtroEstado === 'Todos' || t.estado === this.filtroEstado;
      return coincideBusqueda && coincidePrioridad && coincideEstado;
    });
  }
}