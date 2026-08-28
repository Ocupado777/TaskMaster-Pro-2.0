import { createServer } from 'node:http';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const port = Number(process.env.PORT || 3000);
const dataDir = join(process.cwd(), 'server', 'data');
const databaseFile = join(dataDir, 'database.json');
const webDir = join(process.cwd(), 'dist', 'taskmaster-pro', 'browser');

const emptyDatabase = { users: [], sessions: {}, tasks: {}, data: {}, requests: [] , messages: [] };
const database = existsSync(databaseFile) ? JSON.parse(readFileSync(databaseFile, 'utf8')) : emptyDatabase;
database.data ||= {};
database.requests ||= [];
const saveDatabase = () => writeFileSync(databaseFile, JSON.stringify(database, null, 2));

function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
function validPassword(password, stored) {
  const [salt, expected] = stored.split(':');
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'));
}
function publicUser(user) {
  const { password, ...safeUser } = user;
  return safeUser;
}
function send(response, status, body, headers = {}) {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', ...headers });
  response.end(JSON.stringify(body));
}
function body(request) {
  return new Promise((resolve, reject) => {
    let chunks = '';
    request.on('data', chunk => { chunks += chunk; });
    request.on('end', () => { try { resolve(chunks ? JSON.parse(chunks) : {}); } catch { reject(new Error('JSON inválido')); } });
    request.on('error', reject);
  });
}
function auth(request, response) {
  const token = request.headers.authorization?.replace('Bearer ', '');
  const userId = token && database.sessions[token];
  const user = database.users.find(item => item.id === userId);
  if (!user) { send(response, 401, { message: 'Sesión inválida' }); return null; }
  return user;
}
function route(path, prefix) { return path.startsWith(prefix) ? path.slice(prefix.length).split('/').filter(Boolean) : null; }
function contentType(file) {
  return { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ico': 'image/x-icon' }[extname(file)] || 'application/octet-stream';
}

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') { response.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' }); return response.end(); }
  const url = new URL(request.url, `http://localhost:${port}`);
  try {
    if (request.method === 'GET' && url.pathname === '/api/health') return send(response, 200, { ok: true });
    if (request.method === 'GET' && !url.pathname.startsWith('/api/')) {
      const requested = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
      const file = join(webDir, requested);
      const safeFile = file.startsWith(webDir) && existsSync(file) && statSync(file).isFile() ? file : join(webDir, 'index.html');
      if (existsSync(safeFile)) { response.writeHead(200, { 'Content-Type': contentType(safeFile) }); return response.end(readFileSync(safeFile)); }
    }
    if (request.method === 'POST' && url.pathname === '/api/auth/register') {
      const input = await body(request);
      const email = String(input.email || '').trim().toLowerCase();
      const username = String(input.usuario || '').trim().toLowerCase();
      if (!email || !username || !input.password || database.users.some(item => item.email === email || item.usuario === username)) return send(response, 409, { message: 'El correo o usuario ya existe' });
      const user = { id: randomUUID(), nombre: String(input.nombre || '').trim(), usuario: username, email, password: hashPassword(input.password), createdAt: new Date().toISOString() };
      database.users.push(user); saveDatabase(); return send(response, 201, { user: publicUser(user) });
    }
    if (request.method === 'POST' && url.pathname === '/api/auth/login') {
      const input = await body(request);
      const user = database.users.find(item => item.email === String(input.email || '').trim().toLowerCase());
      if (!user || !validPassword(String(input.password || ''), user.password)) return send(response, 401, { message: 'Credenciales incorrectas' });
      const token = randomBytes(32).toString('hex'); database.sessions[token] = user.id; saveDatabase(); return send(response, 200, { token, user: publicUser(user) });
    }
    const user = auth(request, response); if (!user) return;
    if (request.method === 'GET' && url.pathname === '/api/me') return send(response, 200, publicUser(user));
    if (request.method === 'PUT' && url.pathname === '/api/me') { const input = await body(request); Object.assign(user, { nombre: input.nombre ?? user.nombre, telefono: input.telefono ?? user.telefono, avatar: input.avatar ?? user.avatar }); saveDatabase(); return send(response, 200, publicUser(user)); }
    if (request.method === 'GET' && url.pathname === '/api/tasks') return send(response, 200, database.tasks[user.id] || []);
    if (request.method === 'PUT' && url.pathname === '/api/tasks') { database.tasks[user.id] = await body(request); saveDatabase(); return send(response, 200, database.tasks[user.id]); }
    if (request.method === 'GET' && url.pathname === '/api/users') return send(response, 200, database.users.filter(item => item.id !== user.id).map(publicUser));
    if (request.method === 'GET' && url.pathname === '/api/requests') return send(response, 200, database.requests.filter(item => item.emisor === user.usuario || item.receptor === user.usuario));
    if (request.method === 'POST' && url.pathname === '/api/requests') {
      const input = await body(request);
      const receptor = String(input.receptor || '').trim().toLowerCase();
      if (!database.users.some(item => item.usuario === receptor) || receptor === user.usuario || database.requests.some(item => item.emisor === user.usuario && item.receptor === receptor && item.estado === 'pendiente')) return send(response, 409, { message: 'Solicitud inválida' });
      const requestItem = { id: Date.now(), emisor: user.usuario, receptor, estado: 'pendiente', fecha: new Date().toISOString() }; database.requests.push(requestItem); saveDatabase(); return send(response, 201, requestItem);
    }
    if (request.method === 'PUT' && url.pathname.startsWith('/api/requests/')) {
      const id = Number(url.pathname.split('/').pop()); const input = await body(request); const requestItem = database.requests.find(item => item.id === id && item.receptor === user.usuario);
      if (!requestItem || !['aceptada', 'rechazada'].includes(input.estado)) return send(response, 404, { message: 'Solicitud no encontrada' });
      requestItem.estado = input.estado; saveDatabase(); return send(response, 200, requestItem);
    }
    if (request.method === 'GET' && url.pathname.startsWith('/api/data/')) { const key = url.pathname.split('/').pop(); return send(response, 200, database.data[user.id]?.[key] || []); }
    if (request.method === 'PUT' && url.pathname.startsWith('/api/data/')) { const key = url.pathname.split('/').pop(); database.data[user.id] ||= {}; database.data[user.id][key] = await body(request); saveDatabase(); return send(response, 200, database.data[user.id][key]); }
    if (request.method === 'GET' && url.pathname === '/api/messages') { const contact = url.searchParams.get('contact'); return send(response, 200, database.messages.filter(item => (item.emisor === user.usuario && item.receptor === contact) || (item.emisor === contact && item.receptor === user.usuario))); }
    if (request.method === 'POST' && url.pathname === '/api/messages') { const input = await body(request); const message = { id: Date.now(), emisor: user.usuario, receptor: input.receptor, texto: String(input.texto || '').trim(), fecha: new Date().toISOString(), audioUrl: input.audioUrl || '' }; database.messages.push(message); saveDatabase(); return send(response, 201, message); }
    send(response, 404, { message: 'Ruta no encontrada' });
  } catch (error) { send(response, 400, { message: error.message }); }
});
server.listen(port, '0.0.0.0', () => console.log(`Taskmaster API escuchando en http://0.0.0.0:${port}`));
