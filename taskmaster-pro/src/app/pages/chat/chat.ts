import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, MensajeChat, SolicitudContacto, Usuario } from '../../services/data';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrls: ['./chat.scss']
})
export class Chat implements OnInit, OnDestroy {
  contactos: Usuario[] = [];
  solicitudes: SolicitudContacto[] = [];
  contactoActivo: Usuario | null = null;
  mensajes: MensajeChat[] = [];
  busqueda = '';
  nombreBusqueda = '';
  textoMensaje = '';
  mensajeEstado = '';
  grabandoAudio = false;
  private grabador?: MediaRecorder;
  private partesAudio: Blob[] = [];
  private actualizador?: ReturnType<typeof setInterval>;

  constructor(public dataService: DataService) {}

  ngOnInit() {
    this.cargarDatos();
    this.actualizador = setInterval(() => this.cargarDatos(), 1000);
  }

  ngOnDestroy() {
    if (this.actualizador) clearInterval(this.actualizador);
  }

  @HostListener('window:storage')
  actualizarDesdeOtraPestana() {
    this.cargarDatos();
  }

  get contactosFiltrados() {
    const filtro = this.busqueda.trim().toLowerCase();
    return this.contactos.filter(contacto => !filtro || (contacto.usuario || '').includes(filtro) || contacto.nombre.toLowerCase().includes(filtro));
  }

  async cargarDatos() {
    this.contactos = this.dataService.getContactos();
    this.solicitudes = this.dataService.getSolicitudesContacto().filter(solicitud => solicitud.receptor === this.usuarioActual);
    if (this.contactoActivo) {
      this.contactoActivo = this.contactos.find(contacto => contacto.usuario === this.contactoActivo?.usuario) || null;
      await this.dataService.cargarConversacion(this.contactoActivo?.usuario || '');
      this.mensajes = this.contactoActivo ? this.dataService.getConversacion(this.contactoActivo.usuario || '') : [];
    }
  }

  get usuarioActual() {
    return this.dataService.usuario()?.usuario || '';
  }

  get solicitudesEnviadas() {
    return this.dataService.getSolicitudesContacto().filter(solicitud => solicitud.emisor === this.usuarioActual && solicitud.estado === 'pendiente');
  }

  buscarUsuario() {
    this.mensajeEstado = '';
    const usuario = this.dataService.getUsuarioPorNombre(this.nombreBusqueda);
    if (!usuario) {
      this.mensajeEstado = 'No encontramos ese nombre de usuario.';
      return;
    }
    if (usuario.usuario === this.usuarioActual) {
      this.mensajeEstado = 'No puedes enviarte una solicitud a ti mismo.';
      return;
    }
    if (this.contactos.some(contacto => contacto.usuario === usuario.usuario)) {
      this.mensajeEstado = 'Ya tienes este contacto agregado.';
      return;
    }
    if (this.dataService.enviarSolicitudContacto(usuario.usuario || '')) {
      this.mensajeEstado = `Solicitud enviada a @${usuario.usuario}.`;
      this.nombreBusqueda = '';
    } else {
      this.mensajeEstado = 'La solicitud ya existe o no se pudo enviar.';
    }
  }

  responderSolicitud(solicitud: SolicitudContacto, estado: 'aceptada' | 'rechazada') {
    this.dataService.responderSolicitud(solicitud.id, estado);
    this.cargarDatos();
  }

  seleccionarContacto(contacto: Usuario) {
    this.contactoActivo = contacto;
    this.mensajes = this.dataService.getConversacion(contacto.usuario || '');
  }

  enviarMensaje() {
    if (!this.contactoActivo?.usuario || !this.textoMensaje.trim()) return;
    this.dataService.enviarMensaje(this.contactoActivo.usuario, this.textoMensaje);
    this.textoMensaje = '';
    this.mensajes = this.dataService.getConversacion(this.contactoActivo.usuario);
  }

  async alternarGrabacion() {
    if (this.grabandoAudio) {
      this.grabador?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      this.mensajeEstado = 'Tu navegador no permite grabar audio.';
      return;
    }
    try {
      const flujo = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.partesAudio = [];
      this.grabador = new MediaRecorder(flujo);
      this.grabador.ondataavailable = evento => this.partesAudio.push(evento.data);
      this.grabador.onstop = async () => {
        flujo.getTracks().forEach(track => track.stop());
        const audioUrl = await this.dataService.enviarAudio(new Blob(this.partesAudio, { type: this.grabador?.mimeType || 'audio/webm' }), 'mensaje.webm');
        if (audioUrl && this.contactoActivo?.usuario) {
          this.dataService.enviarMensaje(this.contactoActivo.usuario, '', audioUrl);
          this.mensajes = this.dataService.getConversacion(this.contactoActivo.usuario);
        }
        this.grabandoAudio = false;
      };
      this.grabador.start();
      this.grabandoAudio = true;
    } catch {
      this.mensajeEstado = 'No se pudo acceder al micrófono.';
    }
  }
}
