import { DOCUMENT } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

const apiHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const API_URL = (globalThis as typeof globalThis & { __TASKMASTER_API__?: string }).__TASKMASTER_API__ || `http://${apiHost}:3000/api`;

export interface Usuario {
  nombre: string;
  email: string;
  usuario?: string;
  password?: string;
  avatar?: string;
  telefono?: string;
  fechaLogin?: string;
}

export interface SolicitudContacto {
  id: number;
  emisor: string;
  receptor: string;
  estado: 'pendiente' | 'aceptada' | 'rechazada';
  fecha: string;
}

export interface MensajeChat {
  id: number;
  emisor: string;
  receptor: string;
  texto: string;
  fecha: string;
}

export interface Tarea {
  id: number;
  titulo: string;
  descripcion: string;
  prioridad: 'Alta' | 'Media' | 'Baja';
  estado: 'Pendiente' | 'Completada';
  fechaLimite: string;
  horaLimite: string;
  subtareas: { texto: string; completada: boolean }[];
}

export interface Alerta {
  id: number;
  tarea: Tarea;
  tipo: 'vencida' | 'proxima';
  texto: string;
}

export interface Preferencias {
  colorPrincipal: string;
  premiumActivo: boolean;
  tamanioLetra: 'Pequeña' | 'Mediana' | 'Grande';
  notificacionesActivas: boolean;
  sonidoAlertas: boolean;
  animacionesActivas: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  usuario = signal<Usuario | null>(this.getUsuario());
  tema = signal<'light' | 'dark'>((localStorage.getItem('taskmaster_tema') as 'light' | 'dark') || 'light');
  preferencias = signal<Preferencias>(this.getPreferencias());

  constructor(@Inject(DOCUMENT) private document: Document, private http: HttpClient) {
    this.aplicarTema(this.tema());
    this.aplicarPreferencias(this.preferencias());
  }

  // Métodos para manejar Usuarios
  getUsuario(): Usuario | null {
    const usuario: Usuario | null = JSON.parse(localStorage.getItem('usuario') || 'null');
    return usuario ? { ...usuario, usuario: usuario.usuario || this.crearIdentificador(usuario.nombre) } : null;
  }

  saveUsuario(user: Usuario) {
    const actualizado = { ...user, usuario: user.usuario || this.crearIdentificador(user.nombre) };
    const usuarios = this.getUsuarios();
    const indice = usuarios.findIndex(item => item.email === user.email || item.usuario === actualizado.usuario);
    if (indice >= 0) usuarios[indice] = { ...usuarios[indice], ...actualizado };
    else usuarios.push(actualizado);
    localStorage.setItem('taskmaster_usuarios', JSON.stringify(usuarios));
    localStorage.setItem('usuario', JSON.stringify(actualizado));
    localStorage.setItem('taskmaster_usuario_registrado', JSON.stringify(actualizado));
    this.usuario.set(actualizado);
    this.migrarDatosPersonalesLegados(actualizado);
    if (this.token) this.http.put(`${API_URL}/me`, actualizado, { headers: this.authHeaders }).subscribe();
  }

  async registrarUsuario(user: Usuario): Promise<boolean> {
    try {
      await firstValueFrom(this.http.post(`${API_URL}/auth/register`, user));
      return true;
    } catch {
      return this.registrarUsuarioLocal(user);
    }
  }

  private registrarUsuarioLocal(user: Usuario): boolean {
    const usuarios = this.getUsuarios();
    const identificador = (user.usuario || user.nombre).trim().toLowerCase();
    if (usuarios.some(registrado => registrado.email.toLowerCase() === user.email.toLowerCase() || (registrado.usuario || registrado.nombre).toLowerCase() === identificador)) return false;
    const usuarioNuevo = { ...user, usuario: identificador };
    localStorage.setItem('taskmaster_usuarios', JSON.stringify([...usuarios, usuarioNuevo]));
    if (!localStorage.getItem('taskmaster_usuario_registrado')) localStorage.setItem('taskmaster_usuario_registrado', JSON.stringify(usuarioNuevo));
    return true;
  }

