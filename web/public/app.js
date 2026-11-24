const statusBox = document.querySelector('[role="status"]');
const lista = document.querySelector('#oficinas');
const template = document.querySelector('#cartao');
const busca = document.querySelector('#busca');
const trilha = document.querySelector('#trilha');
const disponiveis = document.querySelector('#disponiveis');
const reservas = document.querySelector('#reservas');
const retornoConsulta = document.querySelector('#retorno-consulta');
let oficinas = [];

async function carregar() {
  const response = await fetch('/api/oficinas');
  if (!response.ok) throw new Error('Não foi possível carregar as oficinas.');
  oficinas = await response.json();
  document.querySelector('#total-oficinas').textContent = oficinas.length;
  document.querySelector('#total-vagas').textContent = oficinas.reduce(
    (total, oficina) => total + Math.max(0, oficina.vagas - oficina.inscritos), 0
  );
  document.querySelector('#total-inscricoes').textContent = oficinas.reduce(
    (total, oficina) => total + oficina.inscritos, 0
  );
  renderizarCatalogo();
}

function renderizarCatalogo() {
  const termo = busca.value.trim().toLocaleLowerCase('pt-BR');
  const visiveis = oficinas.filter(oficina =>
    oficina.nome.toLocaleLowerCase('pt-BR').includes(termo) &&
    (!trilha.value || oficina.trilha === trilha.value) &&
    (!disponiveis.checked || oficina.inscritos < oficina.vagas)
  );
  lista.replaceChildren();
  if (visiveis.length === 0) lista.textContent = 'Nenhuma oficina corresponde aos filtros.';
  for (const oficina of visiveis) {
    const card = template.content.firstElementChild.cloneNode(true);
    card.dataset.cy = 'oficina-' + oficina.id;
    card.querySelector('h3').textContent = oficina.nome;
    card.querySelector('.trilha').textContent = oficina.trilha;
    card.querySelector('.meta').textContent = oficina.horario + ' · ' + oficina.local;
    card.querySelector('.descricao').textContent = oficina.descricao;
    card.querySelector('[data-cy=vagas]').textContent =
      oficina.inscritos + ' de ' + oficina.vagas + ' vagas ocupadas';
    const progresso = card.querySelector('progress');
    progresso.max = oficina.vagas;
    progresso.value = oficina.inscritos;
    card.querySelector('form').addEventListener('submit', event => inscrever(event, oficina.id));
    lista.append(card);
  }
}

function rotaInscricao(id, email) {
  return '/api/oficinas/' + id + '/inscricoes?' + new URLSearchParams({ email });
}

async function inscrever(event, id) {
  event.preventDefault();
  const form = event.currentTarget;
  const botao = form.querySelector('button');
  const email = new FormData(form).get('email');
  botao.disabled = true;
  try {
    const response = await fetch(rotaInscricao(id, email), { method: 'POST' });
    const { mensagem } = await response.json();
    if (response.ok) {
      await carregar();
      reservas.replaceChildren();
      retornoConsulta.textContent = '';
    }
    statusBox.textContent = mensagem;
  } catch {
    statusBox.textContent = 'Não foi possível atualizar as inscrições.';
  } finally {
    botao.disabled = false;
  }
}

async function consultar(email) {
  reservas.replaceChildren();
  const response = await fetch('/api/inscricoes?' + new URLSearchParams({ email }));
  if (!response.ok) throw new Error('Não foi possível consultar as inscrições.');
  const inscricoes = await response.json();
  retornoConsulta.textContent = inscricoes.length ? '' : 'Nenhuma inscrição para este e-mail.';
  for (const oficina of inscricoes) {
    const item = document.createElement('li');
    item.textContent = oficina.nome + ' · ' + oficina.horario + ' · ' + oficina.local;
    const botao = document.createElement('button');
    botao.textContent = 'Cancelar inscrição';
    botao.addEventListener('click', async () => {
      botao.disabled = true;
      try {
        const resposta = await fetch(rotaInscricao(oficina.id, email), { method: 'DELETE' });
        const { mensagem } = await resposta.json();
        await Promise.all([carregar(), consultar(email)]);
        retornoConsulta.textContent = mensagem;
      } catch {
        retornoConsulta.textContent = 'Não foi possível atualizar as inscrições.';
      } finally {
        botao.disabled = false;
      }
    });
    item.append(botao);
    reservas.append(item);
  }
}

busca.addEventListener('input', renderizarCatalogo);
trilha.addEventListener('change', renderizarCatalogo);
disponiveis.addEventListener('change', renderizarCatalogo);
document.querySelector('#consultar').addEventListener('submit', event => {
  event.preventDefault();
  consultar(new FormData(event.currentTarget).get('email')).catch(erro => {
    retornoConsulta.textContent = erro.message;
  });
});
carregar().catch(erro => { statusBox.textContent = erro.message; });
