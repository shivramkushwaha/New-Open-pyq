'use strict';

const STORAGE_KEY = 'open-pyq.preferences.v1';
const BOOKMARK_KEY = 'open-pyq.bookmarks.v1';
const DEFAULT_PREFS = { displayName: 'Learner', examId: 'gate', activePaperId: 'CS' };

class OpenPYQApp {
  constructor() {
    this.exams = [];
    this.papers = [];
    this.questions = [];
    this.syllabus = null;
    this.preferences = this.readStorage(STORAGE_KEY, DEFAULT_PREFS);
    this.bookmarks = new Set(this.readStorage(BOOKMARK_KEY, []));
    this.filters = { query: '', year: 'ALL', subject: 'ALL', topic: 'ALL' };
    this.currentQuestion = null;
    this.revealedHints = 0;
    this.printSelection = new Set();
    this.toastTimer = null;
    this.init();
  }

  readStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return Array.isArray(fallback) ? [...fallback] : { ...fallback };
      const parsed = JSON.parse(raw);
      if (Array.isArray(fallback)) return Array.isArray(parsed) ? parsed : [...fallback];
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? { ...fallback, ...parsed } : { ...fallback };
    } catch (error) {
      console.warn(`Could not read ${key}; using defaults.`, error);
      return Array.isArray(fallback) ? [...fallback] : { ...fallback };
    }
  }

  async init() {
    this.bindEvents();
    try {
      const [exams, papers, questions, syllabus] = await Promise.all([
        this.loadJSON('data/exams.json'), this.loadJSON('data/papers.json'),
        this.loadJSON('data/questions.json'), this.loadJSON('data/syllabus.json')
      ]);
      this.exams = exams;
      this.papers = papers;
      this.questions = questions;
      this.syllabus = syllabus;
      this.validatePreferences();
      this.populateEnvironmentForm();
      this.renderAll();
      if (!localStorage.getItem(STORAGE_KEY)) this.openEnvironmentDialog();
    } catch (error) {
      console.error(error);
      const main = document.getElementById('main-content');
      main.innerHTML = `<div class="empty-state"><strong>Could not load the OPEN-PYQ data.</strong><p>Open this folder through a local web server (not a file:// URL), then refresh.</p><p class="muted">${this.escapeHTML(error.message)}</p></div>`;
    }
  }

  async loadJSON(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Failed to load ${path} (${response.status})`);
    return response.json();
  }

  validatePreferences() {
    if (!this.exams.some(e => e.id === this.preferences.examId)) this.preferences.examId = 'gate';
    const validPapers = this.availablePapers();
    if (!validPapers.some(p => p.id === this.preferences.activePaperId)) {
      this.preferences.activePaperId = validPapers[0]?.id || 'CS';
    }
  }

  availablePapers() {
    return this.papers.filter(p => p.examId === this.preferences.examId && p.status === 'available');
  }

  get activePaper() {
    return this.papers.find(p => p.id === this.preferences.activePaperId) || this.papers[0] || { id: 'CS', name: 'Computer Science' };
  }

  get paperQuestions() {
    return this.questions.filter(q => q.examId === this.preferences.examId && q.paperId === this.preferences.activePaperId);
  }

  bindEvents() {
    document.querySelectorAll('.nav-item').forEach(button => button.addEventListener('click', () => this.showView(button.dataset.view)));
    document.getElementById('start-exploring').addEventListener('click', () => this.showView('explorer'));
    document.getElementById('view-all-questions').addEventListener('click', () => this.showView('explorer'));
    document.getElementById('dashboard-print').addEventListener('click', () => this.showView('print'));
    document.getElementById('explorer-print').addEventListener('click', () => this.showView('print'));
    document.getElementById('open-environment').addEventListener('click', () => this.openEnvironmentDialog());
    document.getElementById('open-profile').addEventListener('click', () => this.openEnvironmentDialog());
    document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => document.getElementById(button.dataset.closeDialog).close()));
    document.getElementById('environment-form').addEventListener('submit', event => this.saveEnvironment(event));
    document.getElementById('exam-select').addEventListener('change', () => this.populatePaperSelect());
    document.getElementById('search-input').addEventListener('input', event => { this.filters.query = event.target.value.trim().toLowerCase(); this.renderExplorer(); });
    document.getElementById('year-filter').addEventListener('change', event => { this.filters.year = event.target.value; this.renderExplorer(); });
    document.getElementById('subject-filter').addEventListener('change', event => { this.filters.subject = event.target.value; this.filters.topic = 'ALL'; this.renderExplorer(); });
    document.getElementById('topic-filter').addEventListener('change', event => { this.filters.topic = event.target.value; this.renderExplorer(); });
    document.getElementById('clear-filters').addEventListener('click', () => this.resetFilters());
    document.getElementById('print-now').addEventListener('click', () => this.printQuestions());
    ['print-include-answers','print-include-hints'].forEach(id => document.getElementById(id).addEventListener('change', () => this.renderPrintBuilder()));
    document.getElementById('print-use-filtered').addEventListener('change', () => {
      this.printSelection.clear();
      const base = document.getElementById('print-use-filtered').checked ? this.filteredQuestions : this.paperQuestions;
      base.forEach(q => this.printSelection.add(q.id));
      this.renderPrintBuilder();
    });
    document.getElementById('print-question-checklist').addEventListener('change', event => {
      const checkbox = event.target.closest('input[data-question-id]');
      if (!checkbox) return;
      if (checkbox.checked) this.printSelection.add(checkbox.dataset.questionId); else this.printSelection.delete(checkbox.dataset.questionId);
      this.updatePrintSummary();
    });
    document.addEventListener('click', event => {
      const openButton = event.target.closest('[data-open-question]');
      if (openButton) this.openQuestion(openButton.dataset.openQuestion);
      const bookmarkButton = event.target.closest('[data-bookmark-question]');
      if (bookmarkButton) this.toggleBookmark(bookmarkButton.dataset.bookmarkQuestion);
      const actionButton = event.target.closest('[data-terminal-action]');
      if (actionButton) this.handleTerminalAction(actionButton.dataset.terminalAction);
    });
  }

  renderAll() {
    this.renderEnvironmentLabels();
    this.renderStats();
    this.renderDashboardQuestions();
    this.renderFilterOptions();
    this.renderExplorer();
    this.renderBookmarks();
    this.renderPrintBuilder();
  }

  renderEnvironmentLabels() {
    const paper = this.activePaper;
    const exam = this.exams.find(e => e.id === this.preferences.examId)?.name || 'GATE';
    document.getElementById('active-env-label').textContent = `${exam} · ${paper.id}`;
    document.getElementById('profile-label').textContent = this.preferences.displayName || 'Learner';
    document.getElementById('user-avatar').textContent = (this.preferences.displayName || 'L').trim().split(/\s+/).map(s => s[0]).join('').slice(0, 2).toUpperCase();
    document.getElementById('dashboard-paper-title').textContent = `${exam} · ${paper.name}`;
    document.getElementById('explorer-paper-label').textContent = `${exam} · ${paper.id}`;
    document.getElementById('print-set-title').textContent = `${exam} ${paper.id} question set`;
  }

  renderStats() {
    document.getElementById('stat-questions').textContent = this.paperQuestions.length;
    document.getElementById('stat-bookmarks').textContent = this.paperQuestions.filter(q => this.bookmarks.has(q.id)).length;
    document.getElementById('stat-topics').textContent = new Set(this.paperQuestions.flatMap(q => q.topicIds || [])).size;
    document.getElementById('bookmark-count').textContent = this.bookmarks.size;
  }

  renderFilterOptions() {
    const years = [...new Set(this.paperQuestions.map(q => String(q.year)))].sort((a,b) => Number(b)-Number(a));
    const subjects = [...new Set(this.paperQuestions.map(q => q.subjectId))].sort();
    this.setOptions('year-filter', years, 'All years', this.filters.year);
    this.setOptions('subject-filter', subjects, 'All subjects', this.filters.subject);
    this.renderTopicOptions();
  }

  setOptions(id, values, allLabel, selected) {
    const select = document.getElementById(id);
    select.innerHTML = `<option value="ALL">${allLabel}</option>` + values.map(value => `<option value="${this.escapeHTML(value)}">${this.escapeHTML(value)}</option>`).join('');
    select.value = values.includes(selected) ? selected : 'ALL';
  }

  renderTopicOptions() {
    let list = this.paperQuestions;
    if (this.filters.subject !== 'ALL') list = list.filter(q => q.subjectId === this.filters.subject);
    const topics = [...new Set(list.flatMap(q => q.topicIds || []))].sort();
    this.setOptions('topic-filter', topics, 'All topics', this.filters.topic);
    this.filters.topic = document.getElementById('topic-filter').value;
  }

  get filteredQuestions() {
    const query = this.filters.query;
    return this.paperQuestions.filter(q => {
      const searchable = [q.title, q.text, q.subjectId, ...(q.topicIds || []), q.year, q.questionType].join(' ').toLowerCase();
      return (this.filters.year === 'ALL' || String(q.year) === this.filters.year) &&
        (this.filters.subject === 'ALL' || q.subjectId === this.filters.subject) &&
        (this.filters.topic === 'ALL' || (q.topicIds || []).includes(this.filters.topic)) &&
        (!query || searchable.includes(query));
    });
  }

  renderDashboardQuestions() {
    const items = this.paperQuestions.slice(0, 4);
    document.getElementById('dashboard-question-list').innerHTML = items.length ? items.map(q => this.questionCard(q)).join('') : this.emptyState('No sample questions for this paper yet.', 'Add reviewed records to the data/questions.json file.');
  }

  renderExplorer() {
    this.renderTopicOptions();
    const questions = this.filteredQuestions;
    document.getElementById('result-count').textContent = `${questions.length} question${questions.length === 1 ? '' : 's'}`;
    document.getElementById('explorer-question-list').innerHTML = questions.length ? questions.map(q => this.questionCard(q)).join('') : this.emptyState('No questions match these filters.', 'Try changing the search or resetting the filters.');
  }

  questionCard(q) {
    const saved = this.bookmarks.has(q.id);
    const topicText = (q.topicIds || []).join(' · ') || 'Topic not mapped';
    return `<article class="question-card"><div class="question-meta"><span class="tag blue">${this.escapeHTML(q.paperId)} · ${this.escapeHTML(q.year)}</span><span class="tag">${this.escapeHTML(q.questionType || 'Question')}</span><span>${this.escapeHTML(String(q.marks ?? '—'))} mark${q.marks === 1 ? '' : 's'}</span></div><h3>${this.escapeHTML(q.title || 'Untitled question')}</h3><p class="question-excerpt">${this.escapeHTML(q.text || '')}</p><div class="question-meta"><span>${this.escapeHTML(q.subjectId || 'Unmapped subject')}</span><span>·</span><span>${this.escapeHTML(topicText)}</span></div><div class="card-footer"><button class="text-button" data-open-question="${this.escapeHTML(q.id)}" type="button">Open problem-solving terminal ↗</button><button class="bookmark-button ${saved ? 'saved' : ''}" data-bookmark-question="${this.escapeHTML(q.id)}" aria-label="${saved ? 'Remove bookmark' : 'Bookmark question'}" title="${saved ? 'Remove bookmark' : 'Bookmark question'}" type="button">${saved ? '★' : '☆'}</button></div></article>`;
  }

  emptyState(title, description) { return `<div class="empty-state"><strong>${this.escapeHTML(title)}</strong><span>${this.escapeHTML(description)}</span></div>`; }

  showView(viewId) {
    document.querySelectorAll('.view').forEach(view => view.classList.toggle('hidden', view.id !== `view-${viewId}`));
    document.querySelectorAll('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.view === viewId));
    if (viewId === 'bookmarks') this.renderBookmarks();
    if (viewId === 'print') this.renderPrintBuilder();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  resetFilters() {
    this.filters = { query: '', year: 'ALL', subject: 'ALL', topic: 'ALL' };
    document.getElementById('search-input').value = '';
    this.renderFilterOptions();
    this.renderExplorer();
  }

  openQuestion(id) {
    const question = this.questions.find(q => q.id === id);
    if (!question) return;
    this.currentQuestion = question;
    this.revealedHints = 0;
    document.getElementById('question-detail').dataset.answerVisible = 'false';
    this.renderQuestionDetail();
    document.getElementById('question-dialog').showModal();
  }

  renderQuestionDetail() {
    const q = this.currentQuestion;
    if (!q) return;
    const options = (q.options || []).map((option, index) => `<li>${String.fromCharCode(65 + index)}. ${this.escapeHTML(option)}</li>`).join('');
    const hints = (q.hints || []).slice(0, this.revealedHints).map((hint, index) => `<li><strong>Hint ${index + 1}:</strong> ${this.escapeHTML(hint)}</li>`).join('');
    const guidance = (q.guidance || []).map(item => `<li>${this.escapeHTML(item)}</li>`).join('');
    const answerVisible = document.getElementById('question-detail').dataset.answerVisible === 'true';
    document.getElementById('question-detail').innerHTML = `<div class="terminal"><div class="question-meta"><span class="tag blue">${this.escapeHTML(q.paperId)} · ${this.escapeHTML(q.year)}</span><span class="tag">${this.escapeHTML(q.questionType || 'Question')}</span><span>${this.escapeHTML(q.marks ?? '—')} marks</span><span class="tag">${this.escapeHTML(q.status || 'unreviewed')}</span></div><h2 class="terminal-title">${this.escapeHTML(q.title || 'Question')}</h2><p class="terminal-question">${this.escapeHTML(q.text || '')}</p>${options ? `<div class="terminal-section"><h3>Answer choices</h3><ol>${options}</ol></div>` : ''}<div class="terminal-actions"><button class="button primary" data-terminal-action="hint" type="button">Reveal next hint (${this.revealedHints}/${(q.hints || []).length})</button><button class="button secondary" data-terminal-action="answer" type="button">${answerVisible ? 'Hide answer key' : 'Check answer key'}</button><button class="button subtle" data-terminal-action="bookmark" type="button">${this.bookmarks.has(q.id) ? '★ Bookmarked' : '☆ Bookmark'}</button></div>${hints ? `<section class="terminal-section"><h3>Progressive hints</h3><ol>${hints}</ol></section>` : ''}${q.concept ? `<section class="terminal-section"><h3>Concept checkpoint</h3><p>${this.escapeHTML(q.concept)}</p></section>` : ''}${q.illustration ? `<section class="terminal-section"><h3>Illustration / mental model</h3><p>${this.escapeHTML(q.illustration)}</p></section>` : ''}${guidance ? `<section class="terminal-section"><h3>Problem-solving recipe</h3><ol>${guidance}</ol></section>` : ''}<section id="answer-key-area" class="terminal-section ${answerVisible ? '' : 'hidden'}"><h3>Answer key</h3><div class="answer-box">${this.escapeHTML(q.answerKey ?? 'No answer key supplied')}</div><p class="muted small">Check the key only after making your own attempt. No full solution is provided.</p></section><hr class="terminal-rule"><div class="question-meta">Subject: ${this.escapeHTML(q.subjectId || 'Unmapped')} · Topics: ${this.escapeHTML((q.topicIds || []).join(', ') || 'Not mapped')}</div></div>`;
  }

  handleTerminalAction(action) {
    if (!this.currentQuestion) return;
    if (action === 'hint') {
      const total = (this.currentQuestion.hints || []).length;
      if (this.revealedHints < total) this.revealedHints += 1; else this.showToast('All available hints are visible.');
      this.renderQuestionDetail();
    } else if (action === 'answer') {
      const area = document.getElementById('question-detail');
      area.dataset.answerVisible = area.dataset.answerVisible === 'true' ? 'false' : 'true';
      this.renderQuestionDetail();
    } else if (action === 'bookmark') {
      this.toggleBookmark(this.currentQuestion.id);
      this.renderQuestionDetail();
    }
  }

  toggleBookmark(id) {
    if (this.bookmarks.has(id)) { this.bookmarks.delete(id); this.showToast('Bookmark removed'); }
    else { this.bookmarks.add(id); this.showToast('Question bookmarked'); }
    try { localStorage.setItem(BOOKMARK_KEY, JSON.stringify([...this.bookmarks])); } catch (error) { console.warn('Could not save bookmarks', error); }
    this.renderStats();
    this.renderDashboardQuestions();
    this.renderExplorer();
    this.renderBookmarks();
  }

  renderBookmarks() {
    const items = this.questions.filter(q => this.bookmarks.has(q.id) && q.examId === this.preferences.examId && q.paperId === this.preferences.activePaperId);
    const container = document.getElementById('bookmark-question-list');
    if (container) container.innerHTML = items.length ? items.map(q => this.questionCard(q)).join('') : this.emptyState('No bookmarked questions yet.', 'Use the star on a question card to save it here.');
  }

  populateEnvironmentForm() {
    const examSelect = document.getElementById('exam-select');
    examSelect.innerHTML = this.exams.filter(e => e.status === 'available').map(e => `<option value="${this.escapeHTML(e.id)}">${this.escapeHTML(e.name)}</option>`).join('');
    examSelect.value = this.preferences.examId;
    document.getElementById('name-input').value = this.preferences.displayName || '';
    this.populatePaperSelect();
  }

  populatePaperSelect() {
    const examId = document.getElementById('exam-select').value;
    const papers = this.papers.filter(p => p.examId === examId && p.status === 'available');
    const select = document.getElementById('paper-select');
    select.innerHTML = papers.map(p => `<option value="${this.escapeHTML(p.id)}">${this.escapeHTML(p.name)} (${this.escapeHTML(p.id)})</option>`).join('');
    if (papers.some(p => p.id === this.preferences.activePaperId)) select.value = this.preferences.activePaperId;
  }

  openEnvironmentDialog() {
    if (!this.exams.length) return;
    this.populateEnvironmentForm();
    document.getElementById('environment-dialog').showModal();
  }

  saveEnvironment(event) {
    event.preventDefault();
    const name = document.getElementById('name-input').value.trim();
    this.preferences = {
      displayName: name || 'Learner',
      examId: document.getElementById('exam-select').value,
      activePaperId: document.getElementById('paper-select').value || 'CS'
    };
    this.validatePreferences();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences)); }
    catch (error) { this.showToast('Could not save preferences in this browser.'); }
    this.filters = { query: '', year: 'ALL', subject: 'ALL', topic: 'ALL' };
    document.getElementById('search-input').value = '';
    document.getElementById('environment-dialog').close();
    this.renderAll();
    this.showToast('Environment saved');
  }

  renderPrintBuilder() {
    const useFiltered = document.getElementById('print-use-filtered').checked;
    const base = useFiltered ? this.filteredQuestions : this.paperQuestions;
    if (this.printSelection.size === 0) base.forEach(q => this.printSelection.add(q.id));
    const validIds = new Set(base.map(q => q.id));
    this.printSelection = new Set([...this.printSelection].filter(id => validIds.has(id)));
    if (this.printSelection.size === 0) base.forEach(q => this.printSelection.add(q.id));
    const list = document.getElementById('print-question-checklist');
    list.innerHTML = base.length ? base.map(q => `<label class="print-check-item"><input type="checkbox" data-question-id="${this.escapeHTML(q.id)}" ${this.printSelection.has(q.id) ? 'checked' : ''}><span><strong>${this.escapeHTML(q.title || 'Question')}</strong><small>${this.escapeHTML(q.year)} · ${this.escapeHTML(q.subjectId)} · ${(q.topicIds || []).map(t => this.escapeHTML(t)).join(', ')}</small></span></label>`).join('') : this.emptyState('No questions in this set.', 'Change your filters or choose all questions.');
    this.updatePrintSummary();
  }

  updatePrintSummary() {
    const count = this.printSelection.size;
    document.getElementById('print-set-summary').textContent = `${count} selected question${count === 1 ? '' : 's'} · ${document.getElementById('print-include-answers').checked ? 'answer keys included' : 'answer keys hidden'} · ${document.getElementById('print-include-hints').checked ? 'hints included' : 'hints hidden'}`;
  }

  printQuestions() {
    const includeAnswers = document.getElementById('print-include-answers').checked;
    const includeHints = document.getElementById('print-include-hints').checked;
    const selected = this.paperQuestions.filter(q => this.printSelection.has(q.id));
    if (!selected.length) { this.showToast('Select at least one question first.'); return; }
    let printRoot = document.getElementById('print-document');
    if (!printRoot) { printRoot = document.createElement('div'); printRoot.id = 'print-document'; printRoot.className = 'print-document'; document.body.appendChild(printRoot); }
    const paperName = `${this.exams.find(e => e.id === this.preferences.examId)?.name || 'Exam'} · ${this.activePaper.id}`;
    printRoot.innerHTML = `<h1>OPEN-PYQ — ${this.escapeHTML(paperName)} Question Sheet</h1><p class="print-meta">${selected.length} selected question(s) · Demonstration build · Verify source data before relying on it.</p>` + selected.map((q,index) => `<article class="print-item"><div class="print-meta">${index + 1}. ${this.escapeHTML(q.year)} · ${this.escapeHTML(q.subjectId)} · ${(q.topicIds || []).map(t => this.escapeHTML(t)).join(', ')} · ${this.escapeHTML(q.marks)} mark(s)</div><h2>${this.escapeHTML(q.title || 'Question')}</h2><p>${this.escapeHTML(q.text || '')}</p>${(q.options || []).length ? `<ol>${q.options.map(o => `<li>${this.escapeHTML(o)}</li>`).join('')}</ol>` : ''}${q.concept ? `<p class="concept"><strong>Concept:</strong> ${this.escapeHTML(q.concept)}</p>` : ''}${includeHints && (q.hints || []).length ? `<div class="hint"><strong>Hints:</strong><ol>${q.hints.map(h => `<li>${this.escapeHTML(h)}</li>`).join('')}</ol></div>` : ''}${includeAnswers ? `<p class="answer">Answer key: ${this.escapeHTML(q.answerKey ?? 'Not supplied')}</p>` : ''}</article>`).join('');
    window.print();
  }

  showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }
}

window.addEventListener('DOMContentLoaded', () => { window.openPYQApp = new OpenPYQApp(); });
