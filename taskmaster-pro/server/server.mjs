import { createServer } from 'node:http';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const port = Number(process.env.PORT || 3000);
const dataDir = join(process.cwd(), 'server', 'data');
const uploadsDir = join(dataDir, 'uploads');
const databaseFile = join(dataDir, 'database.json');
mkdirSync(uploadsDir, { recursive: true });

const emptyDatabase = { users: [], sessions: {}, tasks: {}, messages: [] };
const database = existsSync(databaseFile) ? JSON.parse(readFileSync(databaseFile, 'utf8')) : emptyDatabase;
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

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') { response.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' }); return response.end(); }
  const url = new URL(request.url, `http://localhost:${port}`);
  try {
    if (request.method === 'GET' && url.pathname === '/api/health') return send(response, 200, { ok: true });
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
    if (request.method === 'GET' && url.pathname === '/api/messages') { const contact = url.searchParams.get('contact'); return send(response, 200, database.messages.filter(item => (item.emisor === user.usuario && item.receptor === contact) || (item.emisor === contact && item.receptor === user.usuario))); }
    if (request.method === 'POST' && url.pathname === '/api/messages') { const input = await body(request); const message = { id: Date.now(), emisor: user.usuario, receptor: input.receptor, texto: String(input.texto || '').trim(), fecha: new Date().toISOString(), audioUrl: input.audioUrl || '' }; database.messages.push(message); saveDatabase(); return send(response, 201, message); }
    const audioParts = route(url.pathname, '/api/audio/');
    if (request.method === 'POST' && audioParts?.length === 1) { const input = await body(request); const raw = String(input.data || '').replace(/^data:audio\/[^;]+;base64,/, ''); const extension = ['.webm', '.ogg', '.mp4'].includes(extname(input.name || '')) ? extname(input.name) : '.webm'; const filename = `${randomUUID()}${extension}`; writeFileSync(join(uploadsDir, filename), Buffer.from(raw, 'base64')); return send(response, 201, { audioUrl: `/api/audio-file/${filename}` }); }
    if (request.method === 'GET' && url.pathname.startsWith('/api/audio-file/')) { const filename = url.pathname.split('/').pop(); const file = join(uploadsDir, filename); if (!existsSync(file)) return send(response, 404, { message: 'Audio no encontrado' }); response.writeHead(200, { 'Content-Type': 'audio/webm', 'Access-Control-Allow-Origin': '*' }); return response.end(readFileSync(file)); }
    send(response, 404, { message: 'Ruta no encontrada' });
  } catch (error) { send(response, 400, { message: error.message }); }
});
server.listen(port, '0.0.0.0', () => console.log(`Taskmaster API escuchando en http://0.0.0.0:${port}`));
