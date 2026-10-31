(function () {
  'use strict';
  const Q = window.MARRIAGE_QUESTIONS;
  const C = window.ConversationCore;
  const KEY = 'lets-talk-forever.session.v1';
  const byId = new Map(Q.map(q => [q.id, q]));
  const topics = [...new Map(Q.map(q => [q.topicId, q.topic])).entries()].map(([id, name]) => ({ id, name }));
  const descriptions = [
    'The promises, expectations, and possibilities behind choosing a life together.',
    'Feeling loved, expressing affection, and finding your own kind of closeness.',
    'Understanding each other, disagreeing thoughtfully, and finding a way forward.',
    'Making room for two individuals within a shared life.',
    'The small routines, unseen work, and everyday choices that make a home.',
    'Balancing security, opportunity, and what matters more than money.',
    'Honoring your roots while building something that belongs to both of you.',
    'Choosing your path, with or without children, and exploring what parenthood means.',
    'Different dreams, shared directions, and decisions you make together.',
    'When life changes, plans unravel, and commitment asks new things of you.',
    'Staying curious, finding joy, and enjoying the person beside you.'
  ];
  let storageAvailable = true;
  let raw;
  try { raw = JSON.parse(localStorage.getItem(KEY)); } catch (_) { storageAvailable = false; }
  let state = C.restore(raw, Q);
  const main = document.querySelector('main');
  document.querySelector('.skip-link').addEventListener('click', e => {
    e.preventDefault();
    main.focus();
    main.scrollIntoView();
  });
  const dialog = document.getElementById('confirm-dialog');
  let onConfirm = null;
  let toastTimer;
  const bankViews = {};
  let activeBank = null;
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const arrow = '<span aria-hidden="true">←</span>';
  const icons = {
    topics: '<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    random: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c1.6 0 3-1.2 4.2-3M14 9c1.3-1.8 2.5-3 4-3h3m-4-4 4 4-4 4"/></svg>',
    bank: '<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 4h7v16H4zM13 4h7v16h-7zM7 8h1m8 0h1M7 12h1m8 0h1"/></svg>'
  };
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); storageAvailable = true; }
    catch (_) { storageAvailable = false; }
    document.getElementById('session-note').textContent = storageAvailable ? 'Progress saved on this device' : 'Progress lasts for this visit only';
  }
  function notify(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message; toast.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.hidden = true; }, 3500);
  }
  function confirmAction(title, description, label, action) {
    document.getElementById('dialog-title').textContent = title;
    document.getElementById('dialog-description').textContent = description;
    document.getElementById('confirm-action').textContent = label;
    onConfirm = action;
    dialog.returnValue = '';
    dialog.showModal();
  }
  dialog.addEventListener('close', () => {
    if (dialog.returnValue === 'confirm' && onConfirm) onConfirm();
    onConfirm = null;
  });
  dialog.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const buttons = [...dialog.querySelectorAll('button:not(:disabled)')];
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  });
  function back(href, label) { return `<a class="back-link" href="${href}" aria-label="Back${label === 'Back' ? '' : ' — ' + esc(label.replace(/^Back to /, ''))}">${arrow}Back</a>`; }
  function option(href, title, description, icon, featured = false) {
    return `<a class="option-card${featured ? ' featured' : ''}" href="${href}"><span class="option-icon">${icons[icon]}</span><span class="card-arrow" aria-hidden="true">↗</span><h2>${esc(title)}</h2><p>${esc(description)}</p></a>`;
  }
  function home() {
    const dirty = state.seen.length > 0 || Object.values(state.views).some(v => v.history.length);
    main.innerHTML = `<section class="home-hero"><div class="hero-ornament" aria-hidden="true">✧</div><h1>Let’s Talk<br><em>Forever</em></h1><p class="tagline">There’s more to marriage than “I do.”</p></section><div class="home-options">${option('#/topics', 'Choose Topic', 'Follow your curiosity. Explore eleven sides of a life together.', 'topics')}${option('#/random/all', 'Random Question', 'See where the conversation takes you. All topics, one question at a time.', 'random', true)}</div><div class="home-bottom"><p class="session-meter">${state.seen.length} of ${Q.length} questions viewed this session</p><div class="session-track" aria-hidden="true"><span style="width:${state.seen.length / Q.length * 100}%"></span></div><button class="text-button" data-action="reset" ${dirty ? '' : 'disabled'}>Reset Session</button></div>`;
  }
  function topicList() {
    main.innerHTML = `${back('#/', 'Back')}<section class="screen-top"><span class="eyebrow">ELEVEN WAYS INTO THE CONVERSATION</span><h1>What’s on your mind?</h1><p class="intro">Start somewhere familiar. Or somewhere you haven’t been before.</p></section><div class="topic-grid">${topics.map((t, i) => {
      const total = Q.filter(q => q.topicId === t.id).length;
      const left = C.pool(state, Q, t.id).length;
      return `<a class="topic-card" href="#/bank/${t.id}"><span class="topic-number">${String(i + 1).padStart(2, '0')} <span aria-hidden="true">/</span></span><h2>${esc(t.name)}</h2><span class="topic-count${left ? '' : ' completed'}">${total} questions · ${left ? `${left} unseen` : 'All viewed'}</span></a>`;
    }).join('')}</div>`;
  }
  function randomPage(scope) {
    const t = topics.find(t => t.id === scope), label = t ? t.name : 'All topics';
    let id = C.current(state, scope);
    if (!id) id = C.next(state, Q, scope);
    if (id) C.mark(state, id, true);
    save();
    const q = byId.get(id), left = C.pool(state, Q, scope).length;
    if (!q) {
      main.innerHTML = `${back(t ? `#/bank/${scope}` : '#/', t ? `Back to ${label}` : 'Home')}<section class="empty-state"><span class="eyebrow">A LOT TO TALK ABOUT</span><h1>Every question explored.</h1><p>You’ve viewed every question ${t ? 'in this topic' : 'across all topics'}. Choose another topic, or reset the session to make them available again.</p><div class="actions"><a class="button primary" href="#/topics">Choose Topic</a><button class="button secondary" data-action="reset">Reset Session</button></div></section>`;
      return;
    }
    const view = state.views[scope], hasForward = view.index < view.history.length - 1;
    main.innerHTML = `${back(t ? `#/bank/${scope}` : '#/', t ? `Back to ${label}` : 'Home')}<section class="question-stage"><div class="context-bar"><span>${left} unseen question${left === 1 ? '' : 's'} remaining</span></div><article class="question-card" aria-labelledby="question-text"><h1 class="question-topic">${esc(q.topic)}</h1><h2 class="question-angle">${esc(q.angle)}</h2><p class="question-text" id="question-text" tabindex="-1">${esc(q.question)}</p></article><nav class="question-nav" aria-label="Question navigation"><button class="button secondary" data-action="previous" ${view.index > 0 ? '' : 'disabled'}><span aria-hidden="true">←</span> Previous</button><button class="button primary" data-action="next">${hasForward || left ? 'Next' : 'Finish'} <span aria-hidden="true">→</span></button></nav><div class="question-save"><button class="button secondary" data-action="save-later">Save For Later</button></div><div class="random-bottom"><p>Take your time. Listen, wonder, disagree. Or move on.</p><button class="text-button" data-action="shuffle">Shuffle Again</button></div></section>`;
  }
  function bankPage(t) {
    const entries = Q.filter(q => q.topicId === t.id);
    const bankView = bankViews[t.id] || (bankViews[t.id] = { filter: '', scroll: 0 });
    activeBank = t.id;
    main.innerHTML = `${back('#/topics', 'All topics')}<section class="screen-top"><h1>${esc(t.name)}</h1><p class="intro">Browse at your own pace. Mark a question as viewed to leave it out of random selections.</p><div class="bank-actions"><a class="button primary" href="#/random/${t.id}">${icons.random} Random Question</a></div></section><div class="bank-tools"><p id="bank-count" role="status" aria-live="polite" aria-atomic="true"></p><label class="search-label"><span aria-hidden="true">⌕</span><span class="sr-only">Search this question bank</span><input id="bank-search" type="search" placeholder="Search this topic…" autocomplete="off"></label></div><ul class="bank-list" id="bank-list"></ul>`;
    const draw = filter => {
      const matches = entries.filter(q => `${q.angle} ${q.question}`.toLocaleLowerCase().includes(filter.toLocaleLowerCase()));
      document.getElementById('bank-count').textContent = `${matches.length} ${filter ? 'matching questions' : 'questions'} · ${entries.filter(q => !state.seen.includes(q.id)).length} unseen in topic · ${entries.filter(q => state.seen.includes(q.id)).length} viewed`;
      document.getElementById('bank-list').innerHTML = matches.length ? matches.map(q => {
        const viewed = state.seen.includes(q.id);
        return `<li class="bank-card${viewed ? ' viewed' : ''}" data-id="${q.id}"><div class="bank-heading"><h2 id="angle-${q.id}">${esc(q.angle)}</h2>${viewed ? '<span class="viewed-badge">✓ Viewed</span>' : ''}</div><p class="bank-question" id="text-${q.id}">${esc(q.question)}</p><button class="text-button bank-toggle" data-action="toggle" data-id="${q.id}" aria-label="${viewed ? 'Mark as unviewed' : 'Mark as viewed'}: ${esc(q.angle)}" aria-describedby="text-${q.id}">${viewed ? 'Mark as unviewed' : 'Mark as viewed'}</button></li>`;
      }).join('') : '<li class="no-results">No questions match. Try a different word.</li>';
    };
    document.getElementById('bank-search').value = bankView.filter;
    draw(bankView.filter);
    document.getElementById('bank-search').addEventListener('input', e => { bankView.filter = e.target.value; draw(e.target.value); });
    main.redrawBank = draw;
  }
  function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    const type = parts[0], scope = parts[1], topic = topics.find(t => t.id === scope);
    main.redrawBank = null;
    activeBank = null;
    if (type === 'topics') topicList();
    else if (type === 'topic' && topic) bankPage(topic);
    else if (type === 'random' && (topic || scope === 'all')) randomPage(scope);
    else if (type === 'bank' && topic) bankPage(topic);
    else home();
    const pageName = type === 'topics' ? 'Choose Topic' : type === 'random' ? (topic ? topic.name + ' — Random Question' : 'Random Question') : topic ? topic.name : '';
    document.title = `${pageName ? pageName + ' · ' : ''}Let’s Talk Forever`;
    save();
  }
  main.addEventListener('click', e => {
    const button = e.target.closest('button[data-action]');
    if (!button) return;
    const action = button.dataset.action, scope = location.hash.split('/')[2];
    if (action === 'reset') {
      confirmAction('Reset this session?', 'All questions will become available again. Viewed history and saved question positions will be cleared.', 'Reset Session', () => {
        state = C.fresh(Q);
        for (const key of Object.keys(bankViews)) delete bankViews[key];
        activeBank = null; save();
        if (location.hash !== '#/') location.hash = '#/';
        else route();
        notify('Session reset. Every question is available again.');
        main.focus();
      });
    } else if (action === 'shuffle') {
      if (!C.pool(state, Q, scope).length) { notify('No unseen questions here. Choose another topic or reset your session.'); return; }
      confirmAction('Shuffle the question order?', 'This reshuffles the order across all topics and clears Previous history. Viewed questions stay viewed.', 'Shuffle Again', () => {
        C.reshuffle(state); save(); route(); focusQuestion();
        notify('Question order shuffled across all topics.');
      });
    } else if (action === 'next') {
      if (!C.next(state, Q, scope)) {
        showFinished(scope); save(); return;
      }
      save(); route(); focusQuestion();
    } else if (action === 'save-later') {
      const result = C.saveForLater(state, Q, scope);
      save();
      if (result.nextId) {
        route(); focusQuestion();
        notify('Saved for Later');
      } else {
        location.hash = scope === 'all' ? '#/' : '#/bank/' + scope;
        notify('Saved for Later');
      }
    } else if (action === 'previous') {
      C.previous(state, scope); save(); route(); focusQuestion();
    } else if (action === 'toggle') {
      const id = button.dataset.id, viewed = !state.seen.includes(id);
      C.mark(state, id, viewed); save();
      const filter = document.getElementById('bank-search').value;
      main.redrawBank(filter);
      main.querySelector(`button[data-id="${id}"]`)?.focus();
      document.getElementById('announcement').textContent = `${byId.get(id).angle}: marked as ${viewed ? 'viewed' : 'unviewed'}.`;
    }
  });
  function focusQuestion() { document.getElementById('question-text')?.focus({ preventScroll: true }); }
  function showFinished(scope) {
    const t = topics.find(t => t.id === scope);
    main.innerHTML = `${back(t ? `#/bank/${scope}` : '#/', t ? `Back to ${t.name}` : 'Home')}<section class="empty-state"><span class="eyebrow">A CONVERSATION WELL STARTED</span><h1>You’ve explored them all.</h1><p>Every question ${t ? 'in this topic' : 'across all topics'} has been viewed. Your history is still here if you’d like to revisit a question.</p><div class="actions"><button class="button secondary" data-action="resume">Return to last question</button><a class="button primary" href="#/topics">Choose Topic</a><button class="text-button" data-action="reset">Reset Session</button></div></section>`;
    main.querySelector('[data-action="resume"]').onclick = () => { route(); focusQuestion(); };
    main.focus();
  }
  main.addEventListener('click', e => {
    if (activeBank && e.target.closest('a[href]')) bankViews[activeBank].scroll = window.scrollY;
  });
  window.addEventListener('scroll', () => {
    if (activeBank) bankViews[activeBank].scroll = window.scrollY;
  }, { passive: true });
  window.addEventListener('hashchange', () => {
    route();
    window.scrollTo(0, activeBank ? bankViews[activeBank].scroll : 0);
    main.focus({ preventScroll: true });
  });
  route();
})();
