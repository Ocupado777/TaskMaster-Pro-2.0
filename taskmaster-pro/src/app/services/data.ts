import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, signal } from '@angular/core';

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

  constructor(@Inject(DOCUMENT) private document: Document) {
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
  }

  registrarUsuario(user: Usuario): boolean {
    const usuarios = this.getUsuarios();
    const identificador = (user.usuario || user.nombre).trim().toLowerCase();
    if (usuarios.some(registrado => registrado.email.toLowerCase() === user.email.toLowerCase() || (registrado.usuario || registrado.nombre).toLowerCase() === identificador)) return false;
    const usuarioNuevo = { ...user, usuario: identificador };
    localStorage.setItem('taskmaster_usuarios', JSON.stringify([...usuarios, usuarioNuevo]));
    if (!localStorage.getItem('taskmaster_usuario_registrado')) localStorage.setItem('taskmaster_usuario_registrado', JSON.stringify(usuarioNuevo));
    return true;
  }

  iniciarSesion(email: string, password: string): boolean {
    const registrado = this.getUsuarios().find(usuario => usuario.email === email && usuario.password === password) || null;
    if (!registrado || registrado.email !== email || registrado.password !== password) return false;
    this.saveUsuario({ ...registrado, fechaLogin: new Date().toISOString() });
    return true;
  }

  cerrarSesion() {
    localStorage.removeItem('usuario');
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
    return true;
  }

  getSolicitudesContacto(): SolicitudContacto[] {
    return JSON.parse(localStorage.getItem('taskmaster_solicitudes') || '[]');
  }

  responderSolicitud(id: number, estado: 'aceptada' | 'rechazada') {
    const solicitudes = this.getSolicitudesContacto().map(solicitud => solicitud.id === id ? { ...solicitud, estado } : solicitud);
    localStorage.setItem('taskmaster_solicitudes', JSON.stringify(solicitudes));
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
    mensajes.push({ id: Date.now(), emisor, receptor: contacto, texto: texto.trim(), fecha: new Date().toISOString() });
    localStorage.setItem('taskmaster_mensajes', JSON.stringify(mensajes));
  }

  private getMensajesChat(): MensajeChat[] {
    return JSON.parse(localStorage.getItem('taskmaster_mensajes') || '[]');
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
    return JSON.parse(localStorage.getItem('tareas') || '[]');
  }

  saveTareas(tareas: Tarea[]) {
    localStorage.setItem('tareas', JSON.stringify(tareas));
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
  return JSON.parse(localStorage.getItem('eventos') || '[]');
}

saveEventos(eventos: any[]) {
  localStorage.setItem('eventos', JSON.stringify(eventos));
}
getPrioridades() {
  return JSON.parse(localStorage.getItem('prioridades') || '[]');
}

savePrioridades(prioridades: any[]) {
  localStorage.setItem('prioridades', JSON.stringify(prioridades));
  
}
getRecordatorios() {
  return JSON.parse(localStorage.getItem('recordatorios') || '[]');
}

saveRecordatorios(recordatorios: any[]) {
  localStorage.setItem('recordatorios', JSON.stringify(recordatorios));
}

}
