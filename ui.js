/* ============================================================
   ui.js — ยูทิลิตี้ UI : modal, spinner, skeleton, alert, อัพโหลดรูป, ลายเซ็น
   ============================================================ */
var UI = (function () {

  var THAI_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                     'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  var THAI_MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

  function $(s, root) { return (root || document).querySelector(s); }
  function $$(s, root) { return Array.prototype.slice.call((root || document).querySelectorAll(s)); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---------- วันที่ ---------- */
  function thDate(iso, short) {
    if (!iso) return '-';
    var p = String(iso).split('-'); if (p.length < 3) return iso;
    var d = parseInt(p[2], 10), m = parseInt(p[1], 10) - 1, y = parseInt(p[0], 10) + 543;
    return d + ' ' + (short ? THAI_MONTHS_SHORT[m] : THAI_MONTHS[m]) + ' ' + y;
  }
  function thDateShort(iso) { return thDate(iso, true); }
  function todayISO() {
    var d = new Date(), m = d.getMonth() + 1, dd = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (dd < 10 ? '0' + dd : dd);
  }
  function daysBetween(a, b) {
    if (!a || !b) return 0;
    var d1 = new Date(a + 'T00:00:00'), d2 = new Date(b + 'T00:00:00');
    if (isNaN(d1) || isNaN(d2) || d2 < d1) return 0;
    return Math.round((d2 - d1) / 86400000) + 1;
  }
  function rangeText(a, b) {
    if (!a) return '-';
    if (!b || a === b) return thDateShort(a);
    return thDateShort(a) + ' - ' + thDateShort(b);
  }

  /* ---------- ป้าย/ชื่อ ---------- */
  function roleName(r) {
    var x = DB.ROLES.filter(function (o) { return o.id === r; })[0];
    return x ? x.name : r;
  }
  function typeName(t) {
    var x = DB.LEAVE_TYPES.filter(function (o) { return o.id === t; })[0];
    return x ? x.name : t;
  }
  function typeBadge(t) {
    var x = DB.LEAVE_TYPES.filter(function (o) { return o.id === t; })[0];
    return '<span class="badge ' + (x ? x.badge : 'badge-gray') + '">' + esc(x ? x.name : t) + '</span>';
  }
  function statusBadge(s) {
    if (s === 'approved') return '<span class="badge badge-ok"><i class="fa-solid fa-circle-check"></i> อนุญาต</span>';
    if (s === 'rejected') return '<span class="badge badge-no"><i class="fa-solid fa-circle-xmark"></i> ไม่อนุญาต</span>';
    return '<span class="badge badge-wait"><i class="fa-regular fa-clock"></i> รออนุญาต</span>';
  }
  function statusText(s) {
    return s === 'approved' ? 'อนุญาต' : s === 'rejected' ? 'ไม่อนุญาต' : 'รออนุญาต';
  }
  function avatarOf(u) { return (u && u.avatar) ? u.avatar : DB.AVATAR; }

  /* ---------- overlay / spinner ---------- */
  var ovCount = 0;
  function busy(text) {
    ovCount++;
    var ov = $('#overlay');
    $('#overlayText').textContent = text || 'กำลังดำเนินการ...';
    ov.classList.remove('hidden'); ov.classList.add('flex');
  }
  function idle() {
    ovCount = Math.max(0, ovCount - 1);
    if (ovCount === 0) {
      var ov = $('#overlay');
      ov.classList.add('hidden'); ov.classList.remove('flex');
    }
  }
  /** จำลองการโหลดข้อมูล (lazy) */
  function delay(ms) { return new Promise(function (r) { setTimeout(r, ms == null ? 450 : ms); }); }
  function btnLoading(btn, on, label) {
    if (!btn) return;
    if (on) {
      btn.dataset.html = btn.innerHTML; btn.disabled = true;
      btn.innerHTML = '<span class="spinner spinner-sm"></span> ' + (label || 'กำลังบันทึก...');
    } else {
      btn.disabled = false;
      if (btn.dataset.html) btn.innerHTML = btn.dataset.html;
    }
  }

  /* ---------- skeleton ---------- */
  function skTable(rows, cols) {
    var h = '<div class="card card-pad space-y-3">';
    h += '<div class="sk h-6 w-48"></div>';
    for (var i = 0; i < (rows || 6); i++) {
      h += '<div class="flex gap-3">';
      for (var j = 0; j < (cols || 6); j++) h += '<div class="sk h-9 flex-1"></div>';
      h += '</div>';
    }
    return h + '</div>';
  }
  function skCards(n) {
    var h = '<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">';
    for (var i = 0; i < (n || 4); i++)
      h += '<div class="card card-pad space-y-3"><div class="sk h-10 w-10 rounded-xl"></div>' +
           '<div class="sk h-7 w-24"></div><div class="sk h-4 w-32"></div></div>';
    return h + '</div>';
  }
  function skForm() {
    var h = '<div class="card card-pad space-y-4">';
    for (var i = 0; i < 5; i++) h += '<div class="space-y-2"><div class="sk h-4 w-28"></div><div class="sk h-11 w-full"></div></div>';
    return h + '</div>';
  }

  /* ---------- sweetalert ---------- */
  var BRAND = '#BE185D';
  function toast(msg, icon) {
    Swal.fire({
      toast: true, position: 'top-end', timer: 2600, timerProgressBar: true,
      showConfirmButton: false, icon: icon || 'success', title: msg
    });
  }
  function ok(title, text) {
    return Swal.fire({ icon: 'success', title: title, text: text || '',
      confirmButtonColor: BRAND, confirmButtonText: 'ตกลง' });
  }
  function err(title, text) {
    return Swal.fire({ icon: 'error', title: title, text: text || '',
      confirmButtonColor: '#D32F2F', confirmButtonText: 'ตกลง' });
  }
  function warn(title, text) {
    return Swal.fire({ icon: 'warning', title: title, text: text || '',
      confirmButtonColor: '#F57C00', confirmButtonText: 'ตกลง' });
  }
  function confirmDel(title, text) {
    return Swal.fire({
      icon: 'warning', title: title || 'ยืนยันการลบข้อมูล?',
      text: text || 'ข้อมูลที่ลบแล้วไม่สามารถกู้คืนได้',
      showCancelButton: true, confirmButtonText: '<i class="fa-solid fa-trash"></i> ลบข้อมูล',
      cancelButtonText: 'ยกเลิก', confirmButtonColor: '#D32F2F', cancelButtonColor: '#94a3b8',
      reverseButtons: true
    }).then(function (r) { return r.isConfirmed; });
  }
  function confirmAsk(title, text, btn) {
    return Swal.fire({
      icon: 'question', title: title, html: text || '',
      showCancelButton: true, confirmButtonText: btn || 'ยืนยัน', cancelButtonText: 'ยกเลิก',
      confirmButtonColor: BRAND, cancelButtonColor: '#94a3b8', reverseButtons: true
    }).then(function (r) { return r.isConfirmed; });
  }

  /* ---------- modal ---------- */
  var onCloseCb = null;
  function modal(opt) {
    $('#modalTitle').textContent = opt.title || '';
    $('#modalSub').textContent = opt.sub || '';
    $('#modalIcon').innerHTML = '<i class="fa-solid ' + (opt.icon || 'fa-pen') + '"></i>';
    $('#modalBody').innerHTML = opt.body || '';
    $('#modalFoot').innerHTML = opt.foot || '';
    $('#modalCard').className = 'modal-card w-full ' + (opt.size || 'max-w-2xl');
    $('#modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    onCloseCb = opt.onClose || null;
    if (opt.onOpen) opt.onOpen($('#modalBody'));
  }
  function closeModal() {
    $('#modal').classList.add('hidden');
    document.body.style.overflow = '';
    $('#modalBody').innerHTML = '';
    if (onCloseCb) { var c = onCloseCb; onCloseCb = null; c(); }
  }

  /* ---------- อัพโหลดรูป -> dataURL (ย่อขนาดอัตโนมัติ) ---------- */
  function fileToDataURL(file, maxW, maxH) {
    return new Promise(function (resolve, reject) {
      if (!file) return resolve('');
      if (!/^image\//.test(file.type)) return reject(new Error('กรุณาเลือกไฟล์รูปภาพ'));
      var fr = new FileReader();
      fr.onerror = function () { reject(new Error('อ่านไฟล์ไม่สำเร็จ')); };
      fr.onload = function () {
        var img = new Image();
        img.onload = function () {
          var mw = maxW || 500, mh = maxH || 500;
          var r = Math.min(1, mw / img.width, mh / img.height);
          var w = Math.round(img.width * r), h = Math.round(img.height * r);
          var c = document.createElement('canvas'); c.width = w; c.height = h;
          var x = c.getContext('2d');
          if (/png|webp/i.test(file.type)) { x.clearRect(0, 0, w, h); }
          else { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); }
          x.drawImage(img, 0, 0, w, h);
          resolve(c.toDataURL(/png|webp/i.test(file.type) ? 'image/png' : 'image/jpeg', 0.85));
        };
        img.onerror = function () { reject(new Error('ไฟล์รูปภาพไม่ถูกต้อง')); };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }
  /** ผูก input[type=file] กับ <img> พรีวิว  (เก็บค่าไว้ที่ input.dataset.value) */
  function bindUpload(input, preview, maxW, maxH) {
    if (!input) return;
    input.addEventListener('change', function () {
      var f = input.files && input.files[0];
      if (!f) return;
      busy('กำลังประมวลผลรูปภาพ...');
      fileToDataURL(f, maxW, maxH).then(function (d) {
        input.dataset.value = d;
        if (preview) { preview.src = d; preview.classList.remove('hidden'); }
        idle();
      }).catch(function (e) { idle(); err('อัพโหลดไม่สำเร็จ', e.message); input.value = ''; });
    });
  }

  /* ---------- ลายเซ็น (canvas) ---------- */
  function signaturePad(canvas) {
    var ctx = canvas.getContext('2d'), drawing = false, dirty = false;
    function fit() {
      var r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      var data = dirty ? canvas.toDataURL() : null;
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0f172a';
      if (data) { var im = new Image(); im.onload = function () { ctx.drawImage(im, 0, 0, r.width, r.height); }; im.src = data; }
    }
    function pos(e) {
      var r = canvas.getBoundingClientRect();
      var t = e.touches ? e.touches[0] : e;
      return { x: t.clientX - r.left, y: t.clientY - r.top };
    }
    function start(e) { e.preventDefault(); drawing = true; dirty = true; var p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); }
    function move(e) { if (!drawing) return; e.preventDefault(); var p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); }
    function end() { drawing = false; }
    canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end);
    setTimeout(fit, 30);
    window.addEventListener('resize', fit);
    return {
      clear: function () { ctx.clearRect(0, 0, canvas.width, canvas.height); dirty = false; },
      isEmpty: function () { return !dirty; },
      toDataURL: function () { return dirty ? canvas.toDataURL('image/png') : ''; },
      refit: fit
    };
  }

  /** บล็อกเลือกวิธีลงลายเซ็น : สแกน / เซ็นสด */
  function signatureBlockHTML(id, scanSrc, label) {
    var hasScan = !!scanSrc;
    return '' +
    '<div class="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">' +
      '<p class="mb-3 text-sm font-semibold text-slate-700"><i class="fa-solid fa-signature text-brand-600"></i> ' + esc(label || 'ลงชื่อ') + ' <span class="req text-danger2">*</span></p>' +
      '<div class="mb-3 flex flex-wrap gap-2">' +
        '<label class="btn-ghost cursor-pointer" data-sigmode="' + id + '">' +
          '<input type="radio" name="sigmode_' + id + '" value="scan" class="accent-brand-600" ' + (hasScan ? 'checked' : 'disabled') + '> ลายเซ็นสแกน' +
        '</label>' +
        '<label class="btn-ghost cursor-pointer" data-sigmode="' + id + '">' +
          '<input type="radio" name="sigmode_' + id + '" value="draw" class="accent-brand-600" ' + (hasScan ? '' : 'checked') + '> ลายเซ็นสด (วาด)' +
        '</label>' +
      '</div>' +
      (hasScan
        ? '<div id="' + id + '_scan" class="rounded-xl border border-slate-200 bg-white p-3 text-center">' +
            '<img src="' + scanSrc + '" alt="ลายเซ็นสแกน" class="mx-auto h-24 object-contain">' +
          '</div>'
        : '<div class="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-warn2">' +
          '<i class="fa-solid fa-triangle-exclamation"></i> ยังไม่มีรูปลายเซ็นสแกนในระบบ (อัพโหลดได้ที่เมนูแก้ไขข้อมูลส่วนตัว)</div>') +
      '<div id="' + id + '_draw" class="' + (hasScan ? 'hidden' : '') + '">' +
        '<div class="sig-box"><canvas id="' + id + '_canvas"></canvas></div>' +
        '<div class="mt-2 flex items-center justify-between">' +
          '<span class="text-xs text-slate-400">ใช้เมาส์หรือนิ้วเซ็นในกรอบ</span>' +
          '<button type="button" id="' + id + '_clear" class="btn-ghost text-xs"><i class="fa-solid fa-eraser"></i> ล้างลายเซ็น</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /** เรียกหลัง modal เปิด : คืน object {get:()=>dataURL} */
  function initSignatureBlock(id, scanSrc) {
    var cv = document.getElementById(id + '_canvas');
    var pad = cv ? signaturePad(cv) : null;
    var clr = document.getElementById(id + '_clear');
    if (clr && pad) clr.addEventListener('click', function () { pad.clear(); });
    function mode() {
      var r = document.querySelector('input[name="sigmode_' + id + '"]:checked');
      return r ? r.value : 'draw';
    }
    $$('input[name="sigmode_' + id + '"]').forEach(function (r) {
      r.addEventListener('change', function () {
        var sc = document.getElementById(id + '_scan'), dw = document.getElementById(id + '_draw');
        if (sc) sc.classList.toggle('hidden', mode() !== 'scan');
        if (dw) dw.classList.toggle('hidden', mode() !== 'draw');
        if (mode() === 'draw' && pad) setTimeout(pad.refit, 30);
      });
    });
    return {
      get: function () {
        if (mode() === 'scan') return scanSrc || '';
        return pad ? pad.toDataURL() : '';
      },
      mode: mode
    };
  }

  /* ---------- อื่น ๆ ---------- */
  function emptyRow(cols, text) {
    return '<tr><td colspan="' + cols + '" class="py-10 text-center text-slate-400">' +
      '<i class="fa-regular fa-folder-open mb-2 block text-3xl"></i>' + esc(text || 'ไม่พบข้อมูล') + '</td></tr>';
  }
  function pageHead(title, desc, actionsHTML) {
    return '<div class="mb-5 flex flex-wrap items-end justify-between gap-3">' +
      '<div><h2 class="text-lg font-bold text-slate-800 sm:text-xl">' + esc(title) + '</h2>' +
      '<p class="mt-0.5 text-xs text-slate-500 sm:text-sm">' + esc(desc || '') + '</p></div>' +
      '<div class="flex flex-wrap gap-2">' + (actionsHTML || '') + '</div></div>';
  }
  function stat(icon, color, label, value, unit) {
    return '<div class="card card-pad">' +
      '<div class="flex items-start justify-between">' +
        '<div class="grid h-11 w-11 place-items-center rounded-xl text-white" style="background:' + color + '">' +
          '<i class="fa-solid ' + icon + '"></i></div>' +
      '</div>' +
      '<p class="mt-3 text-2xl font-bold text-slate-800">' + esc(value) +
        (unit ? ' <span class="text-sm font-medium text-slate-400">' + esc(unit) + '</span>' : '') + '</p>' +
      '<p class="text-xs text-slate-500">' + esc(label) + '</p></div>';
  }

  return {
    $: $, $$: $$, esc: esc,
    thDate: thDate, thDateShort: thDateShort, todayISO: todayISO, daysBetween: daysBetween, rangeText: rangeText,
    roleName: roleName, typeName: typeName, typeBadge: typeBadge, statusBadge: statusBadge, statusText: statusText,
    avatarOf: avatarOf,
    busy: busy, idle: idle, delay: delay, btnLoading: btnLoading,
    skTable: skTable, skCards: skCards, skForm: skForm,
    toast: toast, ok: ok, err: err, warn: warn, confirmDel: confirmDel, confirmAsk: confirmAsk,
    modal: modal, closeModal: closeModal,
    fileToDataURL: fileToDataURL, bindUpload: bindUpload,
    signaturePad: signaturePad, signatureBlockHTML: signatureBlockHTML, initSignatureBlock: initSignatureBlock,
    emptyRow: emptyRow, pageHead: pageHead, stat: stat
  };
})();