  async iniciarSesion(email: string, password: string): Promise<boolean> {
    try {
      const respuesta = await firstValueFrom(this.http.post<{ token: string; user: Usuario }>(`${API_URL}/auth/login`, { email, password }));
      localStorage.setItem('taskmaster_token', respuesta.token);
      this.saveUsuario({ ...respuesta.user, fechaLogin: new Date().toISOString() });
      await this.cargarDatosRemotos();
      return true;
    } catch {
      return this.iniciarSesionLocal(email, password);
    }
  }

  private iniciarSesionLocal(email: string, password: string): boolean {
    const registrado = this.getUsuarios().find(usuario => usuario.email === email && usuario.password === password) || null;
    if (!registrado || registrado.email !== email || registrado.password !== password) return false;
    this.saveUsuario({ ...registrado, fechaLogin: new Date().toISOString() });
    return true;
  }

  private async cargarDatosRemotos() {
    if (!this.token) return;
    try {
      const [tareas, usuarios, solicitudes, preferencias, eventos, prioridades, recordatorios] = await Promise.all([
        firstValueFrom(this.http.get<Tarea[]>(`${API_URL}/tasks`, { headers: this.authHeaders })),
        firstValueFrom(this.http.get<Usuario[]>(`${API_URL}/users`, { headers: this.authHeaders })),
        firstValueFrom(this.http.get<SolicitudContacto[]>(`${API_URL}/requests`, { headers: this.authHeaders })),
        firstValueFrom(this.http.get<Preferencias>(`${API_URL}/data/preferencias`, { headers: this.authHeaders })),
        firstValueFrom(this.http.get<any[]>(`${API_URL}/data/eventos`, { headers: this.authHeaders })),
        firstValueFrom(this.http.get<any[]>(`${API_URL}/data/prioridades`, { headers: this.authHeaders })),
        firstValueFrom(this.http.get<any[]>(`${API_URL}/data/recordatorios`, { headers: this.authHeaders }))
      ]);
      localStorage.setItem('taskmaster_usuarios', JSON.stringify([this.usuario(), ...usuarios].filter(Boolean)));
      localStorage.setItem('taskmaster_solicitudes', JSON.stringify(solicitudes));
      this.guardarDatosPersonales('tareas', tareas);
      this.guardarDatosPersonales('eventos', eventos);
      this.guardarDatosPersonales('prioridades', prioridades);
      this.guardarDatosPersonales('recordatorios', recordatorios);
      if (preferencias && !Array.isArray(preferencias)) { this.preferencias.set({ ...this.getPreferencias(), ...preferencias }); this.aplicarPreferencias(this.preferencias()); }
    } catch { /* Las pantallas usan la caché local si una carga remota falla. */ }
  }

  cerrarSesion() {
    localStorage.removeItem('usuario');
    localStorage.removeItem('taskmaster_token');
    this.usuario.set(null);
  }

  cambiarPassword(passwordActual: string, passwordNueva: string): boolean {
    const usuario = this.usuario();
    const registrado = this.getUsuarios().find(item => item.email === usuario?.email) || null;
    if (!usuario || !registrado || registrado.password !== passwordActual || passwordNueva.length < 6) return false;

    const actualizado = { ...usuario, password: passwordNueva };
    this.saveUsuario(actualizado);
    return true;
  }

  getUsuarios(): Usuario[] {
    const guardados = JSON.parse(localStorage.getItem('taskmaster_usuarios') || 'null');
    if (Array.isArray(guardados)) return guardados;
    const legado: Usuario | null = JSON.parse(localStorage.getItem('taskmaster_usuario_registrado') || 'null');
    return legado ? [{ ...legado, usuario: legado.usuario || legado.nombre.trim().toLowerCase().replace(/\s+/g, '_') }] : [];
  }

  getUsuarioPorNombre(usuario: string): Usuario | undefined {
    const buscado = usuario.trim().toLowerCase();
    return this.getUsuarios().find(item => (item.usuario || '').toLowerCase() === buscado);
  }

