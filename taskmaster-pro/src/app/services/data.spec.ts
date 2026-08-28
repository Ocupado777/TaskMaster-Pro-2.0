import { TestBed } from '@angular/core/testing';
import { DataService } from './data';
import { provideHttpClient } from '@angular/common/http';

describe('DataService', () => {
  let service: DataService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(DataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should keep tasks isolated between users', async () => {
    const tarea = {
      id: 1,
      titulo: 'Tarea privada',
      descripcion: '',
      prioridad: 'Media' as const,
      estado: 'Pendiente' as const,
      fechaLimite: '',
      horaLimite: '',
      subtareas: []
    };

    expect(await service.registrarUsuario({ nombre: 'Ana', usuario: 'ana', email: 'ana@test.com', password: '123456' })).toBe(true);
    expect(await service.registrarUsuario({ nombre: 'Luis', usuario: 'luis', email: 'luis@test.com', password: '123456' })).toBe(true);
    expect(await service.iniciarSesion('ana@test.com', '123456')).toBe(true);
    service.saveTareas([tarea]);

    service.cerrarSesion();
    expect(await service.iniciarSesion('luis@test.com', '123456')).toBe(true);
    expect(service.getTareas()).toEqual([]);
  });
});
