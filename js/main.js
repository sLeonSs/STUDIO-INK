(function () {
  'use strict';

  const D = window.SK_DATA;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Hàng "Phong cách chơi" trong bảng so sánh: Control (lấy từ chỉ số hiệu năng) đứng đầu
  const PLAY_ROWS = [
    ['Control', (l) => l.stats.control],
    ['Tracking', (l) => l.play.tracking],
    ['Flicking', (l) => l.play.flicking],
    ['Micro adjust', (l) => l.play.micro],
    ['Static aim', (l) => l.play.static],
  ];

  const statLines = D.lines.filter((l) => l.stats);
  const sizeById = new Map(D.sizes.map((s) => [s.id, s]));
  const categoryById = new Map(D.categories.map((c) => [c.id, c]));
  const categoryOf = (i) => categoryById.get(D.designs[i].category);
  const formatOf = (i) => sizeById.get(D.designs[i].format);
  const inCategory = (id) => D.designs.map((_, j) => j).filter((j) => D.designs[j].category === id);
  const sizesOf = (c) => c.sizes.map((id) => sizeById.get(id));
  const linesAt = (s) => D.lines.filter((l) => s.prices[l.id] != null); // dòng pad bán ở cỡ s

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const formatPrice = (p) => `${p.toLocaleString('vi-VN')}₫`;
  const num = (v) => String(v).replace('.', ',');
  const two = (n) => String(n).padStart(2, '0');
  const ratioOf = (s) => `${s.cm[0]} / ${s.cm[1]}`;
  // Ảnh thu nhỏ (tools/make_thumbs.sh) cho giá treo và danh sách; trang chi tiết dùng ảnh gốc
  const thumbOf = (src) => src.replace(/^assets\//, 'assets/thumbs/');
  const sizesText = (c) => `${sizesOf(c).map((s) => s.cm.join(' × ')).join(' / ')} cm`;

  // "250.000₫" nếu chỉ có một giá, "từ 199.000₫" nếu có nhiều giá
  function priceText(sizes) {
    const prices = sizes.flatMap((s) => Object.values(s.prices));
    const min = Math.min(...prices);
    return prices.every((p) => p === min) ? formatPrice(min) : `từ ${formatPrice(min)}`;
  }

  // Thanh 5 nấc; điểm lẻ (vd. 3,5) tô nửa nấc
  function meter(v) {
    let cells = '';
    for (let i = 0; i < 5; i++) cells += `<i style="--f:${Math.max(0, Math.min(1, v - i))}"></i>`;
    return `<span class="meter" aria-hidden="true">${cells}</span>`;
  }

  /* ---------- Giá treo đầu trang ---------- */

  $('#railItems').innerHTML = D.designs.map((d, i) => `
    <button class="rail__item" type="button" tabindex="-1" data-index="${i}" aria-label="${esc(d.name)} · ${esc(categoryOf(i).title)}">
      <svg class="rail__hook" viewBox="0 0 16 36" aria-hidden="true" focusable="false"><path d="M8 36V11a5 5 0 1 1 5-5"/></svg>
      <span class="rail__hanger" aria-hidden="true"></span>
      <span class="rail__pad"><img alt="" data-src="${esc(thumbOf(d.image))}" data-full="${esc(d.image)}" decoding="async" draggable="false"><span class="rail__shade"></span></span>
    </button>`).join('');

  // Dòng chữ nhỏ trên giá: bấm vào một danh mục để nhảy tới mẫu đầu tiên của danh mục đó
  const railCats = $('#railCats');
  const firstOf = new Map();
  D.designs.forEach((d, i) => { if (!firstOf.has(d.category)) firstOf.set(d.category, i); });
  railCats.innerHTML = `Lót chuột · ${D.categories.map((c) => `<button type="button" data-category="${c.id}">${esc(c.title)}</button>`).join(' · ')}`;

  const railName = $('#railName');
  const railMeta = $('#railMeta');
  // Mẫu hiện đầu tiên: ngẫu nhiên mỗi lần vào trang, và không trùng với mẫu đầu của lần trước
  function randomStart() {
    let last = -1;
    try { last = Number(localStorage.getItem('sk-rail-start') ?? -1); } catch { /* trình duyệt chặn lưu trữ */ }
    let i = Math.floor(Math.random() * D.designs.length);
    if (i === last && D.designs.length > 1) i = (i + 1 + Math.floor(Math.random() * (D.designs.length - 1))) % D.designs.length;
    try { localStorage.setItem('sk-rail-start', String(i)); } catch { /* bỏ qua */ }
    return i;
  }

  const rail = new window.Rail($('#rail'), D.designs.map((_, i) => formatOf(i).cm), {
    start: randomStart(),
    onChange(i) {
      const c = categoryOf(i);
      railName.textContent = D.designs[i].name;
      railMeta.textContent = `${c.title} · ${sizesText(c)} · ${priceText(sizesOf(c))}`;
      $$('button', railCats).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.category === c.id)));
    },
    onOpen: (i) => openDetail(i, true),
    // đang tự trượt thì không đọc to tên mẫu mỗi lần đổi (trình đọc màn hình)
    onAuto: (on) => railName.setAttribute('aria-live', on ? 'off' : 'polite'),
  });
  railCats.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (btn) rail.select(firstOf.get(btn.dataset.category));
  });
  $('#railPrev').addEventListener('click', () => rail.move(-1));
  $('#railNext').addEventListener('click', () => rail.move(1));
  $('#railOpen').addEventListener('click', () => openDetail(rail.active, true));
  // Lúc mới vào trang giá treo tự trượt; rê chuột lên dòng chữ/nút bên dưới cũng tạm dừng
  rail.startAuto({ delay: 1100, interval: 1650, pauseOn: [$('.caption')] });

  /* ---------- Danh sách sản phẩm: chia trang, 9 mẫu mỗi trang (8 trên điện thoại) ---------- */

  const grid = $('#productGrid');
  const pager = $('#productPager');
  const phone = window.matchMedia('(max-width: 639px)'); // khớp lưới 2 cột trong css
  const perPage = () => (phone.matches ? 8 : 9);         // để hàng cuối luôn đủ ô
  let filter = D.categories[0].id;
  let page = 0;
  let shownPer = perPage();

  // Mọi ô trong một danh mục cùng khung (pad dài: 2:1, còn lại: 4:3), chừa lề TILE_PAD mỗi bên.
  // Pad được đặt giữa ô theo tỉ lệ thật: pad dài chiếm hết bề ngang, pad gần vuông hết bề cao.
  const TILE_PAD = 0.08;
  const tileOf = (c) => (sizesOf(c).some((s) => s.cm[0] / s.cm[1] > 1.6) ? 2 : 4 / 3);
  const tileFit = (s, tile) => Math.min(1, s.cm[0] / s.cm[1] / ((1 - 2 * TILE_PAD) / (1 / tile - 2 * TILE_PAD)));

  function renderCatalog() {
    const c = categoryById.get(filter);
    const list = inCategory(filter);
    const tile = tileOf(c);
    shownPer = perPage();
    const pages = Math.max(1, Math.ceil(list.length / shownPer));
    page = Math.min(page, pages - 1);
    const start = page * shownPer;
    const items = list.slice(start, start + shownPer);
    const from = priceText(sizesOf(c));

    grid.style.setProperty('--tile', String(tile));
    grid.classList.toggle('grid--wide', tile > 1.5);
    grid.innerHTML = items.map((i) => {
      const d = D.designs[i];
      const f = formatOf(i);
      return `
      <li>
        <button class="card" type="button" data-open="${i}">
          <span class="card__media"><img src="${esc(thumbOf(d.image))}" data-full="${esc(d.image)}" alt="" loading="lazy" decoding="async" style="--ar:${ratioOf(f)};width:${(tileFit(f, tile) * 100).toFixed(2)}%"></span>
          <span class="card__name">${esc(d.name)}</span>
          <span class="card__meta">${esc(from[0].toUpperCase() + from.slice(1))}</span>
        </button>
      </li>`;
    }).join('');

    $('#productScope').textContent = `${c.title} · ${sizesText(c)}`;
    $('#productRange').textContent = `${start + 1}–${start + items.length} / ${list.length} mẫu`;
    pager.innerHTML = pages < 2 ? '' : `
      <button type="button" data-page="${page - 1}" data-step="prev" aria-label="Trang trước"${page === 0 ? ' disabled' : ''}>
        <span aria-hidden="true">←</span><span class="pager__label">Trang trước</span>
      </button>
      <span class="pager__pages">${Array.from({ length: pages }, (_, p) => `
        <button type="button" data-page="${p}" aria-label="Trang ${p + 1}"${p === page ? ' aria-current="page"' : ''}>${p + 1}</button>`).join('')}
      </span>
      <button type="button" data-page="${page + 1}" data-step="next" aria-label="Trang sau"${page === pages - 1 ? ' disabled' : ''}>
        <span class="pager__label">Trang sau</span><span aria-hidden="true">→</span>
      </button>`;
  }

  pager.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-page]');
    if (!btn || btn.disabled) return;
    page = Number(btn.dataset.page);
    renderCatalog();
    // Nút vừa bấm đã được vẽ lại: trả focus về nút tương ứng
    const again = btn.dataset.step && pager.querySelector(`[data-step="${btn.dataset.step}"]:not(:disabled)`);
    (again || pager.querySelector('[aria-current]')).focus({ preventScroll: true });
    // Đang ở cuối danh sách thì đưa đầu trang mới vào màn hình
    const section = $('#products');
    if (section.getBoundingClientRect().top < 0) section.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  });
  // Thiếu ảnh thu nhỏ (vd. mới thêm mẫu mà chưa chạy tools/make_thumbs.sh): dùng ảnh gốc
  grid.addEventListener('error', (e) => {
    const img = e.target;
    if (img.dataset && img.dataset.full && img.getAttribute('src') !== img.dataset.full) img.src = img.dataset.full;
  }, true);
  grid.addEventListener('click', (e) => {
    const card = e.target.closest('[data-open]');
    if (card) openDetail(Number(card.dataset.open), false);
  });
  // Đổi giữa 9 và 8 mẫu mỗi trang khi xoay/thu nhỏ màn hình: giữ mẫu đầu trang đang xem
  phone.addEventListener('change', () => {
    page = Math.floor((page * shownPer) / perPage());
    renderCatalog();
  });

  // Chọn danh mục
  const tabs = $('#categoryTabs');
  tabs.innerHTML = D.categories
    .map((c, k) => `<button type="button" data-category="${c.id}" aria-pressed="${k === 0}">${esc(c.title)}<sup>${inCategory(c.id).length}</sup></button>`)
    .join('');
  tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn || btn.dataset.category === filter) return;
    $$('button', tabs).forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    filter = btn.dataset.category;
    page = 0;
    renderCatalog();
  });
  renderCatalog();

  /* ---------- So sánh nhanh ---------- */

  const row = (label, cells) => `
    <tr><th scope="row">${label}</th>${cells.map((c) => `<td>${c}</td>`).join('')}</tr>`;
  const group = (title) => `<tr class="compare__group"><th scope="rowgroup" colspan="${statLines.length + 1}"><span>${title}</span></th></tr>`;
  const value = (v) => `<span class="value"><span class="value__num">${num(v)}</span>${meter(v)}</span>`;

  $('#compareTable').innerHTML = `
    <thead>
      <tr>
        <td></td>${statLines.map((l) => `
        <th scope="col">
          <img class="compare__tex" src="${esc(l.texture)}" alt="" loading="lazy">
          <span class="compare__name">${esc(l.name)}</span>
          <span class="compare__tag">${esc(l.tagline)}</span>
        </th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${row('Bề mặt', statLines.map((l) => esc(l.surface)))}
      ${row('Đế PORON', statLines.map((l) => (l.base === 'PORON' ? 'Có' : 'Không')))}
      ${group('Phong cách chơi')}
      ${PLAY_ROWS.map(([label, get]) => row(label, statLines.map((l) => value(get(l))))).join('')}
      ${row('Tóm tắt', statLines.map((l) => `
        <p class="compare__headline">${esc(l.headline)}</p>
        <p>${esc(l.desc)}</p>
        <ul>${l.pros.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>`))}
    </tbody>`;

  // Điện thoại, iPad dọc: bảng gọn (cột = dòng pad, hàng = chỉ số) + chi tiết từng dòng dạng mở/đóng
  $('#compareMatrix').innerHTML = `
    <thead>
      <tr><td></td>${statLines.map((l) => `<th scope="col">${esc(l.name)}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${PLAY_ROWS.map(([label, get]) => `
      <tr>
        <th scope="row">${label}</th>
        ${statLines.map((l) => `<td><span class="cmx__num">${num(get(l))}</span>${meter(get(l))}</td>`).join('')}
      </tr>`).join('')}
      <tr class="cmx__base">
        <th scope="row">Đế PORON</th>
        ${statLines.map((l) => `<td>${l.base === 'PORON' ? 'Có' : 'Không'}</td>`).join('')}
      </tr>
    </tbody>`;
  $('#compareDetails').innerHTML = statLines.map((l, k) => `
    <details class="acc__item"${k === 0 ? ' open' : ''}>
      <summary>
        <span class="acc__tex" style="background-image:url('${esc(l.texture)}')" aria-hidden="true"></span>
        <span class="acc__head"><span class="acc__name">${esc(l.name)}</span><span class="acc__tag">${esc(l.tagline)}</span></span>
        <span class="acc__icon" aria-hidden="true"></span>
      </summary>
      <div class="acc__body">
        <dl class="acc__specs">
          <div><dt>Bề mặt</dt><dd>${esc(l.surface)}</dd></div>
          <div><dt>Loại đế</dt><dd>${esc(l.base || 'Đang cập nhật')}</dd></div>
        </dl>
        <p class="acc__headline">${esc(l.headline)}</p>
        <p>${esc(l.desc)}</p>
        <ul>${l.pros.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
      </div>
    </details>`).join('');

  /* ---------- Trang chi tiết: chọn kích thước, dòng pad, số lượng ---------- */

  const QTY_MAX = 20;
  const sheet = $('#detail');
  const panel = $('#detailPanel');
  const detailImg = $('#detailImg');
  const sizeList = $('#detailSizes');
  const lineList = $('#detailLines');
  const qtyInput = $('#detailQty');
  let current = -1;
  let currentSize = null;
  let wantedLine = statLines[0].id; // dòng pad khách chọn gần nhất, nhớ cả khi đổi cỡ/đổi mẫu
  let qty = 1;
  let fromRail = false;  // mở từ giá treo thì chuyển mẫu cũng xoay giá theo
  let returnFocus = null;
  let hideTimer = 0;

  // Dòng pad đang chọn ở cỡ s: dòng khách muốn nếu cỡ đó có bán, nếu không thì dòng đầu tiên
  const lineAt = (s) => linesAt(s).find((l) => l.id === wantedLine) || linesAt(s)[0];

  // Lựa chọn hiện tại, dùng cho giá, mã đặt hàng và ô đặt hàng
  function selection() {
    const s = sizeById.get(currentSize);
    const line = lineAt(s);
    const unit = s.prices[line.id];
    return { d: D.designs[current], c: categoryOf(current), s, line, unit, qty, total: unit * qty };
  }

  // Ô lựa chọn: cả ô bấm được, nút radio nằm ẩn bên trong (vẫn chọn được bằng bàn phím)
  const tile = (name, value, label, meta, price, checked) => `
    <label class="tile${checked ? ' is-checked' : ''}">
      <input type="radio" name="${name}" value="${esc(value)}"${checked ? ' checked' : ''}>
      <span class="tile__name">${esc(label)}</span>
      ${meta ? `<span class="tile__meta">${esc(meta)}</span>` : ''}
      <span class="tile__price">${esc(price)}</span>
    </label>`;
  const markChecked = (list) => $$('.tile', list).forEach((t) => t.classList.toggle('is-checked', $('input', t).checked));

  function renderDetail() {
    const d = D.designs[current];
    const c = categoryOf(current);
    const list = inCategory(d.category);
    detailImg.src = d.image;
    detailImg.alt = `${d.name} – lót chuột ${c.title.toLowerCase()}`;
    $('#detailKicker').textContent = `${c.title} · ${d.collection}`;
    $('#detailTitle').textContent = d.name;
    $('#detailCount').textContent = `${two(list.indexOf(current) + 1)} / ${two(list.length)}`;
    $('#detailPrev').hidden = $('#detailNext').hidden = list.length < 2;
    sizeList.innerHTML = sizesOf(c).map((s) => {
      const lines = linesAt(s);
      const meta = lines.length === 1 ? `Chỉ có ${lines[0].fullName.toLowerCase()}` : `${lines.length} dòng pad`;
      return tile('size', s.id, s.size, meta, priceText([s]), s.id === currentSize);
    }).join('');
    renderLines();
  }

  // Các dòng pad bán ở cỡ đang chọn (chỉ vẽ lại khi đổi cỡ để không mất focus)
  function renderLines() {
    const s = sizeById.get(currentSize);
    const chosen = lineAt(s);
    lineList.innerHTML = linesAt(s)
      .map((l) => tile('line', l.id, l.name, '', formatPrice(s.prices[l.id]), l === chosen))
      .join('');
    renderPrice();
  }

  function renderPrice() {
    const o = selection();
    detailImg.style.setProperty('--ar', ratioOf(o.s));
    $('#detailPrice').textContent = `${formatPrice(o.unit)} / cái`;
    $('#detailTotal').textContent = formatPrice(o.total);
    $('#detailPick').textContent = `${o.s.size} · ${o.line.name} · ${o.qty} cái`;
    qtyInput.value = String(o.qty);
    $('[data-qty="-1"]', sheet).disabled = o.qty <= 1;
    $('[data-qty="1"]', sheet).disabled = o.qty >= QTY_MAX;
    // Dưới ảnh: bề mặt pad (ảnh vân bề mặt; pad kính chưa có ảnh nên vẽ ô kính), tên bề mặt, loại đế
    const swatch = $('#detailSwatch');
    swatch.style.backgroundImage = o.line.texture ? `url("${o.line.texture}")` : '';
    swatch.classList.toggle('is-glass', !o.line.texture);
    $('#detailSurfaceName').textContent = o.line.surface;
    $('#detailBase').textContent = o.line.base || 'Đang cập nhật';
    // Toàn bộ phần "Tóm tắt" của dòng pad trong bảng so sánh
    $('#detailSummary').innerHTML = `
      <p class="detail__headline">${esc(o.line.headline)}</p>
      <p>${esc(o.line.desc)}</p>
      ${o.line.pros.length ? `<ul>${o.line.pros.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}`;
    $('#detailSpecs').innerHTML = [
      ['Kích thước', o.s.size],
      ['Độ dày', (o.line.stats && o.s.thickness) || 'Đang cập nhật'],
    ].map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('');
  }

  function setQty(n) {
    qty = Math.min(QTY_MAX, Math.max(1, Math.round(n) || 1));
    renderPrice();
  }

  sizeList.addEventListener('change', (e) => {
    currentSize = e.target.value;
    markChecked(sizeList);
    renderLines();
  });
  lineList.addEventListener('change', (e) => {
    wantedLine = e.target.value;
    markChecked(lineList);
    renderPrice();
  });
  $('#detailQtyBox').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-qty]');
    if (btn) setQty(qty + Number(btn.dataset.qty));
  });
  qtyInput.addEventListener('change', () => setQty(Number(qtyInput.value)));

  /* ---------- Lớp phủ và nút Back ----------
   * Mỗi lớp (trang chi tiết, ô đặt hàng) thêm một mục vào lịch sử trình duyệt. Nhờ vậy nút Back
   * của Android, cử chỉ vuốt Back của iPhone, vuốt hai ngón trên trackpad và nút quay lại trong
   * trình duyệt của Zalo/Facebook đều đóng lớp trên cùng thay vì thoát khỏi web.
   */
  const layers = []; // [{ id, hide, pushed }]
  try {
    if (history.state && history.state.skLayer) history.replaceState(null, ''); // tải lại trang lúc đang mở lớp
  } catch { /* trình duyệt chặn lịch sử */ }

  function openLayer(id, hide) {
    let pushed = false;
    try {
      history.pushState({ skLayer: layers.length + 1 }, '');
      pushed = true;
    } catch { /* vd. Safari mở bằng file:// */ }
    layers.push({ id, hide, pushed });
  }

  // Đóng bằng nút, vuốt hay bấm ra ngoài: lùi lịch sử một bước, popstate sẽ đóng lớp
  function closeLayer(id) {
    const top = layers[layers.length - 1];
    if (!top || top.id !== id) return;
    if (top.pushed && history.state && history.state.skLayer === layers.length) {
      history.back();
      // phòng khi trình duyệt không báo popstate
      setTimeout(() => {
        if (layers[layers.length - 1] !== top) return;
        layers.pop();
        top.hide();
      }, 600);
    } else {
      layers.pop();
      top.hide();
    }
  }

  window.addEventListener('popstate', (e) => {
    const depth = (e.state && e.state.skLayer) || 0;
    while (layers.length > depth) layers.pop().hide();
  });

  /* ---------- Mở / đóng trang chi tiết ---------- */

  let swipedOut = false; // đã vuốt văng ra ngoài, chỉ còn chờ ẩn

  function resetPanel() {
    panel.style.transform = '';
    sheet.style.removeProperty('--veil');
    swipedOut = false;
  }

  function openDetail(index, viaRail) {
    rail.stopAuto(); // khách đã bấm xem sản phẩm
    clearTimeout(hideTimer);
    const c = categoryOf(index);
    current = index;
    fromRail = viaRail;
    qty = 1;
    // Mở ở đúng cỡ của ảnh mẫu nếu danh mục có cỡ đó
    if (!c.sizes.includes(currentSize)) currentSize = c.sizes.includes(D.designs[index].format) ? D.designs[index].format : c.sizes[0];
    if (sheet.hidden) returnFocus = document.activeElement;
    renderDetail();
    resetPanel();
    sheet.hidden = false;
    void sheet.offsetWidth; // để hiệu ứng hiện dần chạy
    sheet.classList.add('is-open');
    sheet.scrollTop = 0;
    document.documentElement.classList.add('modal-open');
    $('.sheet__close', sheet).focus({ preventScroll: true });
    if (!layers.some((l) => l.id === 'detail')) openLayer('detail', hideDetail);
    showSwipeHint();
  }

  function hideDetail() {
    if (sheet.hidden) return;
    sheet.classList.remove('is-open');
    document.documentElement.classList.remove('modal-open');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      sheet.hidden = true;
      resetPanel();
    }, reduceMotion.matches ? 0 : 240);
    if (returnFocus && document.contains(returnFocus)) returnFocus.focus({ preventScroll: true });
  }

  // Chuyển mẫu trong cùng danh mục, giữ nguyên cỡ, dòng pad và số lượng đang chọn
  function stepDetail(dir) {
    const list = inCategory(D.designs[current].category);
    current = list[(list.indexOf(current) + dir + list.length) % list.length];
    if (fromRail) rail.select(current);
    renderDetail();
  }

  $$('[data-close]', sheet).forEach((el) => el.addEventListener('click', () => closeLayer('detail')));
  // Máy tính, iPad xoay ngang: bấm vào vùng nền mờ ở hai bên để đóng
  sheet.addEventListener('click', (e) => {
    if (e.target === sheet) closeLayer('detail');
  });
  $('#detailPrev').addEventListener('click', () => stepDetail(-1));
  $('#detailNext').addEventListener('click', () => stepDetail(1));
  $('#detailCopy').addEventListener('click', copyOrder);
  $('#detailOrder').addEventListener('click', openOrder);

  /* ---------- Vuốt ngang để đóng (điện thoại, iPad – cả trong trình duyệt của Zalo, Facebook) ----------
   * css đặt touch-action: pan-y nên trình duyệt chỉ tự xử lý cuộn dọc; vuốt ngang được chuyển cho js.
   */
  const SWIPE_SLOP = 10;       // px – đi chưa tới đây thì chưa biết là vuốt ngang hay cuộn dọc
  const SWIPE_CLOSE = 0.28;    // vuốt quá 28% bề ngang thì đóng
  const SWIPE_FLING = 0.45;    // hoặc hất nhanh hơn 0,45 px/ms
  let swipe = null;
  let swallowClick = false;

  sheet.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || !e.isPrimary || swipedOut) return;
    // đang gõ số lượng: kéo trong ô là để di chuyển con trỏ chữ, không phải vuốt đóng.
    // (ô chưa được chọn thì vẫn vuốt được – màn hình cảm ứng hay "hút" cú chạm gần đó vào ô)
    if (e.target.matches('input, textarea') && e.target === document.activeElement) return;
    swipe = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, v: 0, lastX: e.clientX, lastT: e.timeStamp, active: false };
  });

  sheet.addEventListener('pointermove', (e) => {
    if (!swipe || e.pointerId !== swipe.id) return;
    const dx = e.clientX - swipe.x;
    const dy = e.clientY - swipe.y;
    if (!swipe.active) {
      if (Math.abs(dx) < SWIPE_SLOP && Math.abs(dy) < SWIPE_SLOP) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.2) {
        swipe = null; // đang cuộn dọc
        return;
      }
      swipe.active = true;
      try { sheet.setPointerCapture(e.pointerId); } catch { /* ngón tay đã nhấc */ }
      sheet.classList.add('is-swiping');
    }
    swipe.v = (e.clientX - swipe.lastX) / Math.max(1, e.timeStamp - swipe.lastT);
    swipe.lastX = e.clientX;
    swipe.lastT = e.timeStamp;
    swipe.dx = dx;
    panel.style.transform = `translate3d(${dx}px, 0, 0)`;
    sheet.style.setProperty('--veil', (1 - Math.min(1, Math.abs(dx) / panel.offsetWidth)).toFixed(3));
  });

  function endSwipe(e) {
    if (!swipe || e.pointerId !== swipe.id) return;
    const s = swipe;
    swipe = null;
    if (!s.active) return;
    sheet.classList.remove('is-swiping');
    swallowClick = true; // không để cú vuốt bị tính là bấm vào nút bên dưới ngón tay
    setTimeout(() => { swallowClick = false; }, 0);
    const width = panel.offsetWidth;
    const fling = Math.abs(s.v) > SWIPE_FLING && Math.sign(s.v) === Math.sign(s.dx);
    if (e.type === 'pointerup' && (Math.abs(s.dx) > width * SWIPE_CLOSE || fling)) {
      swipedOut = true;
      panel.style.transform = `translate3d(${Math.sign(s.dx) * (width + 40)}px, 0, 0)`;
      sheet.style.setProperty('--veil', '0');
      closeLayer('detail');
    } else {
      panel.style.transform = '';
      sheet.style.removeProperty('--veil');
    }
  }
  sheet.addEventListener('pointerup', endSwipe);
  sheet.addEventListener('pointercancel', endSwipe);
  sheet.addEventListener('click', (e) => {
    if (!swallowClick) return;
    e.preventDefault();
    e.stopPropagation();
    swallowClick = false;
  }, true);

  // Lần đầu mở trên màn hình cảm ứng: nhắc khách có thể vuốt ngang để đóng
  const coarse = window.matchMedia('(pointer: coarse)');
  let hinted = false;
  function showSwipeHint() {
    if (hinted || !coarse.matches || reduceMotion.matches) return;
    hinted = true;
    const hint = $('#detailHint');
    setTimeout(() => hint.classList.add('is-on'), 400);
    setTimeout(() => hint.classList.remove('is-on'), 3400);
  }

  document.addEventListener('keydown', (e) => {
    if (orderIsOpen()) {
      // <dialog> thật tự báo Esc qua sự kiện cancel; bản dự phòng cho Safari cũ thì phải tự làm
      if (!nativeDialog && e.key === 'Escape') closeLayer('order');
      return;
    }
    if (sheet.hidden) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeLayer('detail');
    } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !e.target.matches('input')) {
      // mũi tên trong các ô lựa chọn là để chọn, không chuyển mẫu
      e.preventDefault();
      stepDetail(e.key === 'ArrowLeft' ? -1 : 1);
    } else if (e.key === 'Tab') {
      // giữ focus bên trong trang chi tiết
      const focusables = $$('button:not(:disabled), a[href], input:checked, input:not([type="radio"])', sheet).filter((el) => el.offsetParent !== null && !el.hidden);
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  /* ---------- Ô đặt hàng: gửi đơn về Gmail của shop qua FormSubmit ---------- */

  const orderDialog = $('#order');
  const orderForm = $('#orderForm');
  const orderDone = $('#orderDone');
  const orderSubmit = $('#orderSubmit');
  const orderStatus = $('#orderStatus');
  let sending = false;

  // Safari cũ (trước iOS 15.4) chưa có <dialog>: mở/đóng bằng thuộc tính open, css lo phần hiển thị
  const nativeDialog = typeof orderDialog.showModal === 'function';
  if (!nativeDialog) orderDialog.classList.add('order--fallback');
  const orderIsOpen = () => orderDialog.hasAttribute('open');
  function showOrderDialog() {
    if (nativeDialog) {
      orderDialog.showModal();
    } else {
      orderDialog.setAttribute('open', '');
      orderForm.elements.name.focus();
    }
  }
  function closeOrderDialog() {
    if (nativeDialog) {
      orderDialog.close();
    } else if (orderIsOpen()) {
      orderDialog.removeAttribute('open');
      orderDialog.dispatchEvent(new Event('close'));
    }
  }

  // Kiểm tra từng ô; trả về lời nhắc, rỗng là hợp lệ. Chỉ Gmail được bỏ trống.
  const CHECKS = {
    name: (v) => (v.length >= 2 ? '' : 'Vui lòng nhập tên người nhận.'),
    phone: (v) => {
      if (!v) return 'Vui lòng nhập số điện thoại.';
      return /^(0\d{9,10}|\+?84\d{9,10})$/.test(v.replace(/[\s.()-]/g, '')) ? '' : 'Số điện thoại chưa đúng, ví dụ 0886 115 561.';
    },
    email: (v) => (!v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Gmail chưa đúng, ví dụ ten@gmail.com.'),
    address: (v) => (v.length >= 5 ? '' : 'Vui lòng nhập địa chỉ nhận hàng.'),
  };
  const fieldValue = (name) => orderForm.elements[name].value.trim();

  function showError(input, message) {
    const field = input.closest('.field');
    field.classList.toggle('is-invalid', Boolean(message));
    input.setAttribute('aria-invalid', String(Boolean(message)));
    $('.field__error', field).textContent = message;
  }

  function openOrder() {
    const o = selection();
    $('#orderTitle').textContent = o.d.name;
    $('#orderSummary').textContent = `${o.c.title} · ${o.s.size} · ${o.line.fullName} · ${o.qty} cái`;
    $('#orderTotal').textContent = formatPrice(o.total);
    orderForm.hidden = false;
    orderDone.hidden = true;
    orderStatus.textContent = '';
    Object.keys(CHECKS).forEach((name) => showError(orderForm.elements[name], ''));
    showOrderDialog();
    openLayer('order', closeOrderDialog);
  }

  async function sendOrder(payload) {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 20000);
    try {
      const res = await fetch(`https://formsubmit.co/ajax/${D.shop.orderEmail}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
        signal: abort.signal,
      });
      const data = await res.json().catch(() => ({}));
      // FormSubmit trả success dạng chuỗi "true"/"false" (chưa kích hoạt cũng là "false")
      if (!res.ok || String(data.success) !== 'true') throw new Error(data.message || `HTTP ${res.status}`);
    } finally {
      clearTimeout(timer);
    }
  }

  orderForm.addEventListener('input', (e) => {
    if (e.target.closest('.field.is-invalid')) showError(e.target, '');
  });

  orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending) return;
    let firstBad = null;
    for (const [name, check] of Object.entries(CHECKS)) {
      const message = check(fieldValue(name));
      showError(orderForm.elements[name], message);
      if (message && !firstBad) firstBad = orderForm.elements[name];
    }
    if (firstBad) {
      firstBad.focus();
      return;
    }

    const o = selection();
    const email = fieldValue('email');
    const payload = {
      _subject: `Đơn hàng mới: ${o.d.name} – ${o.s.size} – ${o.line.fullName} × ${o.qty}`,
      _template: 'table',
      _captcha: 'false',
      _honey: orderForm.elements._honey.value, // ô bẫy: chỉ máy tự động mới điền
      'Mẫu': o.d.name,
      'Danh mục': o.c.title,
      'Kích thước': o.s.size,
      'Dòng pad': o.line.fullName,
      'Số lượng': String(o.qty),
      'Đơn giá': formatPrice(o.unit),
      'Thành tiền': formatPrice(o.total),
      'Tên người nhận': fieldValue('name'),
      'Số điện thoại': fieldValue('phone'),
      'Gmail': email || '(không có)',
      'Địa chỉ nhận hàng': fieldValue('address'),
    };
    if (email) payload._replyto = email; // bấm "Trả lời" trong Gmail là gửi thẳng cho khách

    sending = true;
    orderSubmit.disabled = true;
    orderSubmit.textContent = 'Đang gửi…';
    orderStatus.textContent = '';
    try {
      await sendOrder(payload);
      $('#orderDoneText').textContent = `Shop sẽ gọi lại số ${fieldValue('phone')} để xác nhận đơn ${o.d.name} – ${o.s.size} – ${o.line.fullName}, ${o.qty} cái, ${formatPrice(o.total)}.`;
      orderForm.hidden = true;
      orderDone.hidden = false;
      $('#orderDoneTitle').focus();
    } catch {
      orderStatus.textContent = 'Chưa gửi được đơn hàng. Vui lòng thử lại, hoặc gọi 0886 115 561 để đặt trực tiếp.';
    } finally {
      sending = false;
      orderSubmit.disabled = false;
      orderSubmit.textContent = 'Xác nhận đặt hàng';
    }
  });

  $$('[data-order-close]', orderDialog).forEach((el) => el.addEventListener('click', () => closeLayer('order')));
  // Bấm ra ngoài ô (phần nền mờ) để đóng
  orderDialog.addEventListener('click', (e) => {
    if (e.target === orderDialog) closeLayer('order');
  });
  // Esc (hoặc nút Back của Android) trên <dialog> thật: đóng qua lịch sử như các cách khác
  orderDialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeLayer('order');
  });
  orderDialog.addEventListener('close', () => {
    if (!sheet.hidden) $('#detailOrder').focus({ preventScroll: true });
  });

  /* ---------- Sao chép mã đặt hàng ---------- */

  const toastEl = $('#toast');
  let toastTimer = 0;
  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 2800);
  }

  async function copyOrder() {
    const o = selection();
    const text = `[${D.shop.name}] Đặt mẫu ${o.d.name} – ${o.line.fullName}, ${o.s.size} – ${o.qty} cái – ${formatPrice(o.total)}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    toast('Đã sao chép mã đặt hàng – dán vào Zalo hoặc Facebook để gửi shop.');
  }

  $('#year').textContent = new Date().getFullYear();
})();
