/**
 * UNISCORE VN - APPLICATION CONTROLLER & SCORE ENGINE
 * Hệ thống tính điểm chuẩn, lọc nguyện vọng và tối ưu chiến lược tuyển sinh
 */

// Global State
const STATE = {
  theme: localStorage.getItem('uniscore_theme') || 'light',
  activeTab: 'tab-calc',
  activeMethod: 'thpt',
  currentScore: 26.04,
  currentCombo: 'A01',
  selectedCategory: 'all',
  wishlist: JSON.parse(localStorage.getItem('uniscore_wishlist') || '[]'),
  currentModalMajor: null,
  rankedCombos: []
};

// DOM Content Loaded Handler
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNavigation();
  initMethodTabs();
  initIeltsTable();
  initCategoryPills();
  initUniversityDropdown();
  
  // Calculate default scores on load
  calculateThptScores();
  
  // Render match results and explore table
  renderMatches();
  renderExploreTable();
  renderWishlist();
  
  initEventListeners();
  updateStatsCounters();
});

/* ===================================================================
   1. THEME & NAVIGATION
   =================================================================== */
function initTheme() {
  document.documentElement.setAttribute('data-theme', STATE.theme);
  updateThemeIcon();
}

function updateThemeIcon() {
  const icon = document.getElementById('themeIcon');
  if (icon) {
    if (STATE.theme === 'dark') {
      icon.className = 'fa-solid fa-sun';
      icon.style.color = '#f59e0b';
    } else {
      icon.className = 'fa-solid fa-moon';
      icon.style.color = '';
    }
  }
}

function toggleTheme() {
  STATE.theme = STATE.theme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', STATE.theme);
  localStorage.setItem('uniscore_theme', STATE.theme);
  updateThemeIcon();
  
  // Redraw modal chart if open
  if (STATE.currentModalMajor) {
    drawTrendChart(STATE.currentModalMajor);
  }
}

function initNavigation() {
  const navBtns = document.querySelectorAll('.nav-item-btn, .tab-nav-btn');
  navBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetTab = btn.getAttribute('data-tab');
      if (targetTab) {
        switchTab(targetTab);
      }
    });
  });

  const btnOpenWishlistTab = document.getElementById('btnOpenWishlistTab');
  if (btnOpenWishlistTab) {
    btnOpenWishlistTab.addEventListener('click', () => {
      switchTab('tab-wishlist');
    });
  }

  const navBrandLogo = document.getElementById('navBrandLogo');
  if (navBrandLogo) {
    navBrandLogo.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab('tab-calc');
    });
  }
}

function switchTab(tabId) {
  STATE.activeTab = tabId;

  // Update navbar button active styles
  document.querySelectorAll('.nav-item-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
  });

  // Update secondary tab button active styles
  document.querySelectorAll('.tab-nav-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
  });

  // Toggle tab pane visibility
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === tabId);
  });

  // Scroll smoothly to top of main-wrapper
  const mainWrapper = document.querySelector('.main-wrapper');
  if (mainWrapper) {
    mainWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // If switching to match tab, re-render
  if (tabId === 'tab-match') {
    renderMatches();
  } else if (tabId === 'tab-wishlist') {
    renderWishlist();
  }
}

function initMethodTabs() {
  const methodBtns = document.querySelectorAll('.method-btn');
  methodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      methodBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const method = btn.getAttribute('data-method');
      STATE.activeMethod = method;

      document.querySelectorAll('.method-form-box').forEach(box => {
        box.style.display = 'none';
      });

      const activeForm = document.getElementById(`form-${method}`);
      if (activeForm) {
        activeForm.style.display = 'block';
      }
    });
  });
}

function updateStatsCounters() {
  let totalMajors = 0;
  UNIVERSITIES_DATA.forEach(u => totalMajors += u.majors.length);
  
  const elUni = document.getElementById('statUniCount');
  const elMajor = document.getElementById('statMajorCount');
  if (elUni) elUni.innerText = `${UNIVERSITIES_DATA.length}+`;
  if (elMajor) elMajor.innerText = `${totalMajors}+`;
}

/* ===================================================================
   2. SCORE ENGINE & CALCULATOR FORMULAS
   =================================================================== */

/**
 * Tính điểm thi THPT theo quy chế Bộ GD&ĐT
 * Hỗ trợ giảm điểm ưu tiên tuyến tính từ 22.5 điểm trở lên
 */
