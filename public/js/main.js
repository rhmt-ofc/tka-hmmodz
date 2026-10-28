/**
 * TKAORA v2.5 — Platform Belajar & Latihan TKA SMA
 * Developed by HMMODZ (Rohmatulloh)
 * Pure Vanilla JavaScript — High Performance, Zero Bloatware
 */

(() => {
  'use strict';

  // Helper DOM Selectors
  const $ = (sel, parent = document) => parent.querySelector(sel);
  const $$ = (sel, parent = document) => [...parent.querySelectorAll(sel)];

  // Local Storage Keys
  const STORAGE_KEYS = {
    DONE: 'tkaora_done_v2',
    SCRATCHPAD: 'tkaora_scratchpad_v2',
    LAST_MAT: 'tkaora_last_mat_v2',
    THEME: 'tkaora_theme_v2',
    QUIZ_STATE: 'tkaora_quiz_state_v2'
  };

  const LETTERS = ['A', 'B', 'C', 'D', 'E'];

  // Global State
  const state = {
    materials: [],
    questions: [],
    cheatsheet: [],
    doneSet: new Set(),
    scratchpad: '',
    lastMaterialId: null,
    filterCluster: 'semua',
    searchQuery: '',
    theme: 'dark',

    // Quiz State
    quizMode: 'zen',
    quizQuestions: [],
    answers: {},
    flagged: new Set(),
    quizIndex: 0,
    timerSeconds: 0,
    timerInterval: null,
    isRetestMode: false
  };

  // Safe Storage Accessors
  const storage = {
    get(key, fallback = null) {
      try {
        const val = localStorage.getItem(key);
        return val ? JSON.parse(val) : fallback;
      } catch {
        return fallback;
      }
    },
    set(key, val) {
      try {
        localStorage.setItem(key, JSON.stringify(val));
      } catch {}
    }
  };

  // Toast System
  let toastTimer = null;
  function showToast(message) {
    const box = $('#toastBox');
    if (!box) return;
    box.textContent = message;
    box.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove('visible'), 2600);
  }

  // =========================================================================
  // THEME MANAGEMENT (Dark / Light)
  // =========================================================================
  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    storage.set(STORAGE_KEYS.THEME, theme);

    const isDark = theme === 'dark';
    $$('.theme-icon-sun').forEach(el => el.style.display = isDark ? 'inline-block' : 'none');
    $$('.theme-icon-moon').forEach(el => el.style.display = isDark ? 'none' : 'inline-block');
    if ($('#themeLabel')) $('#themeLabel').textContent = isDark ? 'Mode Terang' : 'Mode Gelap';
  }

  function toggleTheme() {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark');
  }

  // =========================================================================
  // ROUTING & PAGE NAVIGATION
  // =========================================================================
  const PAGES = ['home', 'library', 'practice', 'cheatsheet', 'progress'];

  function navigateTo(pageId) {
    if (!PAGES.includes(pageId)) pageId = 'home';

    $$('.page-view').forEach(el => {
      el.hidden = el.id !== pageId;
    });

    $$('.nav-link').forEach(link => {
      link.removeAttribute('aria-current');
      if (link.dataset.nav === pageId) {
        link.setAttribute('aria-current', 'page');
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (pageId === 'library') renderLibrary();
    if (pageId === 'progress') renderProgressPage();
    if (pageId === 'cheatsheet') renderCheatsheet();
    if (pageId === 'home') renderHomeStats();
  }

  window.addEventListener('hashchange', () => {
    navigateTo(location.hash.replace('#', '') || 'home');
  });

  // =========================================================================
  // FASE 1: MATERI TKA (LIBRARY)
  // =========================================================================
  function renderLibrary() {
    const container = $('#materialsContainer');
    if (!container) return;

    const q = state.searchQuery.toLowerCase().trim();
    const filter = state.filterCluster;

    const filtered = state.materials.filter(m => {
      // Filter by cluster / kind
      if (filter === 'Wajib' && m.kind !== 'Wajib') return false;
      if (filter === 'Pilihan' && m.kind !== 'Pilihan') return false;
      if (filter === 'Bahasa' && !m.cluster.includes('Bahasa')) return false;
      if (filter === 'Sains' && !m.cluster.includes('Sains')) return false;
      if (filter === 'Soshum' && !m.cluster.includes('Sosial')) return false;

      // Filter by search query
      if (q) {
        const text = `${m.title} ${m.description} ${m.cluster} ${m.kind}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });

    if (!filtered.length) {
      container.innerHTML = `
        <div style="grid-column:1/-1;padding:48px 24px;text-align:center;background:var(--bg-surface);border:1px dashed var(--line-strong);border-radius:var(--radius-lg)">
          <h3>Tidak ada materi yang sesuai</h3>
          <p class="muted" style="margin-top:6px">Coba gunakan kata kunci pencarian lain atau pilih filter "Semua".</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(m => {
      const isDone = state.doneSet.has(m.id);
      const dotColor = m.color || '#6366f1';

      return `
        <article class="material-card-crafted ${isDone ? 'completed' : ''}" data-id="${m.id}">
          <div class="material-card-top">
            <span class="cluster-pill">
              <span class="cluster-pill-dot" style="background:${dotColor}"></span>
              ${m.cluster || 'TKA'}
            </span>
            <div style="display:flex;align-items:center;gap:6px">
              <span class="kind-badge ${m.kind === 'Wajib' ? 'wajib' : ''}">${m.kind}</span>
              ${isDone ? '<span style="color:var(--emerald);font-size:12px;font-weight:700">✓ Selesai</span>' : ''}
            </div>
          </div>

          <h3 class="material-title">${m.title}</h3>
          <p class="material-desc">${m.description || 'Modul resmi persiapan TKA SMA.'}</p>

          <div class="material-card-foot">
            <span class="material-status-tag ready">
              <svg class="icon" style="width:14px;height:14px"><use href="#i-check"/></svg>
              <span>${m.pages || 'PDF Tersedia'}</span>
            </span>

            <button class="btn btn-sm btn-primary btn-open-pdf" data-id="${m.id}" aria-label="Buka dokumen ${m.title}">
              <span>Buka Dokumen</span>
              <svg class="icon" style="width:13px;height:13px"><use href="#i-external"/></svg>
            </button>
          </div>
        </article>
      `;
    }).join('');
  }

  // Search and Filter Event Listeners
  $('#searchInput')?.addEventListener('input', e => {
    state.searchQuery = e.target.value;
    renderLibrary();
  });

  $$('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.filter-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.filterCluster = btn.dataset.filter;
      renderLibrary();
    });
  });

  // Open PDF Reader from Material Grid
  $('#materialsContainer')?.addEventListener('click', e => {
    const btn = e.target.closest('.btn-open-pdf');
    if (btn) openPdfModal(btn.dataset.id);
  });

  // =========================================================================
  // FASE 3: IN-APP IMMERSIVE PDF READER
  // =========================================================================
  const pdfModal = $('#pdfReaderModal');
  let currentActiveMaterial = null;

  function openPdfModal(materialId) {
    const m = state.materials.find(x => x.id === materialId);
    if (!m || !pdfModal) return;

    currentActiveMaterial = m;
    state.lastMaterialId = m.id;
    storage.set(STORAGE_KEYS.LAST_MAT, m.id);

    $('#pdfModalTitle').textContent = m.title;
    $('#pdfModalCluster').textContent = m.cluster || 'TKA Modul';
    $('#pdfPageCountNote').textContent = `${m.kind} • ${m.pages || 'Modul Resmi TKA SMA'}`;
    $('#pdfExternalSourceBtn').href = m.sourceUrl || '#';

    // Set PDF source
    const pdfUrl = `/pdfs/${m.id}.pdf`;
    $('#pdfIframe').src = pdfUrl;

    syncPdfDoneButton();
    pdfModal.showModal();
    renderHomeStats();
  }

  function syncPdfDoneButton() {
    if (!currentActiveMaterial) return;
    const isDone = state.doneSet.has(currentActiveMaterial.id);
    const btn = $('#pdfMarkDoneBtn');
    if (!btn) return;

    if (isDone) {
      btn.innerHTML = `<svg class="icon" style="width:14px;height:14px"><use href="#i-check"/></svg><span>✓ Selesai Dipelajari</span>`;
      btn.classList.remove('btn-primary');
    } else {
      btn.innerHTML = `<svg class="icon" style="width:14px;height:14px"><use href="#i-check"/></svg><span>Tandai Selesai Dipelajari</span>`;
      btn.classList.add('btn-primary');
    }
  }

  $('#pdfMarkDoneBtn')?.addEventListener('click', () => {
    if (!currentActiveMaterial) return;
    const mid = currentActiveMaterial.id;
    if (state.doneSet.has(mid)) {
      state.doneSet.delete(mid);
      showToast('Tanda selesai dihapus');
    } else {
      state.doneSet.add(mid);
      showToast('Modul ditandai selesai dipelajari');
    }
    storage.set(STORAGE_KEYS.DONE, [...state.doneSet]);
    syncPdfDoneButton();
    renderProgressPage();
    renderHomeStats();
    renderLibrary();
  });

  $('#pdfCloseBtn')?.addEventListener('click', () => {
    if (pdfModal) {
      $('#pdfIframe').src = 'about:blank';
      pdfModal.close();
    }
  });

  pdfModal?.addEventListener('close', () => {
    $('#pdfIframe').src = 'about:blank';
  });

  // =========================================================================
  // FASE 1 & FASE 2: LATIHAN SOAL INTERAKTIF (QUIZ CORE)
  // =========================================================================
  function startQuiz(mode = 'zen', customQuestions = null) {
    state.quizMode = mode;
    state.quizQuestions = customQuestions || [...state.questions];
    state.answers = {};
    state.flagged.clear();
    state.quizIndex = 0;
    state.isRetestMode = Boolean(customQuestions);

    $('#quizIntroView').hidden = true;
    $('#quizResultsView').hidden = true;
    $('#quizActiveView').hidden = false;

    // Start timer
    clearInterval(state.timerInterval);
    if (mode === 'timer') {
      state.timerSeconds = state.quizQuestions.length * 60; // 1 min per question
      updateTimerDisplay();
      state.timerInterval = setInterval(() => {
        state.timerSeconds--;
        updateTimerDisplay();
        if (state.timerSeconds <= 0) {
          clearInterval(state.timerInterval);
          finishQuiz(true);
        }
      }, 1000);
    } else {
      state.timerSeconds = 0;
      updateTimerDisplay();
      state.timerInterval = setInterval(() => {
        state.timerSeconds++;
        updateTimerDisplay();
      }, 1000);
    }

    renderActiveQuestion();
  }

  function updateTimerDisplay() {
    const box = $('#quizTimerText');
    if (!box) return;
    const mins = Math.floor(Math.abs(state.timerSeconds) / 60);
    const secs = Math.abs(state.timerSeconds) % 60;
    box.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function renderActiveQuestion() {
    const q = state.quizQuestions[state.quizIndex];
    if (!q) return;

    const total = state.quizQuestions.length;
    const idx = state.quizIndex;
    const answeredCount = Object.keys(state.answers).length;

    $('#quizCurrentIndexLabel').textContent = `Soal ${idx + 1} dari ${total}`;
    $('#quizAnsweredCountLabel').textContent = `${answeredCount} dijawab • ${state.flagged.size} ragu-ragu`;

    // Flag button state
    const isFlagged = state.flagged.has(idx);
    $('#btnToggleFlag').classList.toggle('btn-amber', isFlagged);
    $('#btnToggleFlagLabel').textContent = isFlagged ? 'Tersimpan Ragu-Ragu' : 'Ragu-Ragu';

    // Subject and Topic
    $('#qSubjectBadge').textContent = q.subject;
    $('#qTopicText').textContent = q.topic;
    $('#qQuestionText').textContent = q.question;

    // Reading Passage (Wacana) detection
    const wacanaBox = $('#wacanaBox');
    if (q.question.length > 120 && (q.subject.includes('Bahasa') || q.subject.includes('English'))) {
      wacanaBox.hidden = false;
      $('#wacanaText').innerHTML = `<strong>Teks Wacana:</strong><br>${q.question.split(':')[1] || q.question}`;
    } else {
      wacanaBox.hidden = true;
    }

    // Number Nav Strip
    const navStrip = $('#questionNavStrip');
    navStrip.innerHTML = state.quizQuestions.map((_, i) => {
      const isCurrent = i === idx;
      const isAnswered = state.answers[i] !== undefined;
      const flagged = state.flagged.has(i);

      let classes = ['nav-dot-btn'];
      if (isCurrent) classes.push('active');
      else if (isAnswered) classes.push('answered');
      if (flagged) classes.push('flagged');

      return `<button class="${classes.join(' ')}" data-jump="${i}" aria-label="Soal ${i + 1}">${i + 1}</button>`;
    }).join('');

    // Smooth scroll active button into view in strip
    const activeDot = navStrip.querySelector('.nav-dot-btn.active');
    activeDot?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });

    // Options Cards
    const optionsContainer = $('#optionsContainer');
    const selectedAnswer = state.answers[idx];

    optionsContainer.innerHTML = q.options.map((optText, optIdx) => {
      const isChecked = selectedAnswer === optIdx;
      return `
        <label class="option-card-label ${isChecked ? 'selected' : ''}">
          <input type="radio" name="quizOption" value="${optIdx}" ${isChecked ? 'checked' : ''}>
          <span class="option-key-bubble">${LETTERS[optIdx]}</span>
          <span class="option-text-span">${optText}</span>
        </label>
      `;
    }).join('');

    // Update bottom next/finish buttons
    $('#btnPrevQuestion').disabled = idx === 0;
    const isLast = idx === total - 1;
    $('#btnNextQuestion').innerHTML = isLast 
      ? `<span>Selesai & Lihat Pembahasan</span>`
      : `<span>Berikutnya →</span>`;
  }

  // Options Click
  $('#optionsContainer')?.addEventListener('change', e => {
    if (e.target.name === 'quizOption') {
      state.answers[state.quizIndex] = Number(e.target.value);
      renderActiveQuestion();
    }
  });

  // Nav Strip Jump
  $('#questionNavStrip')?.addEventListener('click', e => {
    const dot = e.target.closest('[data-jump]');
    if (dot) {
      state.quizIndex = Number(dot.dataset.jump);
      renderActiveQuestion();
    }
  });

  // Next / Prev Buttons
  $('#btnPrevQuestion')?.addEventListener('click', () => {
    if (state.quizIndex > 0) {
      state.quizIndex--;
      renderActiveQuestion();
    }
  });

  $('#btnNextQuestion')?.addEventListener('click', () => {
    if (state.quizIndex < state.quizQuestions.length - 1) {
      state.quizIndex++;
      renderActiveQuestion();
    } else {
      finishQuiz();
    }
  });

  // Toggle Flag
  $('#btnToggleFlag')?.addEventListener('click', () => {
    const idx = state.quizIndex;
    if (state.flagged.has(idx)) {
      state.flagged.delete(idx);
      showToast('Tanda ragu-ragu dilepas');
    } else {
      state.flagged.add(idx);
      showToast('Soal ditandai ragu-ragu');
    }
    renderActiveQuestion();
  });

  // Restart Quiz
  $('#btnRestartQuiz')?.addEventListener('click', () => {
    if (confirm('Ulangi latihan ini dari awal? Jawaban saat ini akan dikosongkan.')) {
      startQuiz(state.quizMode, state.isRetestMode ? state.quizQuestions : null);
    }
  });

  // Mode Selection
  $('#modeCardZen')?.addEventListener('click', () => {
    $('#modeCardZen').classList.add('selected');
    $('#modeCardTimer').classList.remove('selected');
  });

  $('#modeCardTimer')?.addEventListener('click', () => {
    $('#modeCardTimer').classList.add('selected');
    $('#modeCardZen').classList.remove('selected');
  });

  $('#btnStartQuiz')?.addEventListener('click', () => {
    const selectedMode = $('input[name="quizModeOpt"]:checked')?.value || 'zen';
    startQuiz(selectedMode);
  });

  // Finish Quiz & Results Calculation
  function finishQuiz(force = false) {
    const total = state.quizQuestions.length;
    const answeredCount = Object.keys(state.answers).length;
    const unAnswered = total - answeredCount;

    if (!force && unAnswered > 0) {
      if (!confirm(`Masih ada ${unAnswered} soal yang belum dijawab. Yakin ingin mengakhiri sekarang?`)) {
        return;
      }
    }

    clearInterval(state.timerInterval);
    renderResultsPage();
  }

  function renderResultsPage() {
    $('#quizActiveView').hidden = true;
    const resView = $('#quizResultsView');
    resView.hidden = false;

    const qs = state.quizQuestions;
    const total = qs.length;
    const correctCount = qs.reduce((acc, q, i) => acc + (state.answers[i] === q.answer ? 1 : 0), 0);
    const scorePct = Math.round((correctCount / total) * 100);

    // Filter incorrect questions for "Latih Ulang Soal Salah"
    const wrongQuestions = qs.filter((q, i) => state.answers[i] !== q.answer);

    // Subject breakdown
    const subjectStats = {};
    qs.forEach((q, i) => {
      if (!subjectStats[q.subject]) subjectStats[q.subject] = { total: 0, correct: 0 };
      subjectStats[q.subject].total++;
      if (state.answers[i] === q.answer) subjectStats[q.subject].correct++;
    });

    resView.innerHTML = `
      <div class="results-hero-card">
        <div class="score-badge-circle">
          <div>
            <strong>${correctCount}/${total}</strong>
            <small>${scorePct}%</small>
          </div>
        </div>

        <div>
          <h2>${scorePct >= 80 ? 'Pemahaman Sangat Kuat!' : scorePct >= 50 ? 'Hasil Cukup Bagus, Terus Asah!' : 'Tetap Semangat, Pelajari Pembahasan!'}</h2>
          <p class="muted" style="margin-top:6px;max-width:54ch">Hasil ini murni sebagai cermin kesiapan belajarmu. Pakai catatan dan pembahasan di bawah untuk memperdalam konsep.</p>
        </div>

        <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center">
          ${wrongQuestions.length ? `
            <button class="btn btn-amber" id="btnRetestWrong">
              <svg class="icon"><use href="#i-refresh"/></svg>
              <span>Latih Ulang Soal yang Salah Saja (${wrongQuestions.length})</span>
            </button>
          ` : ''}

          <button class="btn btn-primary" id="btnRestartAllQuiz">
            <span>Ulangi Seluruh Latihan</span>
          </button>

          <a class="btn" href="#library">
            <span>Pelajari Modul Terkait</span>
          </a>
        </div>
      </div>

      <!-- Subject Breakdown -->
      <h3 style="margin:28px 0 12px">Analisis Pemahaman per Mata Pelajaran</h3>
      <div class="subject-breakdown-grid">
        ${Object.entries(subjectStats).map(([subj, stat]) => `
          <div class="subject-score-item">
            <span>${subj}</span>
            <strong>${stat.correct}/${stat.total} Benar</strong>
          </div>
        `).join('')}
      </div>

      <!-- In-Depth Question Review List -->
      <h3 style="margin:28px 0 16px">Pembahasan & Analisis Kunci Jawaban</h3>
      <div class="review-questions-list">
        ${qs.map((q, i) => {
          const userAns = state.answers[i];
          const isCorrect = userAns === q.answer;
          const userAnsText = userAns !== undefined ? `${LETTERS[userAns]}. ${q.options[userAns]}` : 'Tidak dijawab';
          const correctAnsText = `${LETTERS[q.answer]}. ${q.options[q.answer]}`;

          return `
            <article class="review-card-item ${isCorrect ? 'correct' : 'incorrect'}">
              <div style="display:flex;align-items:center;justify-content:space-between">
                <span class="cluster-pill">${i + 1}. ${q.subject} • ${q.topic}</span>
                <strong style="color:${isCorrect ? 'var(--emerald)' : 'var(--rose)'};font-size:13px">
                  ${isCorrect ? '✓ Jawaban Tepat' : '✕ Perlu Dipelajari Lagi'}
                </strong>
              </div>

              <h4 style="font-size:16px;line-height:1.5">${q.question}</h4>

              <div style="display:grid;gap:6px;font-size:13.5px">
                <div>Jawaban Benar: <strong style="color:var(--emerald)">${correctAnsText}</strong></div>
                ${!isCorrect ? `<div>Pilihanmu: <span style="color:var(--rose)">${userAnsText}</span></div>` : ''}
              </div>

              <div class="explanation-box">
                <strong>Intisari & Jebakan Soal:</strong><br>
                ${q.explanation || 'Pembahasan materi ini menguji ketelitian membaca premis dan analisis logika dasar.'}
              </div>
            </article>
          `;
        }).join('')}
      </div>
    `;

    // Event Listener for Retest Wrong Questions
    $('#btnRetestWrong')?.addEventListener('click', () => {
      startQuiz(state.quizMode, wrongQuestions);
    });

    $('#btnRestartAllQuiz')?.addEventListener('click', () => {
      startQuiz(state.quizMode);
    });
  }

  // =========================================================================
  // FASE 4: RUMUS KILAT (CHEATSHEET)
  // =========================================================================
  function renderCheatsheet() {
    const container = $('#cheatsheetContainer');
    if (!container) return;

    if (!state.cheatsheet.length) {
      container.innerHTML = '<p class="muted">Memuat ringkasan rumus...</p>';
      return;
    }

    container.innerHTML = state.cheatsheet.map(section => `
      <div style="margin-bottom:32px">
        <h3 class="cheatsheet-section-title" style="color:${section.color || 'var(--accent)'}">
          <svg class="icon"><use href="#i-zap"/></svg>
          <span>${section.subject}</span>
        </h3>

        <div class="cheatsheet-cards-grid">
          ${section.items.map(item => `
            <div class="cheatsheet-card">
              <strong style="font-size:15px;color:var(--ink)">${item.title}</strong>
              <div class="cheatsheet-formula-box">${item.formula}</div>
              <p class="cheatsheet-tip">💡 ${item.tip}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  // =========================================================================
  // FASE 3: CATATAN BELAJAR & DATA BACKUP
  // =========================================================================
  function renderProgressPage() {
    const container = $('#progressChecklistContainer');
    if (!container) return;

    container.innerHTML = state.materials.map(m => {
      const isDone = state.doneSet.has(m.id);
      return `
        <button class="checklist-item-btn ${isDone ? 'done' : ''}" data-toggle-id="${m.id}">
          <span class="check-circle" aria-hidden="true">${isDone ? '✓' : ''}</span>
          <div style="flex:1">
            <strong style="display:block;font-size:15px;color:var(--ink)">${m.title}</strong>
            <small class="muted">${m.cluster} • ${m.kind}</small>
          </div>
          <span style="font-size:12.5px;color:${isDone ? 'var(--emerald)' : 'var(--muted)'};font-weight:600">
            ${isDone ? 'Selesai' : 'Tandai'}
          </span>
        </button>
      `;
    }).join('');

    $('#scratchpadInput').value = state.scratchpad || '';
  }

  $('#progressChecklistContainer')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-toggle-id]');
    if (!btn) return;
    const id = btn.dataset.toggleId;
    if (state.doneSet.has(id)) {
      state.doneSet.delete(id);
    } else {
      state.doneSet.add(id);
    }
    storage.set(STORAGE_KEYS.DONE, [...state.doneSet]);
    renderProgressPage();
    renderHomeStats();
    renderLibrary();
  });

  // Scratchpad Autosave
  $('#scratchpadInput')?.addEventListener('input', e => {
    state.scratchpad = e.target.value;
    storage.set(STORAGE_KEYS.SCRATCHPAD, state.scratchpad);
    $('#scratchpadSaveStatus').textContent = 'Tersimpan otomatis pada ' + new Date().toLocaleTimeString('id-ID');
  });

  $('#btnClearScratchpad')?.addEventListener('click', () => {
    if (confirm('Kosongkan semua lembar catatan saku?')) {
      state.scratchpad = '';
      storage.set(STORAGE_KEYS.SCRATCHPAD, '');
      $('#scratchpadInput').value = '';
      showToast('Catatan dikosongkan');
    }
  });

  // Export / Import Data
  $('#btnExportData')?.addEventListener('click', () => {
    const backupData = {
      app: 'TKAORA',
      version: '2.5.0',
      timestamp: new Date().toISOString(),
      doneMaterials: [...state.doneSet],
      scratchpad: state.scratchpad
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tkaora_cadangan_belajar_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Berkas cadangan berhasil diunduh');
  });

  $('#importFileInput')?.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (Array.isArray(data.doneMaterials)) {
          state.doneSet = new Set(data.doneMaterials);
          storage.set(STORAGE_KEYS.DONE, [...state.doneSet]);
        }
        if (data.scratchpad) {
          state.scratchpad = data.scratchpad;
          storage.set(STORAGE_KEYS.SCRATCHPAD, state.scratchpad);
        }
        renderProgressPage();
        renderHomeStats();
        renderLibrary();
        showToast('Cadangan belajar berhasil dipulihkan!');
      } catch (err) {
        alert('Gagal membaca berkas cadangan JSON: format tidak valid.');
      }
    };
    reader.readAsText(file);
  });

  $('#btnResetProgress')?.addEventListener('click', () => {
    if (confirm('Hapus seluruh catatan dan tanda materi selesai dari browser ini?')) {
      state.doneSet.clear();
      state.scratchpad = '';
      storage.set(STORAGE_KEYS.DONE, []);
      storage.set(STORAGE_KEYS.SCRATCHPAD, '');
      renderProgressPage();
      renderHomeStats();
      renderLibrary();
      showToast('Semua data belajar telah direset');
    }
  });

  // =========================================================================
  // BERANDA (HOME) STATS & METRICS
  // =========================================================================
  function renderHomeStats() {
    const total = state.materials.length || 14;
    const done = state.doneSet.size;
    const pct = Math.round((done / total) * 100);

    $('#homeProgressPct').textContent = `${pct}% Selesai`;
    $('#homeCountText').textContent = `${done} dari ${total} Materi`;

    // Progress Ring Calculation (Circumference 2 * PI * 32 ~= 201)
    const ring = $('#homeRingFill');
    if (ring) {
      const circumference = 201;
      const offset = circumference - (pct / 100) * circumference;
      ring.style.strokeDashoffset = offset;
    }

    const statusEl = $('#homeProgressStatus');
    if (statusEl) {
      statusEl.textContent = done === 0
        ? 'Mulai dari materi yang kamu sukai'
        : done === total
        ? 'Luar biasa! Seluruh 14 modul telah dipelajari'
        : `Bagus! Terus lanjutkan ritme belajarmu (${total - done} tersisa)`;
    }

    // Resume Last Material Button
    const lastId = state.lastMaterialId || storage.get(STORAGE_KEYS.LAST_MAT);
    const lastMat = state.materials.find(m => m.id === lastId);
    if (lastMat) {
      $('#resumeLastLabel').textContent = `Lanjut: ${lastMat.title}`;
      $('#resumeLastBtn').onclick = () => { openPdfModal(lastMat.id); return false; };
    } else {
      $('#resumeLastLabel').textContent = 'Mulai Modul Pertama';
      $('#resumeLastBtn').onclick = () => { location.hash = '#library'; return false; };
    }
  }

  // About Creator Modal
  const devModal = $('#aboutCreatorModal');
  $('#openAboutDev')?.addEventListener('click', () => devModal?.showModal());
  $('#openAboutDevMobile')?.addEventListener('click', () => devModal?.showModal());
  $('#closeAboutDevBtn')?.addEventListener('click', () => devModal?.close());
  devModal?.addEventListener('click', e => { if (e.target === devModal) devModal.close(); });

  // Theme Toggle
  $('#themeToggle')?.addEventListener('click', toggleTheme);
  $('#themeToggleMobile')?.addEventListener('click', toggleTheme);

  // =========================================================================
  // KEYBOARD SHORTCUTS (DESKTOP POWER USERS)
  // =========================================================================
  window.addEventListener('keydown', e => {
    // Escape to close modals
    if (e.key === 'Escape') {
      if (pdfModal?.open) { pdfModal.close(); return; }
      if (devModal?.open) { devModal.close(); return; }
    }

    // '/' to focus search input
    if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
      e.preventDefault();
      location.hash = '#library';
      setTimeout(() => $('#searchInput')?.focus(), 100);
      return;
    }

    // Quiz Shortcuts when on practice page
    if (!$('#quizActiveView').hidden) {
      const key = e.key.toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(key)) {
        const optIndex = key.charCodeAt(0) - 65;
        state.answers[state.quizIndex] = optIndex;
        renderActiveQuestion();
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        state.answers[state.quizIndex] = Number(e.key) - 1;
        renderActiveQuestion();
      } else if (e.key === 'ArrowRight') {
        $('#btnNextQuestion')?.click();
      } else if (e.key === 'ArrowLeft') {
        $('#btnPrevQuestion')?.click();
      } else if (key === 'F') {
        $('#btnToggleFlag')?.click();
      }
    }
  });

  // =========================================================================
  // INITIALIZATION
  // =========================================================================
  async function init() {
    // 1. Restore Theme
    const savedTheme = storage.get(STORAGE_KEYS.THEME, 'dark');
    applyTheme(savedTheme);

    // 2. Restore Saved Local Progress
    state.doneSet = new Set(storage.get(STORAGE_KEYS.DONE, []));
    state.scratchpad = storage.get(STORAGE_KEYS.SCRATCHPAD, '');
    state.lastMaterialId = storage.get(STORAGE_KEYS.LAST_MAT, null);

    // 3. Fetch Data Concurrently
    try {
      const [matRes, qRes, cheatRes] = await Promise.all([
        fetch('/api/materials').catch(() => fetch('/materials.json')),
        fetch('/questions.json'),
        fetch('/cheatsheet.json').catch(() => ({ ok: false }))
      ]);

      if (matRes.ok) {
        const matJson = await matRes.json();
        state.materials = matJson.materials || matJson;
      }

      if (qRes.ok) {
        state.questions = await qRes.json();
      }

      if (cheatRes.ok) {
        state.cheatsheet = await cheatRes.json();
      }
    } catch (err) {
      console.warn('Fallback data loading triggered:', err);
    }

    // Update nav counter
    $('#navMaterialCount').textContent = state.materials.length || 14;

    // Route to current hash
    const initialPage = location.hash.replace('#', '') || 'home';
    navigateTo(initialPage);
  }

  init();
})();
