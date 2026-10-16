/* ============================================================
   staff.js — หน้าสำหรับเจ้าหน้าที่ (+ ฟอร์มแก้ไขข้อมูลส่วนตัวที่ใช้ร่วมกัน)
   ============================================================ */
var STAFF = (function () {
  var $ = UI.$, $$ = UI.$$, esc = UI.esc;
  var _editId = null;   /* ใบลาที่กำลังแก้ไข */

  var MENU = [
    { id: 'dash',    icon: 'fa-gauge-high',    label: 'แดชบอร์ด',          title: 'แดชบอร์ด',            sub: 'สรุปการลาของท่าน' },
    { id: 'profile', icon: 'fa-user-pen',      label: 'แก้ไขข้อมูลส่วนตัว', title: 'แก้ไขข้อมูลส่วนตัว',   sub: 'บัญชีผู้ใช้ รูปโปรไฟล์ และลายเซ็น' },
    { id: 'request', icon: 'fa-file-pen',      label: 'ขออนุญาตลา',        title: 'แบบใบลา',             sub: 'ลาป่วย / ลากิจส่วนตัว / ลาคลอดบุตร' },
    { id: 'vacation',icon: 'fa-umbrella-beach',label: 'ขอลาพักผ่อน',       title: 'แบบใบลาพักผ่อน',       sub: 'ยื่นขอลาพักผ่อนประจำปี' },
    { id: 'mine',    icon: 'fa-folder-open',   label: 'ข้อมูลขออนุญาตลา',   title: 'ข้อมูลขออนุญาตลา',    sub: 'ดูรายละเอียด แก้ไข ลบ และพิมพ์ใบลา' }
  ];

  function render(page, body) {
    if (page === 'dash')    return dash(body);
    if (page === 'profile') return profile(body);
    if (page === 'request')  return request(body);
    if (page === 'vacation') return vacation(body);
    if (page === 'mine')    return mine(body);
  }

  /* ================= แดชบอร์ด ================= */
  function dash(body) {
    body.innerHTML = UI.skCards(4);
    UI.delay().then(function () {
      var me = APP.user(), f = DB.currentFY();
      var s = DB.summaryOf(me.id, f ? f.id : '');
      var my = DB.leavesByUser(me.id);
      var wait = my.filter(function (l) { return (l.status || 'pending') === 'pending'; }).length;

      body.innerHTML = UI.pageHead('สวัสดี ' + me.fullname, 'ปีงบประมาณ ' + (f ? f.name : '-')) +
        '<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">' +
          UI.stat('fa-virus', '#EF5350', 'ลาป่วย', s.sick.days, 'วัน') +
          UI.stat('fa-briefcase', '#0288D1', 'ลากิจส่วนตัว', s.personal.days, 'วัน') +
          UI.stat('fa-baby', '#DB2777', 'ลาคลอดบุตร', s.maternity.days, 'วัน') +
          UI.stat('fa-umbrella-beach', '#26A69A', 'ลาพักผ่อน', s.vacation.days, 'วัน') +
          UI.stat('fa-clock', '#F57C00', 'รออนุญาต', wait, 'รายการ') +
        '</div>' +
        '<div class="mt-4 card card-pad">' +
          '<p class="mb-1 font-bold text-slate-800"><i class="fa-solid fa-umbrella-beach text-brand-600"></i> สิทธิลาพักผ่อนคงเหลือ</p>' +
          (function () {
            var v = DB.vacationInfo(me.id, f ? f.id : '');
            return '<p class="text-sm text-slate-600">สะสมยกมา <b>' + v.carry + '</b> วัน · ' +
              'สิทธิประจำปีคงเหลือ <b>' + v.remain + '</b> วันทำการ · ' +
              'รวมลาได้อีก <b class="text-brand-700">' + v.total + '</b> วันทำการ</p>';
          })() +
        '</div>' +
        '<div class="mt-6 card card-pad">' +
          '<p class="mb-3 font-bold text-slate-800"><i class="fa-regular fa-rectangle-list text-brand-600"></i> สถิติการลาปีงบประมาณนี้</p>' +
          statTableHTML(s, null) + '</div>';
    });
  }

  function statTableHTML(before, now) {
    var h = '<div class="tbl-wrap"><table class="tbl" style="min-width:520px"><thead><tr>' +
      '<th>ประเภทการลา</th><th>ลามาแล้ว (วัน)</th><th>ลาครั้งนี้ (วัน)</th><th>รวมเป็น (วัน)</th>' +
      '</tr></thead><tbody>';
    DB.LEAVE_TYPES.forEach(function (t) {
      var b = Number((before[t.id] || {}).days || 0);
      var n = (now && now.type === t.id) ? Number(now.days || 0) : 0;
      h += '<tr><td>' + UI.typeBadge(t.id) + '</td><td class="td-c">' + b + '</td>' +
        '<td class="td-c">' + (n || '-') + '</td><td class="td-c font-semibold">' + (b + n) + '</td></tr>';
    });
    return h + '</tbody></table></div>';
  }

  /** บรรทัดสรุปสิทธิลาพักผ่อนปัจจุบัน (แสดงใต้ช่องกรอกในหน้าโปรไฟล์) */
  function vacationSummary(u) {
    var fy = DB.currentFY();
    var v = DB.vacationInfo(u.id, fy ? fy.id : '');
    return 'ปีงบประมาณ ' + esc(fy ? fy.name : '-') +
      ' · ใช้ไปแล้ว <b>' + v.used + '</b> วัน' +
      ' · คงเหลือลาได้อีก <b class="text-brand-700">' + v.total + '</b> วันทำการ' +
      ' (สะสมยกมา ' + v.carry + ' + สิทธิประจำปีคงเหลือ ' + v.remain + ')';
  }

  /* ================= แก้ไขข้อมูลส่วนตัว (ใช้ร่วมกับสาธารณสุขอำเภอ) ================= */
  function profile(body) {
    body.innerHTML = UI.skForm();
    UI.delay().then(function () {
      var u = APP.user();
      body.innerHTML = UI.pageHead('แก้ไขข้อมูลส่วนตัว', 'ข้อมูลนี้จะถูกนำไปใช้ในใบลา') +
        '<form id="pForm" class="card card-pad max-w-3xl space-y-4" autocomplete="off">' +
          '<div class="grid gap-4 sm:grid-cols-2">' +
            '<div><label class="lbl">ชื่อผู้ใช้ (Username) <span class="req">*</span></label>' +
              '<input name="username" class="inp" value="' + esc(u.username) + '" required></div>' +
            '<div><label class="lbl">รหัสผ่าน (Password) <span class="req">*</span></label>' +
              '<div class="relative"><input name="password" type="password" class="inp pr-10" value="' + esc(u.password) + '" required>' +
              '<button type="button" class="pw-toggle" id="pPw"><i class="fa-regular fa-eye"></i></button></div></div>' +
          '</div>' +
          '<div class="grid gap-4 sm:grid-cols-2">' +
            '<div><label class="lbl">ชื่อ-นามสกุล <span class="req">*</span></label>' +
              '<input name="fullname" class="inp" value="' + esc(u.fullname) + '" required></div>' +
            '<div><label class="lbl">ตำแหน่ง <span class="req">*</span></label>' +
              '<input name="position" class="inp" value="' + esc(u.position || '') + '" placeholder="กรอกตำแหน่ง" required></div>' +
          '</div>' +

          '<div class="rounded-2xl border border-brand-100 bg-brand-50/40 p-4">' +
            '<p class="mb-3 text-sm font-semibold text-brand-700">' +
              '<i class="fa-solid fa-umbrella-beach"></i> สิทธิลาพักผ่อน</p>' +
            '<div class="grid gap-3 sm:grid-cols-2">' +
              '<div><label class="lbl">วันลาพักผ่อนสะสมยกมา (วันทำการ)</label>' +
                '<input class="inp" value="' + esc(u.vacationCarry == null ? 0 : u.vacationCarry) + '" readonly></div>' +
              '<div><label class="lbl">สิทธิลาพักผ่อนประจำปี (วันทำการ)</label>' +
                '<input class="inp" value="' + esc(u.vacationQuota == null ? DB.VACATION_QUOTA : u.vacationQuota) + '" readonly></div>' +
            '</div>' +
            '<p class="mt-2 text-xs text-slate-500">' + vacationSummary(u) + '</p>' +
            '<p class="mt-1.5 text-xs text-warn2"><i class="fa-solid fa-circle-info"></i> ' +
              'สองช่องนี้แก้ไขได้เฉพาะผู้ดูแลระบบ ที่เมนูจัดการผู้ใช้งาน</p>' +
          '</div>' +

          '<div class="grid gap-4 sm:grid-cols-2">' +
            '<div><label class="lbl">รูปภาพโปรไฟล์</label>' +
              '<div class="flex items-center gap-3">' +
                '<img id="pAvPrev" class="up-prev" src="' + UI.avatarOf(u) + '" alt="โปรไฟล์">' +
                '<input type="file" id="pAvatar" accept="image/*" class="inp">' +
              '</div><p class="mt-1 text-xs text-slate-400">ไม่บังคับ</p></div>' +
            '<div><label class="lbl">รูปภาพลายเซ็น (สแกน)</label>' +
              '<div class="flex items-center gap-3">' +
                '<img id="pSigPrev" class="up-prev-wide ' + (u.signature ? '' : 'hidden') + '" src="' + (u.signature || '') + '" alt="ลายเซ็น">' +
                '<input type="file" id="pSig" accept="image/*" class="inp">' +
              '</div><p class="mt-1 text-xs text-slate-400">ไม่บังคับ · ใช้เลือกเป็น "ลายเซ็นสแกน" ในใบลา</p></div>' +
          '</div>' +
          '<div class="flex justify-end pt-2">' +
            '<button type="submit" class="btn-primary"><i class="fa-solid fa-floppy-disk"></i> บันทึกข้อมูล</button></div>' +
        '</form>';

      UI.bindUpload($('#pAvatar'), $('#pAvPrev'), 400, 400);
      UI.bindUpload($('#pSig'), $('#pSigPrev'), 600, 300);
      $('#pPw').addEventListener('click', function () {
        var inp = $('#pForm').querySelector('[name=password]');
        var show = inp.type === 'password';
        inp.type = show ? 'text' : 'password';
        $('#pPw').innerHTML = '<i class="fa-regular ' + (show ? 'fa-eye-slash' : 'fa-eye') + '"></i>';
      });

      $('#pForm').addEventListener('submit', function (e) {
        e.preventDefault();
        var fd = new FormData(e.target);
        var d = {
          id: u.id,
          username: String(fd.get('username') || '').trim(),
          password: String(fd.get('password') || ''),
          fullname: String(fd.get('fullname') || '').trim(),
          position: String(fd.get('position') || '').trim()
          /* ไม่รวม vacationCarry / vacationQuota : แก้ได้เฉพาะผู้ดูแลระบบ */
        };
        if (!d.username || !d.password || !d.fullname || !d.position) {
          UI.warn('ข้อมูลไม่ครบ', 'กรุณากรอกข้อมูลที่มีเครื่องหมาย * ให้ครบถ้วน'); return;
        }
        if (DB.usernameTaken(d.username, u.id)) { UI.warn('ชื่อผู้ใช้ซ้ำ', 'มีผู้ใช้ชื่อนี้ในระบบแล้ว'); return; }
        if ($('#pAvatar').dataset.value) d.avatar = $('#pAvatar').dataset.value;
        if ($('#pSig').dataset.value) d.signature = $('#pSig').dataset.value;

        var btn = e.target.querySelector('button[type=submit]');
        UI.btnLoading(btn, true);
        UI.delay(500).then(function () {
          DB.saveUser(d);
          UI.btnLoading(btn, false);
          APP.refreshUser();
          UI.ok('บันทึกสำเร็จ', 'อัปเดตข้อมูลส่วนตัวเรียบร้อย');
          APP.reload();
        });
      });
    });
  }

  /* ================= ขออนุญาตลา ================= */
  function request(body) {
    body.innerHTML = UI.skForm();
    UI.delay().then(function () {
      var me = APP.user(), st = DB.settings(), fy = DB.currentFY();
      var ed = _editId ? DB.leaveById(_editId) : null;
      if (ed && ed.leaveType === 'vacation') { ed = null; _editId = null; }
      else if (ed && ed.status !== 'pending') {
        UI.warn('แก้ไขไม่ได้', 'ใบลานี้ได้รับการพิจารณาแล้ว');
        ed = null; _editId = null;
      }
      var formTypeIds = DB.FORM_TYPES.map(function (t) { return t.id; });
      var last = DB.lastLeaveOf(me.id, _editId || null, formTypeIds);

      var typeRadio = DB.FORM_TYPES.map(function (t) {
        return '<label class="btn-ghost cursor-pointer"><input type="radio" name="leaveType" value="' + t.id +
          '" class="accent-brand-600" ' + (ed && ed.leaveType === t.id ? 'checked' : '') + '> ' + esc(t.name) + '</label>';
      }).join('');

      var lastCb = DB.FORM_TYPES.map(function (t) {
        var on = last ? last.leaveType === t.id : false;
        return '<label class="inline-flex items-center gap-1.5 text-sm text-slate-600">' +
          '<input type="checkbox" class="h-4 w-4 accent-brand-600" disabled ' + (on ? 'checked' : '') + '> ' + esc(t.name) + '</label>';
      }).join('');

      var h = UI.pageHead(ed ? 'แก้ไขแบบใบลา' : 'แบบใบลาป่วย ลากิจส่วนตัว ลาคลอดบุตร',
        'ปีงบประมาณปัจจุบัน ' + (fy ? fy.name : '-'),
        ed ? '<button class="btn-ghost" id="lvCancel"><i class="fa-solid fa-xmark"></i> ยกเลิกการแก้ไข</button>' : '');

      h += '<form id="lvForm" class="sheet max-w-4xl space-y-4">' +
        '<div class="grid gap-4 sm:grid-cols-2">' +
          '<div><label class="lbl">เขียนที่</label><input class="inp" value="' + esc(ed ? ed.writtenAt : st.officeName) + '" readonly></div>' +
          '<div><label class="lbl">วันที่ <span class="req">*</span></label>' +
            '<input type="date" name="docDate" class="inp" value="' + esc(ed ? ed.docDate : UI.todayISO()) + '" required></div>' +
        '</div>' +
        '<div><label class="lbl">เรื่อง <span class="req">*</span></label>' +
          '<input name="subject" class="inp" placeholder="เช่น ขอลาป่วย" value="' + esc(ed ? ed.subject : '') + '" required></div>' +
        '<div class="rounded-xl bg-brand-50/70 px-4 py-2.5 text-sm font-semibold text-brand-700">เรียน สาธารณสุขอำเภอกู่แก้ว</div>' +
        '<div class="grid gap-4 sm:grid-cols-3">' +
          '<div><label class="lbl">ข้าพเจ้า</label><input class="inp" value="' + esc(me.fullname) + '" readonly></div>' +
          '<div><label class="lbl">ตำแหน่ง</label><input class="inp" value="' + esc(me.position || '-') + '" readonly></div>' +
          '<div><label class="lbl">สังกัด</label><input class="inp" value="' + esc(st.affiliation) + '" readonly></div>' +
        '</div>' +
        '<div><label class="lbl">ขอลา <span class="req">*</span></label>' +
          '<div class="flex flex-wrap gap-2">' + typeRadio + '</div></div>' +
        '<div><label class="lbl">เนื่องจาก <span class="req">*</span></label>' +
          '<textarea name="reason" class="txa" required>' + esc(ed ? ed.reason : '') + '</textarea></div>' +
        '<div class="grid gap-4 sm:grid-cols-3">' +
          '<div><label class="lbl">ตั้งแต่วันที่ <span class="req">*</span></label>' +
            '<input type="date" name="startDate" id="lvS" class="inp" value="' + esc(ed ? ed.startDate : '') + '" required></div>' +
          '<div><label class="lbl">ถึงวันที่ <span class="req">*</span></label>' +
            '<input type="date" name="endDate" id="lvE" class="inp" value="' + esc(ed ? ed.endDate : '') + '" required></div>' +
          '<div><label class="lbl">มีกำหนด (วัน)</label>' +
            '<input id="lvD" class="inp" value="' + esc(ed ? ed.days : 0) + '" readonly></div>' +
        '</div>' +
        '<div class="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">' +
          '<p class="mb-2 text-sm font-semibold text-slate-700">ข้าพเจ้าได้ลา (ครั้งสุดท้าย)</p>' +
          '<div class="mb-3 flex flex-wrap gap-4">' + lastCb + '</div>' +
          '<div class="grid gap-3 sm:grid-cols-3">' +
            '<div><label class="lbl">ตั้งแต่วันที่</label><input class="inp" value="' + esc(last ? UI.thDate(last.startDate) : '-') + '" readonly></div>' +
            '<div><label class="lbl">ถึงวันที่</label><input class="inp" value="' + esc(last ? UI.thDate(last.endDate) : '-') + '" readonly></div>' +
            '<div><label class="lbl">มีกำหนด (วัน)</label><input class="inp" value="' + esc(last ? last.days : '-') + '" readonly></div>' +
          '</div></div>' +
        '<div><label class="lbl">ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่ <span class="req">*</span></label>' +
          '<input name="contact" class="inp" value="' + esc(ed ? ed.contact : '') + '" required></div>' +
        '<div class="text-center text-sm font-semibold text-slate-600">ขอแสดงความนับถือ</div>' +
        UI.signatureBlockHTML('sigStaff', me.signature || '', 'ลงชื่อเจ้าหน้าที่') +
        '<div class="rounded-2xl border border-brand-100 bg-brand-50/40 p-4">' +
          '<p class="mb-2 text-sm font-semibold text-brand-700">สถิติการลาในปีงบประมาณ ' + esc(fy ? fy.name : '-') + '</p>' +
          '<div id="lvStat"></div></div>' +
        '<div class="flex justify-end gap-2 pt-1">' +
          '<button type="submit" class="btn-primary"><i class="fa-solid fa-paper-plane"></i> ' +
          (ed ? 'บันทึกการแก้ไข' : 'ยื่นบันทึกขออนุญาตลา') + '</button></div>' +
      '</form>';
      body.innerHTML = h;

      var sig = UI.initSignatureBlock('sigStaff', me.signature || '');
      if ($('#lvCancel')) $('#lvCancel').addEventListener('click', function () { _editId = null; APP.go('mine'); });

      function curType() {
        var r = document.querySelector('input[name=leaveType]:checked');
        return r ? r.value : '';
      }
      function recalc() {
        var d = UI.daysBetween($('#lvS').value, $('#lvE').value);
        $('#lvD').value = d;
        var before = DB.summaryOf(me.id, fy ? fy.id : '', _editId || null);
        $('#lvStat').innerHTML = statTableHTML(before, { type: curType(), days: d });
      }
      $('#lvS').addEventListener('change', recalc);
      $('#lvE').addEventListener('change', recalc);
      $$('input[name=leaveType]').forEach(function (r) { r.addEventListener('change', recalc); });
      recalc();

      $('#lvForm').addEventListener('submit', function (e) {
        e.preventDefault();
        var fd = new FormData(e.target);
        var d = {
          docDate: fd.get('docDate'),
          subject: String(fd.get('subject') || '').trim(),
          leaveType: curType(),
          reason: String(fd.get('reason') || '').trim(),
          startDate: fd.get('startDate'),
          endDate: fd.get('endDate'),
          contact: String(fd.get('contact') || '').trim()
        };
        if (!d.docDate || !d.subject || !d.leaveType || !d.reason || !d.startDate || !d.endDate || !d.contact) {
          UI.warn('กรอกข้อมูลไม่ครบ', 'กรุณากรอกข้อมูลที่มีเครื่องหมาย * ให้ครบทุกช่อง'); return;
        }
        var days = UI.daysBetween(d.startDate, d.endDate);
        if (!days) { UI.warn('ช่วงวันที่ไม่ถูกต้อง', 'วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น'); return; }
        var sg = sig.get();
        if (!sg) { UI.warn('ยังไม่ได้ลงลายเซ็น', 'กรุณาเลือกลายเซ็นสแกน หรือเซ็นสดในกรอบ'); return; }

        var per = DB.resolvePeriod(d.startDate);
        var before = DB.summaryOf(me.id, per.fyId, _editId || null);

        var rec = Object.assign({}, d, {
          id: _editId || undefined,
          userId: me.id,
          fyId: per.fyId, fyName: per.fyName, round: per.round,
          days: days,
          writtenAt: st.officeName, affiliation: st.affiliation,
          applicantName: me.fullname, applicantPosition: me.position || '',
          signature: sg,
          lastType: last ? last.leaveType : '', lastStart: last ? last.startDate : '',
          lastEnd: last ? last.endDate : '', lastDays: last ? last.days : '',
          summaryBefore: before,
          status: 'pending'
        });

        UI.confirmAsk(_editId ? 'ยืนยันการแก้ไขใบลา?' : 'ยืนยันการยื่นใบลา?',
          '<div class="text-left text-sm leading-7">' +
          '<b>ประเภท:</b> ' + esc(UI.typeName(d.leaveType)) + '<br>' +
          '<b>วันที่ลา:</b> ' + esc(UI.rangeText(d.startDate, d.endDate)) + '<br>' +
          '<b>มีกำหนด:</b> ' + days + ' วัน<br>' +
          '<b>รอบที่/ปีงบประมาณ:</b> ' + esc(per.round) + '/' + esc(per.fyName) +
          '</div>', '<i class="fa-solid fa-paper-plane"></i> ยืนยัน').then(function (yes) {
          if (!yes) return;
          UI.busy('กำลังบันทึกใบลา...');
          UI.delay(600).then(function () {
            DB.saveLeave(rec);
            _editId = null;
            UI.idle();
            UI.ok('บันทึกสำเร็จ', 'ยื่นใบลาเรียบร้อย รอสาธารณสุขอำเภอพิจารณา').then(function () { APP.go('mine'); });
          });
        });
      });
    });
  }

  /* ================= ขอลาพักผ่อน ================= */
  function vacation(body) {
    body.innerHTML = UI.skForm();
    UI.delay().then(function () {
      var me = APP.user(), st = DB.settings(), fy = DB.currentFY();
      var ed = _editId ? DB.leaveById(_editId) : null;
      if (ed && (ed.leaveType !== 'vacation' || ed.status !== 'pending')) { ed = null; _editId = null; }

      /* ดึงสิทธิลาพักผ่อนอัตโนมัติ (ไม่นับใบที่กำลังแก้ไข) */
      var v = DB.vacationInfo(me.id, fy ? fy.id : '', _editId || null);
      var district = st.district || 'กู่แก้ว';

      function peopleOpts(list, sel) {
        return '<option value="">— เลือก —</option>' + list.map(function (u) {
          return '<option value="' + u.id + '"' + (sel === u.id ? ' selected' : '') + '>' +
            esc(u.fullname) + (u.position ? ' (' + esc(u.position) + ')' : '') + '</option>';
        }).join('');
      }
      var others = DB.users().filter(function (u) { return u.id !== me.id; });
      var boss = DB.chief();   /* สาธารณสุขอำเภอ : ผู้ให้ความเห็นผู้บังคับบัญชา */

      var h = UI.pageHead(ed ? 'แก้ไขแบบใบลาพักผ่อน' : 'แบบใบลาพักผ่อน',
        'ปีงบประมาณปัจจุบัน ' + (fy ? fy.name : '-') + ' · ช่องสีเทาระบบดึงข้อมูลให้อัตโนมัติ',
        ed ? '<button class="btn-ghost" id="vcCancel"><i class="fa-solid fa-xmark"></i> ยกเลิกการแก้ไข</button>' : '');

      h += '<form id="vcForm" class="sheet max-w-4xl space-y-4">' +
        '<div class="grid gap-4 sm:grid-cols-2">' +
          '<div><label class="lbl">เขียนที่</label><input class="inp" value="' + esc(ed ? ed.writtenAt : st.officeName) + '" readonly></div>' +
          '<div><label class="lbl">วันที่ <span class="req">*</span></label>' +
            '<input type="date" name="docDate" class="inp" value="' + esc(ed ? ed.docDate : UI.todayISO()) + '" required></div>' +
        '</div>' +
        '<div class="grid gap-4 sm:grid-cols-2">' +
          '<div><label class="lbl">เรื่อง</label><input class="inp" value="ขอลาพักผ่อน" readonly></div>' +
          '<div><label class="lbl">เรียน</label><input class="inp" value="นายอำเภอ' + esc(district) + '" readonly></div>' +
        '</div>' +
        '<div class="grid gap-4 sm:grid-cols-3">' +
          '<div><label class="lbl">ข้าพเจ้า</label><input class="inp" value="' + esc(me.fullname) + '" readonly></div>' +
          '<div><label class="lbl">ตำแหน่ง</label><input class="inp" value="' + esc(me.position || '-') + '" readonly></div>' +
          '<div><label class="lbl">สังกัด</label><input class="inp" value="' + esc(st.affiliation) + '" readonly></div>' +
        '</div>' +

        '<div class="rounded-2xl border border-brand-100 bg-brand-50/40 p-4">' +
          '<p class="mb-3 text-sm font-semibold text-brand-700"><i class="fa-solid fa-calculator"></i> สิทธิลาพักผ่อน (ระบบคำนวณอัตโนมัติ)</p>' +
          '<div class="grid gap-3 sm:grid-cols-3">' +
            '<div><label class="lbl">มีวันลาพักผ่อนสะสม</label><input class="inp" value="' + esc(v.carry) + '" readonly></div>' +
            '<div><label class="lbl">มีสิทธิลาพักผ่อนประจำปีนี้อีก (วันทำการ)</label><input class="inp" value="' + esc(v.remain) + '" readonly></div>' +
            '<div><label class="lbl">รวมเป็น (วันทำการ)</label><input class="inp font-bold" value="' + esc(v.total) + '" readonly></div>' +
          '</div>' +
          '<p class="mt-2 text-xs text-slate-500">สิทธิประจำปี ' + esc(v.quota) + ' วัน · ใช้ไปแล้วในปีงบประมาณนี้ ' + esc(v.used) + ' วัน' +
            ' <span class="text-slate-400">(แก้ไขวันสะสม/สิทธิประจำปีได้ที่เมนูจัดการผู้ใช้งานของผู้ดูแลระบบ)</span></p>' +
        '</div>' +

        '<div class="grid gap-4 sm:grid-cols-3">' +
          '<div><label class="lbl">ขอลาพักผ่อน ตั้งแต่วันที่ <span class="req">*</span></label>' +
            '<input type="date" name="startDate" id="vcS" class="inp" value="' + esc(ed ? ed.startDate : '') + '" required></div>' +
          '<div><label class="lbl">ถึงวันที่ <span class="req">*</span></label>' +
            '<input type="date" name="endDate" id="vcE" class="inp" value="' + esc(ed ? ed.endDate : '') + '" required></div>' +
          '<div><label class="lbl">กำหนด (วัน)</label><input id="vcD" class="inp" value="' + esc(ed ? ed.days : 0) + '" readonly></div>' +
        '</div>' +
        '<div><label class="lbl">ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่ โทรศัพท์ <span class="req">*</span></label>' +
          '<input name="contact" class="inp" placeholder="เช่น 08x-xxx-xxxx" value="' + esc(ed ? ed.contact : '') + '" required></div>' +

        UI.signatureBlockHTML('sigVac', me.signature || '', 'ลงชื่อผู้ขอลา') +

        '<div class="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">' +
          '<p class="mb-3 text-sm font-semibold text-slate-700"><i class="fa-solid fa-user-check"></i> ผู้ตรวจสอบ <span class="req text-danger2">*</span></p>' +
          '<select id="vcChecker" class="sel">' + peopleOpts(others, ed ? ed.checkerId : '') + '</select>' +
          '<p class="mt-1 text-xs text-slate-400">ระบบจะดึงชื่อ ตำแหน่ง และลายเซ็นสแกนของผู้ตรวจสอบมาแสดงในใบลาอัตโนมัติ</p>' +
          '<div id="vcCheckerInfo" class="mt-2 text-sm text-slate-600"></div>' +
        '</div>' +

        '<div class="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">' +
          '<p class="mb-1 text-sm font-semibold text-slate-700"><i class="fa-solid fa-user-gear"></i> หมายเหตุ : ขอมอบหมายงานในหน้าที่ของข้าพเจ้า</p>' +
          '<p class="mb-3 text-xs text-slate-400">เลือกผู้ปฏิบัติงานแทน <span class="text-danger2">*</span></p>' +
          '<select id="vcDeputy" class="sel">' + peopleOpts(others, ed ? ed.deputyId : '') + '</select>' +
          '<div id="vcDeputyInfo" class="mt-2 text-sm text-slate-600"></div>' +
        '</div>' +

        '<div class="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">' +
          '<p class="mb-2 text-sm font-semibold text-slate-700"><i class="fa-solid fa-user-tie"></i> ผู้ลงนามในใบลา (ระบบดึงให้อัตโนมัติ)</p>' +
          '<div class="grid gap-3 sm:grid-cols-2 text-sm">' +
            '<div class="rounded-xl bg-white p-3 ring-1 ring-slate-200">' +
              '<p class="text-xs text-slate-400">ความเห็นผู้บังคับบัญชา</p>' +
              '<p class="font-semibold text-slate-700">' + esc(boss ? boss.fullname : '— ยังไม่มีบัญชีสาธารณสุขอำเภอ —') + '</p>' +
              '<p class="text-xs text-slate-500">' + esc(boss ? (boss.position || 'สาธารณสุขอำเภอ' + district) : '-') + '</p>' +
            '</div>' +
            '<div class="rounded-xl bg-white p-3 ring-1 ring-slate-200">' +
              '<p class="text-xs text-slate-400">คำสั่ง</p>' +
              '<p class="font-semibold text-slate-700">นายอำเภอ' + esc(district) + '</p>' +
              '<p class="text-xs text-slate-500">เว้นช่องไว้ให้ลงนามด้วยปากกา</p>' +
            '</div>' +
          '</div></div>' +
        '<div class="rounded-2xl border border-brand-100 bg-brand-50/40 p-4">' +
          '<p class="mb-2 text-sm font-semibold text-brand-700">สถิติการลาพักผ่อนในปีงบประมาณ ' + esc(fy ? fy.name : '-') + '</p>' +
          '<div id="vcStat"></div></div>' +

        '<div class="flex justify-end gap-2 pt-1">' +
          '<button type="submit" class="btn-primary"><i class="fa-solid fa-paper-plane"></i> ' +
          (ed ? 'บันทึกการแก้ไข' : 'ยื่นบันทึกขอลาพักผ่อน') + '</button></div>' +
      '</form>';
      body.innerHTML = h;

      var sig = UI.initSignatureBlock('sigVac', me.signature || '');
      if ($('#vcCancel')) $('#vcCancel').addEventListener('click', function () { _editId = null; APP.go('mine'); });

      function personInfo(selId, boxId) {
        var u = DB.userById($('#' + selId).value);
        $('#' + boxId).innerHTML = u
          ? '<span class="badge badge-brand"><i class="fa-regular fa-user"></i> ' + esc(u.fullname) + '</span> ' +
            '<span class="text-slate-500">ตำแหน่ง ' + esc(u.position || '-') + '</span>' +
            (u.signature ? ' <span class="badge badge-ok"><i class="fa-solid fa-signature"></i> มีลายเซ็นสแกน</span>'
                         : ' <span class="badge badge-wait">ยังไม่มีลายเซ็นสแกน</span>')
          : '';
      }
      $('#vcChecker').addEventListener('change', function () { personInfo('vcChecker', 'vcCheckerInfo'); });
      $('#vcDeputy').addEventListener('change', function () { personInfo('vcDeputy', 'vcDeputyInfo'); });
      personInfo('vcChecker', 'vcCheckerInfo');
      personInfo('vcDeputy', 'vcDeputyInfo');

      function recalc() {
        var d = UI.daysBetween($('#vcS').value, $('#vcE').value);
        $('#vcD').value = d;
        $('#vcStat').innerHTML =
          '<div class="tbl-wrap"><table class="tbl" style="min-width:420px"><thead><tr>' +
          '<th>ลามาแล้ว (วันทำการ)</th><th>ลาครั้งนี้ (เว้นวันทำการ)</th><th>รวมเป็น (วันทำการ)</th>' +
          '</tr></thead><tbody><tr>' +
          '<td class="td-c">' + v.used + '</td><td class="td-c">' + d + '</td>' +
          '<td class="td-c font-semibold">' + (v.used + d) + '</td>' +
          '</tr></tbody></table></div>';
      }
      $('#vcS').addEventListener('change', recalc);
      $('#vcE').addEventListener('change', recalc);
      recalc();

      $('#vcForm').addEventListener('submit', function (e) {
        e.preventDefault();
        var fd = new FormData(e.target);
        var docDate = fd.get('docDate'), s = fd.get('startDate'), en = fd.get('endDate');
        var contact = String(fd.get('contact') || '').trim();
        var checker = DB.userById($('#vcChecker').value);
        var deputy = DB.userById($('#vcDeputy').value);

        if (!docDate || !s || !en || !contact) {
          UI.warn('กรอกข้อมูลไม่ครบ', 'กรุณากรอกข้อมูลที่มีเครื่องหมาย * ให้ครบทุกช่อง'); return;
        }
        if (!checker) { UI.warn('ยังไม่เลือกผู้ตรวจสอบ'); return; }
        if (!deputy) { UI.warn('ยังไม่เลือกผู้ปฏิบัติงานแทน'); return; }
        var days = UI.daysBetween(s, en);
        if (!days) { UI.warn('ช่วงวันที่ไม่ถูกต้อง', 'วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น'); return; }
        if (days > v.total) {
          UI.warn('วันลาเกินสิทธิ', 'ขอลา ' + days + ' วัน แต่มีสิทธิลาพักผ่อนคงเหลือ ' + v.total + ' วันทำการ'); return;
        }
        var sg = sig.get();
        if (!sg) { UI.warn('ยังไม่ได้ลงลายเซ็น', 'กรุณาเลือกลายเซ็นสแกน หรือเซ็นสดในกรอบ'); return; }

        var per = DB.resolvePeriod(s);
        var rec = {
          id: _editId || undefined,
          userId: me.id,
          fyId: per.fyId, fyName: per.fyName, round: per.round,
          leaveType: 'vacation',
          subject: 'ขอลาพักผ่อน',
          reason: 'ลาพักผ่อนประจำปี',
          docDate: docDate, startDate: s, endDate: en, days: days, contact: contact,
          writtenAt: st.officeName, affiliation: st.affiliation, district: district,
          applicantName: me.fullname, applicantPosition: me.position || '',
          signature: sg,
          /* snapshot ผู้ตรวจสอบ / ผู้ปฏิบัติงานแทน */
          checkerId: checker.id, checkerName: checker.fullname,
          checkerPosition: checker.position || '', checkerSignature: checker.signature || '',
          deputyId: deputy.id, deputyName: deputy.fullname,
          deputyPosition: deputy.position || '', deputySignature: deputy.signature || '',
          /* snapshot สิทธิ ณ วันที่ยื่น */
          vacation: { carry: v.carry, quota: v.quota, used: v.used, remain: v.remain, total: v.total },
          summaryBefore: DB.summaryOf(me.id, per.fyId, _editId || null),
          status: 'pending'
        };

        UI.confirmAsk(_editId ? 'ยืนยันการแก้ไขใบลาพักผ่อน?' : 'ยืนยันการยื่นใบลาพักผ่อน?',
          '<div class="text-left text-sm leading-7">' +
          '<b>วันที่ลา:</b> ' + esc(UI.rangeText(s, en)) + '<br>' +
          '<b>กำหนด:</b> ' + days + ' วัน<br>' +
          '<b>คงเหลือหลังลา:</b> ' + (v.total - days) + ' วันทำการ<br>' +
          '<b>ผู้ตรวจสอบ:</b> ' + esc(checker.fullname) + '<br>' +
          '<b>ผู้ปฏิบัติงานแทน:</b> ' + esc(deputy.fullname) +
          '</div>', '<i class="fa-solid fa-paper-plane"></i> ยืนยัน').then(function (yes) {
          if (!yes) return;
          UI.busy('กำลังบันทึกใบลาพักผ่อน...');
          UI.delay(600).then(function () {
            DB.saveLeave(rec);
            _editId = null;
            UI.idle();
            UI.ok('บันทึกสำเร็จ', 'ยื่นใบลาพักผ่อนเรียบร้อย รอผู้บังคับบัญชาพิจารณา').then(function () { APP.go('mine'); });
          });
        });
      });
    });
  }

  /* ================= ข้อมูลขออนุญาตลาของฉัน ================= */
  function mine(body) {
    body.innerHTML = UI.skTable(6, 7);
    UI.delay().then(function () {
      var me = APP.user();
      var list = DB.leavesByUser(me.id).sort(function (a, b) {
        return String(a.startDate).localeCompare(String(b.startDate));
      });
      var h = UI.pageHead('ข้อมูลขออนุญาตลา', 'ทั้งหมด ' + list.length + ' รายการ',
        '<button class="btn-primary" id="goReq"><i class="fa-solid fa-file-pen"></i> ขออนุญาตลา</button>');
      h += '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
        '<th style="width:60px">ลำดับ</th><th>ปีงบประมาณ</th><th>รอบที่</th><th>ประเภทการลา</th>' +
        '<th>กำหนดวัน</th><th>สถานะ</th><th style="width:170px">จัดการ</th></tr></thead><tbody>';
      if (!list.length) h += UI.emptyRow(7, 'ยังไม่มีการยื่นใบลา');
      list.forEach(function (l, i) {
        var pending = (l.status || 'pending') === 'pending';
        h += '<tr><td class="td-c">' + (i + 1) + '</td>' +
          '<td class="td-c">' + esc(l.fyName) + '</td><td class="td-c">' + esc(l.round) + '</td>' +
          '<td class="td-c">' + UI.typeBadge(l.leaveType) + '</td>' +
          '<td class="td-c">' + esc(UI.rangeText(l.startDate, l.endDate)) + ' <span class="text-slate-400">(' + esc(l.days) + ' วัน)</span></td>' +
          '<td class="td-c">' + UI.statusBadge(l.status) + '</td>' +
          '<td class="td-c"><div class="flex justify-center gap-1.5">' +
            '<button class="ibtn ibtn-view" data-view="' + l.id + '" title="ดูใบลา"><i class="fa-solid fa-eye"></i></button>' +
            '<button class="ibtn ibtn-print" data-print="' + l.id + '" title="พิมพ์ใบลา"><i class="fa-solid fa-print"></i></button>' +
            (pending ? '<button class="ibtn ibtn-edit" data-edit="' + l.id + '" title="แก้ไข"><i class="fa-solid fa-pen"></i></button>' +
                       '<button class="ibtn ibtn-del" data-del="' + l.id + '" title="ลบ"><i class="fa-solid fa-trash"></i></button>' : '') +
          '</div></td></tr>';
      });
      h += '</tbody></table></div>';
      body.innerHTML = h;

      $('#goReq').addEventListener('click', function () { _editId = null; APP.go('request'); });
      $$('[data-view]', body).forEach(function (b) {
        b.addEventListener('click', function () { PRINT.preview(b.dataset.view); });
      });
      $$('[data-print]', body).forEach(function (b) {
        b.addEventListener('click', function () { PRINT.leave(b.dataset.print); });
      });
      $$('[data-edit]', body).forEach(function (b) {
        b.addEventListener('click', function () {
          var l = DB.leaveById(b.dataset.edit);
          _editId = b.dataset.edit;
          APP.go(l && l.leaveType === 'vacation' ? 'vacation' : 'request');
        });
      });
      $$('[data-del]', body).forEach(function (b) {
        b.addEventListener('click', function () {
          UI.confirmDel('ลบใบลานี้?').then(function (yes) {
            if (!yes) return;
            UI.busy('กำลังลบข้อมูล...');
            UI.delay(400).then(function () {
              DB.deleteLeave(b.dataset.del);
              UI.idle(); UI.toast('ลบใบลาเรียบร้อย'); APP.reload();
            });
          });
        });
      });
    });
  }

  /** ล้างสถานะ "กำลังแก้ไขใบลา" (เรียกเมื่อผู้ใช้กดเมนูเอง) */
  function clearEditing() { _editId = null; }

  return { MENU: MENU, render: render, profile: profile, statTableHTML: statTableHTML, clearEditing: clearEditing };
})();