function calculateThptScores() {
  const math = parseFloat(document.getElementById('score_math')?.value) || 0;
  const literature = parseFloat(document.getElementById('score_literature')?.value) || 0;
  const english = parseFloat(document.getElementById('score_english')?.value) || 0;
  const physics = parseFloat(document.getElementById('score_physics')?.value) || 0;
  const chemistry = parseFloat(document.getElementById('score_chemistry')?.value) || 0;
  const biology = parseFloat(document.getElementById('score_biology')?.value) || 0;
  const history = parseFloat(document.getElementById('score_history')?.value) || 0;
  const geography = parseFloat(document.getElementById('score_geography')?.value) || 0;
  const gdcd = parseFloat(document.getElementById('score_gdcd')?.value) || 0;

  const subjectScores = {
    math, literature, english, physics, chemistry, biology, history, geography, gdcd
  };

  // Ưu tiên khu vực
  const regionVal = document.getElementById('selectRegion')?.value || 'KV3';
  let regionBonus = 0;
  if (regionVal === 'KV1') regionBonus = 0.75;
  else if (regionVal === 'KV2-NT') regionBonus = 0.50;
  else if (regionVal === 'KV2') regionBonus = 0.25;

  // Đối tượng ưu tiên
  const targetBonus = parseFloat(document.getElementById('selectTarget')?.value) || 0;
  const theoreticalPriority = regionBonus + targetBonus;

  // Điểm khuyến khích
  const generalBonus = parseFloat(document.getElementById('inputBonus')?.value) || 0;

  // Hệ số môn chính
  const multiplier = document.getElementById('selectMultiplier')?.value || 'none';

  // Tính toán tất cả các tổ hợp
  const comboResults = [];

  for (const [comboCode, info] of Object.entries(COMBOS_INFO)) {
    const s1 = subjectScores[info.subjects[0]] || 0;
    const s2 = subjectScores[info.subjects[1]] || 0;
    const s3 = subjectScores[info.subjects[2]] || 0;

    let rawScore = s1 + s2 + s3;
    let scoreForPriority = rawScore;

    // Xử lý hệ số môn chính nếu có
    let finalScore = 0;
    let hasMultiplier = false;

    if (multiplier !== 'none') {
      let multiplierSubjectScore = null;
      let other1 = 0;
      let other2 = 0;

      if (info.subjects[0] === multiplier) {
        multiplierSubjectScore = s1;
        other1 = s2;
        other2 = s3;
      } else if (info.subjects[1] === multiplier) {
        multiplierSubjectScore = s2;
        other1 = s1;
        other2 = s3;
      } else if (info.subjects[2] === multiplier) {
        multiplierSubjectScore = s3;
        other1 = s1;
        other2 = s2;
      }

      if (multiplierSubjectScore !== null) {
        hasMultiplier = true;
        // Quy đổi về thang 30 theo công thức Bộ GD&ĐT: (Môn 1 + Môn 2 + Môn chính * 2) * 3 / 4
        scoreForPriority = ((other1 + other2 + multiplierSubjectScore * 2) * 3) / 4;
      }
    }

    // Công thức tính điểm ưu tiên thực tế của Bộ GD&ĐT:
    // Nếu tổng điểm >= 22.5 => Điểm UT = [(30 - Tổng điểm) / 7.5] * Mức UT quy định
    let actualPriority = theoreticalPriority;
    if (scoreForPriority >= 22.5) {
      actualPriority = ((30 - scoreForPriority) / 7.5) * theoreticalPriority;
      if (actualPriority < 0) actualPriority = 0;
    }

    if (hasMultiplier) {
      finalScore = scoreForPriority + actualPriority + generalBonus;
    } else {
      finalScore = rawScore + actualPriority + generalBonus;
    }

    // Giới hạn làm tròn 2 chữ số thập phân
    rawScore = Math.round(rawScore * 100) / 100;
    actualPriority = Math.round(actualPriority * 100) / 100;
    finalScore = Math.min(30, Math.round(finalScore * 100) / 100);

    comboResults.push({
      code: comboCode,
      name: info.name,
      subjects: info.subjects,
      rawScore,
      theoreticalPriority,
      actualPriority,
      bonus: generalBonus,
      finalScore,
      hasMultiplier
    });
  }

  // Sắp xếp các tổ hợp theo điểm số giảm dần
  comboResults.sort((a, b) => b.finalScore - a.finalScore);
  STATE.rankedCombos = comboResults;

  // Lấy tổ hợp cao nhất
  const bestCombo = comboResults[0];
  STATE.currentScore = bestCombo.finalScore;
  STATE.currentCombo = bestCombo.code;

  // Cập nhật giao diện tóm tắt
  updateSummaryUI(bestCombo, comboResults);

  // Cập nhật input điểm mục tiêu ở Tab Gợi ý
  const targetScoreInput = document.getElementById('userTargetScoreInput');
  if (targetScoreInput) {
    targetScoreInput.value = bestCombo.finalScore;
  }

  const comboSelect = document.getElementById('matchComboSelect');
  if (comboSelect) {
    comboSelect.value = bestCombo.code;
  }
}

function updateSummaryUI(bestCombo, allCombos) {
  document.getElementById('bestComboCode').innerText = bestCombo.code;
  document.getElementById('bestComboScore').innerText = bestCombo.finalScore.toFixed(2);
  document.getElementById('bestComboDesc').innerText = bestCombo.name;

  const multiplierBadge = document.getElementById('bestComboMultiplierBadge');
  if (multiplierBadge) {
    multiplierBadge.innerText = bestCombo.hasMultiplier ? '(Quy đổi thang 30 môn chính x2)' : '';
  }

  document.getElementById('sumRawScore').innerText = bestCombo.rawScore.toFixed(2);
  document.getElementById('sumTheoreticalPriority').innerText = `+${bestCombo.theoreticalPriority.toFixed(2)}`;
  document.getElementById('sumActualPriority').innerText = `+${bestCombo.actualPriority.toFixed(2)}`;
  document.getElementById('sumBonusScore').innerText = `+${bestCombo.bonus.toFixed(2)}`;
  document.getElementById('sumFinalScore').innerText = `${bestCombo.finalScore.toFixed(2)} / 30.00`;

  // Render danh sách các tổ hợp khác
  const otherCombosList = document.getElementById('otherCombosList');
  if (otherCombosList) {
    otherCombosList.innerHTML = '';
    allCombos.slice(1, 8).forEach(combo => {
      const item = document.createElement('div');
      item.className = 'other-combo-row';
      item.innerHTML = `
        <div>
          <strong style="color: var(--primary);">${combo.code}</strong> 
          <span style="color: var(--text-muted); font-size: 0.78rem;">(${combo.name})</span>
        </div>
        <div>
          <strong style="font-size: 0.95rem;">${combo.finalScore.toFixed(2)}</strong>
        </div>
      `;
      item.addEventListener('click', () => {
        selectComboForMatching(combo.code, combo.finalScore);
      });
      otherCombosList.appendChild(item);
    });
  }
}

function selectComboForMatching(comboCode, score) {
  STATE.currentCombo = comboCode;
  STATE.currentScore = score;

  const targetScoreInput = document.getElementById('userTargetScoreInput');
  if (targetScoreInput) targetScoreInput.value = score;

  const comboSelect = document.getElementById('matchComboSelect');
  if (comboSelect) comboSelect.value = comboCode;

  showToast(`Đã chọn tổ hợp ${comboCode} (${score.toFixed(2)} điểm)`, 'info');
}

/**
 * Tính điểm xét Học bạ THPT
 */