  private crearIdentificador(nombre: string): string {
    return nombre.trim().toLowerCase().replace(/\s+/g, '_');
  }

  enviarSolicitudContacto(receptor: string): boolean {
    const actual = this.usuario();
    const destino = this.getUsuarioPorNombre(receptor);
    if (!actual?.usuario || !destino?.usuario || actual.usuario === destino.usuario) return false;
    const solicitudes = this.getSolicitudesContacto();
    if (solicitudes.some(solicitud => solicitud.emisor === actual.usuario && solicitud.receptor === destino.usuario && solicitud.estado === 'pendiente')) return false;
    solicitudes.push({ id: Date.now(), emisor: actual.usuario, receptor: destino.usuario, estado: 'pendiente', fecha: new Date().toISOString() });
    localStorage.setItem('taskmaster_solicitudes', JSON.stringify(solicitudes));
    if (this.token) this.http.post(`${API_URL}/requests`, { receptor: destino.usuario }, { headers: this.authHeaders }).subscribe();
    return true;
  }

  getSolicitudesContacto(): SolicitudContacto[] {
    return JSON.parse(localStorage.getItem('taskmaster_solicitudes') || '[]');
  }

  responderSolicitud(id: number, estado: 'aceptada' | 'rechazada') {
    const solicitudes = this.getSolicitudesContacto().map(solicitud => solicitud.id === id ? { ...solicitud, estado } : solicitud);
    localStorage.setItem('taskmaster_solicitudes', JSON.stringify(solicitudes));
    if (this.token) this.http.put(`${API_URL}/requests/${id}`, { estado }, { headers: this.authHeaders }).subscribe();
  }

  getContactos(): Usuario[] {
    const actual = this.usuario()?.usuario;
    if (!actual) return [];
    const solicitudes = this.getSolicitudesContacto().filter(solicitud => solicitud.estado === 'aceptada' && (solicitud.emisor === actual || solicitud.receptor === actual));
    const nombres = solicitudes.map(solicitud => solicitud.emisor === actual ? solicitud.receptor : solicitud.emisor);
    return this.getUsuarios().filter(usuario => usuario.usuario && nombres.includes(usuario.usuario));
  }

  getConversacion(contacto: string): MensajeChat[] {
    const actual = this.usuario()?.usuario;
    if (!actual) return [];
    return this.getMensajesChat().filter(mensaje => (mensaje.emisor === actual && mensaje.receptor === contacto) || (mensaje.emisor === contacto && mensaje.receptor === actual));
  }

  enviarMensaje(contacto: string, texto: string) {
    const emisor = this.usuario()?.usuario;
    if (!emisor || !texto.trim()) return;
    const mensajes = this.getMensajesChat();
    const mensaje = { id: Date.now(), emisor, receptor: contacto, texto: texto.trim(), fecha: new Date().toISOString() };
    mensajes.push(mensaje);
    localStorage.setItem('taskmaster_mensajes', JSON.stringify(mensajes));
    if (this.token) this.http.post(`${API_URL}/messages`, mensaje, { headers: this.authHeaders }).subscribe();
  }

  private getMensajesChat(): MensajeChat[] {
    return JSON.parse(localStorage.getItem('taskmaster_mensajes') || '[]');
  }

  async cargarConversacion(contacto: string) {
    if (!this.token) return;
    try {
      const mensajes = await firstValueFrom(this.http.get<MensajeChat[]>(`${API_URL}/messages?contact=${encodeURIComponent(contacto)}`, { headers: this.authHeaders }));
      localStorage.setItem('taskmaster_mensajes', JSON.stringify(mensajes));
    } catch { /* La caché local permite continuar si la API no está disponible. */ }
  }

  cambiarTema() {
    const nuevoTema = this.tema() === 'light' ? 'dark' : 'light';
    this.tema.set(nuevoTema);
    localStorage.setItem('taskmaster_tema', nuevoTema);
    this.aplicarTema(nuevoTema);
  }

