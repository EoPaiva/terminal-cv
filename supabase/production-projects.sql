-- ==================================================
-- M PAIVA_ — carrossel de projetos sincronizado — tabela existente
-- Execute este SQL no Supabase SQL Editor do projeto usado pelo upaiva.dev.
-- Objetivo: permitir que o carrossel leia os projetos em qualquer dispositivo
-- e que o painel admin salve/remova usando Supabase Auth.
-- ==================================================

create table if not exists public.production_projects (
  id text primary key,
  name text not null,
  url text not null,
  domain text,
  category text,
  description text,
  image_url text,
  sort_order integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
 );

-- Garantias não destrutivas para bancos que já tinham a tabela criada antes desta sprint.
alter table public.production_projects add column if not exists domain text;
alter table public.production_projects add column if not exists category text;
alter table public.production_projects add column if not exists description text;
alter table public.production_projects add column if not exists image_url text;
alter table public.production_projects add column if not exists sort_order integer default 0;
alter table public.production_projects add column if not exists created_at timestamptz not null default now();
alter table public.production_projects add column if not exists updated_at timestamptz not null default now();

alter table public.production_projects enable row level security;

-- Leitura pública: necessária para o carrossel aparecer atualizado no PC, celular e visitantes.
drop policy if exists "production_projects_public_read" on public.production_projects;
create policy "production_projects_public_read"
on public.production_projects
for select
to anon, authenticated
using (true);

-- Escrita protegida: apenas usuários autenticados no Supabase Auth conseguem alterar pelo painel admin.
drop policy if exists "production_projects_authenticated_insert" on public.production_projects;
create policy "production_projects_authenticated_insert"
on public.production_projects
for insert
to authenticated
with check (true);

drop policy if exists "production_projects_authenticated_update" on public.production_projects;
create policy "production_projects_authenticated_update"
on public.production_projects
for update
to authenticated
using (true)
with check (true);

drop policy if exists "production_projects_authenticated_delete" on public.production_projects;
create policy "production_projects_authenticated_delete"
on public.production_projects
for delete
to authenticated
using (true);

create index if not exists production_projects_sort_order_idx
on public.production_projects (sort_order asc, updated_at desc);

-- Seed inicial. Pode rodar novamente sem duplicar, porque usa upsert por id.
insert into public.production_projects (id, name, url, domain, category, description, image_url, sort_order)
values
  ('upaiva_dev', 'Upaiva.dev', 'https://upaiva.dev/', 'upaiva.dev', 'Portfólio profissional', 'Site profissional voltado para IA, automação, desenvolvimento web e gestão estratégica.', '', 0),
  ('studio_jm', 'Studio JM', 'https://studiojmarq.com/', 'studiojmarq.com', 'Site institucional / Arquitetura', 'Plataforma digital para arquitetura e interiores, com apresentação visual premium e estrutura profissional.', '', 1),
  ('projeto_casal', 'Projeto Casal', 'https://projeto-casal-one.vercel.app/', 'projeto-casal-one.vercel.app', 'Experiência interativa / Front-end', 'Projeto front-end romântico e interativo, criado como experimento autoral para explorar animações, áudio, efeitos visuais e recursos personalizados em JavaScript puro.', '', 2),
  ('oasis_customs', 'Oasis Customs', 'https://oasis-customs-main.vercel.app/', 'oasis-customs-main.vercel.app', 'Calculadora operacional / RP', 'Calculadora automotiva para FiveM RP, com serviços de tuning, descontos, repasses, acumuladores e painel resumo em interface futurista.', '', 3),
  ('taf_prf', 'Sistema TAF PRF', 'https://projeto-taf-prf.vercel.app/', 'projeto-taf-prf.vercel.app', 'Automação de recrutamento / FiveM', 'Sistema de recrutamento policial para FiveM com avaliação dinâmica, correção automática, relatórios em formato .LOG, painel administrativo e interface Cyber-Tactical.', '', 4),
  ('fitpro', 'FitPro', 'https://fit-pro-woad.vercel.app/', 'fit-pro-woad.vercel.app', 'Plataforma fitness / Gestão de treinos', 'Protótipo de plataforma fitness para personal trainers e alunos, com dashboard, agenda, avaliação física, comunidade, planos, gráficos e persistência local.', '', 5)
on conflict (id) do update set
  name = excluded.name,
  url = excluded.url,
  domain = excluded.domain,
  category = excluded.category,
  description = excluded.description,
  image_url = excluded.image_url,
  sort_order = excluded.sort_order,
  updated_at = now();
