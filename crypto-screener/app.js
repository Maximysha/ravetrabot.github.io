const API_BASE = 'https://fapi.binance.com';
const WS_BASE = 'wss://fstream.binance.com/stream?streams=';
const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'];
const MAX_CARDS = 20;
const DEFAULT_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'LINKUSDT'];

const state = {
  timeframe: '5m',
  cardCount: 9,
  symbols: [],
  cards: [],
  ws: null,
  mockTimer: null,
  tvSymbol: 'BTCUSDT',
  tvWidget: null,
};

const grid = document.getElementById('grid');
const cardTemplate = document.getElementById('cardTemplate');
const timeframesEl = document.getElementById('timeframes');
const cardCountEl = document.getElementById('cardCount');
const refreshEl = document.getElementById('refreshSymbols');
const addSymbolInput = document.getElementById('addSymbolInput');
const addSymbolBtn = document.getElementById('addSymbolBtn');
const statusEl = document.getElementById('status');
const tvSymbolSelect = document.getElementById('tvSymbolSelect');

renderTimeframeButtons();
attachEvents();
bootstrap();

async function bootstrap() {
  await loadSymbols();
  populateTvSymbolSelect();
  renderTradingViewWidget();
  buildCards();
  await Promise.all(state.cards.map((card) => loadHistory(card)));
  openStream();
}

function attachEvents() {
  cardCountEl.addEventListener('change', async (e) => {
    state.cardCount = Number(e.target.value);
    buildCards();
    await Promise.all(state.cards.map((card) => loadHistory(card)));
    openStream();
  });

  refreshEl.addEventListener('click', async () => {
    await loadSymbols();
    populateTvSymbolSelect();
    renderTradingViewWidget();
    buildCards();
    await Promise.all(state.cards.map((card) => loadHistory(card)));
    openStream();
  });

  addSymbolBtn.addEventListener('click', async () => {
    await addSymbolCard(addSymbolInput.value);
  });

  addSymbolInput.addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      await addSymbolCard(addSymbolInput.value);
    }
  });

  tvSymbolSelect.addEventListener('change', () => {
    state.tvSymbol = tvSymbolSelect.value;
    renderTradingViewWidget();
  });
}

function renderTimeframeButtons() {
  timeframesEl.innerHTML = '';
  TIMEFRAMES.forEach((tf) => {
    const btn = document.createElement('button');
    btn.textContent = tf;
    btn.className = `tf-btn ${tf === state.timeframe ? 'active' : ''}`;
    btn.addEventListener('click', async () => {
      state.timeframe = tf;
      renderTimeframeButtons();
      renderTradingViewWidget();
      await Promise.all(state.cards.map((card) => loadHistory(card)));
      openStream();
    });
    timeframesEl.append(btn);
  });
}

function getTvResolution(tf) {
  const map = { '1m': '1', '5m': '5', '15m': '15', '1h': '60', '4h': '240', '1d': 'D' };
  return map[tf] || '5';
}

function toTvSymbol(symbol) {
  return `BINANCE:${symbol}.P`;
}

function populateTvSymbolSelect() {
  if (!tvSymbolSelect) return;
  tvSymbolSelect.innerHTML = '';
  state.symbols.slice(0, 120).forEach((s) => {
    const option = document.createElement('option');
    option.value = s.symbol;
    option.textContent = s.symbol;
    if (s.symbol === state.tvSymbol) option.selected = true;
    tvSymbolSelect.append(option);
  });

  if (!state.symbols.some((s) => s.symbol === state.tvSymbol) && state.symbols.length) {
    state.tvSymbol = state.symbols[0].symbol;
    tvSymbolSelect.value = state.tvSymbol;
  }
}

function renderTradingViewWidget() {
  const tvRoot = document.getElementById('tvChart');
  if (!tvRoot) return;
  tvRoot.innerHTML = '';

  if (!window.TradingView || !window.TradingView.widget) {
    tvRoot.innerHTML = '<div style="padding:16px;color:#ffd48a;">TradingView script не завантажився.</div>';
    return;
  }

  state.tvWidget = new window.TradingView.widget({
    autosize: true,
    symbol: toTvSymbol(state.tvSymbol),
    interval: getTvResolution(state.timeframe),
    timezone: 'Etc/UTC',
    theme: 'dark',
    style: '1',
    locale: 'uk',
    enable_publishing: false,
    allow_symbol_change: false,
    hide_top_toolbar: false,
    withdateranges: true,
    container_id: 'tvChart',
  });
}

async function safeFetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

function createFallbackSymbols() {
  return DEFAULT_SYMBOLS.map((symbol, index) => ({
    symbol,
    lastPrice: 100 + index * 50,
    change: 0,
    quoteVolume: 1_000_000,
  }));
}