  private aplicarTema(tema: 'light' | 'dark') {
    this.document.documentElement.dataset['theme'] = tema;
    this.aplicarPreferencias(this.preferencias());
  }

  getPreferencias(): Preferencias {
    const guardadas = JSON.parse(localStorage.getItem('taskmaster_preferencias') || 'null');
    return {
      colorPrincipal: guardadas?.colorPrincipal || '#2e7d32',
      premiumActivo: guardadas?.premiumActivo ?? false,
      tamanioLetra: guardadas?.tamanioLetra || 'Mediana',
      notificacionesActivas: guardadas?.notificacionesActivas ?? true,
      sonidoAlertas: guardadas?.sonidoAlertas ?? true,
      animacionesActivas: guardadas?.animacionesActivas ?? true
    };
  }

  guardarPreferencias(cambios: Partial<Preferencias>) {
    const nuevas = { ...this.preferencias(), ...cambios };
    this.preferencias.set(nuevas);
    localStorage.setItem('taskmaster_preferencias', JSON.stringify(nuevas));
    this.aplicarPreferencias(nuevas);
    if (this.token) this.http.put(`${API_URL}/data/preferencias`, nuevas, { headers: this.authHeaders }).subscribe();
  }

  reproducirSonido() {
    if (!this.preferencias().sonidoAlertas) return;
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const contexto = new AudioContextClass();
    const oscilador = contexto.createOscillator();
    const ganancia = contexto.createGain();
    oscilador.frequency.value = 660;
    ganancia.gain.setValueAtTime(0.08, contexto.currentTime);
    ganancia.gain.exponentialRampToValueAtTime(0.001, contexto.currentTime + 0.18);
    oscilador.connect(ganancia);
    ganancia.connect(contexto.destination);
    oscilador.start();
    oscilador.stop(contexto.currentTime + 0.18);
  }

  private aplicarPreferencias(preferencias: Preferencias) {
    const root = this.document.documentElement;
    const colorAcento = preferencias.premiumActivo ? '#c9a227' : preferencias.colorPrincipal;
    const colorAcentoFuerte = preferencias.premiumActivo
      ? '#8f6d0b'
      : this.tema() === 'dark' ? this.aclararColor(colorAcento) : this.oscurecerColor(colorAcento);
    root.style.setProperty('--accent', colorAcento);
    root.style.setProperty('--accent-strong', colorAcentoFuerte);
    root.style.setProperty('--accent-soft', `${colorAcento}22`);
    root.style.setProperty('--accent-text', this.colorDeContraste(colorAcento));
    root.dataset['premium'] = String(preferencias.premiumActivo);
    const tamanios = { 'Pequeña': 'small', 'Mediana': 'medium', 'Grande': 'large' } as const;
    root.dataset['fontSize'] = tamanios[preferencias.tamanioLetra];
    root.classList.toggle('no-animations', !preferencias.animacionesActivas);
  }

  private aclararColor(color: string): string {
    const valores = color.replace('#', '').match(/.{2}/g)?.map(valor => parseInt(valor, 16)) || [46, 125, 50];
    return `rgb(${valores.map(valor => Math.min(255, Math.round(valor + (255 - valor) * 0.42))).join(', ')})`;
  }

  private oscurecerColor(color: string): string {
    const valores = color.replace('#', '').match(/.{2}/g)?.map(valor => parseInt(valor, 16)) || [46, 125, 50];
    return `rgb(${valores.map(valor => Math.round(valor * 0.78)).join(', ')})`;
  }

  private colorDeContraste(color: string): string {
    const valores = color.replace('#', '').match(/.{2}/g)?.map(valor => parseInt(valor, 16)) || [46, 125, 50];
    const luminancia = (valores[0] * 299 + valores[1] * 587 + valores[2] * 114) / 1000;
    return luminancia > 155 ? '#102119' : '#ffffff';
  }

  restablecerCuenta() {
    localStorage.clear();
    this.usuario.set(null);
    this.tema.set('light');
    this.preferencias.set(this.getPreferencias());
    this.aplicarTema('light');
    this.aplicarPreferencias(this.preferencias());
  }

