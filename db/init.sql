CREATE TABLE oficinas (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome text NOT NULL,
  vagas integer NOT NULL CHECK (vagas > 0)
);

CREATE TABLE inscricoes (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  oficina_id integer NOT NULL REFERENCES oficinas(id),
  email text NOT NULL,
  UNIQUE (oficina_id, email)
);

INSERT INTO oficinas (nome, vagas) VALUES ('Docker na prática', 2), ('Git em equipe', 1);

ALTER TABLE oficinas
  ADD COLUMN trilha text NOT NULL DEFAULT '',
  ADD COLUMN horario text NOT NULL DEFAULT '',
  ADD COLUMN local text NOT NULL DEFAULT '',
  ADD COLUMN descricao text NOT NULL DEFAULT '';

UPDATE oficinas SET trilha = 'Infraestrutura', horario = '19h00–20h30',
  local = 'Laboratório 1', descricao = 'Empacote uma aplicação e conecte serviços com Docker Compose.'
  WHERE id = 1;
UPDATE oficinas SET trilha = 'Engenharia', horario = '19h00–20h00',
  local = 'Laboratório 2', descricao = 'Organize mudanças em branches e revise um pull request em equipe.'
  WHERE id = 2;
INSERT INTO oficinas (nome, vagas, trilha, horario, local, descricao) VALUES
  ('Testes de interface com Cypress', 4, 'Qualidade', '20h45–22h00', 'Laboratório 1',
   'Automatize uma jornada pelo navegador e investigue uma falha de teste.'),
  ('Integração contínua', 3, 'Engenharia', '20h15–21h45', 'Laboratório 2',
   'Configure um pipeline para verificar alterações antes de integrá-las.');