async function loadSymbols() {
  try {
    const [info, tickers] = await Promise.all([
      safeFetchJson(`${API_BASE}/fapi/v1/exchangeInfo`),
      safeFetchJson(`${API_BASE}/fapi/v1/ticker/24hr`),
    ]);

    const tradable = new Set(
      info.symbols
        .filter((s) => s.status === 'TRADING' && s.quoteAsset === 'USDT' && s.contractType === 'PERPETUAL')
        .map((s) => s.symbol),
    );

    state.symbols = tickers
      .filter((t) => tradable.has(t.symbol))
      .sort((a, b) => Number(b.quoteVolume) - Number(a.quoteVolume))
      .map((t) => ({
        symbol: t.symbol,
        lastPrice: Number(t.lastPrice),
        change: Number(t.priceChangePercent),
        quoteVolume: Number(t.quoteVolume),
      }));

    setStatus('Підключено до Binance Futures API.', false);
  } catch (error) {
    console.error('loadSymbols fallback:', error);
    state.symbols = createFallbackSymbols();
    setStatus('Binance API недоступний у цьому середовищі. Показую fallback-графіки.', true);
  }
}

function setStatus(text, isWarning) {
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.className = isWarning ? 'status warning' : 'status';
}

function buildCards() {
  grid.innerHTML = '';
  state.cards = [];

  state.symbols.slice(0, state.cardCount).forEach((symbolInfo) => {
    const card = createCard(symbolInfo.symbol);
    updateTickerUI(card, symbolInfo);
    state.cards.push(card);
    grid.append(card.node);
  });
}

function createCard(symbol) {
  const node = cardTemplate.content.firstElementChild.cloneNode(true);
  const select = node.querySelector('.symbol-select');
  const price = node.querySelector('.price');
  const stats = node.querySelector('.stats');
  const chartContainer = node.querySelector('.chart');

  state.symbols.slice(0, 120).forEach((s) => {
    const option = document.createElement('option');
    option.value = s.symbol;
    option.textContent = s.symbol;
    if (s.symbol === symbol) option.selected = true;
    select.append(option);
  });

  const chart = LightweightCharts.createChart(chartContainer, {
    width: Math.max(chartContainer.clientWidth, 320),
    height: 230,
    layout: { background: { color: '#13172a' }, textColor: '#b8c2e8' },
    grid: {
      vertLines: { color: '#20264a' },
      horzLines: { color: '#20264a' },
    },
    rightPriceScale: { borderColor: '#2a3363' },
    timeScale: { borderColor: '#2a3363', timeVisible: true },
    crosshair: { mode: 0 },
    handleScroll: false,
    handleScale: false,
  });

  window.addEventListener('resize', () => {
    chart.applyOptions({ width: Math.max(chartContainer.clientWidth, 320), height: 230 });
  });

  const candleSeries = chart.addCandlestickSeries({
    upColor: '#00c48c',
    downColor: '#ff4d6d',
    borderVisible: false,
    wickUpColor: '#00c48c',
    wickDownColor: '#ff4d6d',
  });

  const volumeSeries = chart.addHistogramSeries({
    priceFormat: { type: 'volume' },
    priceScaleId: '',
    scaleMargins: { top: 0.82, bottom: 0 },
  });

  const card = { symbol, chart, candleSeries, volumeSeries, node, price, stats, select };
  select.addEventListener('change', async (e) => {
    card.symbol = e.target.value;
    await loadHistory(card);
    openStream();
  });

  return card;
}

async function addSymbolCard(rawSymbol) {
  const symbol = String(rawSymbol || '').trim().toUpperCase();
  if (!symbol) return;

  const ticker = state.symbols.find((item) => item.symbol === symbol);
  if (!ticker) {
    alert('Такої монети немає в списку доступних інструментів.');
    return;
  }

  if (state.cards.some((card) => card.symbol === symbol)) {
    alert('Ця монета вже додана.');
    return;
  }

  if (state.cards.length >= MAX_CARDS) {
    alert(`Максимум ${MAX_CARDS} карток одночасно.`);
    return;
  }

  if (!state.symbols.some((s) => s.symbol === symbol)) {
    state.symbols.unshift(ticker);
  }

  const card = createCard(symbol);
  updateTickerUI(card, ticker);
  state.cards.push(card);
  grid.append(card.node);

  populateTvSymbolSelect();
  await loadHistory(card);
  openStream();
  addSymbolInput.value = '';
}

function generateMockKlines(basePrice = 100, points = 220) {
  const now = Math.floor(Date.now() / 1000);
  const candles = [];
  const volumes = [];
  let lastClose = basePrice;

  for (let i = points; i > 0; i -= 1) {
    const time = now - i * 60;
    const open = lastClose;
    const delta = (Math.random() - 0.5) * basePrice * 0.01;
    const close = Math.max(0.0001, open + delta);
    const high = Math.max(open, close) * (1 + Math.random() * 0.002);
    const low = Math.min(open, close) * (1 - Math.random() * 0.002);
    const volume = 100 + Math.random() * 500;

    candles.push({ time, open, high, low, close });
    volumes.push({ time, value: volume, color: close >= open ? 'rgba(0,196,140,0.5)' : 'rgba(255,77,109,0.5)' });
    lastClose = close;
  }

  return { candles, volumes, lastClose };
}

