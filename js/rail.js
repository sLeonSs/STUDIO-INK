/*
 * Giá treo ở đầu trang: các tấm pad treo trên một thanh ngang và xoay nghiêng trên móc như
 * quần áo trên giá, tấm đang chọn quay mặt ra ngoài. Chọn bằng cách bấm vào một tấm, kéo/vuốt,
 * lăn ngang (trackpad, Shift + lăn chuột) hoặc phím mũi tên. Giá nối vòng: hết thì quay lại
 * tấm đầu. Tấm pad to nhỏ theo kích thước thật (cm) nên các cỡ pad đúng tỉ lệ với nhau.
 * Lúc mới vào trang giá tự trượt từng tấm (startAuto); khách tự dùng giá là dừng hẳn.
 */
(function () {
  'use strict';

  const TURN = 80;           // độ nghiêng (độ) của các tấm hai bên
  const LIFT = 60;           // px – tấm đang chọn được kéo ra phía trước
  const SWING = 0.3;         // độ lắc khi giá chạy: 1 = lắc nhiều, 0 = không lắc
  const DRAG_THRESHOLD = 6;  // px – dưới ngưỡng này là bấm, không phải kéo
  const PAD_TOP = 40;        // px – mép trên tấm pad tính từ mép trên móc (khớp css)
  const SPRING_USER = 110;   // độ cứng lò xo khi khách tự chọn: dừng nhanh (~0,4 giây)
  const SPRING_AUTO = 120;   // khi tự trượt: mỗi lần lật ~0,4 giây

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const mod = (a, n) => ((a % n) + n) % n;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  class Rail {
    /* sizes[i] = [rộng, cao] (cm) của tấm thứ i, theo thứ tự các phần tử trong .rail__items;
       start: tấm nằm giữa lúc mới hiện (không có hiệu ứng chạy tới) */
    constructor(root, sizes, { onChange, onOpen, onAuto, start = 0 } = {}) {
      this.root = root;
      this.cm = sizes;
      this.n = sizes.length;
      this.onChange = onChange || (() => {});
      this.onOpen = onOpen || (() => {});
      this.onAuto = onAuto || (() => {}); // báo bật/tắt tự trượt (vd. để tắt đọc to tên mẫu)
      this.k = SPRING_USER;
      this.auto = null;
      this.items = Array.from(root.querySelector('.rail__items').children, (el) => ({
        el,
        img: el.querySelector('img'),
        shade: el.querySelector('.rail__shade'),
        sharp: false, // đã dùng ảnh gốc
        w: 0,
        h: 0,
        theta: 0,    // góc lắc
        omega: 0,
        peek: 0,     // hé ra khi rê chuột
        peekTo: 0,
        shown: null,
        key: '',
      }));

      this.pos = mod(Math.round(start), this.n); // vị trí giá, tính theo số tấm (số lẻ khi đang chạy)
      this.prevPos = this.pos;
      this.vel = 0;
      this.target = this.pos;
      this.active = -1;
      this.hovered = null;
      this.drag = null;
      this.suppressClick = false;
      this.wheelTimer = 0;
      this.running = false;
      this.loop = this.loop.bind(this);

      // thiếu ảnh thu nhỏ thì dùng luôn ảnh gốc
      this.items.forEach((it) => it.img.addEventListener('error', () => {
        const full = it.img.dataset.full;
        if (full && it.img.getAttribute('src') !== full) it.img.src = full;
      }));
      this.measure();
      this.bind();
      this.render();
      this.report();
    }

    measure() {
      const vw = this.root.clientWidth || window.innerWidth;
      const narrow = vw < 700;
      const perCm = clamp(vw / 225, 5, 6.4); // px cho mỗi cm
      this.step = narrow ? 40 : 58;          // khoảng cách móc giữa hai tấm nghiêng
      this.gap = narrow ? 22 : 40;           // khoảng trống hai bên tấm đang chọn
      this.dragUnit = narrow ? 70 : 90;      // kéo bao nhiêu px thì sang một tấm
      this.reach = Math.ceil(vw / 2 / this.step) + 2; // số tấm mỗi bên cần vẽ
      let maxH = 0;
      this.items.forEach((it, i) => {
        const [w, h] = this.cm[i];
        it.w = Math.min(w * perCm, vw - 32);
        it.h = (it.w * h) / w;
        maxH = Math.max(maxH, it.h);
        it.el.style.setProperty('--w', `${it.w.toFixed(1)}px`);
        it.el.style.setProperty('--h', `${it.h.toFixed(1)}px`);
        it.key = '';
      });
      this.root.style.setProperty('--rail-h', `${Math.ceil(maxH + PAD_TOP + 56)}px`);
    }

    /* ---------- Điều khiển ---------- */

    // Chọn tấm i theo đường ngắn nhất quanh vòng (khách tự chọn nên dừng tự trượt)
    select(i) {
      this.takeOver();
      const base = Math.round(this.target);
      this.target = base + mod(i - base + this.n / 2, this.n) - this.n / 2;
      this.wake();
    }

    move(dir) {
      this.takeOver();
      this.target = Math.round(this.target) + dir;
      this.wake();
    }

    /* ---------- Tự trượt lúc mới vào trang ----------
     * Sau `delay` ms, cứ mỗi `interval` ms lại chuyển sang tấm kế tiếp.
     * Dừng hẳn khi khách tự dùng giá (kéo, bấm, lăn ngang, phím, nút ← →…).
     * Chỉ tạm dừng (rồi chạy tiếp) khi rê chuột lên giá hoặc lên `pauseOn`, khi đang chạm giữ,
     * khi focus bàn phím nằm trong đó, khi giá khuất khỏi màn hình hoặc tab bị ẩn.
     */
    startAuto({ delay = 1100, interval = 1650, pauseOn = [] } = {}) {
      if (this.auto || reduceMotion.matches || this.n < 2) return;
      const a = { interval, timer: 0, holds: new Set(), stopped: false };
      this.auto = a;
      [this.root, ...pauseOn].forEach((el, k) => {
        el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') this.holdAuto(`hover${k}`, true); });
        el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') this.holdAuto(`hover${k}`, false); });
        el.addEventListener('focusin', () => this.holdAuto(`focus${k}`, true));
        el.addEventListener('focusout', (e) => { if (!el.contains(e.relatedTarget)) this.holdAuto(`focus${k}`, false); });
      });
      document.addEventListener('visibilitychange', () => this.holdAuto('hidden', document.hidden));
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(([entry]) => this.holdAuto('offscreen', entry.intersectionRatio < 0.35), { threshold: [0, 0.35] }).observe(this.root);
      }
      this.onAuto(true);
      this.scheduleAuto(delay);
    }

    scheduleAuto(ms) {
      const a = this.auto;
      if (!a || a.stopped) return;
      clearTimeout(a.timer);
      a.timer = 0;
      if (a.holds.size) return; // đang tạm dừng: hết lý do tạm dừng thì hẹn lại
      a.timer = setTimeout(() => {
        a.timer = 0;
        this.k = SPRING_AUTO;
        this.target = Math.round(this.target) + 1;
        this.wake();
        this.scheduleAuto(a.interval);
      }, ms);
    }

    autoActive() {
      const a = this.auto;
      return Boolean(a && !a.stopped && !a.holds.size);
    }

    holdAuto(reason, on) {
      const a = this.auto;
      if (!a || a.stopped) return;
      this.wake(); // vẽ lại để tấm ở giữa đổi sang ảnh nét khi tạm dừng
      if (on) {
        a.holds.add(reason);
        clearTimeout(a.timer);
        a.timer = 0;
      } else if (a.holds.delete(reason) && !a.holds.size) {
        this.scheduleAuto(a.interval); // chạy tiếp sau một nhịp đầy đủ, không nhảy ngay
      }
    }

    stopAuto() {
      const a = this.auto;
      if (!a || a.stopped) return;
      a.stopped = true;
      clearTimeout(a.timer);
      this.wake();
      this.onAuto(false);
    }

    // Khách bắt đầu tự điều khiển: dừng tự trượt, dùng lại lò xo nhanh
    takeOver() {
      this.stopAuto();
      this.k = SPRING_USER;
    }

    /* ---------- Sự kiện ---------- */

    bind() {
      const r = this.root;
      r.addEventListener('pointerdown', (e) => this.onDown(e));
      r.addEventListener('pointermove', (e) => this.onMove(e));
      r.addEventListener('pointerup', (e) => this.onUp(e));
      r.addEventListener('pointercancel', (e) => this.onUp(e));
      r.addEventListener('pointerleave', () => this.hover(null));
      r.addEventListener('dragstart', (e) => e.preventDefault());
      r.addEventListener('click', (e) => this.onClick(e));
      r.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
      r.addEventListener('keydown', (e) => this.onKey(e));
      window.addEventListener('resize', () => {
        this.measure();
        this.render();
      });
    }

    onDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      this.holdAuto('pointer', true); // đang chạm/giữ: chưa biết là kéo giá hay cuộn trang
      this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, origin: this.pos, moved: false };
    }

    onMove(e) {
      const d = this.drag;
      if (d && e.pointerId === d.id) {
        const dx = e.clientX - d.x;
        if (!d.moved) {
          if (Math.abs(dx) < DRAG_THRESHOLD) return;
          if (e.pointerType !== 'mouse' && Math.abs(e.clientY - d.y) > Math.abs(dx)) {
            this.drag = null; // người dùng đang cuộn trang theo chiều dọc
            return;
          }
          d.moved = true;
          this.takeOver(); // kéo ngang: khách đang tự xem mẫu
          try { this.root.setPointerCapture(d.id); } catch { /* con trỏ đã nhả */ }
          this.root.classList.add('is-dragging');
          this.hover(null);
        }
        this.pos = d.origin - dx / this.dragUnit;
        this.target = this.pos;
        this.wake();
        return;
      }
      if (e.pointerType === 'mouse' && !this.drag) this.hover(e.target.closest('.rail__item'));
    }

    onUp(e) {
      this.holdAuto('pointer', false);
      const d = this.drag;
      if (!d || e.pointerId !== d.id) return;
      this.drag = null;
      if (!d.moved) return;
      this.root.classList.remove('is-dragging');
      // Nuốt cú click ngay sau khi kéo để không chọn/mở nhầm
      this.suppressClick = true;
      setTimeout(() => { this.suppressClick = false; }, 0);
      // Đi tiếp theo đà tay rồi dừng đúng vào một tấm
      this.target = Math.round(this.pos + clamp(this.vel, -30, 30) * 0.22);
      this.wake();
    }

    onClick(e) {
      if (this.suppressClick) {
        e.preventDefault();
        e.stopPropagation();
        this.suppressClick = false;
        return;
      }
      const el = e.target.closest('.rail__item');
      if (!el) return;
      this.takeOver();
      const i = Number(el.dataset.index);
      if (i === mod(Math.round(this.target), this.n)) this.onOpen(i);
      else this.select(i);
    }

    onWheel(e) {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // lăn dọc: để trang cuộn
      e.preventDefault();
      this.takeOver();
      const px = e.deltaMode === 1 ? e.deltaX * 16 : e.deltaX;
      this.target += px / this.dragUnit;
      clearTimeout(this.wheelTimer);
      this.wheelTimer = setTimeout(() => {
        this.wheelTimer = 0;
        this.move(0); // dừng đúng vào tấm gần nhất
      }, 140);
      this.wake();
    }

    onKey(e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        this.move(e.key === 'ArrowRight' ? 1 : -1);
      } else if ((e.key === 'Enter' || e.key === ' ') && e.target === this.root) {
        e.preventDefault();
        this.onOpen(this.active);
      }
    }

    hover(el) {
      const it = el && this.items[Number(el.dataset.index)];
      if (it === this.hovered) return;
      if (this.hovered) this.hovered.peekTo = 0;
      this.hovered = it;
      if (it) it.peekTo = 1;
      this.wake();
    }

    /* ---------- Vòng mô phỏng ---------- */

    wake() {
      if (this.running) return;
      this.running = true;
      this.last = performance.now();
      requestAnimationFrame(this.loop);
    }

    loop(now) {
      const dt = clamp((now - this.last) / 1000, 1 / 240, 1 / 30);
      this.last = now;
      const prevVel = this.vel;
      const dragging = this.drag && this.drag.moved;

      if (dragging) {
        // vị trí theo con trỏ; vận tốc ước lượng để ném khi thả tay
        this.vel += ((this.pos - this.prevPos) / dt - this.vel) * 0.5;
      } else if (reduceMotion.matches) {
        this.pos = this.target;
        this.vel = 0;
      } else {
        const k = this.k;
        this.vel += ((this.target - this.pos) * k - this.vel * 2 * Math.sqrt(k) * 0.92) * dt;
        this.pos += this.vel * dt;
        if (Math.abs(this.target - this.pos) < 0.0005 && Math.abs(this.vel) < 0.005) {
          this.pos = this.target;
          this.vel = 0;
        }
      }
      this.prevPos = this.pos;

      // Gia tốc của giá (px/s²) làm các tấm lắc nhẹ
      const swinging = this.stepItems(dt, ((this.vel - prevVel) / dt) * this.step);
      this.render();
      this.report();

      if (dragging || swinging || this.pos !== this.target || this.vel !== 0 || this.wheelTimer) {
        requestAnimationFrame(this.loop);
      } else {
        this.running = false;
      }
    }

    stepItems(dt, acc) {
      const still = reduceMotion.matches;
      const ease = 1 - Math.exp(-dt * 12);
      let busy = false;
      for (const it of this.items) {
        if (!it.shown) continue;
        if (still) {
          it.theta = 0;
          it.omega = 0;
          it.peek = it.peekTo;
          continue;
        }
        it.omega += (-40 * it.theta - 4.5 * it.omega - acc * 0.05 * SWING) * dt;
        it.theta = clamp(it.theta + it.omega * dt, -8 * SWING, 8 * SWING);
        it.peek += (it.peekTo - it.peek) * ease;
        if (Math.abs(it.peekTo - it.peek) < 0.002) it.peek = it.peekTo;
        if (Math.abs(it.theta) > 0.01 || Math.abs(it.omega) > 0.05 || it.peek !== it.peekTo) busy = true;
      }
      return busy;
    }

    render() {
      const { n, items } = this;
      const p = this.pos;
      const i0 = Math.floor(p);
      const f = p - i0;
      // Tấm ở giữa cần chỗ bằng bề ngang của nó; nội suy khi đang chuyển giữa hai tấm
      const center = items[mod(i0, n)].w * (1 - f) + items[mod(i0 + 1, n)].w * f;
      const open = center + 2 * this.gap - this.step;

      for (let i = 0; i < n; i++) {
        const it = items[i];
        const t = mod(i - p + n / 2, n) - n / 2; // khoảng cách tới giữa, theo đường vòng ngắn nhất
        const a = Math.abs(t);
        const shown = a <= this.reach;
        if (shown !== it.shown) {
          it.shown = shown;
          it.el.style.visibility = shown ? '' : 'hidden';
        }
        if (a <= this.reach + 4 && !it.img.getAttribute('src')) it.img.src = it.img.dataset.src;
        // tấm ở giữa và hai tấm sát bên: ảnh gốc cho nét – trừ lúc đang tự trượt (mỗi mẫu chỉ dừng
        // ~1 giây, tải ảnh gốc từng bước rất tốn dung lượng); khách dừng lại xem thì mới thay
        if (a < 1.5 && !this.autoActive()) this.sharpen(it);
        if (!shown) continue;

        const spread = a >= 1 ? 0.5 : a - (a * a) / 2;
        const x = this.step * t + Math.sign(t) * open * spread;
        const turn = -TURN * clamp(t, -1, 1) * (1 - 0.22 * it.peek);
        const z = LIFT * Math.max(0, 1 - a);
        const key = `${x.toFixed(1)}|${turn.toFixed(2)}|${it.theta.toFixed(2)}`;
        if (key === it.key) continue;
        it.key = key;
        it.el.style.transform = `translate3d(${x.toFixed(1)}px,0,${z.toFixed(1)}px) rotate(${it.theta.toFixed(2)}deg) rotateY(${turn.toFixed(2)}deg)`;
        it.el.style.zIndex = String(1000 - Math.round(a * 10));
        it.shade.style.opacity = (0.2 * Math.min(1, a) * (1 - 0.4 * it.peek)).toFixed(3);
      }
    }

    // Thay ảnh thu nhỏ bằng ảnh gốc (data-full): tải xong mới thay nên không nháy trắng
    sharpen(it) {
      const full = it.img.dataset.full;
      if (!full || it.sharp) return;
      it.sharp = true;
      const pre = new Image();
      pre.onload = () => { it.img.src = full; };
      pre.src = full;
    }

    report() {
      // Giữ số nhỏ khi đã dừng (dời cả vị trí lẫn đích đi một vòng không làm đổi hình)
      if (!this.drag && !this.wheelTimer) {
        const shift = Math.floor(this.target / this.n) * this.n;
        if (shift) {
          this.target -= shift;
          this.pos -= shift;
          this.prevPos -= shift;
        }
      }
      const i = mod(Math.round(this.pos), this.n);
      if (i === this.active) return;
      if (this.active >= 0) this.items[this.active].el.classList.remove('is-active');
      this.active = i;
      this.items[i].el.classList.add('is-active');
      this.onChange(i);
    }
  }

  window.Rail = Rail;
})();
