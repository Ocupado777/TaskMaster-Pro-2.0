import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Alerta, DataService } from '../../services/data';

@Component({
  selector: 'app-recordatorios',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './recordatorios.html',
  styleUrls: ['./recordatorios.scss']
})
export class Recordatorios implements OnInit {
  recordatorios: any[] = [];
  nuevoRecordatorio: string = '';

  constructor(private dataService: DataService) {}

  get alertas(): Alerta[] { return this.dataService.getAlertas(); }
  get recordatoriosPendientes() { return this.recordatorios.filter(recordatorio => !recordatorio.completado).length; }

  ngOnInit() {
    this.recordatorios = this.dataService.getRecordatorios ? this.dataService.getRecordatorios() : [];
  }

  agregarRecordatorio() {
    if (!this.nuevoRecordatorio.trim()) return;

    const recordatorioObj = {
      id: Date.now(),
      texto: this.nuevoRecordatorio.trim(),
      completado: false
    };

    this.recordatorios.push(recordatorioObj);
    if (this.dataService.saveRecordatorios) {
      this.dataService.saveRecordatorios(this.recordatorios);
    }

    this.nuevoRecordatorio = '';
  }

  eliminarRecordatorio(id: number) {
    this.recordatorios = this.recordatorios.filter(r => r.id !== id);
    if (this.dataService.saveRecordatorios) {
      this.dataService.saveRecordatorios(this.recordatorios);
    }
  }

  cambiarEstado(recordatorio: any) {
    recordatorio.completado = !recordatorio.completado;
    this.dataService.saveRecordatorios(this.recordatorios);
  }

  limpiarCompletados() {
    this.recordatorios = this.recordatorios.filter(recordatorio => !recordatorio.completado);
    this.dataService.saveRecordatorios(this.recordatorios);
  }
}