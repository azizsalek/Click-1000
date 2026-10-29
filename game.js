(() => {
  "use strict";
  const SAVE_KEY = "click1000-save-v1";
  const MAX_OFFLINE_SECONDS = 8 * 60 * 60;
  const initialState = {
    coins: 0, totalClicks: 0, clickPower: 1,
    clickUpgrade: 0, autoUpgrade: 0, sound: true, lastSavedAt: Date.now()
  };
  let state = loadState();
  let toastTimer;
  let audioContext;

  const $ = (id) => document.getElementById(id);
  const ui = {
    coins: $("coins"), totalClicks: $("total-clicks"), clickPower: $("click-power"),
    level: $("level"), progressLabel: $("progress-label"), progressBar: $("progress-bar"),
    clickUpgradeLevel: $("click-upgrade-level"), autoUpgradeLevel: $("auto-upgrade-level"),
    clickUpgradeCost: $("click-upgrade-cost"), autoUpgradeCost: $("auto-upgrade-cost"),
    autoIncome: $("auto-income"), target: $("click-target"), tip: $("tip"),
    clickUpgrade: $("upgrade-click"), autoUpgrade: $("upgrade-auto"),
    soundToggle: $("sound-toggle"), resetButton: $("reset-button"), toast: $("toast")
  };

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!saved || typeof saved !== "object") return { ...initialState };
      const number = (value, fallback, max = Number.MAX_SAFE_INTEGER) =>
        Number.isFinite(Number(value)) ? Math.min(max, Math.max(0, Number(value))) : fallback;
      return {
        coins: number(saved.coins, 0),
        totalClicks: number(saved.totalClicks, 0),
        clickPower: Math.max(1, number(saved.clickPower, 1)),
        clickUpgrade: number(saved.clickUpgrade, 0, 1000),
        autoUpgrade: number(saved.autoUpgrade, 0, 1000),
        sound: typeof saved.sound === "boolean" ? saved.sound : true,
        lastSavedAt: number(saved.lastSavedAt, Date.now())
      };
    } catch (_) { return { ...initialState }; }
  }

  function save() {
    state.lastSavedAt = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (_) {}
  }
  function format(number) { return Math.floor(number).toLocaleString("en-US"); }
  function clickCost() { return Math.floor(25 * Math.pow(1.65, state.clickUpgrade)); }
  function autoCost() { return Math.floor(50 * Math.pow(1.7, state.autoUpgrade)); }
  function level() { return Math.floor(state.totalClicks / 100) + 1; }

  function applyOfflineEarnings() {
    const elapsed = Math.max(0, Math.min(MAX_OFFLINE_SECONDS, (Date.now() - state.lastSavedAt) / 1000));
    const earned = Math.floor(elapsed * state.autoUpgrade);
    if (earned > 0) {
      state.coins += earned;
      showToast("مرحباً بعودتك! ربحت " + format(earned) + " عملة أثناء غيابك. ✨");
    }
    state.lastSavedAt = Date.now();
  }

  function render() {
    ui.coins.textContent = format(state.coins);
    ui.totalClicks.textContent = format(state.totalClicks);
    ui.clickPower.textContent = format(state.clickPower);
    ui.level.textContent = "المستوى " + format(level());
    const progress = state.totalClicks % 100;
    ui.progressLabel.textContent = format(progress) + " / 100";
    ui.progressBar.style.width = progress + "%";
    ui.clickUpgradeLevel.textContent = "المستوى " + state.clickUpgrade;
    ui.autoUpgradeLevel.textContent = "المستوى " + state.autoUpgrade;
    ui.clickUpgradeCost.textContent = format(clickCost());
    ui.autoUpgradeCost.textContent = format(autoCost());
    ui.autoIncome.textContent = format(state.autoUpgrade);
    ui.clickUpgrade.disabled = state.coins < clickCost();
    ui.autoUpgrade.disabled = state.coins < autoCost();
    ui.soundToggle.textContent = state.sound ? "♫" : "♪̸";
    ui.soundToggle.style.color = state.sound ? "#d9d0ff" : "#77738f";
    const tips = [
      "كل نقرة تمنحك عملة واحدة.",
      "اكسب العملات تلقائياً حتى عندما تغلق اللعبة!",
      "كل 100 نقرة ترفع مستواك!",
      "طوّر قوة النقرة لتجمع العملات أسرع."
    ];
    ui.tip.textContent = tips[Math.min(3, Math.floor(state.totalClicks / 100) % 4)];
  }

  function showToast(message) {
    ui.toast.textContent = message;
    ui.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ui.toast.classList.remove("show"), 2600);
  }

  function playTone(frequency = 620) {
    if (!state.sound) return;
    try {
      audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      gain.gain.setValueAtTime(0.045, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.09);
      oscillator.connect(gain); gain.connect(audioContext.destination);
      oscillator.start(); oscillator.stop(audioContext.currentTime + 0.09);
    } catch (_) {}
  }

  function particle(x, y, value) {
    const el = document.createElement("span");
    el.textContent = "+" + format(value);
    el.setAttribute("aria-hidden", "true");
    el.style.cssText = "position:fixed;z-index:20;pointer-events:none;font:700 16px Inter,sans-serif;color:#ffe29a;text-shadow:0 0 12px #eabfff;left:" + x + "px;top:" + y + "px;transform:translate(-50%,-50%);transition:transform .7s ease,opacity .7s ease";
    document.body.appendChild(el);
    requestAnimationFrame(() => {
      el.style.transform = "translate(-50%,-85px) scale(1.15)";
      el.style.opacity = "0";
    });
    setTimeout(() => el.remove(), 750);
  }

  ui.target.addEventListener("click", (event) => {
    const previousLevel = level();
    state.coins += state.clickPower;
    state.totalClicks += 1;
    const rect = ui.target.getBoundingClientRect();
    particle(event.clientX || rect.left + rect.width / 2, event.clientY || rect.top + rect.height / 2, state.clickPower);
    ui.target.classList.add("pressed");
    setTimeout(() => ui.target.classList.remove("pressed"), 100);
    playTone(520 + Math.min(state.clickPower * 8, 700));
    render();
    save();
    if (level() > previousLevel) showToast("رائع! وصلت إلى المستوى " + format(level()) + " 🎉");
  });

  ui.clickUpgrade.addEventListener("click", () => {
    const cost = clickCost();
    if (state.coins < cost) return showToast("تحتاج إلى " + format(cost - state.coins) + " عملة إضافية.");
    state.coins -= cost;
    state.clickUpgrade += 1;
    state.clickPower += 1;
    playTone(780); render(); save(); showToast("تم تطوير قوة النقرة! ⚡");
  });

  ui.autoUpgrade.addEventListener("click", () => {
    const cost = autoCost();
    if (state.coins < cost) return showToast("تحتاج إلى " + format(cost - state.coins) + " عملة إضافية.");
    state.coins -= cost;
    state.autoUpgrade += 1;
    playTone(700); render(); save(); showToast("النقر التلقائي أصبح أقوى! ⟳");
  });

  ui.soundToggle.addEventListener("click", () => {
    state.sound = !state.sound;
    render(); save();
    showToast(state.sound ? "تم تشغيل الصوت." : "تم إيقاف الصوت.");
    if (state.sound) playTone();
  });

  ui.resetButton.addEventListener("click", () => {
    if (!window.confirm("هل تريد إعادة اللعبة من البداية؟ سيتم حذف تقدمك المحفوظ.")) return;
    state = { ...initialState, lastSavedAt: Date.now() };
    save(); render(); showToast("بدأت مغامرة جديدة! ✦");
  });

  applyOfflineEarnings();
  setInterval(() => {
    if (state.autoUpgrade > 0) {
      state.coins += state.autoUpgrade;
      render();
      save();
    }
  }, 1000);
  setInterval(save, 5000);
  window.addEventListener("pagehide", save);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") save();
  });
  render();
  save();
})();