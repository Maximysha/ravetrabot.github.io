const API_BASE = 'https://fapi.binance.com';
const WS_BASE = 'wss://fstream.binance.com/stream?streams=';
const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'];
const MAX_CARDS = 20;

const state = {
  timeframe: '5m',
  cardCount: 9,
  symbols: [],
  cards: [],
  ws: null,
};

const grid = document.getElementById('grid');
const cardTemplate = document.getElementById('cardTemplate');
const timeframesEl = document.getElementById('timeframes');
const cardCountEl = document.getElementById('cardCount');
const refreshEl = document.getElementById('refreshSymbols');
const addSymbolInput = document.getElementById('addSymbolInput');
const addSymbolBtn = document.getElementById('addSymbolBtn');

renderTimeframeButtons();
attachEvents();
bootstrap();

async function bootstrap() {
  await loadSymbols();
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
      await Promise.all(state.cards.map((card) => loadHistory(card)));
      openStream();
    });
    timeframesEl.append(btn);
  });
}

async function loadSymbols() {
  const [infoRes, tickersRes] = await Promise.all([
    fetch(`${API_BASE}/fapi/v1/exchangeInfo`),
    fetch(`${API_BASE}/fapi/v1/ticker/24hr`),
  ]);

  const info = await infoRes.json();
  const tickers = await tickersRes.json();

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

  state.symbols.slice(0, 80).forEach((s) => {
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
    alert('Такої монети немає в Binance USDT Futures.');
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

  const card = createCard(symbol);
  updateTickerUI(card, ticker);
  state.cards.push(card);
  grid.append(card.node);

  await loadHistory(card);
  openStream();
  addSymbolInput.value = '';
}

async function loadHistory(card) {
  const res = await fetch(`${API_BASE}/fapi/v1/klines?symbol=${card.symbol}&interval=${state.timeframe}&limit=220`);
  const klines = await res.json();

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

  const ticker = state.symbols.find((s) => s.symbol === card.symbol);
  if (ticker) updateTickerUI(card, ticker);
}

function openStream() {
  if (state.ws) state.ws.close();

  const streamNames = state.cards.map((card) => `${card.symbol.toLowerCase()}@kline_${state.timeframe}`);
  if (!streamNames.length) return;

  state.ws = new WebSocket(`${WS_BASE}${streamNames.join('/')}`);

  state.ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    const payload = data.data;
    if (!payload?.k) return;

    const symbol = payload.s;
    const card = state.cards.find((c) => c.symbol === symbol);
    if (!card) return;

    const k = payload.k;
    const candle = {
      time: Math.floor(k.t / 1000),
      open: Number(k.o),
      high: Number(k.h),
      low: Number(k.l),
      close: Number(k.c),
    };

    card.candleSeries.update(candle);
    card.volumeSeries.update({
      time: Math.floor(k.t / 1000),
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
