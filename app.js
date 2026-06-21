(function () {
  "use strict";

  const CDN_BASE = "https://xinxiang-prod-d4g5phsz18ced9f57-1438399057.tcloudbaseapp.com";
  const QR_CODE_ASSET = "./assets/qrcode/xinxiang-shicheng.jpg";
  const BRAND_LOGO_ASSET = "./assets/qrcode/xinxiang-logo-full-dark.png";
  const THEME_VERSION = "20260614-theme-bg-v2";
  const DAY_MS = 24 * 60 * 60 * 1000;
  const DAY_PILLAR_ANCHOR = { date: "1999-06-19", ganzhiName: "壬寅" };
  const STORAGE_KEY = "xinxiang:web:userState";
  const HISTORY_KEY = "xinxiang:web:history";
  const BLESSING_KEY = "xinxiang:web:blessings";
  const app = document.getElementById("app");

  const WISH_THEME_PAGES = [
    {
      id: "taohua",
      title: "桃花愿望",
      painLine1: "那些甜蜜、美满、幸福",
      painLine2: "有时也需要一点对的时机",
      desc: "我们生成的愿望祝符，能够将你的生辰甲子，融入今年最能够实现桃花愿望的能量中，为你的愿望持续加持。",
      target: "给想谈一场恋爱，想遇见另一半，想被看见、被靠近、被认真喜欢的你，增加实现桃花愿望的可能性。",
      buttonText: "生成桃花愿望祝符"
    },
    {
      id: "wealth",
      title: "财富愿望",
      painLine1: "你的努力、奋斗、坚持",
      painLine2: "也需要一点顺势而来的机缘",
      desc: "我们生成的愿望祝符，能够将你的生辰甲子，融入今年最能够实现财富愿望的能量中，为你的愿望持续加持。",
      target: "给想抓住机会、改善收入、让生活更有底气的你，增加实现财富愿望的可能性。",
      buttonText: "生成财富愿望祝符"
    },
    {
      id: "career",
      title: "事业愿望",
      painLine1: "那些迷茫、瓶颈、不甘",
      painLine2: "有时也需要一点照亮前路的方向",
      desc: "我们生成的愿望祝符，能够将你的生辰甲子，融入今年最能够实现事业愿望的能量中，为你的愿望持续加持。",
      target: "给想突破瓶颈、看清方向、推进目标、让努力被看见的你，增加实现事业愿望的可能性。",
      buttonText: "生成事业愿望祝符"
    }
  ];

  const FALLBACK_THEME_BLESSING = {
    taohua: "愿你在新的相遇里，被温柔看见，也被真心回应。",
    wealth: "愿你看见自己的价值，也接住正在靠近你的机会。",
    career: "愿你把方向走稳，让每一步都成为更清楚的进展。",
    default: "愿你在这一年的路上，被好运照见，也被自己的选择托住。"
  };

  const state = {
    data: null,
    blessingMap: {},
    step: "home",
    selectedThemeId: "taohua",
    themeIndex: 0,
    birthday: "",
    birthdayDisplay: "",
    result: null,
    isUnlocked: false,
    sentenceBlessingSent: false,
    ownerId: ""
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function loadCommonJs(text, exportName) {
    const module = { exports: {} };
    const exports = module.exports;
    Function("module", "exports", text)(module, exports);
    return exportName ? module.exports[exportName] : module.exports;
  }

  async function loadData() {
    if (window.XINXIANG_DATA && window.THEME_BLESSING_MAP) {
      state.data = window.XINXIANG_DATA;
      state.blessingMap = window.THEME_BLESSING_MAP;
      hydrateResultAssets();
      return;
    }

    const [dataText, blessingText] = await Promise.all([
      fetch("../miniprogram/data.js").then((res) => res.text()),
      fetch("../miniprogram/data/theme_blessing_config.js").then((res) => res.text())
    ]);
    state.data = loadCommonJs(dataText, "XINXIANG_DATA");
    state.blessingMap = loadCommonJs(blessingText, "THEME_BLESSING_MAP");
    hydrateResultAssets();
  }

  function hydrateResultAssets() {
    const assets = Array.isArray(state.data.assets) ? state.data.assets : [];
    const assetMap = new Map(assets.map((asset) => [asset.resultId, asset]));
    state.data.results = state.data.results.map((result) => {
      const asset = assetMap.get(result.resultId) || {};
      const imageUrl = asset.imageHdUrl || asset.imageResultPageUrl || asset.imageBlurUrl || `${CDN_BASE}/charm/${result.resultId}.jpg`;
      return {
        ...result,
        ...asset,
        imageUrl,
        imageHdUrl: asset.imageHdUrl || imageUrl,
        imageResultPageUrl: asset.imageResultPageUrl || imageUrl,
        imageShareCardUrl: asset.imageShareCardUrl || imageUrl,
        assetAvailable: Boolean(imageUrl)
      };
    });
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      step: state.step,
      selectedThemeId: state.selectedThemeId,
      themeIndex: state.themeIndex,
      birthday: state.birthday,
      birthdayDisplay: state.birthdayDisplay,
      resultId: state.result && state.result.resultId,
      isUnlocked: state.isUnlocked
    }));
  }

  function loadState() {
    try {
      const cached = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (!cached.resultId) return;
      const result = getResultById(cached.resultId);
      if (!result) return;
      state.step = cached.step || "home";
      state.selectedThemeId = cached.selectedThemeId || "taohua";
      state.themeIndex = cached.themeIndex || 0;
      state.birthday = cached.birthday || "";
      state.birthdayDisplay = cached.birthdayDisplay || "";
      state.result = result;
      state.isUnlocked = Boolean(cached.isUnlocked);
    } catch (error) {
      console.warn(error);
    }
  }

  function encodeSharePayload(payload) {
    const json = JSON.stringify(payload);
    const base64 = btoa(unescape(encodeURIComponent(json)));
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function decodeSharePayload(value) {
    if (!value) return null;
    try {
      const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
      return JSON.parse(decodeURIComponent(escape(atob(padded))));
    } catch (error) {
      console.warn("[share] invalid payload", error);
      return null;
    }
  }

  function applyRouteParams() {
    const params = new URLSearchParams(window.location.search);
    const payload = decodeSharePayload(params.get("share") || params.get("s"));
    const resultId = (payload && (payload.r || payload.resultId)) || params.get("resultId") || params.get("r");
    if (!resultId) return false;

    const result = getResultById(resultId);
    if (!result) return false;

    const mode = (payload && (payload.t || payload.mode)) || params.get("mode") || "bless";
    const themeIndex = WISH_THEME_PAGES.findIndex((item) => item.id === result.themeId);
    state.result = result;
    state.selectedThemeId = result.themeId;
    state.themeIndex = themeIndex >= 0 ? themeIndex : 0;
    state.ownerId = (payload && (payload.o || payload.ownerId)) || params.get("ownerId") || params.get("from") || "";

    if (mode === "public") {
      state.step = "publicResult";
      state.isUnlocked = true;
    } else if (mode === "result") {
      state.step = "result";
      state.isUnlocked = params.get("unlocked") === "1";
    } else if (mode === "invite") {
      state.step = "invite";
      state.isUnlocked = false;
    } else {
      state.step = "bless";
      state.isUnlocked = false;
    }

    return true;
  }

  function createShareUrl(mode) {
    if (!state.result) return "";
    const url = new URL(window.location.href);
    const targetFile = mode === "public" ? "charm.html" : "invite.html";
    url.pathname = url.pathname.replace(/[^/]*$/, targetFile);
    url.hash = "";
    url.search = "";
    url.searchParams.set("share", encodeSharePayload({
      v: 1,
      p: "xinxiang-shicheng",
      t: mode || "bless",
      r: state.result.resultId,
      o: state.ownerId || ""
    }));
    return url.toString();
  }

  function getTheme(themeId) {
    return state.data.themes.find((theme) => theme.id === themeId);
  }

  function getThemePage(themeId) {
    return WISH_THEME_PAGES.find((item) => item.id === themeId) || WISH_THEME_PAGES[0];
  }

  function getResultById(resultId) {
    return state.data.results.find((item) => item.resultId === resultId);
  }

  function themeBg(themeId) {
    return `${CDN_BASE}/theme/theme-${themeId}-bg.jpg?v=${THEME_VERSION}`;
  }

  function parseDateAsUtc(dateText) {
    const [year, month, day] = dateText.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  }

  function positiveModulo(value, divisor) {
    return ((value % divisor) + divisor) % divisor;
  }

  function birthdayToGanzhiId(birthday) {
    const anchorIndex = state.data.ganzhi.findIndex((ganzhi) => ganzhi.name === DAY_PILLAR_ANCHOR.ganzhiName);
    const dayOffset = Math.round((parseDateAsUtc(birthday) - parseDateAsUtc(DAY_PILLAR_ANCHOR.date)) / DAY_MS);
    const ganzhiIndex = positiveModulo(anchorIndex + dayOffset, state.data.ganzhi.length);
    return state.data.ganzhi[ganzhiIndex].id;
  }

  function formatBirthdayDisplay(birthday) {
    if (!birthday) return "";
    const [year, month, day] = birthday.split("-").map(Number);
    return `${year}年${month}月${day}日`;
  }

  function findResult(ganzhiId, themeId) {
    return state.data.results.find((item) => item.ganzhiId === ganzhiId && item.themeId === themeId);
  }

  function getThemeBlessingText(result) {
    if (!result) return FALLBACK_THEME_BLESSING.default;
    const matched = state.blessingMap[result.resultId];
    if (matched && matched.blessingText) return matched.blessingText;
    return FALLBACK_THEME_BLESSING[result.themeId] || FALLBACK_THEME_BLESSING.default;
  }

  function getReadingSections(result) {
    if (!result) return [];
    return [
      { title: "今年的能量状态", body: result.yearEnergyStatus },
      { title: "你的甲子能量解读", body: result.ganzhiBaseColor },
      { title: "你的年度愿望解读", body: result.themeStatus },
      { title: "画面能量解读", body: result.imageEnergyExplain },
      { title: "祝符给你的加持", body: result.charmBlessing },
      { title: "今年行动提醒", body: result.actionReminder }
    ].filter((section) => section.body);
  }

  function splitPreviewBody(body) {
    const content = (body || "").trim();
    if (!content) return null;
    const sentenceMatch = content.match(/^.*?[。！？]/);
    const firstSentence = sentenceMatch ? sentenceMatch[0] : content.slice(0, 36);
    return { firstSentence, restContent: content.slice(firstSentence.length).trim() };
  }

  function getLockedPreviewSections(result) {
    const unlockedPreviewTitles = ["今年的能量状态", "你的甲子能量解读"];
    return getReadingSections(result).map((section) => {
      if (unlockedPreviewTitles.includes(section.title)) {
        return { title: section.title, firstSentence: section.body.trim(), restContent: "", isUnlocked: true };
      }
      if (section.title === "今年行动提醒") {
        return { title: section.title, firstSentence: "", restContent: section.body.trim(), isUnlocked: false };
      }
      const preview = splitPreviewBody(section.body);
      return preview ? { title: section.title, ...preview, isUnlocked: false } : null;
    }).filter(Boolean);
  }

  function pushHistory(result, method) {
    const records = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    records.unshift({
      id: `${Date.now()}`,
      resultId: result.resultId,
      charmName: result.charmName,
      themeName: result.themeName,
      ganzhiName: result.ganzhiName,
      createdAt: new Date().toISOString(),
      method
    });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(records.slice(0, 20)));
  }

  function topbar(title, showBack = true) {
    return `
      <div class="topbar">
        ${showBack ? `<button class="back-button" data-action="back" aria-label="返回">‹</button>` : `<span></span>`}
        <div class="topbar-title">${escapeHtml(title || "心象祝符")}</div>
        <button class="profile-button" data-action="history">我的</button>
      </div>
    `;
  }

  function renderHome() {
    app.innerHTML = `
      <section class="home-page">
        <img class="home-bg" src="${CDN_BASE}/home-bg.jpg" alt="" />
        <div class="home-mask"></div>
        ${topbar("心象祝符", false)}
        <section class="home-hero">
          <div class="home-hero-content" id="homeHeroContent">
            <div class="home-sigil"><span>心象</span><span>祝符</span></div>
            <div class="home-main-copy">
              <div>我们依据你的甲子能量</div>
              <div>结合今年的奇门遁甲</div>
              <div>为你最想实现的愿望</div>
              <div>绘制一张专属加持符</div>
            </div>
          </div>
          <div class="scroll-hint" id="scrollHint">
            <span>向下了解你的祝符从何而来</span>
            <span>⌄</span>
          </div>
        </section>
        <section class="subtitle-section">
          <div class="subtitle-title">为什么祝符与你有关？</div>
          <div class="subtitle-list">
            <div class="subtitle-item">60甲子，也称为60甲子循环纪年/干支纪年，是纪年周期为60年的中国传统的<span style="display:inline-block;white-space:nowrap">历法体系</span></div>
            <div class="subtitle-item">每个人的出生日期，都会落在60年一循环的其中一年里，对应<span style="display:inline-block;white-space:nowrap">其中的一甲子</span></div>
            <div class="subtitle-item">我们把它作为绘制祝符的基础，让你的祝符不只是一个愿望图，而是与你的生辰、当下年份和<span style="display:inline-block;white-space:nowrap">愿望方向有关</span></div>
            <div class="subtitle-item">我们熟悉的辛亥革命、戊戌变法等历史事件的命名，成语“花甲之年”的“甲”都是<span style="display:inline-block;white-space:nowrap">因此而来</span></div>
          </div>
        </section>
        <div class="bottom-cta" id="homeCta"><button data-action="go-theme">前往选择愿望方向</button></div>
      </section>
    `;
    window.scrollTo(0, 0);
    const subtitles = [...document.querySelectorAll(".subtitle-item")];
    const onScroll = () => {
      const scrollTop = window.scrollY || 0;
      document.getElementById("scrollHint").classList.toggle("is-hidden", scrollTop > 24);
      document.getElementById("homeHeroContent").classList.toggle("is-hidden", scrollTop > 24);
      subtitles.forEach((item, index) => item.classList.toggle("is-visible", scrollTop > 320 + index * 170));
      document.getElementById("homeCta").classList.toggle("is-visible", scrollTop > 760);
    };
    window.onscroll = onScroll;
    onScroll();
  }

  function renderTheme() {
    window.onscroll = null;
    const item = WISH_THEME_PAGES[state.themeIndex];
    state.selectedThemeId = item.id;
    app.innerHTML = `
      ${topbar("选择愿望方向")}
      <section class="step wish-step">
        <div class="theme-slide theme-${item.id}">
          <img class="theme-bg" src="${themeBg(item.id)}" alt="${escapeHtml(item.title)}" />
          <div class="theme-mask"></div>
          <div class="theme-content">
            <span class="theme-title">${escapeHtml(item.title)}</span>
            <div class="theme-pain">
              <span>${escapeHtml(item.painLine1)}</span>
              <strong>${escapeHtml(item.painLine2)}</strong>
            </div>
            <span class="theme-desc">${escapeHtml(item.desc)}</span>
            <span class="theme-target">${escapeHtml(item.target)}</span>
          </div>
        </div>
        <div class="theme-control">
          <button class="primary" data-action="go-birthday">${escapeHtml(item.buttonText)}</button>
          <div class="theme-dots">
            ${WISH_THEME_PAGES.map((dot, index) => `<span class="dot ${index === state.themeIndex ? "is-active" : ""}" data-action="switch-theme" data-index="${index}"></span>`).join("")}
          </div>
        </div>
      </section>
    `;
    window.scrollTo(0, 0);
  }

  function renderBirthday() {
    window.onscroll = null;
    const today = "2026-12-31";
    app.innerHTML = `
      ${topbar("出生日期")}
      <section class="step">
        <div class="form-card">
          <span class="field-label">出生日期</span>
          <span class="result-subtitle">请选择你的出生年月日</span>
          <input class="date-input" id="birthdayInput" type="date" min="1900-01-01" max="${today}" value="${escapeHtml(state.birthday)}" />
          <div class="actions">
            <button class="primary" data-action="generate">生成我的愿望祝符</button>
            <button class="secondary" data-action="go-theme">重新选择愿望方向</button>
          </div>
        </div>
      </section>
    `;
  }

  function renderLoading() {
    app.innerHTML = `
      ${topbar("生成中")}
      <section class="step loading-card">
        <div>
          <div class="loader"></div>
          <p class="flow-title" style="margin-top:24px">正在生成你的年度心象祝符</p>
          <p class="flow-copy">正在校准生辰甲子、年度能量与愿望方向。</p>
        </div>
      </section>
    `;
    setTimeout(() => {
      state.step = "result";
      state.isUnlocked = false;
      saveState();
      render();
    }, 1200);
  }

  function charmVisual(result, locked) {
    return `
      <div class="charm-visual ${locked ? "is-locked" : "is-unlocked"}">
        <img src="${escapeHtml(result.imageResultPageUrl || result.imageHdUrl || result.imageBlurUrl)}" alt="${escapeHtml(result.charmName)}" />
        ${locked ? `<div class="veil"><span>祝符已生成</span><strong>高清祝符待解锁</strong></div>` : ""}
      </div>
    `;
  }

  function themeBlessingCard(result, locked) {
    const titleMap = { taohua: "你的桃花专属祝福", wealth: "你的财富专属祝福", career: "你的事业专属祝福" };
    return `
      <div class="theme-blessing-card">
        <span class="theme-blessing-title">${escapeHtml(titleMap[result.themeId] || "你的专属祝福")}</span>
        <span class="theme-blessing-text">「${escapeHtml(getThemeBlessingText(result))}」</span>
        ${locked ? `<span class="result-subtitle">解锁后，查看这份专属祝福背后的完整年度指引。</span>` : ""}
      </div>
    `;
  }

  function contactFooter() {
    return `
      <div class="contact-card result-contact-card">
        <img class="contact-qrcode" src="${QR_CODE_ASSET}" alt="心象微信公众号二维码" />
        <span class="contact-copy">你可以通过这个二维码找到我们</span>
        <img class="contact-logo" src="${BRAND_LOGO_ASSET}" alt="心象" />
      </div>
    `;
  }

  function renderLockedResult(result) {
    const previews = getLockedPreviewSections(result);
    app.innerHTML = `
      ${topbar("心象祝符")}
      <section class="step">
        <div class="locked-result-module">
          ${charmVisual(result, true)}
          <div class="locked-result-content">
            <span class="result-title">你的祝符已经生成</span>
            <span class="result-subtitle">高清祝符和完整解读正在等待加持解锁。</span>
            ${state.birthdayDisplay ? `<div class="birthday-chip"><span>生日信息</span><strong style="float:right">${escapeHtml(state.birthdayDisplay)}</strong></div>` : ""}
            ${themeBlessingCard(result, true)}
            <div class="meta-grid">
              <div class="meta-cell"><span>年度</span><strong>${escapeHtml(result.yearName)}</strong></div>
              <div class="meta-cell"><span>状态</span><strong>已生成，未解锁</strong></div>
            </div>
            <div class="unlock-preview-list">
              ${previews.map((item) => `
                <div class="unlock-preview-item">
                  <span class="preview-section-title">${escapeHtml(item.title)}</span>
                  ${item.firstSentence ? `<span class="preview-first">${escapeHtml(item.firstSentence)}</span>` : ""}
                  ${item.restContent && !item.isUnlocked ? `<span class="preview-rest" style="filter:blur(5px);opacity:.58">${escapeHtml(item.restContent)}</span>` : ""}
                  ${!item.isUnlocked ? `<span class="result-subtitle">解锁后查看完整内容</span>` : ""}
                </div>
              `).join("")}
            </div>
          </div>
        </div>
        <div class="actions">
          <button class="primary" data-action="invite">转发给朋友帮我解锁</button>
          <button class="secondary" data-action="restart">再选择一个愿望方向</button>
        </div>
      </section>
    `;
  }

  function renderUnlockedResult(result) {
    const sections = getReadingSections(result);
    app.innerHTML = `
      ${topbar("心象祝符")}
      <section class="step">
        <div class="result-card unlocked">
          ${charmVisual(result, false)}
          <span class="eyebrow">年度心象祝符</span>
          <span class="result-title">${escapeHtml(result.ganzhiName)}·${escapeHtml(result.charmName)}</span>
          <span class="result-subtitle">${escapeHtml(result.ganzhiName)}${escapeHtml(result.yearName)}${escapeHtml(result.themeName)}心象祝符</span>
          ${themeBlessingCard(result, false)}
          <div class="meta-grid">
            <div class="meta-cell"><span>年度</span><strong>${escapeHtml(result.yearName)}</strong></div>
            <div class="meta-cell"><span>状态</span><strong>已解锁</strong></div>
          </div>
          <span class="short-text">${escapeHtml(result.themeStatus || result.shortText || "")}</span>
          <div class="reading">
            ${sections.map((item) => `
              <div class="reading-section">
                <span class="reading-title">${escapeHtml(item.title)}</span>
                <span class="reading-body">${escapeHtml(item.body)}</span>
              </div>
            `).join("")}
          </div>
          <div class="archive-entry" data-action="share-public-link">
            <span class="theme-blessing-title">分享这张祝符</span>
            <span class="result-subtitle">复制一个可在网页直接打开的公开祝符链接。</span>
          </div>
          ${contactFooter()}
        </div>
        <div class="actions">
          <button class="primary" data-action="download-image">保存祝符图</button>
          <button class="secondary" data-action="restart">再选择一个愿望方向</button>
        </div>
      </section>
    `;
  }

  function renderInvite() {
    const result = state.result;
    const blessUrl = createShareUrl("bless");
    app.innerHTML = `
      ${topbar("好友祝福解锁")}
      <section class="step">
        <div class="flow-card">
          <span class="kicker">好友祝福解锁</span>
          <span class="flow-title">我的${escapeHtml(result.ganzhiName)}·${escapeHtml(result.charmName)}加载中</span>
          <div class="meta-grid">
            <div class="meta-cell"><span>祝福进度</span><strong>0/3</strong></div>
            <div class="meta-cell"><span>方式</span><strong>网页模拟</strong></div>
          </div>
          <span class="flow-copy">还需要 3 位好友的加持即可解锁。</span>
        </div>
        <div class="share-link-card">
          <span class="share-link-title">心象事成邀请链接</span>
          <span class="share-link-copy">把这张邀请发给朋友，朋友打开后会直接进入你的祝符加持页。</span>
          <input class="share-link-input" id="blessShareInput" readonly value="${escapeHtml(blessUrl)}" data-action="select-share-link" />
        </div>
        <div class="actions">
          <button class="primary" data-action="share-bless-link">分享/复制加持链接</button>
          <button class="secondary" data-action="preview-bless-link">预览好友加持页</button>
          <button class="secondary" data-action="result">返回未解锁页</button>
        </div>
      </section>
    `;
  }

  function renderBless() {
    const result = state.result;
    app.innerHTML = `
      ${topbar("好友加持邀请")}
      <section class="step">
        <div class="bless-card">
          <img class="bless-share-image" src="${escapeHtml(result.imageShareCardUrl || result.imageResultPageUrl)}" alt="" />
          <span class="kicker">好友加持邀请</span>
          <span class="flow-title">${escapeHtml(result.ganzhiName)}·${escapeHtml(result.charmName)}</span>
          <span class="flow-copy">TA 正在解锁这张年度${escapeHtml(result.themeName)}心象祝符。点亮一次祝福，帮 TA 让祝符更接近完整显影。</span>
        </div>
        <div class="actions">
          <button class="primary" data-action="complete-bless">为 TA 加持祝符</button>
          <button class="secondary" data-action="restart">我也生成心象祝符</button>
        </div>
      </section>
    `;
  }

  function renderPublicResult() {
    const result = state.result;
    const blessings = JSON.parse(localStorage.getItem(BLESSING_KEY) || "[]").filter((item) => item.resultId === result.resultId);
    app.innerHTML = `
      ${topbar("公开祝符")}
      <section class="step" style="padding-bottom:110px">
        <div class="public-card">
          ${charmVisual(result, false)}
          <span class="kicker">TA 的${escapeHtml(result.themeName)}祝符</span>
          <span class="result-title">${escapeHtml(result.charmName)}</span>
          <span class="theme-blessing-text">「${escapeHtml(result.blessingSentence || getThemeBlessingText(result))}」</span>
          ${blessings.length ? `<div class="reading">${blessings.map((item) => `<div class="reading-section"><span class="reading-body">${escapeHtml(item.text)}</span></div>`).join("")}</div>` : ""}
        </div>
        <div class="actions">
          <button class="secondary" data-action="restart">我也生成心象祝符</button>
        </div>
      </section>
      <div class="public-blessing-dock">
        <input id="blessingInput" placeholder="送 TA 一句祝福，会化成弹幕出现" />
        <button data-action="send-blessing">发送</button>
      </div>
    `;
  }

  function renderHistory() {
    const records = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    app.innerHTML = `
      ${topbar("我的")}
      <section class="step">
        <div class="history-card">
          <span class="flow-title">我的祝符记录</span>
          <span class="flow-copy">网页版本记录会保存在当前浏览器。</span>
          <div class="history-list">
            ${records.length ? records.map((item) => `<div class="history-item"><strong>${escapeHtml(item.charmName)}</strong><span>${escapeHtml(item.ganzhiName)} · ${escapeHtml(item.themeName)} · ${new Date(item.createdAt).toLocaleDateString()}</span></div>`).join("") : `<div class="history-item"><strong>暂无祝符记录</strong><span>生成并解锁后会出现在这里。</span></div>`}
          </div>
        </div>
      </section>
    `;
  }

  function render() {
    saveState();
    document.body.className = `page-${state.step}`;
    if (state.step === "home") return renderHome();
    if (state.step === "theme") return renderTheme();
    if (state.step === "birthday") return renderBirthday();
    if (state.step === "loading") return renderLoading();
    if (state.step === "result") return state.isUnlocked ? renderUnlockedResult(state.result) : renderLockedResult(state.result);
    if (state.step === "invite") return renderInvite();
    if (state.step === "bless") return renderBless();
    if (state.step === "publicResult") return renderPublicResult();
    if (state.step === "history") return renderHistory();
    renderHome();
  }

  function toast(text) {
    const node = document.createElement("div");
    node.className = "toast";
    node.textContent = text;
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 1800);
  }

  async function copyText(text) {
    if (!text) return false;
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.left = "-9999px";
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand("copy");
    input.remove();
    return copied;
  }

  async function shareOrCopyLink(mode) {
    const url = createShareUrl(mode);
    if (!url) return;
    const title = mode === "public" ? "我的心象祝符" : "帮我加持心象祝符";
    const text = mode === "public" ? "打开查看这张年度心象祝符。" : "打开链接，帮我为这张心象祝符添一份加持。";

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
      await copyText(url);
      toast("链接已复制");
    } catch (error) {
      console.warn(error);
      window.prompt("复制这个链接分享给朋友", url);
    }
  }

  function selectShareLink() {
    const input = document.getElementById("blessShareInput");
    if (!input) return;
    input.focus();
    input.select();
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
  }

  function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
    const lines = [];
    let current = "";
    Array.from(text || "").forEach((char) => {
      const next = current + char;
      if (ctx.measureText(next).width > maxWidth && current) {
        lines.push(current);
        current = char;
        return;
      }
      current = next;
    });
    if (current) lines.push(current);
    lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
    return y + lines.length * lineHeight;
  }

  function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function drawContainedImage(ctx, image, x, y, width, height) {
    const scale = Math.min(width / image.width, height / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
  }

  function drawQrFooter(ctx, qrImage, logoImage, x, y, width) {
    const footerHeight = 230;
    const qrSize = 148;
    const logoWidth = 68;
    const logoHeight = 152;
    roundRect(ctx, x, y, width, footerHeight, 8);
    ctx.fillStyle = "rgba(58, 58, 58, 0.40)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
    ctx.stroke();

    const qrX = x + 28;
    const qrY = y + 40;
    roundRect(ctx, qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 6);
    ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
    ctx.fill();
    ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

    drawContainedImage(ctx, logoImage, x + width - logoWidth - 44, y + (footerHeight - logoHeight) / 2, logoWidth, logoHeight);

    const copyX = qrX + qrSize + 34;
    ctx.fillStyle = "#f1c76f";
    ctx.font = "700 30px serif";
    ctx.fillText("心象事成", copyX, y + 54);
    ctx.fillStyle = "rgba(255, 255, 255, 0.76)";
    ctx.font = "23px sans-serif";
    ctx.fillText("长按识别二维码", copyX, y + 102);
    ctx.fillText("继续接收年度心象祝福", copyX, y + 138);
  }

  async function downloadCharmPoster() {
    const result = state.result;
    if (!result) return;
    toast("正在生成图片");
    const [charmImage, qrImage, logoImage] = await Promise.all([
      loadImage(result.imageHdUrl || result.imageResultPageUrl || result.imageUrl),
      loadImage(QR_CODE_ASSET),
      loadImage(BRAND_LOGO_ASSET)
    ]);
    const canvas = document.createElement("canvas");
    const width = 900;
    const pagePadding = 34;
    const cardPadding = 30;
    const contentX = pagePadding + cardPadding;
    const contentWidth = width - pagePadding * 2 - cardPadding * 2;
    const imageHeight = Math.round(contentWidth * (charmImage.height / charmImage.width));
    const titleLineHeight = 58;
    const subtitleLineHeight = 38;
    const imageBottomGap = 34;
    const titleToSubtitleGap = 16;
    const footerTopGap = 34;
    const footerHeight = 230;
    const footerBottomReserve = 20;
    const ctx = canvas.getContext("2d");
    ctx.font = "700 44px serif";
    const titleLines = [];
    let current = "";
    Array.from(`${result.ganzhiName} · ${result.charmName}`).forEach((char) => {
      const next = current + char;
      if (ctx.measureText(next).width > contentWidth && current) {
        titleLines.push(current);
        current = char;
        return;
      }
      current = next;
    });
    if (current) titleLines.push(current);
    const posterHeight =
      pagePadding + cardPadding +
      imageHeight + imageBottomGap +
      titleLines.length * titleLineHeight + titleToSubtitleGap + subtitleLineHeight +
      footerTopGap + footerHeight + footerBottomReserve +
      cardPadding + pagePadding;
    canvas.width = width;
    canvas.height = posterHeight;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, posterHeight);
    const gradient = ctx.createLinearGradient(0, 0, width, posterHeight);
    gradient.addColorStop(0, "#000000");
    gradient.addColorStop(0.52, "#070707");
    gradient.addColorStop(1, "#000000");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, posterHeight);
    roundRect(ctx, pagePadding, pagePadding, width - pagePadding * 2, posterHeight - pagePadding * 2, 10);
    ctx.fillStyle = "rgba(24, 24, 24, 0.94)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.34)";
    ctx.lineWidth = 2;
    ctx.stroke();

    let y = pagePadding + cardPadding;
    ctx.drawImage(charmImage, contentX, y, contentWidth, imageHeight);
    y += imageHeight + imageBottomGap;
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 44px serif";
    y = drawWrappedText(ctx, `${result.ganzhiName} · ${result.charmName}`, contentX, y, contentWidth, titleLineHeight) + titleToSubtitleGap;
    ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
    ctx.font = "26px sans-serif";
    y = drawWrappedText(ctx, `${result.yearName}${result.themeName}心象祝符`, contentX, y, contentWidth, subtitleLineHeight);
    drawQrFooter(ctx, qrImage, logoImage, contentX, y + footerTopGap, contentWidth);

    const link = document.createElement("a");
    link.download = `${result.ganzhiName}-${result.charmName}-心象祝符.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 0.94);
    link.click();
    toast("图片已生成");
  }

  function generateResult() {
    const input = document.getElementById("birthdayInput");
    const birthday = input && input.value;
    if (!birthday) {
      toast("请先选择出生日期");
      return;
    }
    state.birthday = birthday;
    state.birthdayDisplay = formatBirthdayDisplay(birthday);
    const result = findResult(birthdayToGanzhiId(birthday), state.selectedThemeId);
    if (!result) {
      toast("暂未找到对应祝符");
      return;
    }
    state.result = result;
    state.isUnlocked = false;
    state.step = "loading";
    render();
  }

  function sendBlessing() {
    const input = document.getElementById("blessingInput");
    const text = input && input.value.trim();
    if (!text) {
      toast("先写一句祝福");
      return;
    }
    const records = JSON.parse(localStorage.getItem(BLESSING_KEY) || "[]");
    records.unshift({ resultId: state.result.resultId, text, createdAt: new Date().toISOString() });
    localStorage.setItem(BLESSING_KEY, JSON.stringify(records.slice(0, 30)));
    toast("祝福已送达");
    renderPublicResult();
  }

  function handleAction(action, target) {
    if (action === "go-theme") {
      state.step = "theme";
      return render();
    }
    if (action === "switch-theme") {
      state.themeIndex = Number(target.dataset.index || 0);
      state.selectedThemeId = WISH_THEME_PAGES[state.themeIndex].id;
      return render();
    }
    if (action === "go-birthday") {
      state.step = "birthday";
      return render();
    }
    if (action === "generate") return generateResult();
    if (action === "invite") {
      state.step = "invite";
      return render();
    }
    if (action === "public-share" || action === "preview-bless-link") {
      state.step = "bless";
      return render();
    }
    if (action === "share-bless-link") return shareOrCopyLink("bless");
    if (action === "share-public-link") return shareOrCopyLink("public");
    if (action === "select-share-link") return selectShareLink();
    if (action === "complete-bless") {
      toast("已为 TA 添一份加持");
      state.step = "publicResult";
      return render();
    }
    if (action === "send-blessing") return sendBlessing();
    if (action === "download-image" && state.result) {
      downloadCharmPoster().catch((error) => {
        console.warn(error);
        window.open(state.result.imageHdUrl || state.result.imageResultPageUrl, "_blank", "noopener");
      });
      return;
    }
    if (action === "restart") {
      state.step = "theme";
      state.isUnlocked = false;
      return render();
    }
    if (action === "result") {
      state.step = "result";
      return render();
    }
    if (action === "history") {
      state.step = "history";
      return render();
    }
    if (action === "back") return goBack();
  }

  function goBack() {
    if (state.step === "theme") state.step = "home";
    else if (state.step === "birthday") state.step = "theme";
    else if (["result", "invite", "bless", "publicResult", "history"].includes(state.step)) state.step = state.result ? "result" : "home";
    else state.step = "home";
    render();
  }

  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    handleAction(target.dataset.action, target);
  });

  loadData()
    .then(() => {
      loadState();
      applyRouteParams();
      render();
    })
    .catch((error) => {
      console.error(error);
      app.innerHTML = `<section class="boot-screen"><div class="boot-mark">心象<br />祝符</div><p>数据载入失败，请用本地服务打开 web 目录。</p></section>`;
    });
})();
