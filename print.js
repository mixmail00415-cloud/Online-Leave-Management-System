/* ============================================================
   print.js — สร้างใบลาและสั่งพิมพ์ด้วย window.print()
   ============================================================ */
var PRINT = (function () {

  function esc(s) { return UI.esc(s); }

  /** แท็ก CSS สำหรับหน้าต่างพิมพ์
   *  - เปิดไฟล์ตรง ๆ : อ้าง assets/style.css ด้วย URL เต็ม (about:blank ใช้ path แบบ relative ไม่ได้)
   *  - บน Google Apps Script : ไม่มีไฟล์ .css ให้อ้าง จึงคัดลอก <style> ในหน้าไปทั้งหมด */
  function cssTag() {
    var link = document.querySelector('link[href$="assets/style.css"]');
    if (link && link.href) return '<link rel="stylesheet" href="' + link.href + '">';

    var css = '';
    Array.prototype.forEach.call(document.querySelectorAll('style'), function (s) {
      css += (s.textContent || '') + '\n';
    });
    if (css) return '<style>' + css + '</style>';

    try { return '<link rel="stylesheet" href="' + new URL('assets/style.css', location.href).href + '">'; }
    catch (e) { return ''; }
  }

  var FIT_STEPS = ['pp-fit1', 'pp-fit2', 'pp-fit3', 'pp-fit4'];   /* 15.5 / 15 / 14.5 / 14 pt */

  /** บีบใบลาให้จบใน 1 หน้า A4 เสมอ
   *  ขั้นที่ 1 : ลดขนาดอักษร 16 → 14pt ทีละขั้น (ตามมาตรฐานเอกสารราชการ)
   *  ขั้นที่ 2 : ถ้ายังไม่พอ ย่อทั้งใบตามสัดส่วน เพื่อรับประกันว่าไม่ล้นไปหน้า 2
   */
  function fitOnePage(win) {
    var d = win.document;
    var el = d.querySelector('.print-paper');
    var inner = el && el.querySelector('.pp-inner');
    if (!el || !inner || !win.getComputedStyle) return;

    /* พื้นที่พิมพ์ = ความสูง content box ของกระดาษ (29.7 - ขอบบน - ขอบล่าง) */
    var cs = win.getComputedStyle(el);
    var limit = el.clientHeight - parseFloat(cs.paddingTop || 0) - parseFloat(cs.paddingBottom || 0);
    if (!(limit > 0)) return;

    /* ล้างค่าเดิมก่อนวัดใหม่ */
    inner.style.transform = '';
    inner.style.width = '';
    FIT_STEPS.forEach(function (c) { el.classList.remove(c); });

    function contentH() { return inner.getBoundingClientRect().height; }

    /* ขั้นที่ 1 : ลดขนาดอักษร 16 -> 14pt */
    for (var i = 0; i < FIT_STEPS.length && contentH() > limit; i++) {
      if (i > 0) el.classList.remove(FIT_STEPS[i - 1]);
      el.classList.add(FIT_STEPS[i]);
    }

    /* ขั้นที่ 2 : ย่อทั้งใบตามสัดส่วน ถ้า 14pt แล้วยังล้น
       ใช้ transform:scale ซึ่งทำงานเหมือนกันทั้งบนจอและตอนพิมพ์ */
    var h = contentH();
    if (h > limit) {
      var ratio = Math.max(0.45, (limit / h) * 0.98);
      inner.style.width = (100 / ratio) + '%';
      inner.style.transform = 'scale(' + ratio + ')';
    }
  }

  /** รอรูปภาพ (โลโก้/ลายเซ็น) โหลดเสร็จก่อนวัดความสูง ไม่งั้นคำนวณพลาด */
  function whenReady(win, cb) {
    var imgs = [], i;
    try { imgs = Array.prototype.slice.call(win.document.images); } catch (e) {}
    var left = 0, done = false;
    function finish() { if (!done) { done = true; cb(); } }
    for (i = 0; i < imgs.length; i++) {
      if (!imgs[i].complete) {
        left++;
        imgs[i].addEventListener('load', step);
        imgs[i].addEventListener('error', step);
      }
    }
    function step() { if (--left <= 0) ready(); }
    /* รอฟอนต์ด้วย : ถ้าวัดก่อนฟอนต์ไทยสลับเข้ามา ความสูงจะเพี้ยนและล้นหน้า */
    function ready() {
      var f = win.document.fonts;
      if (f && f.ready && f.ready.then) f.ready.then(function () { setTimeout(finish, 80); });
      else setTimeout(finish, 300);
    }
    if (!left) ready();
    setTimeout(finish, 3000);   /* กันค้างกรณีรูป/ฟอนต์โหลดไม่ขึ้น */
  }

  function dot(txt, grow) {
    return '<span class="pp-dot' + (grow ? ' grow' : '') + '">' + (txt == null || txt === '' ? '&nbsp;' : esc(txt)) + '</span>';
  }
  function cb(checked, label) {
    return '<span style="white-space:nowrap"><span class="cb">' + (checked ? '&#10004;' : '&nbsp;') + '</span>' + esc(label) + '</span>';
  }

  /** แยกวัน / เดือน(ไทย) / พ.ศ. ของวันที่ ISO (สำหรับแบบฟอร์มที่เว้นช่องแยกกัน) */
  function dmy(iso) {
    if (!iso) return { d: '', m: '', y: '' };
    var p = String(iso).split('-');
    if (p.length < 3) return { d: iso, m: '', y: '' };
    var M = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
             'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
    return { d: String(parseInt(p[2], 10)), m: M[parseInt(p[1], 10) - 1], y: String(parseInt(p[0], 10) + 543) };
  }

  /** ตารางสถิติการลาในใบลา (ลามาแล้ว / ลาครั้งนี้ / รวมเป็น) */
  function statTable(l) {
    var before = l.summaryBefore || {};
    var h = '<table class="pp-tbl"><thead><tr>' +
      '<th style="width:28%">ประเภทการลา</th><th>ลามาแล้ว (วัน)</th>' +
      '<th>ลาครั้งนี้ (วัน)</th><th>รวมเป็น (วัน)</th></tr></thead><tbody>';
    DB.FORM_TYPES.forEach(function (t) {
      var b = Number((before[t.id] || {}).days || 0);
      var now = (l.leaveType === t.id) ? Number(l.days || 0) : 0;
      h += '<tr><td style="text-align:left">' + esc(t.name) + '</td>' +
        '<td>' + b + '</td><td>' + (now || '-') + '</td><td>' + (b + now) + '</td></tr>';
    });
    return h + '</tbody></table>';
  }

  /** บล็อกลายเซ็น */
  function signBlock(label, sig, name, position, extra) {
    return '<div class="pp-sign">' +
      (label ? '<div>' + esc(label) + '</div>' : '') +
      (sig ? '<img src="' + sig + '" alt="ลายเซ็น">' : '<div style="height:60px"></div>') +
      '<div class="pp-sline"></div>' +
      '<div>( ' + esc(name || '-') + ' )</div>' +
      '<div>' + esc(position || '-') + '</div>' +
      (extra ? '<div>' + esc(extra) + '</div>' : '') +
      '</div>';
  }

  /** บล็อกลายเซ็นแบบบรรทัดจุดไข่ปลา (ใช้ในใบลาพักผ่อน) */
  function signLine(prefix, suffix, sig, name, position, dateIso, posLabel) {
    var h = '<div class="pp-sline-blk">';
    h += '<div class="pp-row">' + esc(prefix || 'ลงชื่อ') +
         '<span class="pp-dot grow" style="text-align:center">' +
         (sig ? '<img class="pp-sig-inline" src="' + sig + '" alt="ลายเซ็น">' : '&nbsp;') +
         '</span>' + esc(suffix || '') + '</div>';
    h += '<div class="pp-row" style="padding-left:1.4cm">(' + dot(name || '', true) + ')</div>';
    if (position !== false) h += '<div class="pp-row">' + esc(posLabel || 'ตำแหน่ง') + dot(position || '', true) + '</div>';
    if (dateIso !== false) h += '<div class="pp-row">วันที่' + dot(dateIso ? UI.thDate(dateIso) : '', true) + '</div>';
    return h + '</div>';
  }

  /* ============================================================
     แบบใบลาพักผ่อน (ตามแบบฟอร์มราชการ)
     ============================================================ */
  function vacationSheet(l) {
    var st = DB.settings();
    var office = l.writtenAt || st.officeName;
    var affil = l.affiliation || st.affiliation;
    var district = l.district || st.district || 'กู่แก้ว';
    var doc = dmy(l.docDate), s = dmy(l.startDate), e = dmy(l.endDate);
    var v = l.vacation || {};

    var h = '<div class="print-paper pp-vac"><div class="pp-inner">';

    h += '<div class="pp-head"><div class="pp-title pp-ul">แบบใบลาพักผ่อน</div></div>';

    /* เขียนที่ / วันที่ */
    h += '<div class="pp-right">' +
         '<div class="pp-row" style="justify-content:flex-end">เขียนที่ ' + esc(office) + '</div>' +
         '<div class="pp-row" style="justify-content:flex-end">วันที่ ' + dot(doc.d) +
           ' เดือน ' + dot(doc.m) + ' พ.ศ. ' + dot(doc.y) + '</div>' +
         '</div>';

    h += '<div class="pp-row"><b>เรื่อง</b>&nbsp;&nbsp;ขอลาพักผ่อน</div>';
    h += '<div class="pp-row"><b>เรียน</b>&nbsp;&nbsp;นายอำเภอ' + esc(district) + '</div>';

    /* ย่อหน้าที่ 1 */
    h += '<div class="pp-para">' +
         '<span class="pp-ind2"></span>ข้าพเจ้า ' + dot(l.applicantName, true) +
         ' ตำแหน่ง ' + dot(l.applicantPosition, true) +
         ' สังกัด ' + dot(affil, true) +
         ' มีวันลาพักผ่อนสะสม ' + dot(v.carry) +
         ' มีสิทธิลาพักผ่อนประจำปีนี้อีก ' + dot(v.remain) + ' วันทำการ' +
         ' รวมเป็น ' + dot(v.total) + ' วันทำการ' +
         '</div>';

    /* ย่อหน้าที่ 2 */
    h += '<div class="pp-para">' +
         '<span class="pp-ind2"></span>ขอลาพักผ่อน ตั้งแต่วันที่ ' + dot(s.d) + ' เดือน ' + dot(s.m) + ' พ.ศ. ' + dot(s.y) +
         ' ถึงวันที่ ' + dot(e.d) + ' เดือน ' + dot(e.m) + ' พ.ศ. ' + dot(e.y) +
         ' กำหนด ' + dot(l.days) + ' วัน' +
         ' ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่ โทรศัพท์ ' + dot(l.contact, true) +
         '</div>';

    /* ลงชื่อผู้ลา */
    h += '<div class="pp-sign" style="margin:14px 0">' +
         (l.signature ? '<img src="' + l.signature + '" alt="ลายเซ็น">' : '<div style="height:60px"></div>') +
         '<div>ลงชื่อ<span class="pp-dotline"></span></div>' +
         '<div>( ' + esc(l.applicantName || '-') + ' )</div>' +
         '<div>ตำแหน่ง ' + esc(l.applicantPosition || '-') + '</div>' +
         '</div>';

    /* สถิติการลาพักผ่อน */
    h += '<div class="pp-ul" style="font-weight:700">สถิติการลาในปีงบประมาณนี้</div>' +
         '<table class="pp-tbl" style="width:62%;margin-left:0">' +
         '<thead><tr><th>ลามาแล้ว<br>(วันทำการ)</th><th>ลาครั้งนี้<br>(เว้นวันทำการ)</th>' +
         '<th>รวมเป็น<br>(วันทำการ)</th></tr></thead><tbody>' +
         '<tr><td>' + esc(v.used != null ? v.used : 0) + '</td><td>' + esc(l.days || 0) + '</td>' +
         '<td>' + esc(Number(v.used || 0) + Number(l.days || 0)) + '</td></tr>' +
         '</tbody></table>';

    /* สองคอลัมน์ล่าง */
    h += '<div class="pp-cols" style="margin-top:16px">';

    /* ซ้าย : ผู้ตรวจสอบ + ผู้ปฏิบัติงานแทน */
    h += '<div>';
    h += signLine('(ลงชื่อ)', 'ผู้ตรวจสอบ', l.checkerSignature, l.checkerName, l.checkerPosition,
                  l.checkedAt ? String(l.checkedAt).slice(0, 10) : '', '(ตำแหน่ง)');
    h += '<div style="margin-top:12px"><span class="pp-ul">หมายเหตุ</span> ขอมอบหมายงานในหน้าที่ของข้าพเจ้า</div>' +
         '<div class="pp-row">ให้ ' + dot(l.deputyName, true) + ' ตำแหน่ง ' + dot(l.deputyPosition, true) +
         ' เป็นผู้ปฏิบัติงานแทน</div>';
    h += signLine('(ลงลายมือชื่อ)', 'ผู้ปฏิบัติงานแทน', l.deputySignature, l.deputyName, false, false, '');
    h += '<div class="pp-row">วันที่ ' + dot(dmy(l.docDate).d) + ' เดือน ' + dot(dmy(l.docDate).m) +
         ' พ.ศ. ' + dot(dmy(l.docDate).y) + '</div>';
    h += '</div>';

    /* ขวา : ความเห็นผู้บังคับบัญชา (สาธารณสุขอำเภอ) + คำสั่ง (นายอำเภอ)
       ถ้ายังไม่ได้ให้ความเห็น ดึงชื่อ/ตำแหน่งสาธารณสุขอำเภอจากระบบมาแสดงไว้ก่อน */
    var boss = DB.chief() || {};
    var bossName = l.chiefName || boss.fullname || '';
    var bossPos = l.chiefPosition || boss.position || 'สาธารณสุขอำเภอ' + district;

    h += '<div>';
    h += '<div style="text-align:center;font-weight:700" class="pp-ul">ความเห็นผู้บังคับบัญชา</div>' +
         '<div class="pp-row">' + dot(l.chiefComment || '', true) + '</div>';
    h += signLine('ลงชื่อ', '', l.chiefSignature, bossName, bossPos,
                  l.chiefDecidedAt ? String(l.chiefDecidedAt).slice(0, 10) : '', 'ตำแหน่ง');
    /* คำสั่ง : เว้นว่างให้นายอำเภอลงนามด้วยปากกา */
    h += '<div style="margin-top:18px;text-align:center;font-weight:700" class="pp-ul">คำสั่ง</div>' +
         '<div style="text-align:center">' + cb(false, 'อนุญาต') +
         '&nbsp;&nbsp;&nbsp;&nbsp;' + cb(false, 'ไม่อนุญาต') + '</div>';
    h += signLine('ลงชื่อ', '', '', '', 'นายอำเภอ' + district, '', 'ตำแหน่ง');
    h += '</div>';

    h += '</div>';
    return h + '</div></div>';
  }

  /** HTML ใบลาหนึ่งใบ */
  function sheetHTML(l) {
    if (l.leaveType === 'vacation') return vacationSheet(l);
    return normalSheet(l);
  }

  function normalSheet(l) {
    var st = DB.settings();
    var logo = st.logo || DB.DEFAULT_LOGO;
    var office = l.writtenAt || st.officeName;
    var affil = l.affiliation || st.affiliation;

    var h = '<div class="print-paper"><div class="pp-inner">';

    /* หัวกระดาษ */
    h += '<div class="pp-head">' +
         '<img class="pp-logo" src="' + logo + '" alt="โลโก้">' +
         '<div class="pp-title">แบบใบลาป่วย ลากิจส่วนตัว ลาคลอดบุตร</div>' +
         '<div>' + esc(office) + '</div>' +
         '</div>';

    /* เขียนที่ / วันที่ */
    h += '<div style="text-align:right;margin-top:6px">' +
         '<div class="pp-row" style="justify-content:flex-end">เขียนที่ ' + dot(office) + '</div>' +
         '<div class="pp-row" style="justify-content:flex-end">วันที่ ' + dot(UI.thDate(l.docDate)) + '</div>' +
         '</div>';

    h += '<div class="pp-row">เรื่อง ' + dot(l.subject, true) + '</div>';
    h += '<div>เรียน สาธารณสุขอำเภอกู่แก้ว</div>';

    /* เนื้อหา */
    h += '<div class="pp-row pp-ind">ข้าพเจ้า ' + dot(l.applicantName, true) +
         ' ตำแหน่ง ' + dot(l.applicantPosition, true) + '</div>';
    h += '<div class="pp-row">สังกัด ' + dot(affil, true) + '</div>';

    h += '<div class="pp-row">ขอลา ' +
         cb(l.leaveType === 'sick', 'ลาป่วย') + ' ' +
         cb(l.leaveType === 'personal', 'ลากิจส่วนตัว') + ' ' +
         cb(l.leaveType === 'maternity', 'ลาคลอดบุตร') +
         ' เนื่องจาก ' + dot(l.reason, true) + '</div>';

    h += '<div class="pp-row">ตั้งแต่วันที่ ' + dot(UI.thDate(l.startDate)) +
         ' ถึงวันที่ ' + dot(UI.thDate(l.endDate)) +
         ' มีกำหนด ' + dot(l.days) + ' วัน</div>';

    /* การลาครั้งสุดท้าย */
    if (l.lastType) {
      h += '<div class="pp-row pp-ind">ข้าพเจ้าได้ลา ' +
           cb(l.lastType === 'sick', 'ลาป่วย') + ' ' +
           cb(l.lastType === 'personal', 'ลากิจส่วนตัว') + ' ' +
           cb(l.lastType === 'maternity', 'ลาคลอดบุตร') + '</div>';
      h += '<div class="pp-row">ครั้งสุดท้ายตั้งแต่วันที่ ' + dot(UI.thDate(l.lastStart)) +
           ' ถึงวันที่ ' + dot(UI.thDate(l.lastEnd)) +
           ' มีกำหนด ' + dot(l.lastDays) + ' วัน</div>';
    } else {
      h += '<div class="pp-row pp-ind">ข้าพเจ้าได้ลา ' +
           cb(false, 'ลาป่วย') + ' ' + cb(false, 'ลากิจส่วนตัว') + ' ' + cb(false, 'ลาคลอดบุตร') +
           ' ครั้งสุดท้ายตั้งแต่วันที่ ' + dot('-') + ' ถึงวันที่ ' + dot('-') +
           ' มีกำหนด ' + dot('-') + ' วัน</div>';
    }

    h += '<div class="pp-row">ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่ ' + dot(l.contact, true) + '</div>';

    /* ลงชื่อผู้ลา */
    h += '<div style="margin-top:10px;text-align:center">ขอแสดงความนับถือ</div>';
    h += '<div style="width:52%;margin-left:auto">' +
         signBlock('ขอลา', l.signature, l.applicantName, l.applicantPosition) +
         '</div>';

    /* สถิติการลา */
    h += '<div style="margin-top:10px;font-weight:700">สถิติการลาในปีงบประมาณ ' +
         esc(l.fyName || '-') + ' (รอบที่ ' + esc(l.round || '-') + ')</div>';
    h += statTable(l);

    /* ความเห็น/คำสั่งสาธารณสุขอำเภอ */
    h += '<div class="pp-cols">';
    h += '<div><div style="font-weight:700">ความเห็นผู้บังคับบัญชา</div>' +
         '<div class="pp-row">' + dot(l.chiefComment || '', true) + '</div>' +
         signBlock('', l.chiefSignature, l.chiefName, l.chiefPosition) + '</div>';
    h += '<div><div style="font-weight:700">คำสั่ง</div>' +
         '<div>' + cb(l.status === 'approved', 'อนุญาต') + ' ' +
         cb(l.status === 'rejected', 'ไม่อนุญาต') + '</div>' +
         signBlock('', l.chiefSignature, l.chiefName, l.chiefPosition,
           l.chiefDecidedAt ? 'วันที่ ' + UI.thDate(String(l.chiefDecidedAt).slice(0, 10)) : '') + '</div>';
    h += '</div>';

    return h + '</div></div>';
  }

  /** เอกสารใบลาฉบับเต็ม (ใช้ทั้งหน้าต่างพิมพ์และพรีวิว จึงได้ผลลัพธ์ตรงกัน) */
  function docHTML(l) {
    return '<!doctype html><html lang="th"><head><meta charset="utf-8">' +
      '<title>ใบลา - ' + esc(l.applicantName || '') + '</title>' +
      '<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">' +
      cssTag() +
      '</head><body style="background:#fff;margin:0">' + sheetHTML(l) + '</body></html>';
  }

  /** เปิดหน้าต่างใหม่แล้วสั่งพิมพ์ (window print) */
  function leave(leaveOrId) {
    var l = (typeof leaveOrId === 'string') ? DB.leaveById(leaveOrId) : leaveOrId;
    if (!l) { UI.err('ไม่พบข้อมูลใบลา'); return; }

    UI.busy('กำลังเตรียมใบลา...');
    var html = docHTML(l);

    var w = window.open('', '_blank');
    if (!w) {
      UI.idle();
      UI.warn('เบราว์เซอร์บล็อกหน้าต่างใหม่', 'กรุณาอนุญาต Pop-up ของเว็บไซต์นี้ แล้วลองพิมพ์อีกครั้ง');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();

    /* รอฟอนต์/รูปภาพโหลดก่อนสั่งพิมพ์ */
    var fire = function () {
      whenReady(w, function () {
        try { fitOnePage(w); } catch (e) {}
        UI.idle();
        try { w.focus(); w.print(); } catch (e) {}
      });
    };
    if (w.document.readyState === 'complete') fire();
    else w.addEventListener('load', fire);
  }

  /** พรีวิวใบลาใน modal — เรนเดอร์ใน iframe ขนาด A4 จริง แล้วย่อแสดงด้วย transform
   *  จึงเห็นหน้าตาตรงกับที่พิมพ์ออกมาทุกประการ (รวมการย่อให้พอดี 1 หน้า) */
  var PV_SCALE = 0.62;
  function preview(leaveOrId) {
    var l = (typeof leaveOrId === 'string') ? DB.leaveById(leaveOrId) : leaveOrId;
    if (!l) { UI.err('ไม่พบข้อมูลใบลา'); return; }

    UI.modal({
      title: 'ใบลา', sub: UI.typeName(l.leaveType) + ' · ' + UI.rangeText(l.startDate, l.endDate),
      icon: 'fa-file-lines', size: 'max-w-3xl',
      body: '<p class="mb-2 text-xs text-slate-400"><i class="fa-regular fa-file-lines"></i> ' +
              'A4 แนวตั้ง · ขอบ บน 2.2 / ล่าง 2.0 / ซ้าย 3.0 / ขวา 2.0 ซม. · ' +
              '<span id="pvFit"></span></p>' +
            '<div class="overflow-auto rounded-xl bg-slate-100 p-3">' +
              '<div style="width:' + (21 * PV_SCALE) + 'cm;height:' + (29.6 * PV_SCALE) + 'cm;margin:0 auto">' +
                '<iframe id="pvFrame" title="ตัวอย่างใบลา" style="width:21cm;height:29.6cm;border:0;' +
                  'background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.15);display:block;' +
                  'transform:scale(' + PV_SCALE + ');transform-origin:top left"></iframe>' +
              '</div>' +
            '</div>',
      foot: '<button class="btn-ghost" data-modal-close>ปิด</button>' +
            '<button class="btn-primary" id="pvPrint"><i class="fa-solid fa-print"></i> พิมพ์ใบลา</button>',
      onOpen: function () {
        var fr = UI.$('#pvFrame');
        var fw = fr.contentWindow;
        fw.document.open();
        fw.document.write(docHTML(l));
        fw.document.close();

        /* รอฟอนต์/รูปโหลด แล้วย่อให้พอดี 1 หน้าเหมือนตอนพิมพ์ */
        whenReady(fw, function () {
          try { fitOnePage(fw); } catch (e) {}
          var el = fw.document.querySelector('.print-paper');
          var lbl = UI.$('#pvFit');
          if (el && lbl) {
            var size = fw.getComputedStyle(el).fontSize;
            lbl.innerHTML = '<span class="text-slate-500">ขนาดอักษร ' +
              esc(Math.round(parseFloat(size) * 0.75 * 10) / 10) + ' pt · พอดี 1 หน้า</span>';
          }
        });

        /* พิมพ์จากพรีวิวโดยตรง = ได้หน้าตาเดียวกับที่เห็น */
        UI.$('#pvPrint').addEventListener('click', function () {
          try { fw.focus(); fw.print(); } catch (e) { leave(l); }
        });
      }
    });
  }

  return { leave: leave, preview: preview, sheetHTML: sheetHTML, docHTML: docHTML };
})();
