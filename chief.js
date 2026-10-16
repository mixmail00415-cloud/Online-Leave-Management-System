/* ============================================================
   chief.js — หน้าสำหรับสาธารณสุขอำเภอ
   แดชบอร์ด / แก้ไขข้อมูลส่วนตัว / รายการขออนุญาตลา (พิจารณาอนุญาต)
   ============================================================ */
var CHIEF = (function () {
  var $ = UI.$, $$ = UI.$$, esc = UI.esc;

  var MENU = [
    { id: 'dash',     icon: 'fa-gauge-high',  label: 'แดชบอร์ด',          title: 'แดชบอร์ด',           sub: 'ภาพรวมการขออนุญาตลา' },
    { id: 'profile',  icon: 'fa-user-pen',    label: 'แก้ไขข้อมูลส่วนตัว', title: 'แก้ไขข้อมูลส่วนตัว',  sub: 'บัญชีผู้ใช้ รูปโปรไฟล์ และลายเซ็น' },
    { id: 'requests', icon: 'fa-stamp',       label: 'รายการขออนุญาตลา',   title: 'รายการขออนุญาตลา',   sub: 'พิจารณาอนุญาตการลาของเจ้าหน้าที่' }
  ];

  function render(page, body) {
    if (page === 'dash')     return dash(body);
    if (page === 'profile')  return STAFF.profile(body);   /* ใช้ฟอร์มเดียวกับเจ้าหน้าที่ */
    if (page === 'requests') return requests(body);
  }

  /* ================= แดชบอร์ด ================= */
  function dash(body) {
    body.innerHTML = UI.skCards(4);
    UI.delay().then(function () {
      var f = DB.currentFY();
      var all = DB.leaves().filter(function (l) { return !f || l.fyId === f.id; });
      var wait = all.filter(function (l) { return (l.status || 'pending') === 'pending'; });
      var ok = all.filter(function (l) { return l.status === 'approved'; }).length;
      var no = all.filter(function (l) { return l.status === 'rejected'; }).length;

      var h = UI.pageHead('ภาพรวมการขออนุญาตลา', 'ปีงบประมาณ ' + (f ? f.name : '-'));
      h += '<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">' +
        UI.stat('fa-clock', '#F57C00', 'รออนุญาต', wait.length, 'รายการ') +
        UI.stat('fa-circle-check', '#26A69A', 'อนุญาตแล้ว', ok, 'รายการ') +
        UI.stat('fa-circle-xmark', '#EF5350', 'ไม่อนุญาต', no, 'รายการ') +
        UI.stat('fa-users', '#DB2777', 'เจ้าหน้าที่', DB.usersByRole('staff').length, 'คน') +
        '</div>';

      h += '<div class="mt-6 card card-pad">' +
        '<p class="mb-3 font-bold text-slate-800"><i class="fa-regular fa-clock text-brand-600"></i> รายการที่รอพิจารณา</p>' +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
        '<th>ชื่อเจ้าหน้าที่</th><th>ประเภท</th><th>วันที่ลา</th><th>วัน</th><th style="width:90px">จัดการ</th>' +
        '</tr></thead><tbody>';
      if (!wait.length) h += UI.emptyRow(5, 'ไม่มีรายการรอพิจารณา');
      wait.slice(0, 8).forEach(function (l) {
        h += '<tr><td>' + esc(l.applicantName) + '</td>' +
          '<td class="td-c">' + UI.typeBadge(l.leaveType) + '</td>' +
          '<td class="td-c">' + esc(UI.rangeText(l.startDate, l.endDate)) + '</td>' +
          '<td class="td-c">' + esc(l.days) + '</td>' +
          '<td class="td-c"><button class="ibtn ibtn-ok" data-go="' + l.id + '" title="พิจารณา">' +
          '<i class="fa-solid fa-stamp"></i></button></td></tr>';
      });
      h += '</tbody></table></div></div>';
      body.innerHTML = h;

      $$('[data-go]', body).forEach(function (b) {
        b.addEventListener('click', function () { APP.go('requests'); });
      });
    });
  }

  /* ================= รายการขออนุญาตลา ================= */
  var _st = '';

  function requests(body) {
    body.innerHTML = UI.skTable(6, 7);
    UI.delay().then(function () {
      body.innerHTML = UI.pageHead('รายการขออนุญาตลา', 'พิจารณาอนุญาตการลาของเจ้าหน้าที่') +
        '<div class="card card-pad mb-4"><div class="max-w-xs">' +
          '<label class="lbl">กรองตามสถานะ</label><select id="cSt" class="sel">' +
          '<option value="">ทั้งหมด</option>' +
          '<option value="pending"' + (_st === 'pending' ? ' selected' : '') + '>รออนุญาต</option>' +
          '<option value="approved"' + (_st === 'approved' ? ' selected' : '') + '>อนุญาต</option>' +
          '<option value="rejected"' + (_st === 'rejected' ? ' selected' : '') + '>ไม่อนุญาต</option>' +
        '</select></div></div><div id="cBox"></div>';
      $('#cSt').addEventListener('change', function () { _st = $('#cSt').value; draw(); });
      draw();
    });
  }

  function draw() {
    var box = $('#cBox');
    box.innerHTML = UI.skTable(5, 7);
    UI.delay(350).then(function () {
      var list = DB.leaves().filter(function (l) {
        return !_st || (l.status || 'pending') === _st;
      }).sort(function (a, b) { return String(b.startDate).localeCompare(String(a.startDate)); });

      var h = '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
        '<th style="width:60px">ลำดับ</th><th>ชื่อเจ้าหน้าที่</th><th>รอบที่/ปีงบประมาณ</th><th>ประเภทการลา</th>' +
        '<th>กำหนดวัน</th><th>สถานะ</th><th style="width:130px">จัดการ</th></tr></thead><tbody>';
      if (!list.length) h += UI.emptyRow(7, 'ไม่พบรายการ');
      list.forEach(function (l, i) {
        h += '<tr><td class="td-c">' + (i + 1) + '</td>' +
          '<td>' + esc(l.applicantName) + '<div class="text-[11px] text-slate-400">' + esc(l.applicantPosition || '-') + '</div></td>' +
          '<td class="td-c">' + esc(l.round) + '/' + esc(l.fyName) + '</td>' +
          '<td class="td-c">' + UI.typeBadge(l.leaveType) + '</td>' +
          '<td class="td-c">' + esc(UI.rangeText(l.startDate, l.endDate)) + ' <span class="text-slate-400">(' + esc(l.days) + ' วัน)</span></td>' +
          '<td class="td-c">' + UI.statusBadge(l.status) + '</td>' +
          '<td class="td-c"><div class="flex justify-center gap-1.5">' +
            '<button class="ibtn ibtn-view" data-view="' + l.id + '" title="ดูใบลา"><i class="fa-solid fa-eye"></i></button>' +
            '<button class="ibtn ibtn-print" data-print="' + l.id + '" title="พิมพ์ใบลา"><i class="fa-solid fa-print"></i></button>' +
            '<button class="ibtn ibtn-ok" data-ap="' + l.id + '" title="พิจารณาอนุญาต"><i class="fa-solid fa-stamp"></i></button>' +
          '</div></td></tr>';
      });
      h += '</tbody></table></div>';
      box.innerHTML = h;

      $$('[data-view]', box).forEach(function (b) {
        b.addEventListener('click', function () { PRINT.preview(b.dataset.view); });
      });
      $$('[data-print]', box).forEach(function (b) {
        b.addEventListener('click', function () { PRINT.leave(b.dataset.print); });
      });
      $$('[data-ap]', box).forEach(function (b) {
        b.addEventListener('click', function () { approveForm(DB.leaveById(b.dataset.ap)); });
      });
    });
  }

  /* ================= modal พิจารณาอนุญาต ================= */
  function approveForm(l) {
    if (!l) { UI.err('ไม่พบข้อมูลใบลา'); return; }
    var me = APP.user();
    /* ลาพักผ่อน : สาธารณสุขอำเภอให้ "ความเห็น" เท่านั้น คำสั่งเป็นของนายอำเภอ */
    var isVac = l.leaveType === 'vacation';

    UI.modal({
      title: isVac ? 'ให้ความเห็นการลาพักผ่อน' : 'พิจารณาอนุญาตการลา',
      sub: l.applicantName + ' · ' + UI.typeName(l.leaveType) + ' · ' + UI.rangeText(l.startDate, l.endDate),
      icon: 'fa-stamp', size: 'max-w-2xl',
      body: '<form id="apForm" class="space-y-4">' +
        '<div class="rounded-2xl border border-brand-100 bg-brand-50/50 p-3 text-sm leading-7">' +
          '<div><b>เรื่อง:</b> ' + esc(l.subject) + '</div>' +
          '<div><b>เนื่องจาก:</b> ' + esc(l.reason) + '</div>' +
          '<div><b>มีกำหนด:</b> ' + esc(l.days) + ' วัน</div>' +
          '<div><b>ติดต่อได้ที่:</b> ' + esc(l.contact) + '</div>' +
        '</div>' +
        '<div><label class="lbl">ความคิดเห็นผู้บังคับบัญชา <span class="req">*</span></label>' +
          '<textarea name="comment" class="txa" placeholder="เช่น เห็นควรอนุญาต">' + esc(l.chiefComment || '') + '</textarea></div>' +
        '<div><label class="lbl">' + (isVac ? 'ความเห็น' : 'คำสั่ง') + ' <span class="req">*</span></label>' +
          '<div class="flex flex-wrap gap-2">' +
            '<label class="btn-ghost cursor-pointer"><input type="radio" name="decision" value="approved" class="accent-brand-600" ' +
              (l.status === 'approved' ? 'checked' : '') + '> ' + (isVac ? 'เห็นควรอนุญาต' : 'อนุญาต') + '</label>' +
            '<label class="btn-ghost cursor-pointer"><input type="radio" name="decision" value="rejected" class="accent-brand-600" ' +
              (l.status === 'rejected' ? 'checked' : '') + '> ' + (isVac ? 'ไม่เห็นควรอนุญาต' : 'ไม่อนุญาต') + '</label>' +
          '</div></div>' +
        (isVac ? '<div class="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-warn2">' +
          '<i class="fa-solid fa-circle-info"></i> ช่อง "คำสั่ง" ในใบลาพักผ่อนจะเว้นว่างไว้ให้นายอำเภอ' +
          esc(DB.settings().district || 'กู่แก้ว') + 'ลงนามด้วยปากกาบนเอกสารที่พิมพ์ออกมา</div>' : '') +
        UI.signatureBlockHTML('sigChief', me.signature || '', 'ลงชื่อสาธารณสุขอำเภอกู่แก้ว') +
        '<div class="rounded-xl bg-slate-50 px-4 py-2.5 text-center text-sm">' +
          '<div class="font-semibold text-slate-700">( ' + esc(me.fullname) + ' )</div>' +
          '<div class="text-xs text-slate-500">' + esc(me.position || 'สาธารณสุขอำเภอกู่แก้ว') + '</div>' +
        '</div>' +
        '</form>',
      foot: '<button class="btn-ghost" data-modal-close>ยกเลิก</button>' +
            '<button class="btn-primary" id="apSave"><i class="fa-solid fa-floppy-disk"></i> บันทึกอนุญาตลา</button>',
      onOpen: function () {
        var sig = UI.initSignatureBlock('sigChief', me.signature || '');
        $('#apSave').addEventListener('click', function () {
          var fd = new FormData($('#apForm'));
          var comment = String(fd.get('comment') || '').trim();
          var dec = fd.get('decision');
          if (!comment) { UI.warn('ข้อมูลไม่ครบ', 'กรุณากรอกความคิดเห็น'); return; }
          if (!dec) {
            UI.warn('ข้อมูลไม่ครบ', isVac ? 'กรุณาเลือกความเห็น เห็นควรอนุญาต หรือ ไม่เห็นควรอนุญาต'
                                          : 'กรุณาเลือกคำสั่ง อนุญาต หรือ ไม่อนุญาต'); return;
          }
          var sg = sig.get();
          if (!sg) { UI.warn('ยังไม่ได้ลงลายเซ็น', 'กรุณาเลือกลายเซ็นสแกน หรือเซ็นสดในกรอบ'); return; }

          UI.confirmAsk('ยืนยันการบันทึก?',
            (isVac ? 'ความเห็น: <b>' + (dec === 'approved' ? 'เห็นควรอนุญาต' : 'ไม่เห็นควรอนุญาต') + '</b>' +
                     '<br><span class="text-xs text-slate-500">คำสั่งอนุญาตเป็นอำนาจของนายอำเภอ</span>'
                   : 'คำสั่ง: <b>' + (dec === 'approved' ? 'อนุญาต' : 'ไม่อนุญาต') + '</b>'), 'ยืนยัน')
            .then(function (yes) {
              if (!yes) return;
              var btn = $('#apSave');
              UI.btnLoading(btn, true);
              UI.delay(600).then(function () {
                /* เก็บ snapshot ชื่อ/ตำแหน่ง/ลายเซ็น ณ วันที่พิจารณา */
                DB.saveLeave({
                  id: l.id,
                  status: dec,
                  chiefComment: comment,
                  chiefName: me.fullname,
                  chiefPosition: me.position || 'สาธารณสุขอำเภอกู่แก้ว',
                  chiefSignature: sg,
                  chiefDecidedAt: new Date().toISOString()
                });
                UI.btnLoading(btn, false);
                UI.closeModal();
                UI.ok('บันทึกสำเร็จ', dec === 'approved' ? 'อนุญาตการลาเรียบร้อย' : 'บันทึกไม่อนุญาตเรียบร้อย');
                draw();
              });
            });
        });
      }
    });
  }

  return { MENU: MENU, render: render };
})();