async function loadHistory(card) {
  try {
    const klines = await safeFetchJson(`${API_BASE}/fapi/v1/klines?symbol=${card.symbol}&interval=${state.timeframe}&limit=220`);

    const candles = klines.map((k) => ({
      time: Math.floor(k[0] / 1000),
      open: Number(k[1]),
      high: Number(k[2]),
      low: Number(k[3]),
      close: Number(k[4]),
    }));

    const volumes = klines.map((k) => ({
      time: Math.floor(k[0] / 1000),
      value: Number(k[5]),
      color: Number(k[4]) >= Number(k[1]) ? 'rgba(0,196,140,0.5)' : 'rgba(255,77,109,0.5)',
    }));

    card.candleSeries.setData(candles);
    card.volumeSeries.setData(volumes);
    card.lastTime = candles.length ? candles[candles.length - 1].time : null;

    const ticker = state.symbols.find((s) => s.symbol === card.symbol);
    if (ticker) updateTickerUI(card, ticker);
  } catch (error) {
    console.error('loadHistory fallback:', card.symbol, error);
    const base = state.symbols.find((s) => s.symbol === card.symbol)?.lastPrice || 100;
    const mock = generateMockKlines(base);
    card.candleSeries.setData(mock.candles);
    card.volumeSeries.setData(mock.volumes);
    card.lastTime = mock.candles.length ? mock.candles[mock.candles.length - 1].time : null;
    card.price.textContent = mock.lastClose.toFixed(mock.lastClose > 1000 ? 2 : 4);
  }
}

function startMockRealtime() {
  stopMockRealtime();
  state.mockTimer = setInterval(() => {
    const now = Math.floor(Date.now() / 1000);
    state.cards.forEach((card) => {
      const current = Number(card.price.textContent || '100') || 100;
      const open = current;
      const close = Math.max(0.0001, open + (Math.random() - 0.5) * open * 0.003);
      const high = Math.max(open, close) * (1 + Math.random() * 0.0015);
      const low = Math.min(open, close) * (1 - Math.random() * 0.0015);

      const nextTime = card.lastTime ? Math.max(now, card.lastTime + 1) : now;
      card.lastTime = nextTime;
      card.candleSeries.update({ time: nextTime, open, high, low, close });
      card.volumeSeries.update({
        time: nextTime,
        value: 100 + Math.random() * 400,
        color: close >= open ? 'rgba(0,196,140,0.5)' : 'rgba(255,77,109,0.5)',
      });
      card.price.textContent = close.toFixed(close > 1000 ? 2 : 4);
    });
  }, 1500);
}

function stopMockRealtime() {
  if (state.mockTimer) {
    clearInterval(state.mockTimer);
    state.mockTimer = null;
  }
}

function openStream() {
  stopMockRealtime();
  if (state.ws) {
    state.ws.close();
    state.ws = null;
  }

  const streamNames = state.cards.map((card) => `${card.symbol.toLowerCase()}@kline_${state.timeframe}`);
  if (!streamNames.length) return;

  try {
    state.ws = new WebSocket(`${WS_BASE}${streamNames.join('/')}`);
  } catch (error) {
    console.error('ws init fallback:', error);
    setStatus('WebSocket недоступний. Увімкнено fallback live-режим.', true);
    startMockRealtime();
    return;
  }

  state.ws.onopen = () => setStatus('Реальний час підключено (WebSocket).', false);
  state.ws.onerror = () => {
    setStatus('Помилка WebSocket. Увімкнено fallback live-режим.', true);
    startMockRealtime();
  };
  state.ws.onclose = () => {
    if (!state.mockTimer) startMockRealtime();
  };

  state.ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    const payload = data.data;
    if (!payload?.k) return;

    const symbol = payload.s;
    const card = state.cards.find((c) => c.symbol === symbol);
    if (!card) return;

    const k = payload.k;
    const nextTime = Math.floor(k.t / 1000);
    if (card.lastTime && nextTime < card.lastTime) return;
    card.lastTime = nextTime;

    const candle = {
      time: nextTime,
      open: Number(k.o),
      high: Number(k.h),
      low: Number(k.l),
      close: Number(k.c),
    };

    card.candleSeries.update(candle);
    card.volumeSeries.update({
      time: nextTime,
      value: Number(k.v),
      color: Number(k.c) >= Number(k.o) ? 'rgba(0,196,140,0.5)' : 'rgba(255,77,109,0.5)',
    });

    card.price.textContent = Number(k.c).toFixed(Number(k.c) > 1000 ? 2 : 4);
  };
}

function updateTickerUI(card, ticker) {
  card.price.textContent = ticker.lastPrice.toFixed(ticker.lastPrice > 1000 ? 2 : 4);
  const cls = ticker.change >= 0 ? 'up' : 'down';
  const sign = ticker.change >= 0 ? '+' : '';
  card.stats.innerHTML = `
    <span>24h: <b class="${cls}">${sign}${ticker.change.toFixed(2)}%</b></span>
    <span>Vol: ${(ticker.quoteVolume / 1_000_000).toFixed(1)}M</span>
    <span>${state.timeframe.toUpperCase()}</span>
  `;
}
