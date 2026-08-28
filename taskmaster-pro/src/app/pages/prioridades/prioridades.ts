import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data';

@Component({
  selector: 'app-prioridades',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './prioridades.html',
  styleUrls: ['./prioridades.scss']
})
export class Prioridades implements OnInit {
  itemsPrioritarios: any[] = [];
  nuevoTitulo: string = '';
  nivelPrioridad: string = 'Media';
  busqueda = '';
  filtro = 'Todas';

  constructor(private dataService: DataService) {}

  get itemsFiltrados() {
    return this.itemsPrioritarios.filter(item => item.titulo.toLowerCase().includes(this.busqueda.toLowerCase()) && (this.filtro === 'Todas' || item.prioridad === this.filtro));
  }

  get totalAlta() { return this.itemsPrioritarios.filter(item => item.prioridad === 'Alta').length; }
  get totalMedia() { return this.itemsPrioritarios.filter(item => item.prioridad === 'Media').length; }
  get totalBaja() { return this.itemsPrioritarios.filter(item => item.prioridad === 'Baja').length; }

  ngOnInit() {
    this.itemsPrioritarios = this.dataService.getPrioridades ? this.dataService.getPrioridades() : [];
  }

  agregarPrioridad() {
    if (!this.nuevoTitulo.trim()) return;

    const itemObj = {
      id: Date.now(),
      titulo: this.nuevoTitulo.trim(),
      prioridad: this.nivelPrioridad
    };

    this.itemsPrioritarios.push(itemObj);
    if (this.dataService.savePrioridades) {
      this.dataService.savePrioridades(this.itemsPrioritarios);
    }

    this.nuevoTitulo = '';
    this.nivelPrioridad = 'Media';
  }

  eliminarPrioridad(id: number) {
    this.itemsPrioritarios = this.itemsPrioritarios.filter(i => i.id !== id);
    if (this.dataService.savePrioridades) {
      this.dataService.savePrioridades(this.itemsPrioritarios);
    }
  }
}