function calculateHocBaScores() {
  const m1 = parseFloat(document.getElementById('hb_m1')?.value) || 0;
  const m2 = parseFloat(document.getElementById('hb_m2')?.value) || 0;
  const m3 = parseFloat(document.getElementById('hb_m3')?.value) || 0;
  const combo = document.getElementById('hb_combo_select')?.value || 'D01';

  const rawScore = m1 + m2 + m3;
  let finalScore = Math.min(30, Math.round(rawScore * 100) / 100);

  STATE.currentScore = finalScore;
  STATE.currentCombo = combo;

  document.getElementById('bestComboCode').innerText = `Học bạ ${combo}`;
  document.getElementById('bestComboScore').innerText = finalScore.toFixed(2);
  document.getElementById('bestComboDesc').innerText = `Xét học bạ 3 môn: ${m1} + ${m2} + ${m3}`;
  document.getElementById('sumRawScore').innerText = rawScore.toFixed(2);
  document.getElementById('sumTheoreticalPriority').innerText = '+0.00';
  document.getElementById('sumActualPriority').innerText = '+0.00';
  document.getElementById('sumFinalScore').innerText = `${finalScore.toFixed(2)} / 30.00`;

  const targetScoreInput = document.getElementById('userTargetScoreInput');
  if (targetScoreInput) targetScoreInput.value = finalScore;

  showToast(`Tính điểm Học bạ thành công: ${finalScore.toFixed(2)} điểm`, 'success');
}

/**
 * Quy đổi điểm Đánh giá năng lực / Đánh giá tư duy
 */
function calculateDgnlScores() {
  const examType = document.getElementById('dgnl_exam_type')?.value;
  const rawScore = parseFloat(document.getElementById('dgnl_score_val')?.value) || 0;

  let scaledScore = 0;
  let examName = '';

  if (examType === 'hcm') {
    // ĐHQG TP.HCM thang 1200
    examName = 'ĐGNL ĐHQG TP.HCM';
    scaledScore = (rawScore / 1200) * 30;
  } else if (examType === 'hn') {
    // ĐHQG Hà Nội thang 150
    examName = 'HSA ĐHQG Hà Nội';
    scaledScore = (rawScore / 150) * 30;
  } else {
    // ĐH Bách Khoa Hà Nội TSA thang 100
    examName = 'TSA ĐHBK Hà Nội';
    scaledScore = (rawScore / 100) * 30;
  }

  scaledScore = Math.min(30, Math.round(scaledScore * 100) / 100);
  STATE.currentScore = scaledScore;

  document.getElementById('bestComboCode').innerText = 'ĐGNL/ĐGTD';
  document.getElementById('bestComboScore').innerText = scaledScore.toFixed(2);
  document.getElementById('bestComboDesc').innerText = `${examName}: ${rawScore} điểm quy đổi thang 30`;
  document.getElementById('sumRawScore').innerText = scaledScore.toFixed(2);
  document.getElementById('sumFinalScore').innerText = `${scaledScore.toFixed(2)} / 30.00`;

  const targetScoreInput = document.getElementById('userTargetScoreInput');
  if (targetScoreInput) targetScoreInput.value = scaledScore;

  showToast(`Quy đổi ${examName} thành công: ${scaledScore.toFixed(2)} / 30`, 'success');
}

/**
 * Khởi tạo bảng quy đổi IELTS
 */
