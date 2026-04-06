(function () {
  'use strict';

  var directoryData = null;
  var CARDS_PER_PAGE = 6;
  var currentPage = 1;

  // ── Helpers ──

  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function badge(text, variant) {
    return '<span class="badge badge-' + variant + '">' + escapeHtml(text) + '</span>';
  }

  function statCard(value, label) {
    return (
      '<div class="stat-card">' +
        '<span class="stat-value">' + value + '</span>' +
        '<span class="stat-label">' + escapeHtml(label) + '</span>' +
      '</div>'
    );
  }

  function skillCard(skill) {
    var MAX_BADGES = 5;
    var allBadges = skill.context.map(function (c) { return badge(c, 'context'); })
      .concat(skill.tech.map(function (t) { return badge(t, 'tech'); }));
    var badgesHtml = allBadges.slice(0, MAX_BADGES).join('');
    var badgeData = skill.context.concat(skill.tech).join(',');

    return (
      '<article class="card" id="skill-' + escapeHtml(skill.slug) + '" data-badges="' + escapeHtml(badgeData) + '">' +
        '<div class="card-header">' +
          '<h3 class="card-title">' + escapeHtml(skill.name) + '</h3>' +
          '<span class="card-author">por ' + escapeHtml(skill.author) + '</span>' +
        '</div>' +
        '<p class="card-description">' + escapeHtml(skill.description) + '</p>' +
        '<div class="card-badges">' + badgesHtml + '</div>' +
        '<div class="card-body">' +
          '<a class="card-link" href="#/skills/' + escapeHtml(skill.slug) + '">Ver conteudo</a>' +
        '</div>' +
      '</article>'
    );
  }

  function ruleCard(rule) {
    var MAX_BADGES = 5;
    var allBadges = rule.skills.map(function (s) { return badge(s, 'skill'); });
    var badgesHtml = allBadges.slice(0, MAX_BADGES).join('');
    var badgeData = rule.skills.join(',');

    return (
      '<article class="card" id="rule-' + escapeHtml(rule.slug) + '" data-badges="' + escapeHtml(badgeData) + '">' +
        '<div class="card-header">' +
          '<h3 class="card-title">' + escapeHtml(rule.name) + '</h3>' +
          '<span class="card-author">por ' + escapeHtml(rule.author) + '</span>' +
        '</div>' +
        '<p class="card-description">' + escapeHtml(rule.description) + '</p>' +
        '<div class="card-badges">' + badgesHtml + '</div>' +
        '<div class="card-body">' +
          '<a class="card-link" href="#/rules/' + escapeHtml(rule.slug) + '">Ver conteudo</a>' +
        '</div>' +
      '</article>'
    );
  }

  // ── Markdown ──

  function renderMarkdown(md) {
    var normalized = md.replace(/\r\n/g, '\n');

    var codeBlocks = [];
    var withPlaceholders = normalized.replace(/```(\w*)\n([\s\S]*?)```/g, function (_m, _lang, code) {
      var html = '<pre><code>' + escapeHtml(code.trim()) + '</code></pre>';
      var index = codeBlocks.length;
      codeBlocks.push(html);
      return '\n\n<code-block-' + index + '>\n\n';
    });

    var processed = withPlaceholders
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, function (_m, code) { return '<code>' + escapeHtml(code) + '</code>'; });

    var html = processed
      .split(/\n{2,}/)
      .map(function (block) {
        var trimmed = block.trim();
        if (!trimmed) return '';
        if (trimmed.startsWith('<h') || trimmed.startsWith('<pre') || trimmed.startsWith('<code-block-')) {
          return trimmed;
        }
        if (trimmed.startsWith('- ')) {
          var items = trimmed.split('\n').map(function (l) {
            return '<li>' + escapeHtml(l.replace(/^- /, '').trim()) + '</li>';
          }).join('');
          return '<ul>' + items + '</ul>';
        }
        return '<p>' + trimmed + '</p>';
      })
      .join('\n');

    codeBlocks.forEach(function (blockHtml, idx) {
      html = html.replace('<code-block-' + idx + '>', blockHtml);
    });

    return html;
  }

  // ── Pages ──

  function parseDateString(value) {
    var parts = value.split('-').map(Number);
    var day = parts[0] || 0;
    var month = parts[1] || 0;
    var year = parts[2] || 0;
    if (isNaN(day) || isNaN(month) || isNaN(year)) return 0;
    return new Date(year, month - 1, day).getTime();
  }

  function renderHome(data) {
    var authors = {};
    data.skills.forEach(function (s) { authors[s.author] = true; });
    data.rules.forEach(function (r) { authors[r.author] = true; });
    var authorCount = Object.keys(authors).length;

    var stats = [
      statCard(data.skills.length, 'Skills'),
      statCard(data.rules.length, 'Rules'),
      statCard(authorCount, 'Authors'),
    ].join('');

    var recentSkills = data.skills.slice().sort(function (a, b) {
      return parseDateString(b.updatedAt) - parseDateString(a.updatedAt);
    }).slice(0, 3);

    var skillsGrid = recentSkills.map(function (s) { return skillCard(s); }).join('\n');

    return (
      '<div class="hero">' +
        '<h1 class="hero-title">ACK Directory</h1>' +
        '<p class="hero-description">' +
          'Gerencie skills, rules e configuracoes do Claude Code nos seus projetos. ' +
          'Um repositorio central de conhecimento para construir de forma SIMPLES.' +
        '</p>' +
        '<div class="hero-stats">' + stats + '</div>' +
      '</div>' +
      '<div class="container">' +
        '<h2 class="section-title">Skills recentes</h2>' +
        '<div class="grid">' + skillsGrid + '</div>' +
      '</div>'
    );
  }

  function renderSkills(data) {
    var cardsHtml = data.skills.map(function (s) { return skillCard(s); }).join('\n');

    return (
      '<div class="container">' +
        '<div class="page-header">' +
          '<h1>Skills <span class="page-count">' + data.skills.length + '</span></h1>' +
          '<p>Prompts especializados que guiam o Claude Code em tarefas de desenvolvimento</p>' +
        '</div>' +
        '<div class="search-bar">' +
          '<input type="text" class="search-input" placeholder="Pesquisar" oninput="window.__filterByBadge(this.value)">' +
        '</div>' +
        '<div class="grid">' + cardsHtml + '</div>' +
        '<div class="pagination"></div>' +
      '</div>'
    );
  }

  function renderSkillDetail(data, slug) {
    var skill = data.skills.find(function (s) { return s.slug === slug; });

    if (!skill) {
      return (
        '<div class="container">' +
          '<div class="not-found">' +
            '<h1>404</h1>' +
            '<p>Skill <strong>' + escapeHtml(slug) + '</strong> nao encontrada.</p>' +
            '<p><a href="#/skills">&larr; Voltar para Skills</a></p>' +
          '</div>' +
        '</div>'
      );
    }

    var contextBadges = skill.context.map(function (c) { return badge(c, 'context'); }).join('');
    var techBadges = skill.tech.map(function (t) { return badge(t, 'tech'); }).join('');
    var bodyHtml = renderMarkdown(skill.body);

    return (
      '<div class="container">' +
        '<a href="#/skills" class="back-link">&larr; Skills</a>' +
        '<div class="detail-header">' +
          '<h1>' + escapeHtml(skill.name) + '</h1>' +
          '<div class="detail-meta">' +
            '<span class="detail-author">por ' + escapeHtml(skill.author) + '</span>' +
          '</div>' +
          '<p class="detail-description">' + escapeHtml(skill.description) + '</p>' +
          '<div class="detail-badges">' + contextBadges + techBadges + '</div>' +
        '</div>' +
        '<div class="detail-body">' + bodyHtml + '</div>' +
      '</div>'
    );
  }

  function renderRules(data) {
    var cardsHtml = data.rules.map(function (r) { return ruleCard(r); }).join('\n');

    return (
      '<div class="container">' +
        '<div class="page-header">' +
          '<h1>Rules <span class="page-count">' + data.rules.length + '</span></h1>' +
          '<p>Regras e convencoes que padronizam a qualidade do codigo nos projetos</p>' +
        '</div>' +
        '<div class="search-bar">' +
          '<input type="text" class="search-input" placeholder="Pesquisar" oninput="window.__filterByBadge(this.value)">' +
        '</div>' +
        '<div class="grid">' + cardsHtml + '</div>' +
        '<div class="pagination"></div>' +
      '</div>'
    );
  }

  function renderRuleDetail(data, slug) {
    var rule = data.rules.find(function (r) { return r.slug === slug; });

    if (!rule) {
      return (
        '<div class="container">' +
          '<div class="not-found">' +
            '<h1>404</h1>' +
            '<p>Rule <strong>' + escapeHtml(slug) + '</strong> nao encontrada.</p>' +
            '<p><a href="#/rules">&larr; Voltar para Rules</a></p>' +
          '</div>' +
        '</div>'
      );
    }

    var skillBadges = rule.skills.map(function (s) { return badge(s, 'skill'); }).join('');
    var bodyHtml = renderMarkdown(rule.body);

    return (
      '<div class="container">' +
        '<a href="#/rules" class="back-link">&larr; Rules</a>' +
        '<div class="detail-header">' +
          '<h1>' + escapeHtml(rule.name) + '</h1>' +
          '<div class="detail-meta">' +
            '<span class="detail-author">por ' + escapeHtml(rule.author) + '</span>' +
          '</div>' +
          '<p class="detail-description">' + escapeHtml(rule.description) + '</p>' +
          '<div class="detail-badges">' + skillBadges + '</div>' +
        '</div>' +
        '<div class="detail-body">' + bodyHtml + '</div>' +
      '</div>'
    );
  }

  function renderComingSoon(label) {
    return (
      '<div class="container">' +
        '<div class="coming-soon-container">' +
          '<div class="coming-soon-icon">&#128679;</div>' +
          '<h2 class="coming-soon-title">Em breve</h2>' +
          '<p class="coming-soon-text">Esta secao esta sendo construida. Volte em breve!</p>' +
        '</div>' +
      '</div>'
    );
  }

  function renderNotFound() {
    return (
      '<div class="container">' +
        '<div class="not-found">' +
          '<h1>404</h1>' +
          '<p>Pagina nao encontrada.</p>' +
          '<p><a href="#/">&larr; Voltar ao inicio</a></p>' +
        '</div>' +
      '</div>'
    );
  }

  // ── Navigation ──

  var navLinks = [
    { hash: '#/', label: 'Inicio', key: 'home', soon: false },
    { hash: '#/skills', label: 'Skills', key: 'skills', soon: false },
    { hash: '#/rules', label: 'Rules', key: 'rules', soon: false },
    { hash: '#/mcp', label: 'MCP', key: 'mcp', soon: true },
  ];

  function renderNav(activeKey) {
    var container = document.getElementById('nav-links');
    if (!container) return;
    container.innerHTML = navLinks.map(function (link) {
      if (link.soon) {
        return '<span class="nav-link soon">' + link.label + '</span>';
      }
      var isActive = activeKey === link.key;
      return '<a class="nav-link' + (isActive ? ' active' : '') + '" href="' + link.hash + '">' + link.label + '</a>';
    }).join('');
  }

  // ── Router ──

  function getActiveKey(hash) {
    if (!hash || hash === '#/' || hash === '#') return 'home';
    if (hash.startsWith('#/skills')) return 'skills';
    if (hash.startsWith('#/rules')) return 'rules';
    if (hash.startsWith('#/mcp')) return 'mcp';
    return 'none';
  }

  function route() {
    if (!directoryData) return;

    var hash = location.hash || '#/';
    var main = document.getElementById('main');
    if (!main) return;

    var activeKey = getActiveKey(hash);
    renderNav(activeKey);

    var skillMatch = hash.match(/^#\/skills\/([^/]+)$/);
    if (skillMatch) {
      main.innerHTML = renderSkillDetail(directoryData, skillMatch[1]);
      window.scrollTo(0, 0);
      return;
    }

    var ruleMatch = hash.match(/^#\/rules\/([^/]+)$/);
    if (ruleMatch) {
      main.innerHTML = renderRuleDetail(directoryData, ruleMatch[1]);
      window.scrollTo(0, 0);
      return;
    }

    switch (hash) {
      case '#/':
      case '#':
      case '':
        main.innerHTML = renderHome(directoryData);
        break;
      case '#/skills':
        main.innerHTML = renderSkills(directoryData);
        currentPage = 1;
        paginate();
        break;
      case '#/rules':
        main.innerHTML = renderRules(directoryData);
        currentPage = 1;
        paginate();
        break;
      case '#/mcp':
        main.innerHTML = renderComingSoon('MCP');
        break;
      default:
        main.innerHTML = renderNotFound();
    }

    window.scrollTo(0, 0);
  }

  // ── Pagination & Filtering ──

  function getVisibleCards() {
    return Array.from(document.querySelectorAll('.card')).filter(function (c) {
      return !c.dataset.filtered;
    });
  }

  function paginate() {
    var cards = getVisibleCards();
    var totalPages = Math.max(1, Math.ceil(cards.length / CARDS_PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;
    var start = (currentPage - 1) * CARDS_PER_PAGE;
    var end = start + CARDS_PER_PAGE;
    cards.forEach(function (card, i) {
      card.style.display = (i >= start && i < end) ? '' : 'none';
    });
    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    var container = document.querySelector('.pagination');
    if (!container) return;
    if (totalPages <= 1) { container.innerHTML = ''; return; }
    var html = '<button class="page-btn" onclick="window.__goToPage(' + (currentPage - 1) + ')"' + (currentPage === 1 ? ' disabled' : '') + '>&larr;</button>';
    for (var i = 1; i <= totalPages; i++) {
      html += '<button class="page-btn' + (i === currentPage ? ' active' : '') + '" onclick="window.__goToPage(' + i + ')">' + i + '</button>';
    }
    html += '<button class="page-btn" onclick="window.__goToPage(' + (currentPage + 1) + ')"' + (currentPage === totalPages ? ' disabled' : '') + '>&rarr;</button>';
    container.innerHTML = html;
  }

  // Expose to inline event handlers
  window.__goToPage = function (page) {
    currentPage = page;
    paginate();
  };

  window.__filterByBadge = function (query) {
    var term = query.toLowerCase().trim();
    document.querySelectorAll('.card').forEach(function (card) {
      if (!term) { delete card.dataset.filtered; card.style.display = ''; return; }
      var badges = (card.getAttribute('data-badges') || '').toLowerCase();
      if (badges.indexOf(term) !== -1) {
        delete card.dataset.filtered;
      } else {
        card.dataset.filtered = '1';
        card.style.display = 'none';
      }
    });
    currentPage = 1;
    paginate();
  };

  // ── Init ──

  window.addEventListener('hashchange', route);

  fetch('directory.json')
    .then(function (res) { return res.json(); })
    .then(function (data) {
      directoryData = data;
      if (!location.hash || location.hash === '#') {
        location.hash = '#/';
      }
      route();
    })
    .catch(function (err) {
      console.error('Failed to load directory.json:', err);
      var main = document.getElementById('main');
      if (main) {
        main.innerHTML =
          '<div class="container">' +
            '<div class="not-found">' +
              '<h1>Erro</h1>' +
              '<p>Nao foi possivel carregar os dados. Verifique se directory.json existe.</p>' +
            '</div>' +
          '</div>';
      }
    });
})();
