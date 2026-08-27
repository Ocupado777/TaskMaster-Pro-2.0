import { Routes } from '@angular/router';
import { Register } from './pages/register/register';
import { Dashboard } from './pages/dashboard/dashboard';
import { Tareas } from './pages/tareas/tareas';
import { Recordatorios } from './pages/recordatorios/recordatorios';
import { Calendario } from './pages/calendario/calendario';
import { Estadisticas } from './pages/estadisticas/estadisticas';
import { Prioridades } from './pages/prioridades/prioridades';
import { Perfil } from './pages/perfil/perfil';
import { Configuracion } from './pages/configuracion/configuracion';
import { Login } from './pages/login/login';
import { Chat } from './pages/chat/chat';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'dashboard', component: Dashboard },
  { path: 'tareas', component: Tareas },
  { path: 'recordatorios', component: Recordatorios },
  { path: 'calendario', component: Calendario },
  { path: 'estadisticas', component: Estadisticas },
  { path: 'prioridades', component: Prioridades },
  { path: 'perfil', component: Perfil },
  { path: 'configuracion', component: Configuracion },
  { path: 'chat', component: Chat },
  { path: '**', redirectTo: 'login' }
];