function initIeltsTable() {
  const tbody = document.getElementById('ieltsConversionTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';
  IELTS_CONVERSION_TABLE.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${row.band}</strong></td>
      <td><span class="table-score-badge">${row.hust.toFixed(1)}</span></td>
      <td><span class="table-score-badge">${row.neu.toFixed(1)}</span></td>
      <td><span class="table-score-badge">${row.ftu.toFixed(1)}</span></td>
      <td><span class="table-score-badge">${row.ueh.toFixed(1)}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function applyIeltsToThpt() {
  const band = document.getElementById('cert_band')?.value || '6.5';
  let convertedScore = 9.5;

  if (parseFloat(band) >= 7.5) convertedScore = 10.0;
  else if (parseFloat(band) >= 7.0) convertedScore = 10.0;
  else if (parseFloat(band) >= 6.5) convertedScore = 9.5;
  else if (parseFloat(band) >= 6.0) convertedScore = 9.0;
  else if (parseFloat(band) >= 5.5) convertedScore = 8.5;
  else convertedScore = 8.0;

  const englishInput = document.getElementById('score_english');
  if (englishInput) {
    englishInput.value = convertedScore;
    englishInput.style.color = 'var(--primary)';
  }

  // Switch back to THPT form
  const btnThpt = document.getElementById('btnMethodThpt');
  if (btnThpt) btnThpt.click();

  calculateThptScores();
  showToast(`Đã áp dụng IELTS ${band} thành ${convertedScore}đ vào môn Tiếng Anh!`, 'success');
}

/* ===================================================================
   3. ADMISSION CHANCE ANALYZER & MATCHING ALGORITHM
   =================================================================== */
function initCategoryPills() {
  const container = document.getElementById('categoryPillsBar');
  if (!container) return;

  container.innerHTML = '';
  MAJOR_CATEGORIES.forEach(cat => {
    const pill = document.createElement('button');
    pill.className = `category-pill ${cat.id === STATE.selectedCategory ? 'active' : ''}`;
    pill.setAttribute('data-category', cat.id);
    pill.innerHTML = `<i class="fa-solid ${cat.icon}"></i> ${cat.name}`;
    pill.addEventListener('click', () => {
      document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      STATE.selectedCategory = cat.id;
      renderMatches();
    });
    container.appendChild(pill);
  });
}

function renderMatches() {
  const grid = document.getElementById('matchesResultsGrid');
  const countEl = document.getElementById('matchResultsCount');
  if (!grid) return;

  const searchKeyword = (document.getElementById('matchSearchInput')?.value || '').trim().toLowerCase();
  const selectedCombo = document.getElementById('matchComboSelect')?.value || 'ALL';
  const userScore = parseFloat(document.getElementById('userTargetScoreInput')?.value) || STATE.currentScore;
  const regionFilter = document.getElementById('matchRegionSelect')?.value || 'all';
  const chanceFilter = document.getElementById('matchChanceSelect')?.value || 'all';
  const categoryFilter = STATE.selectedCategory;

  const matchedItems = [];

  UNIVERSITIES_DATA.forEach(uni => {
    // Check region
    if (regionFilter !== 'all' && uni.region !== 'all' && uni.region !== regionFilter) {
      return;
    }

    uni.majors.forEach(major => {
      // Check category
      if (categoryFilter !== 'all' && major.category !== categoryFilter) {
        return;
      }

      // Check combo
      if (selectedCombo !== 'ALL' && !major.combos.includes(selectedCombo)) {
        return;
      }

      // Check keyword search
      if (searchKeyword) {
        const matchName = major.name.toLowerCase().includes(searchKeyword);
        const matchCode = major.code.toLowerCase().includes(searchKeyword);
        const matchUniName = uni.name.toLowerCase().includes(searchKeyword) || uni.shortName.toLowerCase().includes(searchKeyword);
        const matchUniCode = uni.code.toLowerCase().includes(searchKeyword);
        if (!matchName && !matchCode && !matchUniName && !matchUniCode) {
          return;
        }
      }

      // Calculate Chance Rating
      // Diff = userScore - major.score2024
      const diff = Math.round((userScore - major.score2024) * 100) / 100;
      let chanceType = 'medium';
      let chanceText = 'Vừa sức / Cơ hội tốt';
      let probability = 65;

      if (diff >= 1.0) {
        chanceType = 'safe';
        chanceText = 'Khả năng đỗ cao (An toàn)';
        probability = Math.min(98, Math.round(85 + diff * 5));
      } else if (diff >= -0.5) {
        chanceType = 'medium';
        chanceText = 'Vừa sức (Cạnh tranh tốt)';
        probability = Math.round(65 + diff * 15);
      } else if (diff >= -1.5) {
        chanceType = 'risky';
        chanceText = 'Thử thách (Mạo hiểm)';
        probability = Math.max(15, Math.round(35 + diff * 15));
      } else {
        chanceType = 'very_risky';
        chanceText = 'Khó đỗ';
        probability = Math.max(5, Math.round(15 + diff * 5));
      }

      // Filter by chance selection
      if (chanceFilter === 'safe' && chanceType !== 'safe') return;
      if (chanceFilter === 'medium' && chanceType !== 'medium') return;
      if (chanceFilter === 'risky' && chanceType !== 'risky') return;

      matchedItems.push({
        uni,
        major,
        diff,
        chanceType,
        chanceText,
        probability
      });
    });
  });

  // Sort matched items: Priority to Medium/Safe around user score
  matchedItems.sort((a, b) => {
    // Sort by diff closest to ideal (+0.5) or highest probability
    return b.probability - a.probability;
  });

  if (countEl) countEl.innerText = matchedItems.length;

  if (matchedItems.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i class="fa-solid fa-file-circle-xmark"></i>
        <h4>Không tìm thấy ngành phù hợp với tiêu chí lọc</h4>
        <p>Thử điều chỉnh lại điểm xét tuyển, mở rộng tổ hợp môn hoặc chọn "Toàn quốc".</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = '';
  matchedItems.forEach(item => {
    const isAdded = STATE.wishlist.some(w => w.uniCode === item.uni.code && w.majorCode === item.major.code);
    const card = document.createElement('div');
    card.className = 'major-card';

    const diffBadge = item.diff >= 0 ? `+${item.diff.toFixed(2)}đ` : `${item.diff.toFixed(2)}đ`;

    card.innerHTML = `
      <div>
        <div class="major-card-header">
          <div class="uni-info-wrap">
            <span class="uni-code-tag">${item.uni.code}</span>
            <span class="uni-name-text">${item.uni.shortName}</span>
          </div>
          <span class="chance-indicator-tag ${item.chanceType}">
            <i class="fa-solid ${item.chanceType === 'safe' ? 'fa-shield-halved' : item.chanceType === 'medium' ? 'fa-scale-balanced' : 'fa-triangle-exclamation'}"></i>
            ${item.chanceText} (${diffBadge})
          </span>
        </div>

        <h4 class="major-title">${item.major.name}</h4>
        <div class="major-code-sub">Mã ngành: ${item.major.code} • Nhóm: ${getCategoryName(item.major.category)}</div>

        <div class="scores-row">
          <div>
            <div class="score-col-year">Điểm 2022</div>
            <div class="score-col-val">${item.major.score2022.toFixed(2)}</div>
          </div>
          <div>
            <div class="score-col-year">Điểm 2023</div>
            <div class="score-col-val">${item.major.score2023.toFixed(2)}</div>
          </div>
          <div>
            <div class="score-col-year">Điểm 2024</div>
            <div class="score-col-val current">${item.major.score2024.toFixed(2)}</div>
          </div>
        </div>

        <div class="combos-list-tags">
          ${item.major.combos.map(c => `
            <span class="combo-pill ${c === STATE.currentCombo ? 'highlight' : ''}">${c}</span>
          `).join('')}
        </div>
      </div>

      <div class="card-bottom-actions">
        <button class="btn-add-wishlist ${isAdded ? 'added' : ''}" data-uni="${item.uni.code}" data-major="${item.major.code}">
          <i class="fa-solid ${isAdded ? 'fa-check' : 'fa-plus'}"></i>
          <span>${isAdded ? 'Đã lưu NV' : 'Thêm vào NV'}</span>
        </button>
        <button class="btn-view-detail" data-uni="${item.uni.code}" data-major="${item.major.code}" title="Xem chi tiết & biểu đồ">
          <i class="fa-solid fa-chart-line"></i>
        </button>
      </div>
    `;

    // Event listener for Add Wishlist
    const btnWish = card.querySelector('.btn-add-wishlist');
    btnWish.addEventListener('click', () => {
      toggleWishlistItem(item.uni, item.major, btnWish);
    });

    // Event listener for View Detail Modal
    const btnDetail = card.querySelector('.btn-view-detail');
    btnDetail.addEventListener('click', () => {
      openMajorDetailModal(item.uni, item.major);
    });

    grid.appendChild(card);
  });
}

function getCategoryName(catId) {
  const c = MAJOR_CATEGORIES.find(x => x.id === catId);
  return c ? c.name : catId;
}

/* ===================================================================
   4. BENCHMARK EXPLORER TABLE
   =================================================================== */
function initUniversityDropdown() {
  const select = document.getElementById('exploreUniFilter');
  if (!select) return;

  select.innerHTML = '<option value="all">Tất cả các trường ĐH</option>';
  UNIVERSITIES_DATA.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.code;
    opt.innerText = `${u.code} - ${u.shortName}`;
    select.appendChild(opt);
  });
}

function renderExploreTable() {
  const tbody = document.getElementById('exploreTableBody');
  if (!tbody) return;

  const uniFilter = document.getElementById('exploreUniFilter')?.value || 'all';
  const search = (document.getElementById('exploreSearchInput')?.value || '').trim().toLowerCase();

  tbody.innerHTML = '';

  let count = 0;

  UNIVERSITIES_DATA.forEach(uni => {
    if (uniFilter !== 'all' && uni.code !== uniFilter) {
      return;
    }

    uni.majors.forEach(major => {
      if (search) {
        const mName = major.name.toLowerCase().includes(search);
        const mCode = major.code.toLowerCase().includes(search);
        const uName = uni.name.toLowerCase().includes(search) || uni.shortName.toLowerCase().includes(search);
        if (!mName && !mCode && !uName) return;
      }

      count++;

      // Xu hướng điểm (2024 so với 2023)
      const diff = Math.round((major.score2024 - major.score2023) * 100) / 100;
      let trendHtml = '';
      if (diff > 0.1) {
        trendHtml = `<span style="color: var(--danger); font-weight: 700;"><i class="fa-solid fa-arrow-trend-up"></i> +${diff.toFixed(2)}</span>`;
      } else if (diff < -0.1) {
        trendHtml = `<span style="color: var(--success); font-weight: 700;"><i class="fa-solid fa-arrow-trend-down"></i> ${diff.toFixed(2)}</span>`;
      } else {
        trendHtml = `<span style="color: var(--text-muted); font-weight: 600;"><i class="fa-solid fa-minus"></i> Ổn định</span>`;
      }

      const isAdded = STATE.wishlist.some(w => w.uniCode === uni.code && w.majorCode === major.code);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div style="font-weight: 800; color: var(--text-main);">${uni.shortName}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${uni.city} • <span class="uni-code-tag">${uni.code}</span></div>
        </td>
        <td>
          <div style="font-weight: 800; color: var(--text-main);">${major.name}</div>
          <div style="font-size: 0.78rem; color: var(--text-light); font-family: monospace;">${major.code}</div>
        </td>
        <td>
          <div style="display: flex; gap: 0.25rem; flex-wrap: wrap;">
            ${major.combos.map(c => `<span class="combo-pill">${c}</span>`).join('')}
          </div>
        </td>
        <td><span class="table-score-badge">${major.score2024.toFixed(2)}</span></td>
        <td><strong style="color: var(--text-main);">${major.score2023.toFixed(2)}</strong></td>
        <td><span style="color: var(--text-muted);">${major.score2022.toFixed(2)}</span></td>
        <td>${trendHtml}</td>
        <td>
          <div style="font-size: 0.8rem; color: var(--text-muted); max-width: 240px; line-height: 1.4;">
            ${major.subCriteria || 'Xét từ cao xuống thấp'}
          </div>
        </td>
        <td>
          <div style="display: flex; gap: 0.35rem;">
            <button class="btn-wishlist-tool btn-table-add" data-uni="${uni.code}" data-major="${major.code}" style="padding: 0.35rem 0.6rem; font-size: 0.78rem;">
              <i class="fa-solid ${isAdded ? 'fa-check' : 'fa-plus'}"></i> ${isAdded ? 'Đã lưu' : 'Lưu NV'}
            </button>
            <button class="btn-view-detail btn-table-view" data-uni="${uni.code}" data-major="${major.code}" style="width: 30px; height: 30px;">
              <i class="fa-solid fa-chart-line"></i>
            </button>
          </div>
        </td>
      `;

      // Event listener for Add Wishlist
      const btnAdd = tr.querySelector('.btn-table-add');
      btnAdd.addEventListener('click', () => {
        toggleWishlistItem(uni, major, btnAdd);
      });

      // Event listener for Detail
      const btnDetail = tr.querySelector('.btn-table-view');
      btnDetail.addEventListener('click', () => {
        openMajorDetailModal(uni, major);
      });

      tbody.appendChild(tr);
    });
  });

  if (count === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          Không tìm thấy ngành hoặc trường theo từ khóa tìm kiếm.
        </td>
      </tr>
    `;
  }
}

/* ===================================================================
   5. WISHLIST & STRATEGIC BALANCE OPTIMIZER
   =================================================================== */
function toggleWishlistItem(uni, major, buttonEl) {
  const index = STATE.wishlist.findIndex(w => w.uniCode === uni.code && w.majorCode === major.code);

  if (index >= 0) {
    // Remove
    STATE.wishlist.splice(index, 1);
    if (buttonEl) {
      buttonEl.classList.remove('added');
      buttonEl.innerHTML = '<i class="fa-solid fa-plus"></i> Thêm vào NV';
    }
    showToast(`Đã bỏ ngành ${major.name} khỏi danh sách nguyện vọng.`, 'info');
  } else {
    // Add
    STATE.wishlist.push({
      uniCode: uni.code,
      uniName: uni.shortName,
      uniCity: uni.city,
      majorCode: major.code,
      majorName: major.name,
      combos: major.combos,
      score2024: major.score2024,
      score2023: major.score2023,
      score2022: major.score2022,
      subCriteria: major.subCriteria,
      tuition: major.tuition
    });

    if (buttonEl) {
      buttonEl.classList.add('added');
      buttonEl.innerHTML = '<i class="fa-solid fa-check"></i> Đã lưu NV';
    }
    showToast(`Đã thêm ${major.name} (${uni.code}) vào danh sách nguyện vọng!`, 'success');
  }

  saveWishlist();
  renderWishlist();
  updateWishlistBadges();
}

function saveWishlist() {
  localStorage.setItem('uniscore_wishlist', JSON.stringify(STATE.wishlist));
}

function updateWishlistBadges() {
  const count = STATE.wishlist.length;
  const navBadge = document.getElementById('navWishlistBadge');
  const tabBadge = document.getElementById('tabWishlistCount');
  const totalCount = document.getElementById('wishlistTotalCount');

  if (navBadge) navBadge.innerText = count;
  if (tabBadge) tabBadge.innerText = count;
  if (totalCount) totalCount.innerText = count;
}

function renderWishlist() {
  updateWishlistBadges();
  const container = document.getElementById('wishlistItemsContainer');
  if (!container) return;

  if (STATE.wishlist.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-folder-open"></i>
        <h4>Chưa có nguyện vọng nào được thêm</h4>
        <p>Hãy vào mục <strong>Gợi Ý Nguyện Vọng</strong> hoặc <strong>Kho Điểm Chuẩn</strong> để tìm và thêm ngành học yêu thích vào danh sách!</p>
      </div>
    `;
    updateStrategyOptimizer();
    return;
  }

  container.innerHTML = '';
  STATE.wishlist.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'wishlist-item-card';

    // Chance calculation against current user score
    const diff = Math.round((STATE.currentScore - item.score2024) * 100) / 100;
    let badgeClass = 'medium';
    let badgeText = 'Vừa sức';
    if (diff >= 1.0) {
      badgeClass = 'safe';
      badgeText = 'An toàn';
    } else if (diff < -0.5) {
      badgeClass = 'risky';
      badgeText = 'Thử thách';
    }

    card.innerHTML = `
      <div class="nv-rank-number">NV ${idx + 1}</div>
      <div class="wishlist-item-info">
        <h5>${item.majorName}</h5>
        <p>
          <span class="uni-code-tag">${item.uniCode}</span> 
          <strong>${item.uniName}</strong> • Mã: ${item.majorCode} • Khối: ${item.combos.join(', ')}
        </p>
      </div>
      <div class="wishlist-item-score-pill">
        <div class="label">Điểm chuẩn 2024</div>
        <div class="score">${item.score2024.toFixed(2)}</div>
        <span class="chance-indicator-tag ${badgeClass}" style="margin-top: 0.25rem;">${badgeText} (${diff >= 0 ? '+' + diff.toFixed(2) : diff.toFixed(2)})</span>
      </div>
      <div class="wishlist-item-controls">
        <button class="ctrl-btn btn-move-up" title="Đẩy lên ưu tiên cao hơn" ${idx === 0 ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ''}>
          <i class="fa-solid fa-arrow-up"></i>
        </button>
        <button class="ctrl-btn btn-move-down" title="Hạ xuống" ${idx === STATE.wishlist.length - 1 ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ''}>
          <i class="fa-solid fa-arrow-down"></i>
        </button>
        <button class="ctrl-btn del btn-remove-item" title="Xóa nguyện vọng này">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    `;

    // Move Up
    const btnUp = card.querySelector('.btn-move-up');
    if (btnUp && idx > 0) {
      btnUp.addEventListener('click', () => {
        const temp = STATE.wishlist[idx];
        STATE.wishlist[idx] = STATE.wishlist[idx - 1];
        STATE.wishlist[idx - 1] = temp;
        saveWishlist();
        renderWishlist();
      });
    }

    // Move Down
    const btnDown = card.querySelector('.btn-move-down');
    if (btnDown && idx < STATE.wishlist.length - 1) {
      btnDown.addEventListener('click', () => {
        const temp = STATE.wishlist[idx];
        STATE.wishlist[idx] = STATE.wishlist[idx + 1];
        STATE.wishlist[idx + 1] = temp;
        saveWishlist();
        renderWishlist();
      });
    }

    // Remove
    const btnDel = card.querySelector('.btn-remove-item');
    if (btnDel) {
      btnDel.addEventListener('click', () => {
        STATE.wishlist.splice(idx, 1);
        saveWishlist();
        renderWishlist();
        showToast('Đã xóa nguyện vọng.', 'info');
      });
    }

    container.appendChild(card);
  });

  updateStrategyOptimizer();
}

/**
 * Đánh giá cân bằng chiến lược của danh sách nguyện vọng
 */
function updateStrategyOptimizer() {
  const total = STATE.wishlist.length;
  const adviceBox = document.getElementById('strategyAdviceBox');
  const riskyBar = document.getElementById('meterRiskyBar');
  const mediumBar = document.getElementById('meterMediumBar');
  const safeBar = document.getElementById('meterSafeBar');

  if (total === 0) {
    if (riskyBar) riskyBar.style.width = '0%';
    if (mediumBar) mediumBar.style.width = '0%';
    if (safeBar) safeBar.style.width = '0%';
    document.getElementById('meterRiskyLabel').innerText = '🔴 Thử thách: 0%';
    document.getElementById('meterMediumLabel').innerText = '🟡 Vừa sức: 0%';
    document.getElementById('meterSafeLabel').innerText = '🟢 An toàn: 0%';
    if (adviceBox) {
      adviceBox.innerHTML = '<i class="fa-solid fa-lightbulb" style="color: var(--warning); margin-right: 0.35rem;"></i> Chưa có nguyện vọng nào trong danh sách. Hãy thêm ngành để hệ thống phân tích!';
    }
    return;
  }

  let riskyCount = 0;
  let mediumCount = 0;
  let safeCount = 0;

  STATE.wishlist.forEach(item => {
    const diff = STATE.currentScore - item.score2024;
    if (diff >= 1.0) {
      safeCount++;
    } else if (diff >= -0.5) {
      mediumCount++;
    } else {
      riskyCount++;
    }
  });

  const pRisky = Math.round((riskyCount / total) * 100);
  const pMedium = Math.round((mediumCount / total) * 100);
  const pSafe = Math.round((safeCount / total) * 100);

  if (riskyBar) riskyBar.style.width = `${pRisky}%`;
  if (mediumBar) mediumBar.style.width = `${pMedium}%`;
  if (safeBar) safeBar.style.width = `${pSafe}%`;

  document.getElementById('meterRiskyLabel').innerText = `🔴 Thử thách: ${pRisky}% (${riskyCount})`;
  document.getElementById('meterMediumLabel').innerText = `🟡 Vừa sức: ${pMedium}% (${mediumCount})`;
  document.getElementById('meterSafeLabel').innerText = `🟢 An toàn: ${pSafe}% (${safeCount})`;

  // Generate Strategic Feedback
  let advice = '';
  if (safeCount === 0) {
    advice = `<strong>⚠️ Cảnh báo rủi ro cao:</strong> Danh sách của bạn chưa có nguyện vọng AN TOÀN nào! Bạn đang có nguy cơ trượt hết nếu điểm chuẩn các trường năm nay tăng. Hãy bổ sung ngay ít nhất 1-2 nguyện vọng có điểm chuẩn thấp hơn điểm của bạn từ 1.5 - 2.5 điểm để làm "phao cứu sinh".`;
  } else if (riskyCount > total * 0.6) {
    advice = `<strong>⚠️ Tỷ lệ mạo hiểm quá cao (${pRisky}%):</strong> Bạn đang đặt quá nhiều nguyện vọng có điểm chuẩn cao hơn năng lực. Hãy dồn các ngành này lên NV1, NV2 và bổ sung các ngành vừa sức ở giữa để tăng khả năng đỗ.`;
  } else if (mediumCount >= 1 && safeCount >= 1 && riskyCount >= 1) {
    advice = `<strong>🎉 Chiến lược hoàn hảo:</strong> Danh sách nguyện vọng của bạn phân bổ chuẩn chiến thuật 3 tầng (Mơ ước: ${pRisky}%, Vừa sức: ${pMedium}%, An toàn: ${pSafe}%). Bạn vừa có cơ hội chạm tay vào ngành top, vừa có mạng lưới an toàn tuyệt đối chống trượt đại học!`;
  } else {
    advice = `<strong>Đánh giá tốt:</strong> Bạn có ${safeCount} nguyện vọng an toàn và ${mediumCount} nguyện vọng vừa sức. Hãy đảm bảo rằng ngành bạn THÍCH NHẤT được xếp ở NV1 vì hệ thống sẽ dừng xét tuyển ngay khi trúng tuyển nguyện vọng trên!`;
  }

  if (adviceBox) {
    adviceBox.innerHTML = advice;
  }
}

function clearWishlist() {
  if (STATE.wishlist.length === 0) return;
  if (confirm('Bạn có chắc chắn muốn xóa toàn bộ danh sách nguyện vọng đã lưu không?')) {
    STATE.wishlist = [];
    saveWishlist();
    renderWishlist();
    renderMatches();
    renderExploreTable();
    showToast('Đã xóa toàn bộ danh sách nguyện vọng.', 'info');
  }
}

function printWishlist() {
  if (STATE.wishlist.length === 0) {
    showToast('Danh sách nguyện vọng đang trống, chưa thể in!', 'warning');
    return;
  }
  window.print();
}

/* ===================================================================
   6. MODAL & SPARKLINE TREND CHART
   =================================================================== */
function openMajorDetailModal(uni, major) {
  STATE.currentModalMajor = { uni, major };

  const modal = document.getElementById('majorDetailModal');
  if (!modal) return;

  document.getElementById('modalUniCode').innerText = uni.code;
  document.getElementById('modalUniName').innerText = `${uni.name} (${uni.city})`;
  document.getElementById('modalMajorName').innerText = major.name;
  document.getElementById('modalMajorCode').innerText = `Mã ngành: ${major.code} • Nhóm ngành: ${getCategoryName(major.category)}`;
  document.getElementById('modalCombos').innerText = major.combos.join(', ');
  document.getElementById('modalQuota').innerText = `${major.quota || 200} sinh viên`;
  document.getElementById('modalTuition').innerText = major.tuition || uni.tuitionAvg || 'Theo quy định';
  document.getElementById('modalSubCriteria').innerText = major.subCriteria || 'Xét điểm từ cao xuống thấp';
  document.getElementById('modalNote').innerText = `Ghi chú: ${major.note || 'Chương trình đào tạo chính quy chuẩn chất lượng cao.'}`;

  const link = document.getElementById('modalUniLink');
  if (link) {
    link.href = uni.website || '#';
  }

  // Calculate 3-year change
  const diff = Math.round((major.score2024 - major.score2022) * 100) / 100;
  const trendBadge = document.getElementById('modalTrendBadge');
  if (trendBadge) {
    trendBadge.innerText = `Biến động 3 năm: ${diff >= 0 ? '+' + diff.toFixed(2) : diff.toFixed(2)}đ`;
  }

  // Add Wishlist button state
  const isAdded = STATE.wishlist.some(w => w.uniCode === uni.code && w.majorCode === major.code);
  const btnModalAdd = document.getElementById('btnModalAddWishlist');
  if (btnModalAdd) {
    btnModalAdd.className = `btn-calc-action ${isAdded ? 'added' : ''}`;
    btnModalAdd.innerHTML = `<i class="fa-solid ${isAdded ? 'fa-check' : 'fa-plus'}"></i> ${isAdded ? 'Đã Trong Danh Sách NV' : 'Thêm Vào Danh Sách Nguyện Vọng'}`;
  }

  // Open modal
  modal.classList.add('active');

  // Draw Line Chart on Canvas
  setTimeout(() => {
    drawTrendChart(major);
  }, 50);
}

function closeModal() {
  const modal = document.getElementById('majorDetailModal');
  if (modal) modal.classList.remove('active');
  STATE.currentModalMajor = null;
}

/**
 * Vẽ biểu đồ đường xu hướng điểm chuẩn 3 năm 2022 -> 2023 -> 2024
 */
function drawTrendChart(major) {
  const canvas = document.getElementById('trendChartCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;

  ctx.clearRect(0, 0, w, h);

  const years = ['2022', '2023', '2024'];
  const scores = [major.score2022, major.score2023, major.score2024];

  const minScore = Math.min(...scores) - 0.8;
  const maxScore = Math.max(...scores) + 0.8;

  const paddingLeft = 40;
  const paddingRight = 40;
  const paddingTop = 30;
  const paddingBottom = 35;

  const chartW = w - paddingLeft - paddingRight;
  const chartH = h - paddingTop - paddingBottom;

  const isDark = STATE.theme === 'dark';
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const lineColor = '#4f46e5';

  // Points coordinates
  const points = scores.map((val, idx) => {
    const x = paddingLeft + (idx / (years.length - 1)) * chartW;
    const y = paddingTop + chartH - ((val - minScore) / (maxScore - minScore)) * chartH;
    return { x, y, val, year: years[idx] };
  });

  // Draw Area Gradient Fill
  const gradient = ctx.createLinearGradient(0, paddingTop, 0, h - paddingBottom);
  gradient.addColorStop(0, 'rgba(79, 70, 229, 0.35)');
  gradient.addColorStop(1, 'rgba(79, 70, 229, 0.0)');

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.lineTo(points[points.length - 1].x, h - paddingBottom);
  ctx.lineTo(points[0].x, h - paddingBottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Draw Chart Line
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Draw Points & Labels
  points.forEach(pt => {
    // Circle point
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Value text above
    ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = isDark ? '#f1f5f9' : '#0f172a';
    ctx.textAlign = 'center';
    ctx.fillText(`${pt.val.toFixed(2)}`, pt.x, pt.y - 12);

    // Year text below
    ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = textColor;
    ctx.fillText(`Năm ${pt.year}`, pt.x, h - 10);
  });
}

/* ===================================================================
   7. TOAST NOTIFICATIONS & GLOBAL EVENT LISTENERS
   =================================================================== */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';

  let icon = 'fa-circle-info';
  let color = 'var(--primary)';
  if (type === 'success') {
    icon = 'fa-circle-check';
    color = 'var(--success)';
  } else if (type === 'warning') {
    icon = 'fa-triangle-exclamation';
    color = 'var(--warning)';
  }

  toast.innerHTML = `
    <i class="fa-solid ${icon}" style="color: ${color}; font-size: 1.2rem;"></i>
    <div>${message}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function initEventListeners() {
  // Theme toggle button
  const btnTheme = document.getElementById('btnThemeToggle');
  if (btnTheme) btnTheme.addEventListener('click', toggleTheme);

  // Score Calculator buttons
  const btnCalcScores = document.getElementById('btnCalculateScores');
  if (btnCalcScores) btnCalcScores.addEventListener('click', () => {
    calculateThptScores();
    showToast('Đã tính điểm xét tuyển và xếp hạng tổ hợp thành công!', 'success');
  });

  const btnCalcHB = document.getElementById('btnCalculateHocBa');
  if (btnCalcHB) btnCalcHB.addEventListener('click', calculateHocBaScores);

  const btnCalcDgnl = document.getElementById('btnCalculateDgnl');
  if (btnCalcDgnl) btnCalcDgnl.addEventListener('click', calculateDgnlScores);

  const btnApplyIelts = document.getElementById('btnApplyIeltsToCalc');
  if (btnApplyIelts) btnApplyIelts.addEventListener('click', applyIeltsToThpt);

  // Match From Calc Button
  const btnMatchFromCalc = document.getElementById('btnMatchFromCalc');
  if (btnMatchFromCalc) {
    btnMatchFromCalc.addEventListener('click', () => {
      switchTab('tab-match');
    });
  }

  // Inputs on change in THPT form (live update)
  const thptInputs = document.querySelectorAll('#form-thpt input, #form-thpt select');
  thptInputs.forEach(input => {
    input.addEventListener('change', calculateThptScores);
  });

  // Filter inputs on match tab
  const matchSearch = document.getElementById('matchSearchInput');
  if (matchSearch) matchSearch.addEventListener('input', renderMatches);

  const matchCombo = document.getElementById('matchComboSelect');
  if (matchCombo) matchCombo.addEventListener('change', renderMatches);

  const matchScore = document.getElementById('userTargetScoreInput');
  if (matchScore) matchScore.addEventListener('input', renderMatches);

  const matchRegion = document.getElementById('matchRegionSelect');
  if (matchRegion) matchRegion.addEventListener('change', renderMatches);

  const matchChance = document.getElementById('matchChanceSelect');
  if (matchChance) matchChance.addEventListener('change', renderMatches);

  // Explore Table filters
  const exploreUni = document.getElementById('exploreUniFilter');
  if (exploreUni) exploreUni.addEventListener('change', renderExploreTable);

  const exploreSearch = document.getElementById('exploreSearchInput');
  if (exploreSearch) exploreSearch.addEventListener('input', renderExploreTable);

  // Wishlist Tools
  const btnClearWish = document.getElementById('btnClearWishlist');
  if (btnClearWish) btnClearWish.addEventListener('click', clearWishlist);

  const btnPrintWish = document.getElementById('btnPrintWishlist');
  if (btnPrintWish) btnPrintWish.addEventListener('click', printWishlist);

  // Modal close buttons
  const btnCloseModal = document.getElementById('btnCloseModal');
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);

  const modalOverlay = document.getElementById('majorDetailModal');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  // Modal Add Wishlist button
  const btnModalAddWish = document.getElementById('btnModalAddWishlist');
  if (btnModalAddWish) {
    btnModalAddWish.addEventListener('click', () => {
      if (STATE.currentModalMajor) {
        toggleWishlistItem(STATE.currentModalMajor.uni, STATE.currentModalMajor.major, btnModalAddWish);
      }
    });
  }

  // Esc key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}
