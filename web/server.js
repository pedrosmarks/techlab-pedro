const http = require('node:http');
const fs = require('node:fs');
const { readFileSync } = fs;
const { Pool } = require('pg');

const db = new Pool({ connectionString: process.env.DATABASE_URL });
const page = readFileSync(__dirname + '/public/index.html');

const script = readFileSync(__dirname + '/public/app.js');

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

async function inscrever(id, email) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const oficina = await client.query(
      'SELECT vagas FROM oficinas WHERE id = $1 FOR UPDATE', [id]
    );
    if (!oficina.rowCount) return [404, 'Oficina não encontrada.'];

    const inscritos = await client.query(
      'SELECT email FROM inscricoes WHERE oficina_id = $1', [id]
    );
    if (inscritos.rows.some(inscricao => inscricao.email === email)) {
      return [409, 'Este e-mail já está inscrito.'];
    }

    if (inscritos.rowCount > oficina.rows[0].vagas) {
      return [409, 'Oficina lotada.'];
    }

    await client.query(
      'INSERT INTO inscricoes (oficina_id, email) VALUES ($1, $2)', [id, email]
    );
    await client.query('COMMIT');
    return [201, 'Inscrição confirmada.'];
  } finally {
    try {
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  }
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(page);
      return;
    }
    if (req.method === 'GET' && url.pathname === '/app.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
      res.end(script);
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/oficinas') {
      const result = await db.query(`
        SELECT o.*, count(i.id)::int AS inscritos
        FROM oficinas o LEFT JOIN inscricoes i ON i.oficina_id = o.id
        GROUP BY o.id ORDER BY o.id
      `);
      json(res, 200, result.rows);
      return;
    }

    const rota = /^\/api\/oficinas\/(\d+)\/inscricoes$/.exec(url.pathname);
    if (req.method === 'GET' && url.pathname === '/api/inscricoes') {
      const email = (url.searchParams.get('email') ?? '').trim().toLowerCase();
      const result = await db.query(
        'SELECT o.id, o.nome, o.horario, o.local FROM inscricoes i JOIN oficinas o ON o.id = i.oficina_id WHERE i.email = $1 ORDER BY o.id',
        [email]
      );
      json(res, 200, result.rows);
      return;
    }
    if (rota && ['POST', 'DELETE'].includes(req.method)) {
      const email = (url.searchParams.get('email') ?? '').trim().toLowerCase();
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        json(res, 400, { mensagem: 'Informe um e-mail válido.' });
        return;
      }
      if (req.method === 'DELETE') {
        const result = await db.query(
          'DELETE FROM inscricoes WHERE oficina_id = $1 AND email = $2', [rota[1], email]
        );
        json(res, result.rowCount ? 200 : 404, {
          mensagem: result.rowCount ? 'Inscrição cancelada.' : 'Inscrição não encontrada.',
        });
        return;
      }
      const [status, mensagem] = await inscrever(rota[1], email);
      json(res, status, { mensagem });
      return;
    }

    json(res, 404, { mensagem: 'Rota não encontrada.' });
  } catch (erro) {
    console.error(erro);
    json(res, 500, { mensagem: 'Não foi possível concluir a operação.' });
  }
}).listen(3000, '0.0.0.0', () => {
  console.log('TechLab disponível em http://localhost:3000');
});
