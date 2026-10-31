(function (root) {
  'use strict';
  const VERSION = 1;
  function shuffle(ids, random = Math.random) {
    const result = [...ids];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function fresh(questions) {
    return { version: VERSION, order: shuffle(questions.map(q => q.id)), seen: [], views: {} };
  }
  function restore(raw, questions) {
    if (!raw || raw.version !== VERSION || !Array.isArray(raw.order)) return fresh(questions);
    const valid = new Set(questions.map(q => q.id));
    const order = [...new Set(raw.order.filter(id => valid.has(id)))];
    order.push(...shuffle([...valid].filter(id => !order.includes(id))));
    const seen = [...new Set((Array.isArray(raw.seen) ? raw.seen : []).filter(id => valid.has(id)))];
    const views = {};
    for (const [scope, view] of Object.entries(raw.views || {})) {
      if (!view || !Array.isArray(view.history)) continue;
      const history = view.history.filter(id => valid.has(id) && (scope === 'all' || questions.find(q => q.id === id).topicId === scope));
      if (history.length) views[scope] = { history, index: Math.max(0, Math.min(Number.isInteger(view.index) ? view.index : 0, history.length - 1)) };
    }
    return { version: VERSION, order, seen, views };
  }
  function pool(state, questions, scope) {
    const eligible = new Set(questions.filter(q => scope === 'all' || q.topicId === scope).map(q => q.id));
    return state.order.filter(id => eligible.has(id) && !state.seen.includes(id));
  }
  function mark(state, id, viewed) {
    state.seen = viewed ? [...new Set([...state.seen, id])] : state.seen.filter(item => item !== id);
  }
  function current(state, scope) {
    const view = state.views[scope];
    return view ? view.history[view.index] : null;
  }
  function next(state, questions, scope) {
    const view = state.views[scope] || (state.views[scope] = { history: [], index: -1 });
    if (view.index < view.history.length - 1) {
      view.index++;
    } else {
      const id = pool(state, questions, scope).find(id => id !== current(state, scope));
      if (!id) return null;
      view.history.push(id);
      view.index = view.history.length - 1;
    }
    const id = current(state, scope);
    mark(state, id, true);
    return id;
  }
  function previous(state, scope) {
    const view = state.views[scope];
    if (!view || view.index <= 0) return null;
    view.index--;
    const id = current(state, scope);
    mark(state, id, true);
    return id;
  }
  function reshuffle(state) {
    state.order = shuffle(state.order);
    state.views = {};
  }
  function saveForLater(state, questions, scope) {
    const id = current(state, scope);
    if (!id) return { savedId: null, nextId: null };
    mark(state, id, false);
    state.order = [...state.order.filter(item => item !== id), id];
    // A deferred question must not reappear through another view's saved position.
    for (const view of Object.values(state.views)) {
      const removedBefore = view.history.slice(0, view.index + 1).filter(item => item === id).length;
      view.history = view.history.filter(item => item !== id);
      view.index -= removedBefore;
    }
    const hasOther = pool(state, questions, scope).some(item => item !== id);
    if (!hasOther) {
      delete state.views[scope];
      return { savedId: id, nextId: null };
    }
    return { savedId: id, nextId: next(state, questions, scope) };
  }
  const api = { shuffle, fresh, restore, pool, mark, current, next, previous, reshuffle, saveForLater };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ConversationCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