  // Métodos para manejar Tareas
  getTareas(): Tarea[] {
    return this.leerDatosPersonales<Tarea[]>('tareas', []);
  }

  saveTareas(tareas: Tarea[]) {
    this.guardarDatosPersonales('tareas', tareas);
    if (this.token) this.http.put(`${API_URL}/tasks`, tareas, { headers: this.authHeaders }).subscribe();
  }

  async cargarTareas() {
    if (!this.token) return;
    try {
      const tareas = await firstValueFrom(this.http.get<Tarea[]>(`${API_URL}/tasks`, { headers: this.authHeaders }));
      this.guardarDatosPersonales('tareas', tareas);
    } catch { /* La caché local mantiene la pantalla disponible sin API. */ }
  }

  get token() { return localStorage.getItem('taskmaster_token'); }

  private get authHeaders() {
    return new HttpHeaders({ Authorization: `Bearer ${this.token || ''}` });
  }

  getAlertas(): Alerta[] {
    if (!this.preferencias().notificacionesActivas) return [];
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const limite = new Date(hoy);
    limite.setDate(hoy.getDate() + 3);
    return this.getTareas().filter(tarea => tarea.estado !== 'Completada' && tarea.fechaLimite).map(tarea => {
      const fecha = new Date(`${tarea.fechaLimite}T00:00:00`);
      const vencida = fecha < hoy;
      const tipo: Alerta['tipo'] = vencida ? 'vencida' : 'proxima';
      return { id: tarea.id, tarea, tipo, texto: vencida ? 'Tarea vencida' : 'Vence pronto' };
    }).filter(alerta => alerta.tipo === 'vencida' || new Date(`${alerta.tarea.fechaLimite}T00:00:00`) <= limite);
  }
  // En tu data.ts
getEventos() {
    return this.leerDatosPersonales<any[]>('eventos', []);
}

saveEventos(eventos: any[]) {
    this.guardarDatosPersonales('eventos', eventos);
  this.guardarDatoRemoto('eventos', eventos);
}
getPrioridades() {
    return this.leerDatosPersonales<any[]>('prioridades', []);
}

savePrioridades(prioridades: any[]) {
    this.guardarDatosPersonales('prioridades', prioridades);
  this.guardarDatoRemoto('prioridades', prioridades);
  
}
getRecordatorios() {
    return this.leerDatosPersonales<any[]>('recordatorios', []);
}

saveRecordatorios(recordatorios: any[]) {
    this.guardarDatosPersonales('recordatorios', recordatorios);
    this.guardarDatoRemoto('recordatorios', recordatorios);
}

  private guardarDatoRemoto(clave: string, datos: unknown) {
    if (this.token) this.http.put(`${API_URL}/data/${clave}`, datos, { headers: this.authHeaders }).subscribe();
  }

  private leerDatosPersonales<T>(clave: string, valorInicial: T): T {
    const usuario = this.usuario();
    if (!usuario) return valorInicial;
    return JSON.parse(localStorage.getItem(this.clavePersonalizada(clave, usuario)) || JSON.stringify(valorInicial));
  }

  private guardarDatosPersonales<T>(clave: string, datos: T) {
    const usuario = this.usuario();
    if (usuario) localStorage.setItem(this.clavePersonalizada(clave, usuario), JSON.stringify(datos));
  }

  private clavePersonalizada(clave: string, usuario: Usuario): string {
    const identificador = usuario.usuario || usuario.email;
    return `taskmaster_${clave}_${identificador.trim().toLowerCase()}`;
  }

  private migrarDatosPersonalesLegados(usuario: Usuario) {
    for (const clave of ['tareas', 'eventos', 'prioridades', 'recordatorios']) {
      const claveNueva = this.clavePersonalizada(clave, usuario);
      const datosLegados = localStorage.getItem(clave);
      if (datosLegados && !localStorage.getItem(claveNueva)) {
        localStorage.setItem(claveNueva, datosLegados);
        localStorage.removeItem(clave);
      }
    }
  }

}
