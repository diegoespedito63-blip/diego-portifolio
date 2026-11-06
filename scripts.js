// ============================================================
// LINK DA PLANILHA DE PROJETOS
// Cole entre as aspas o link CSV da planilha publicada no Google
// (Arquivo > Compartilhar > Publicar na Web > formato CSV).
// ============================================================
const PLANILHA_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTdQfhKLbVqShA7PJPrqvMbzn5eJ3E9jrw4G6eUy1b8lKEsDi0e0vcHOIe-6fFycC8vOklrxKnoDpH7/pub?output=csv';

// Menu mobile
const menuToggle = document.getElementById('menuToggle');
const nav = document.getElementById('nav');

menuToggle.addEventListener('click', () => {
  menuToggle.classList.toggle('open');
  nav.classList.toggle('open');
});

document.querySelectorAll('.nav__link').forEach(link => {
  link.addEventListener('click', () => {
    menuToggle.classList.remove('open');
    nav.classList.remove('open');
  });
});

// Header com fundo ao rolar
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 20);
});

// Link ativo conforme a seção visível
const sections = document.querySelectorAll('main section[id]');
const navLinks = document.querySelectorAll('.nav__link');

const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id);
      });
    }
  });
}, { rootMargin: '-45% 0px -50% 0px' });

sections.forEach(section => sectionObserver.observe(section));

// Animação de entrada dos elementos
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// Ano no rodapé
document.getElementById('year').textContent = new Date().getFullYear();

// ===================== PROJETOS DA PLANILHA =====================

// Lê CSV respeitando campos entre aspas (com vírgulas e quebras de linha)
function lerCSV(texto) {
  const linhas = [];
  let linha = [], campo = '', aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ',') { linha.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      linha.push(campo); linhas.push(linha); linha = []; campo = '';
    } else campo += c;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas;
}

// "Descrição" -> "descricao"
const normalizar = s => s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const escapar = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Aceita link de compartilhamento do Google Drive e converte para link de imagem
function linkImagem(url) {
  const drive = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?.*id=)([\w-]+)/);
  return drive ? `https://lh3.googleusercontent.com/d/${drive[1]}` : url;
}

const CAPAS_PADRAO = ['project__cover--gym', 'project__cover--barber', 'project__cover--therapy'];

function cardProjeto(p, i, classeReveal) {
  const link = p.link || '#';
  const capa = p.imagem
    ? `class="project__cover" style="background: url('${escapar(linkImagem(p.imagem))}') center/cover;"`
    : `class="project__cover ${CAPAS_PADRAO[i % CAPAS_PADRAO.length]}"`;
  return `
    <article class="project ${classeReveal}">
      <div ${capa}>
        <span class="project__label">${escapar((p.categoria || p.nome).toUpperCase())}</span>
        <p>${escapar(p.frase || '')}</p>
      </div>
      <div class="project__body">
        <span class="project__type">SITE</span>
        <h3>${escapar(p.nome)}</h3>
        <p>${escapar(p.descricao || '')}</p>
        <a href="${escapar(link)}" ${link === '#' ? '' : 'target="_blank" rel="noopener"'} class="btn btn--small">VER SITE COMPLETO</a>
      </div>
    </article>`;
}

function projetosDoCSV(texto) {
  const [cabecalho, ...linhas] = lerCSV(texto.replace(/^﻿/, ''));
  const colunas = cabecalho.map(normalizar);
  return linhas
    .map(l => Object.fromEntries(colunas.map((col, i) => [col, (l[i] || '').trim()])))
    .filter(p => p.nome);
}

function mostrarProjetos(grid, projetos) {
  // Se o portfólio já está na tela, os cards entram sem repetir a animação
  const classeReveal = grid.querySelector('.reveal.visible') ? 'reveal visible' : 'reveal';
  grid.innerHTML = projetos.map((p, i) => cardProjeto(p, i, classeReveal)).join('');
  grid.querySelectorAll('.reveal:not(.visible)').forEach(el => revealObserver.observe(el));
}

const ESQUELETO = Array(3).fill(`
  <article class="project project--skeleton reveal">
    <div class="project__cover"></div>
    <div class="project__body"><span></span><span></span><span></span></div>
  </article>`).join('');

// Mostra na hora a última versão salva da planilha (ou um esqueleto na primeira visita)
// e atualiza em segundo plano quando o Google responder.
async function carregarProjetos(url) {
  if (!url) return;
  const grid = document.getElementById('projectsGrid');
  const exemplos = grid.innerHTML;
  const chave = 'projetos:' + url;
  const salvo = localStorage.getItem(chave);

  if (salvo && projetosDoCSV(salvo).length) mostrarProjetos(grid, projetosDoCSV(salvo));
  else grid.innerHTML = ESQUELETO;
  grid.querySelectorAll('.reveal:not(.visible)').forEach(el => revealObserver.observe(el));

  try {
    const resposta = await fetch(url, { cache: 'no-store' });
    if (!resposta.ok) throw new Error('HTTP ' + resposta.status);
    const texto = await resposta.text();
    const projetos = projetosDoCSV(texto);
    if (!projetos.length) throw new Error('planilha vazia');
    if (texto !== salvo) {
      localStorage.setItem(chave, texto);
      mostrarProjetos(grid, projetos);
    }
  } catch (erro) {
    console.warn('Não foi possível carregar a planilha de projetos:', erro);
    if (!salvo) grid.innerHTML = exemplos;
    grid.querySelectorAll('.reveal:not(.visible)').forEach(el => revealObserver.observe(el));
  }
}

carregarProjetos(PLANILHA_URL);
