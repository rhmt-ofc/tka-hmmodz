/**
 * TKAORA v2.5 — DARK NEOBRUTALISM EDITION
 * Core Engine & Platform Architected by rhmt ofc (HMMODZ)
 * Pure High-Performance Vanilla JavaScript — Zero Bloatware, 100% Anti-AI Slop
 */

(() => {
  'use strict';

  // Helper DOM Selectors
  const $ = (sel, parent = document) => parent.querySelector(sel);
  const $$ = (sel, parent = document) => [...parent.querySelectorAll(sel)];

  // Local Storage Keys
  const STORAGE_KEYS = {
    DONE: 'tkaora_done_v25',
    SCRATCHPAD: 'tkaora_scratchpad_v25',
    LAST_MAT: 'tkaora_last_mat_v25',
    THEME: 'tkaora_theme_v25',
    FLASHCARD_MASTERY: 'tkaora_fc_mastery_v25'
  };

  const LETTERS = ['A', 'B', 'C', 'D', 'E'];

  // Global State
  const state = {
    materials: [],
    questions: [],
    cheatsheet: [],
    doneSet: new Set(),
    flashcardMastery: {}, // { 'tka-01_0': true }
    scratchpad: '',
    lastMaterialId: null,
    filterCluster: 'semua',
    searchQuery: '',
    theme: 'dark',

    // Active Studio Modal State
    activeMaterial: null,
    activeStudioTab: 'flashcards',
    activeCardIndex: 0,
    isCardFlipped: false,

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

  // Safe Storage
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
      } catch (err) {
        console.warn('Storage write failed', err);
      }
    }
  };

  // Toast System (Brutalist Popup)
  function showToast(message, type = 'green') {
    const container = $('#toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast-brutal';
    if (type === 'pink') toast.style.borderColor = 'var(--neon-pink)';
    if (type === 'yellow') toast.style.borderColor = 'var(--neon-yellow)';

    toast.innerHTML = `<span>⚡</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = 'opacity 0.2s, transform 0.2s';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  }

  // Theme Toggle (Dark Neobrutalism default)
  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    storage.set(STORAGE_KEYS.THEME, theme);

    const sunIcon = $('.theme-icon-sun');
    const moonIcon = $('.theme-icon-moon');
    if (sunIcon && moonIcon) {
      if (theme === 'light') {
        sunIcon.style.display = 'inline-block';
        moonIcon.style.display = 'none';
      } else {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'inline-block';
      }
    }
  }

  function toggleTheme() {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark');
    showToast(`Tema beralih ke mode ${state.theme.toUpperCase()}`);
  }

  // Page Navigation Router
  function navigateTo(pageId) {
    const validPages = ['home', 'library', 'practice', 'cheatsheet', 'progress'];
    if (!validPages.includes(pageId)) pageId = 'home';

    // Update section visibility
    $$('.view-section').forEach(sec => {
      sec.classList.remove('active');
      sec.hidden = true;
    });

    const activeSec = $(`#${pageId}`);
    if (activeSec) {
      activeSec.classList.add('active');
      activeSec.hidden = false;
    }

    // Update Desktop Nav Links
    $$('.nav-link').forEach(link => {
      if (link.dataset.nav === pageId) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      }
    });

    // Update Mobile Nav Dock
    $$('.mobile-nav-item').forEach(link => {
      if (link.dataset.nav === pageId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Hook rendering
    if (pageId === 'home') renderHomeStats();
    if (pageId === 'library') renderLibrary();
    if (pageId === 'cheatsheet') renderCheatsheet();
    if (pageId === 'progress') renderProgressPage();

    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  window.addEventListener('hashchange', () => {
    navigateTo(location.hash.replace('#', '') || 'home');
  });

  // =========================================================================
  // 1. MATERI INTERAKTIF (LIBRARY)
  // =========================================================================
  function renderLibrary() {
    const container = $('#materialsContainer');
    if (!container) return;

    const q = state.searchQuery.toLowerCase().trim();
    const filter = state.filterCluster;

    const filtered = state.materials.filter(m => {
      if (filter === 'Wajib' && m.kind !== 'Wajib') return false;
      if (filter === 'Pilihan' && m.kind !== 'Pilihan') return false;
      if (filter === 'Bahasa' && !m.cluster.includes('Bahasa')) return false;
      if (filter === 'Sains' && !m.cluster.includes('Sains')) return false;
      if (filter === 'Soshum' && !m.cluster.includes('Sosial')) return false;

      if (q) {
        const text = `${m.title} ${m.description} ${m.cluster} ${m.kind}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });

    if (!filtered.length) {
      container.innerHTML = `
        <div style="grid-column:1/-1;padding:48px 24px;text-align:center;background:var(--bg-card);border:2.5px dashed var(--border-color);border-radius:var(--radius-md)">
          <h3 style="color:var(--neon-yellow)">Tidak ada materi yang sesuai</h3>
          <p class="muted" style="margin-top:6px">Gunakan kata kunci pencarian lain atau klik filter 'Semua'.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(m => {
      const isDone = state.doneSet.has(m.id);
      const accent = m.accentColor || 'var(--neon-yellow)';

      return `
        <article class="material-card-brutal" data-id="${m.id}" style="--card-accent:${accent}">
          <div class="card-top-meta">
            <span class="card-cluster-tag">${m.cluster}</span>
            <div style="display:flex;align-items:center;gap:6px">
              <span class="badge-pill-brutal ${m.kind === 'Wajib' ? 'yellow' : 'purple'}" style="font-size:0.65rem;padding:2px 6px">${m.kind}</span>
              ${isDone ? '<span class="badge-pill-brutal green" style="font-size:0.65rem;padding:2px 6px">✓ SELESAI</span>' : ''}
            </div>
          </div>

          <h3>${m.title}</h3>
          <p>${m.description || 'Modul resmi kurikulum TKA 2025.'}</p>

          <div class="card-feature-chips">
            <span class="feature-chip-mini active">🧠 Flashcard 3D</span>
            <span class="feature-chip-mini">⚡ Lab Interaktif</span>
            <span class="feature-chip-mini">🎯 Checkpoint</span>
            <span class="feature-chip-mini">📄 ${m.pages || 'PDF Resmi'}</span>
          </div>

          <div class="card-footer-actions">
            <button class="brutal-btn btn-sm btn-yellow btn-open-studio" data-id="${m.id}" style="flex-grow:1">
              <span>Buka Studio Belajar</span>
              <svg class="icon" style="width:13px;height:13px"><use href="#i-arrow-right"/></svg>
            </button>
          </div>
        </article>
      `;
    }).join('');
  }

  // Search and Filter Listeners
  $('#searchInput')?.addEventListener('input', e => {
    state.searchQuery = e.target.value;
    renderLibrary();
  });

  $$('.tab-btn-brutal').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.tab-btn-brutal').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.filterCluster = btn.dataset.filter;
      renderLibrary();
    });
  });

  $('#materialsContainer')?.addEventListener('click', e => {
    const btn = e.target.closest('.btn-open-studio');
    if (btn) openStudioModal(btn.dataset.id);
  });

  // =========================================================================
  // 2. INTERACTIVE STUDY STUDIO (MODAL DIALOG)
  // =========================================================================
  const studioModal = $('#studioModal');

  function openStudioModal(materialId, initialTab = 'flashcards') {
    const m = state.materials.find(x => x.id === materialId);
    if (!m || !studioModal) return;

    state.activeMaterial = m;
    state.activeStudioTab = initialTab;
    state.activeCardIndex = 0;
    state.isCardFlipped = false;
    state.lastMaterialId = m.id;
    storage.set(STORAGE_KEYS.LAST_MAT, m.id);

    $('#studioModalTitle').textContent = m.title;
    $('#studioClusterBadge').textContent = `${m.kind} • ${m.cluster}`;
    $('#studioDriveLink').href = m.sourceUrl || '#';

    // Set tab buttons
    $$('.studio-tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === initialTab);
    });

    renderStudioContent();
    studioModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeStudioModal() {
    if (!studioModal) return;
    studioModal.classList.remove('open');
    document.body.style.overflow = '';
  }

  $('#studioCloseBtn')?.addEventListener('click', closeStudioModal);
  studioModal?.addEventListener('click', e => {
    if (e.target === studioModal) closeStudioModal();
  });

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && studioModal?.classList.contains('open')) {
      closeStudioModal();
    }
  });

  // Studio Subtab Switching
  $$('.studio-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.studio-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeStudioTab = btn.dataset.tab;
      state.isCardFlipped = false;
      renderStudioContent();
    });
  });

  function renderStudioContent() {
    const container = $('#studioBody');
    const m = state.activeMaterial;
    if (!container || !m) return;

    if (state.activeStudioTab === 'flashcards') {
      renderFlashcardsTab(container, m);
    } else if (state.activeStudioTab === 'lab') {
      renderLabTab(container, m);
    } else if (state.activeStudioTab === 'checkpoint') {
      renderCheckpointTab(container, m);
    } else if (state.activeStudioTab === 'pdf') {
      renderPdfTab(container, m);
    }
  }

  // --- SUBTAB 1: FLASHCARD 3D ---
  function renderFlashcardsTab(container, m) {
    const cards = m.flashcards || [
      {
        term: m.title,
        definition: m.description,
        jebakan: 'Pastikan membaca setiap kalimat wacana dengan teliti sebelum memilih opsi.',
        tip: 'Terapkan eliminasi pilihan jawaban yang ekstrem (selalu, tidak pernah).'
      }
    ];

    const idx = state.activeCardIndex;
    const currentCard = cards[idx] || cards[0];
    const isMastered = !!state.flashcardMastery[`${m.id}_${idx}`];

    container.innerHTML = `
      <div class="flashcards-container">
        <div class="flashcard-progress-bar">
          <span>KARTU HAFALAN ${idx + 1} DARI ${cards.length}</span>
          <span>${isMastered ? '✅ SUDAH PAHAM' : '⏳ PERLU REVIEW'}</span>
        </div>

        <div class="flashcard-box-3d" id="flashcardCardBox">
          <div class="flashcard-inner ${state.isCardFlipped ? 'flipped' : ''}" id="flashcardInner">
            <!-- Front -->
            <div class="flashcard-face flashcard-front">
              <div>
                <span class="flashcard-hint-badge">KLIK KARTU UNTUK MEMBALIK (3D FLIP)</span>
                <h3 class="flashcard-term" style="margin-top:12px">${currentCard.term}</h3>
              </div>
              <div style="font-family:var(--font-mono);font-size:0.85rem;color:var(--muted)">
                Ketuk di mana saja pada kartu untuk melihat definisi & trik jebakan soal ➜
              </div>
            </div>

            <!-- Back -->
            <div class="flashcard-face flashcard-back">
              <div>
                <span class="flashcard-hint-badge" style="color:var(--neon-green)">INTISARI KONSEP</span>
                <p class="flashcard-definition" style="margin-top:8px">${currentCard.definition}</p>

                ${currentCard.jebakan ? `
                  <div class="flashcard-jebakan">
                    <strong>⚠️ JEBAKAN SOAL:</strong> ${currentCard.jebakan}
                  </div>
                ` : ''}

                ${currentCard.tip ? `
                  <div class="flashcard-tip">
                    <strong>💡 TRIK MEMORI:</strong> ${currentCard.tip}
                  </div>
                ` : ''}
              </div>

              <div style="font-family:var(--font-mono);font-size:0.8rem;color:var(--muted)">
                Klik lagi untuk membalik ke depan
              </div>
            </div>
          </div>
        </div>

        <!-- Controls -->
        <div class="flashcard-controls">
          <button class="brutal-btn btn-outline" id="fcPrevBtn" ${idx === 0 ? 'disabled style="opacity:0.5"' : ''}>
            ← Kartu Sebelumnya
          </button>

          <button class="brutal-btn ${isMastered ? 'btn-green' : 'btn-outline'}" id="fcToggleMasterBtn">
            ${isMastered ? '✓ Paham (Lepas)' : 'Tandai Sudah Paham'}
          </button>

          <button class="brutal-btn btn-yellow" id="fcNextBtn" ${idx === cards.length - 1 ? 'disabled style="opacity:0.5"' : ''}>
            Kartu Berikutnya →
          </button>
        </div>
      </div>
    `;

    // Flip Event
    $('#flashcardInner')?.addEventListener('click', () => {
      state.isCardFlipped = !state.isCardFlipped;
      $('#flashcardInner').classList.toggle('flipped', state.isCardFlipped);
    });

    // Prev / Next
    $('#fcPrevBtn')?.addEventListener('click', () => {
      if (state.activeCardIndex > 0) {
        state.activeCardIndex--;
        state.isCardFlipped = false;
        renderStudioContent();
      }
    });

    $('#fcNextBtn')?.addEventListener('click', () => {
      if (state.activeCardIndex < cards.length - 1) {
        state.activeCardIndex++;
        state.isCardFlipped = false;
        renderStudioContent();
      }
    });

    // Toggle Mastery
    $('#fcToggleMasterBtn')?.addEventListener('click', () => {
      const key = `${m.id}_${idx}`;
      state.flashcardMastery[key] = !state.flashcardMastery[key];
      storage.set(STORAGE_KEYS.FLASHCARD_MASTERY, state.flashcardMastery);
      showToast(state.flashcardMastery[key] ? 'Konsep ditandai SUDAH PAHAM' : 'Status paham dilepas');
      renderStudioContent();
    });
  }

  // --- SUBTAB 2: INTERACTIVE LAB SIMULATOR ---
  function renderLabTab(container, m) {
    let labHtml = '';

    if (m.id === 'tka-05') {
      // Matematika Wajib: Pemanasan Global y = 0.02x - 39.9
      labHtml = `
        <div class="lab-container">
          <div class="lab-header">
            <h3>Simulator Model Pemanasan Global (TKA 2025)</h3>
            <span class="badge-pill-brutal yellow">FORMULA: y = 0,02x - 39,9</span>
          </div>

          <div class="lab-interactive-surface">
            <p style="margin-bottom:12px;font-size:0.95rem">
              Uji perkiraan kenaikan suhu bumi rata-rata (°C) berdasarkan variabel tahun:
            </p>
            <div class="lab-slider-row">
              <label style="font-family:var(--font-mono);font-weight:800;color:var(--neon-yellow)">Tahun (x): <span id="labYearVal">2030</span></label>
              <input type="range" id="labYearSlider" min="2000" max="2060" value="2030" step="1">
            </div>

            <div class="lab-output-box">
              <div style="font-size:1.15rem;margin-bottom:8px">
                Hasil Hitung Suhu: <strong style="color:var(--neon-green)" id="labTempResult">0,70 °C</strong>
              </div>
              <div style="font-size:0.85rem;color:var(--muted)" id="labStepMath">
                Langkah: y = 0,02(2030) - 39,9 = 40,6 - 39,9 = 0,70 °C
              </div>
            </div>
          </div>

          <div style="font-size:0.85rem;color:var(--ink-secondary)">
            💡 <em>Indikator Resmi:</em> Pada soal TKA 2025 asli, siswa diminta mencari tahun ketika suhu mencapai 0,7 °C. Model ini membuktikan jawabannya tepat tahun 2030.
          </div>
        </div>
      `;
    } else if (m.id === 'tka-06') {
      // Matematika Pilihan: Gradien Garis Singgung f'(x)
      labHtml = `
        <div class="lab-container">
          <div class="lab-header">
            <h3>Kalkulator Gradien Garis Singgung Parabola</h3>
            <span class="badge-pill-brutal purple">f(x) = 2x² - 3x + 1</span>
          </div>

          <div class="lab-interactive-surface">
            <p style="margin-bottom:12px">Geser nilai absis titik singgung (x):</p>
            <div class="lab-slider-row">
              <label style="font-family:var(--font-mono);font-weight:800;color:var(--neon-cyan)">Absis (x): <span id="labAbsisVal">2</span></label>
              <input type="range" id="labAbsisSlider" min="-5" max="5" value="2" step="1">
            </div>

            <div class="lab-output-box">
              <div style="font-size:1.15rem;margin-bottom:8px">
                Gradien Kemiringan (m = f'(x)): <strong style="color:var(--neon-yellow)" id="labSlopeResult">m = 5</strong>
              </div>
              <div style="font-size:0.85rem;color:var(--muted)" id="labSlopeStep">
                Turunan: f'(x) = 4x - 3 ==> f'(2) = 4(2) - 3 = 5
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (m.id === 'tka-09') {
      // Fisika: Gerak Relatif Perahu vs Arus
      labHtml = `
        <div class="lab-container">
          <div class="lab-header">
            <h3>Simulator Vektor Gerak Relatif Kapal Feri</h3>
            <span class="badge-pill-brutal cyan">v_resultan = √(v_k² - v_a²)</span>
          </div>

          <div class="lab-interactive-surface">
            <div class="lab-slider-row">
              <label style="font-family:var(--font-mono);color:var(--neon-cyan);width:190px">Kecepatan Kapal (v_k): <span id="labVkVal">13</span> km/jam</label>
              <input type="range" id="labVkSlider" min="6" max="25" value="13" step="1">
            </div>
            <div class="lab-slider-row">
              <label style="font-family:var(--font-mono);color:var(--neon-pink);width:190px">Kecepatan Arus (v_a): <span id="labVaVal">5</span> km/jam</label>
              <input type="range" id="labVaSlider" min="1" max="12" value="5" step="1">
            </div>

            <div class="lab-output-box">
              <div style="font-size:1.15rem;margin-bottom:8px">
                Kecepatan Tegak Lurus Menyeberang: <strong style="color:var(--neon-green)" id="labVresResult">12.00 km/jam</strong>
              </div>
              <div style="font-size:0.85rem;color:var(--muted)" id="labVresStep">
                v_res = √(13² - 5²) = √(169 - 25) = √144 = 12 km/jam
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (m.id === 'tka-11') {
      // Kimia: Stoikiometri Alanin & Mol
      labHtml = `
        <div class="lab-container">
          <div class="lab-header">
            <h3>Kalkulator Stoikiometri Asam Amino Alanin</h3>
            <span class="badge-pill-brutal pink">C3H7NO2 (Mr = 89)</span>
          </div>

          <div class="lab-interactive-surface">
            <p style="margin-bottom:12px">Pilih unsur untuk melihat persentase massa di dalam molekul alanin:</p>
            <div style="display:flex;gap:8px;margin-bottom:16px">
              <button class="brutal-btn btn-sm btn-yellow lab-elem-btn active" data-elem="C" data-mass="36" data-name="Karbon (3 x 12)">Karbon (C)</button>
              <button class="brutal-btn btn-sm btn-outline lab-elem-btn" data-elem="H" data-mass="7" data-name="Hidrogen (7 x 1)">Hidrogen (H)</button>
              <button class="brutal-btn btn-sm btn-outline lab-elem-btn" data-elem="N" data-mass="14" data-name="Nitrogen (1 x 14)">Nitrogen (N)</button>
              <button class="brutal-btn btn-sm btn-outline lab-elem-btn" data-elem="O" data-mass="32" data-name="Oksigen (2 x 16)">Oksigen (O)</button>
            </div>

            <div class="lab-output-box">
              <div style="font-size:1.15rem;margin-bottom:8px">
                Persentase Massa <span id="labElemName">Karbon</span>: <strong style="color:var(--neon-green)" id="labElemPct">40.45%</strong>
              </div>
              <div style="font-size:0.85rem;color:var(--muted)" id="labElemMath">
                Hitungan: (36 / 89) × 100% = 40,45% (Soal Asli TKA 2025: 40,4%)
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      // General Interactive Concept Matrix
      const lab = m.lab || { title: 'Lab Eksplorasi Konsep', prompt: 'Eksplorasi wacana dan indikator kurikulum' };
      labHtml = `
        <div class="lab-container">
          <div class="lab-header">
            <h3>${lab.title || 'Lab Interaktif Konsep'}</h3>
            <span class="badge-pill-brutal green">STUDIO TKAORA</span>
          </div>

          <div class="lab-interactive-surface">
            <p style="margin-bottom:16px">${lab.prompt || 'Pelajari kaitan indikator dengan materi soal resmi:'}</p>

            ${lab.cases ? `
              <div style="display:flex;flex-direction:column;gap:12px">
                ${lab.cases.map(c => `
                  <div style="background:#000;border:2px solid var(--border-line);padding:14px;border-radius:var(--radius-sm)">
                    <div style="color:var(--neon-yellow);font-weight:800;margin-bottom:4px">${c.claim || c.sentence || c.passageA}</div>
                    <div style="font-size:0.88rem;color:var(--ink-secondary);margin-bottom:6px">${c.evidence || c.status || c.context}</div>
                    <div style="font-family:var(--font-mono);font-size:0.82rem;color:var(--neon-green)">➔ ${c.validity || c.fix || c.meaning || c.synthesis}</div>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div class="lab-output-box">
                <div style="color:var(--neon-yellow);margin-bottom:6px">Konsep Terapan Modul:</div>
                <div>${m.description}</div>
              </div>
            `}
          </div>
        </div>
      `;
    }

    container.innerHTML = labHtml;

    // Attach dynamic listeners for math/physics sliders
    if (m.id === 'tka-05') {
      const slider = $('#labYearSlider');
      slider?.addEventListener('input', e => {
        const year = parseInt(e.target.value, 10);
        $('#labYearVal').textContent = year;
        const temp = (0.02 * year - 39.9).toFixed(2);
        $('#labTempResult').textContent = `${temp} °C`;
        $('#labStepMath').textContent = `Langkah: y = 0,02(${year}) - 39,9 = ${(0.02 * year).toFixed(2)} - 39,9 = ${temp} °C`;
      });
    } else if (m.id === 'tka-06') {
      const slider = $('#labAbsisSlider');
      slider?.addEventListener('input', e => {
        const x = parseInt(e.target.value, 10);
        $('#labAbsisVal').textContent = x;
        const mVal = 4 * x - 3;
        $('#labSlopeResult').textContent = `m = ${mVal}`;
        $('#labSlopeStep').textContent = `Turunan: f'(${x}) = 4(${x}) - 3 = ${mVal}`;
      });
    } else if (m.id === 'tka-09') {
      const vkSlider = $('#labVkSlider');
      const vaSlider = $('#labVaSlider');
      const updatePhysics = () => {
        const vk = parseFloat(vkSlider.value);
        const va = parseFloat(vaSlider.value);
        $('#labVkVal').textContent = vk;
        $('#labVaVal').textContent = va;
        if (vk <= va) {
          $('#labVresResult').textContent = 'Tidak Mampu Menyeberang Lurus (v_k ≤ v_a)';
          return;
        }
        const vres = Math.sqrt(vk * vk - va * va).toFixed(2);
        $('#labVresResult').textContent = `${vres} km/jam`;
        $('#labVresStep').textContent = `v_res = √(${vk}² - ${va}²) = √(${(vk*vk - va*va).toFixed(0)}) = ${vres} km/jam`;
      };
      vkSlider?.addEventListener('input', updatePhysics);
      vaSlider?.addEventListener('input', updatePhysics);
    } else if (m.id === 'tka-11') {
      $$('.lab-elem-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          $$('.lab-elem-btn').forEach(b => {
            b.classList.remove('btn-yellow', 'active');
            b.classList.add('btn-outline');
          });
          btn.classList.remove('btn-outline');
          btn.classList.add('btn-yellow', 'active');
          const mass = parseFloat(btn.dataset.mass);
          const name = btn.dataset.name;
          const pct = ((mass / 89) * 100).toFixed(2);
          $('#labElemName').textContent = name;
          $('#labElemPct').textContent = `${pct}%`;
          $('#labElemMath').textContent = `Hitungan: (${mass} / 89) × 100% = ${pct}%`;
        });
      });
    }
  }

  // --- SUBTAB 3: CHECKPOINT QUIZ ---
  function renderCheckpointTab(container, m) {
    const checkpoints = m.checkpoint || [];
    if (!checkpoints.length) {
      container.innerHTML = `<p class="muted">Belum ada soal checkpoint kilat untuk modul ini.</p>`;
      return;
    }

    container.innerHTML = `
      <div class="checkpoint-container">
        <div style="margin-bottom:18px">
          <span class="badge-pill-brutal green">UJI RETENSI KILAT</span>
          <h3 style="margin-top:6px;font-size:1.3rem">Kuis Checkpoint: ${m.title}</h3>
          <p style="font-size:0.9rem">Jawab pertanyaan berikut untuk memverifikasi pemahamanmu seketika.</p>
        </div>

        ${checkpoints.map((cp, qIdx) => `
          <div class="checkpoint-question-card" id="cpCard_${qIdx}">
            <h4>${qIdx + 1}. ${cp.q}</h4>
            <div style="display:flex;flex-direction:column;gap:8px">
              ${cp.options.map((opt, optIdx) => `
                <button class="checkpoint-option-btn cp-btn" data-q="${qIdx}" data-opt="${optIdx}">
                  <span>${LETTERS[optIdx]}. ${opt}</span>
                  <span class="cp-indicator"></span>
                </button>
              `).join('')}
            </div>
            <div class="cp-explanation" id="cpExpl_${qIdx}" style="display:none;margin-top:14px;padding:12px;background:#000;border:1.5px solid var(--neon-yellow);border-radius:4px;font-size:0.85rem">
              <strong>💡 PEMBAHASAN:</strong> ${cp.expl}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Click handler for checkpoint options
    $$('.cp-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const qIdx = parseInt(btn.dataset.q, 10);
        const optIdx = parseInt(btn.dataset.opt, 10);
        const cp = checkpoints[qIdx];
        const card = $(`#cpCard_${qIdx}`);
        if (!card) return;

        // Disable all buttons in this card
        const allBtns = $$('.cp-btn', card);
        allBtns.forEach(b => {
          b.disabled = true;
          b.style.pointerEvents = 'none';
          const bOpt = parseInt(b.dataset.opt, 10);
          if (bOpt === cp.ans) {
            b.classList.add('correct');
          } else if (bOpt === optIdx) {
            b.classList.add('wrong');
          }
        });

        const expl = $(`#cpExpl_${qIdx}`);
        if (expl) expl.style.display = 'block';

        if (optIdx === cp.ans) {
          showToast('Jawaban Checkpoint Benar! 🔥', 'green');
        } else {
          showToast('Jawaban Belum Tepat. Periksa pembahasan.', 'pink');
        }
      });
    });
  }

  // --- SUBTAB 4: PDF READER & SPLIT SCRATCHPAD ---
  function renderPdfTab(container, m) {
    const pdfUrl = `/pdfs/${m.id}.pdf`;
    const isDone = state.doneSet.has(m.id);

    container.innerHTML = `
      <div class="pdf-split-layout">
        <!-- PDF Iframe -->
        <div class="pdf-frame-wrapper">
          <iframe src="${pdfUrl}#toolbar=1" title="Dokumen Resmi ${m.title}"></iframe>
        </div>

        <!-- Split Scratchpad -->
        <div class="scratchpad-sidebar">
          <h4>
            <span>📝</span>
            <span>Catatan Modul Ini</span>
          </h4>
          <p style="font-size:0.75rem;color:var(--muted);margin-bottom:10px">Catatan tersimpan otomatis di perangkatmu:</p>
          <textarea class="scratchpad-textarea-brutal" id="studioScratchpadInput" placeholder="Tulis rumus penting atau ringkasan materi ${m.title}..."></textarea>

          <div style="margin-top:14px;display:flex;flex-direction:column;gap:8px">
            <button class="brutal-btn btn-sm ${isDone ? 'btn-green' : 'btn-yellow'}" id="studioMarkDoneBtn">
              ${isDone ? '✓ Modul Sudah Selesai' : 'Tandai Selesai Dipelajari'}
            </button>
            <a class="brutal-btn btn-sm btn-outline" href="${m.sourceUrl || pdfUrl}" target="_blank" rel="noopener noreferrer">
              Buka di Tab Baru ↗
            </a>
          </div>
        </div>
      </div>
    `;

    // Populate scratchpad
    const pad = $('#studioScratchpadInput');
    if (pad) {
      pad.value = state.scratchpad || '';
      pad.addEventListener('input', e => {
        state.scratchpad = e.target.value;
        storage.set(STORAGE_KEYS.SCRATCHPAD, state.scratchpad);
        const mainPad = $('#scratchpadInput');
        if (mainPad) mainPad.value = state.scratchpad;
      });
    }

    // Toggle Mark Done
    $('#studioMarkDoneBtn')?.addEventListener('click', () => {
      if (state.doneSet.has(m.id)) {
        state.doneSet.delete(m.id);
        showToast(`Modul ${m.title} ditandai belum selesai.`);
      } else {
        state.doneSet.add(m.id);
        showToast(`Hebat! Modul ${m.title} selesai dipelajari! 🎉`, 'green');
      }
      storage.set(STORAGE_KEYS.DONE, [...state.doneSet]);
      renderStudioContent();
      renderHomeStats();
      renderLibrary();
    });
  }

  // =========================================================================
  // 3. PRAKTEK & ARENA 20 SOAL AUTENTIK PDF (PRACTICE)
  // =========================================================================
  function startQuiz(mode = 'zen', customQuestions = null) {
    state.quizMode = mode;
    state.quizQuestions = customQuestions || [...state.questions];
    state.answers = {};
    state.flagged = new Set();
    state.quizIndex = 0;
    state.isRetestMode = !!customQuestions;

    if (!state.quizQuestions.length) {
      showToast('Belum ada data soal latihan yang termuat.', 'pink');
      return;
    }

    // Toggle views
    $('#quizIntroView').hidden = true;
    $('#quizResultsView').hidden = true;
    $('#quizActiveView').hidden = false;

    // Badge
    $('#quizModeBadge').textContent = mode === 'timer' ? 'SIMULASI WAKTU' : 'ZEN MODE';
    $('#quizModeBadge').className = `quiz-mode-pill ${mode === 'timer' ? 'pink' : 'purple'}`;

    // Timer setup
    clearInterval(state.timerInterval);
    const timerBox = $('#quizTimerBox');

    if (mode === 'timer') {
      state.timerSeconds = state.quizQuestions.length * 60; // 1 min per question
      if (timerBox) timerBox.style.display = 'inline-flex';
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
      if (timerBox) timerBox.style.display = 'none';
    }

    renderActiveQuestion();
    renderQuestionPalette();
  }

  function updateTimerDisplay() {
    const timerText = $('#quizTimerText');
    if (!timerText) return;
    const m = Math.floor(state.timerSeconds / 60);
    const s = state.timerSeconds % 60;
    timerText.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function renderActiveQuestion() {
    const q = state.quizQuestions[state.quizIndex];
    if (!q) return;

    // Header label
    $('#quizCurrentIndexLabel').textContent = `Soal ${state.quizIndex + 1} dari ${state.quizQuestions.length}`;
    $('#qSubjectBadge').textContent = q.subject;
    $('#qTopicText').textContent = q.topic || 'Soal Resmi TKA 2025';
    $('#qQuestionText').textContent = q.question;

    // Wacana Box (Authentic Passage)
    const wacanaBox = $('#wacanaBox');
    const wacanaText = $('#wacanaText');
    if (q.passage) {
      wacanaText.textContent = q.passage;
      wacanaBox.hidden = false;
    } else {
      wacanaBox.hidden = true;
    }

    // Flag button state
    const isFlagged = state.flagged.has(state.quizIndex);
    const flagBtn = $('#btnToggleFlag');
    if (flagBtn) {
      flagBtn.classList.toggle('btn-pink', isFlagged);
      $('#btnToggleFlagLabel').textContent = isFlagged ? 'Ditandai Ragu' : 'Ragu';
    }

    // Render Options
    const optContainer = $('#optionsContainer');
    const selectedAns = state.answers[state.quizIndex];

    optContainer.innerHTML = q.options.map((opt, i) => {
      const isSelected = selectedAns === i;
      return `
        <button class="quiz-option-btn ${isSelected ? 'selected' : ''}" data-index="${i}">
          <span class="option-key-badge">${LETTERS[i]}</span>
          <span style="font-size:0.95rem;line-height:1.45">${opt}</span>
        </button>
      `;
    }).join('');

    // Previous / Next button labels
    const isLast = state.quizIndex === state.quizQuestions.length - 1;
    const nextBtn = $('#btnNextQuestion');
    if (nextBtn) {
      nextBtn.innerHTML = isLast ? '<span>Selesai & Kumpulkan ✓</span>' : '<span>Berikutnya →</span>';
      nextBtn.className = isLast ? 'brutal-btn btn-green' : 'brutal-btn btn-yellow';
    }

    const prevBtn = $('#btnPrevQuestion');
    if (prevBtn) {
      prevBtn.disabled = state.quizIndex === 0;
      prevBtn.style.opacity = state.quizIndex === 0 ? '0.4' : '1';
    }

    renderQuestionPalette();
  }

  function renderQuestionPalette() {
    const palette = $('#questionNavStrip');
    if (!palette) return;

    palette.innerHTML = state.quizQuestions.map((_, i) => {
      const isCurrent = i === state.quizIndex;
      const isAnswered = state.answers[i] !== undefined;
      const isFlagged = state.flagged.has(i);

      let cls = 'palette-cell-btn';
      if (isCurrent) cls += ' current';
      if (isAnswered) cls += ' answered';
      if (isFlagged) cls += ' flagged';

      return `
        <button class="${cls}" data-goto="${i}" title="Nomor ${i + 1}">
          ${i + 1}
        </button>
      `;
    }).join('');
  }

  // Option selection
  $('#optionsContainer')?.addEventListener('click', e => {
    const btn = e.target.closest('.quiz-option-btn');
    if (!btn) return;
    const optIdx = parseInt(btn.dataset.index, 10);
    state.answers[state.quizIndex] = optIdx;
    renderActiveQuestion();
  });

  // Palette Jump
  $('#questionNavStrip')?.addEventListener('click', e => {
    const btn = e.target.closest('.palette-cell-btn');
    if (!btn) return;
    state.quizIndex = parseInt(btn.dataset.goto, 10);
    renderActiveQuestion();
  });

  // Next / Prev Controls
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

  // Flag toggle
  $('#btnToggleFlag')?.addEventListener('click', () => {
    if (state.flagged.has(state.quizIndex)) {
      state.flagged.delete(state.quizIndex);
    } else {
      state.flagged.add(state.quizIndex);
    }
    renderActiveQuestion();
  });

  // Restart / Cancel
  $('#btnRestartQuiz')?.addEventListener('click', () => {
    if (confirm('Batalkan latihan dan kembali ke menu awal?')) {
      clearInterval(state.timerInterval);
      $('#quizActiveView').hidden = true;
      $('#quizIntroView').hidden = false;
    }
  });

  // Start Quiz Button
  $('#btnStartQuiz')?.addEventListener('click', () => {
    const selectedMode = $('input[name="quizModeOpt"]:checked')?.value || 'zen';
    startQuiz(selectedMode);
  });

  // Finish Quiz & Results Calculation
  function finishQuiz(force = false) {
    clearInterval(state.timerInterval);

    const answeredCount = Object.keys(state.answers).length;
    const totalCount = state.quizQuestions.length;

    if (!force && answeredCount < totalCount) {
      const confirmSubmit = confirm(`Kamu baru menjawab ${answeredCount} dari ${totalCount} soal. Yakin ingin mengumpulkan sekarang?`);
      if (!confirmSubmit) return;
    }

    renderResultsPage();
  }

  function renderResultsPage() {
    $('#quizActiveView').hidden = true;
    const resultsView = $('#quizResultsView');
    if (!resultsView) return;
    resultsView.hidden = false;

    let correctCount = 0;
    const wrongQuestions = [];

    state.quizQuestions.forEach((q, i) => {
      const userAns = state.answers[i];
      if (userAns === q.answer) {
        correctCount++;
      } else {
        wrongQuestions.push(q);
      }
    });

    const scorePct = Math.round((correctCount / state.quizQuestions.length) * 100);

    resultsView.innerHTML = `
      <div class="results-card-brutal">
        <span class="badge-pill-brutal yellow">HASIL EVALUASI TKA RESMI</span>
        <h2 style="font-size:2.2rem;margin:14px 0">Analisis Performa Latihan</h2>

        <div class="score-circle-brutal">
          <div class="score-number">${scorePct}</div>
          <div class="score-total">${correctCount} / ${state.quizQuestions.length} BENAR</div>
        </div>

        <p style="font-size:1.05rem;max-width:600px;margin:0 auto 24px">
          ${scorePct >= 80 ? 'Luar biasa! Pemahaman konsepmu terhadap kurikulum TKA 2025 sudah sangat matang.' : 'Bagus! Pelajari pembahasan di bawah untuk menguasai butir soal yang belum tepat.'}
        </p>

        <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap">
          ${wrongQuestions.length > 0 ? `
            <button class="brutal-btn btn-pink" id="btnRetestWrongs">
              <span>Latih Ulang ${wrongQuestions.length} Soal Keliru</span>
              <svg class="icon" style="width:16px;height:16px"><use href="#i-refresh"/></svg>
            </button>
          ` : ''}
          <button class="brutal-btn btn-yellow" id="btnRestartAll">
            <span>Ulangi Semua Soal</span>
          </button>
          <a class="brutal-btn btn-outline" href="#library">
            <span>Kembali ke Modul</span>
          </a>
        </div>
      </div>

      <!-- Detailed Breakdown -->
      <h3 style="font-size:1.4rem;margin-bottom:16px;color:#fff">Pembahasan Mendalam Soal per Soal:</h3>
      <div style="display:flex;flex-direction:column;gap:16px">
        ${state.quizQuestions.map((q, i) => {
          const userAns = state.answers[i];
          const isCorrect = userAns === q.answer;

          return `
            <article class="question-card-brutal" style="border-color:${isCorrect ? 'var(--neon-green)' : 'var(--neon-pink)'}">
              <div class="question-meta-row">
                <span class="badge-pill-brutal ${isCorrect ? 'green' : 'pink'}">
                  ${isCorrect ? '✓ BENAR' : '✗ PERLU PERBAIKAN'}
                </span>
                <span style="font-family:var(--font-mono);font-size:0.8rem;color:var(--muted)">${q.subject} • ${q.topic}</span>
                <span class="badge-pill-brutal yellow">Nomor ${i + 1}</span>
              </div>

              ${q.passage ? `
                <div class="question-passage-box" style="margin-bottom:14px">
                  <div class="passage-label">STIMULUS SOAL:</div>
                  ${q.passage}
                </div>
              ` : ''}

              <h4 style="font-size:1.1rem;margin-bottom:14px;color:#fff">${q.question}</h4>

              <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px">
                ${q.options.map((opt, optIdx) => {
                  let optStyle = 'background:var(--bg-surface-elevated);border:1.5px solid #000;';
                  if (optIdx === q.answer) {
                    optStyle = 'background:rgba(5, 255, 161, 0.2);border:2px solid var(--neon-green);color:#fff;font-weight:800;';
                  } else if (optIdx === userAns) {
                    optStyle = 'background:rgba(255, 42, 109, 0.2);border:2px solid var(--neon-pink);color:#fff;';
                  }
                  return `
                    <div style="padding:10px 14px;border-radius:4px;font-size:0.9rem;display:flex;align-items:center;gap:10px;${optStyle}">
                      <span class="option-key-badge">${LETTERS[optIdx]}</span>
                      <span>${opt}</span>
                      ${optIdx === q.answer ? '<span style="margin-left:auto;color:var(--neon-green);font-weight:900">KUNCI TKA</span>' : ''}
                      ${optIdx === userAns && !isCorrect ? '<span style="margin-left:auto;color:var(--neon-pink);font-weight:900">PILIHANMU</span>' : ''}
                    </div>
                  `;
                }).join('')}
              </div>

              <div style="background:#000;border:2px solid var(--neon-yellow);padding:14px;border-radius:4px;font-size:0.88rem;line-height:1.55">
                <strong style="color:var(--neon-yellow)">💡 PENJELASAN RESMI:</strong> ${q.explanation}
              </div>
            </article>
          `;
        }).join('')}
      </div>
    `;

    // Retest wrong questions listener
    $('#btnRetestWrongs')?.addEventListener('click', () => {
      startQuiz('zen', wrongQuestions);
    });

    $('#btnRestartAll')?.addEventListener('click', () => {
      startQuiz('zen');
    });
  }

  // Keyboard Shortcuts for Practice Mode
  window.addEventListener('keydown', e => {
    const activeView = $('#quizActiveView');
    if (!activeView || activeView.hidden) return;
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    const key = e.key.toUpperCase();
    const map = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, '1': 0, '2': 1, '3': 2, '4': 3, '5': 4 };
    if (map[key] !== undefined) {
      const q = state.quizQuestions[state.quizIndex];
      if (q && q.options[map[key]] !== undefined) {
        state.answers[state.quizIndex] = map[key];
        renderActiveQuestion();
      }
    } else if (e.key === 'ArrowRight') {
      $('#btnNextQuestion')?.click();
    } else if (e.key === 'ArrowLeft') {
      $('#btnPrevQuestion')?.click();
    } else if (key === 'F') {
      $('#btnToggleFlag')?.click();
    }
  });

  // =========================================================================
  // 4. RUMUS KILAT (CHEATSHEET)
  // =========================================================================
  function renderCheatsheet() {
    const container = $('#cheatsheetContainer');
    if (!container) return;

    container.innerHTML = state.cheatsheet.map(cat => `
      <div class="cheat-card-brutal">
        <div class="cheat-card-header">
          <span style="font-size:1.4rem">⚡</span>
          <h3 style="color:${cat.color || 'var(--neon-yellow)'}">${cat.subject}</h3>
        </div>

        <div style="display:flex;flex-direction:column;gap:12px">
          ${cat.items.map(item => `
            <div>
              <div style="font-weight:800;font-size:0.95rem;color:#fff;margin-bottom:4px">${item.title}</div>
              <div class="cheat-formula-box">${item.formula}</div>
              <p class="cheat-tip-text">💡 <strong>Tip Ujian:</strong> ${item.tip}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  // =========================================================================
  // 5. PROGRESS & SMART SCRATCHPAD
  // =========================================================================
  function renderProgressPage() {
    // Render Checklist
    const listContainer = $('#progressChecklistContainer');
    if (listContainer) {
      listContainer.innerHTML = state.materials.map(m => {
        const isDone = state.doneSet.has(m.id);
        return `
          <label style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg-surface-elevated);border:2px solid #000;border-radius:4px;cursor:pointer">
            <input type="checkbox" class="progress-chk" data-id="${m.id}" ${isDone ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--neon-green)">
            <span style="font-weight:700;${isDone ? 'color:var(--neon-green);text-decoration:line-through' : 'color:#fff'}">${m.title}</span>
            <span style="margin-left:auto;font-family:var(--font-mono);font-size:0.75rem;color:var(--muted)">${m.pages || ''}</span>
          </label>
        `;
      }).join('');

      $$('.progress-chk').forEach(chk => {
        chk.addEventListener('change', e => {
          const id = e.target.dataset.id;
          if (e.target.checked) {
            state.doneSet.add(id);
          } else {
            state.doneSet.delete(id);
          }
          storage.set(STORAGE_KEYS.DONE, [...state.doneSet]);
          renderProgressPage();
          renderHomeStats();
        });
      });
    }

    // Scratchpad input sync
    const pad = $('#scratchpadInput');
    if (pad) {
      pad.value = state.scratchpad || '';
    }
  }

  $('#scratchpadInput')?.addEventListener('input', e => {
    state.scratchpad = e.target.value;
    storage.set(STORAGE_KEYS.SCRATCHPAD, state.scratchpad);
  });

  $('#btnClearScratchpad')?.addEventListener('click', () => {
    if (confirm('Kosongkan semua catatan rumus pribadi?')) {
      state.scratchpad = '';
      storage.set(STORAGE_KEYS.SCRATCHPAD, '');
      const pad = $('#scratchpadInput');
      if (pad) pad.value = '';
      showToast('Catatan berhasil dikosongkan');
    }
  });

  // Export / Import Data
  $('#btnExportData')?.addEventListener('click', () => {
    const backup = {
      version: '2.5',
      author: 'rhmt ofc (HMMODZ)',
      timestamp: new Date().toISOString(),
      done: [...state.doneSet],
      flashcardMastery: state.flashcardMastery,
      scratchpad: state.scratchpad
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tkaora_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Cadangan belajar berhasil diunduh!');
  });

  $('#importFileInput')?.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.done) state.doneSet = new Set(data.done);
        if (data.scratchpad) state.scratchpad = data.scratchpad;
        if (data.flashcardMastery) state.flashcardMastery = data.flashcardMastery;
        storage.set(STORAGE_KEYS.DONE, [...state.doneSet]);
        storage.set(STORAGE_KEYS.SCRATCHPAD, state.scratchpad);
        storage.set(STORAGE_KEYS.FLASHCARD_MASTERY, state.flashcardMastery);
        showToast('Cadangan berhasil dipulihkan! 🎉', 'green');
        renderProgressPage();
        renderHomeStats();
      } catch (err) {
        showToast('Format berkas cadangan tidak valid!', 'pink');
      }
    };
    reader.readAsText(file);
  });

  $('#btnResetProgress')?.addEventListener('click', () => {
    if (confirm('YAKIN RESET SEMUA PROGRES? Semua centang modul dan catatan akan dihapus permanen.')) {
      state.doneSet.clear();
      state.flashcardMastery = {};
      state.scratchpad = '';
      storage.set(STORAGE_KEYS.DONE, []);
      storage.set(STORAGE_KEYS.FLASHCARD_MASTERY, {});
      storage.set(STORAGE_KEYS.SCRATCHPAD, '');
      showToast('Semua data progres telah direset.');
      renderProgressPage();
      renderHomeStats();
    }
  });

  // =========================================================================
  // 6. HOME STATS RENDERER
  // =========================================================================
  function renderHomeStats() {
    const doneCount = state.doneSet.size;
    const statElem = $('#statCompletedModul');
    if (statElem) statElem.textContent = `${doneCount}/14`;
  }

  // =========================================================================
  // 7. ABOUT CREATOR MODAL
  // =========================================================================
  const aboutModal = $('#aboutCreatorModal');
  const openAbout = () => {
    if (aboutModal) {
      if (typeof aboutModal.showModal === 'function') {
        aboutModal.showModal();
      } else {
        aboutModal.setAttribute('open', '');
      }
    }
  };
  const closeAbout = () => {
    if (aboutModal) {
      if (typeof aboutModal.close === 'function') {
        aboutModal.close();
      } else {
        aboutModal.removeAttribute('open');
      }
    }
  };

  $('#openAboutDevSidebar')?.addEventListener('click', openAbout);
  $('#brandBoxSidebar')?.addEventListener('click', openAbout);
  $('#closeAboutCreatorBtn')?.addEventListener('click', closeAbout);

  // Theme Toggle Button
  $('#themeToggleBtn')?.addEventListener('click', toggleTheme);

  // =========================================================================
  // 8. INITIALIZATION
  // =========================================================================
  async function init() {
    try {
      // 1. Restore local storage
      const savedTheme = storage.get(STORAGE_KEYS.THEME, 'dark');
      applyTheme(savedTheme);

      const savedDone = storage.get(STORAGE_KEYS.DONE, []);
      state.doneSet = new Set(savedDone);

      state.scratchpad = storage.get(STORAGE_KEYS.SCRATCHPAD, '');
      state.flashcardMastery = storage.get(STORAGE_KEYS.FLASHCARD_MASTERY, {});
      state.lastMaterialId = storage.get(STORAGE_KEYS.LAST_MAT, null);

      // 2. Fetch Datasets
      const [matRes, qRes, cheatRes] = await Promise.all([
        fetch('/materials.json'),
        fetch('/questions.json'),
        fetch('/cheatsheet.json')
      ]);

      state.materials = await matRes.json();
      state.questions = await qRes.json();
      state.cheatsheet = await cheatRes.json();

      // Update badge counts
      const navCount = $('#navMaterialCount');
      if (navCount) navCount.textContent = `${state.materials.length} Modul`;

      // 3. Initial Routing
      const initRoute = location.hash.replace('#', '') || 'home';
      navigateTo(initRoute);

    } catch (err) {
      console.error('Initialization error:', err);
      showToast('Gagal memuat sebagian data. Periksa koneksi lokal.', 'pink');
    }
  }

  // Boot on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
