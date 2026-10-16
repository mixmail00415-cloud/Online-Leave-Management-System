/* ============================================================
   admin.js — หน้าสำหรับผู้ดูแลระบบ
   ============================================================ */
var ADMIN = (function () {
  var $ = UI.$, $$ = UI.$$, esc = UI.esc;

  var MENU = [
    { id: 'dash',     icon: 'fa-gauge-high',      label: 'แดชบอร์ด',        title: 'แดชบอร์ด',             sub: 'ภาพรวมระบบการลา' },
    { id: 'settings', icon: 'fa-gear',            label: 'ตั้งค่าระบบ',      title: 'ตั้งค่าระบบ',           sub: 'ชื่อสังกัด และโลโก้หน่วยงาน' },
    { id: 'users',    icon: 'fa-users-gear',      label: 'จัดการผู้ใช้งาน',  title: 'จัดการผู้ใช้งาน',       sub: 'เพิ่ม / แก้ไข / ลบ ผู้ใช้งานระบบ' },
    { id: 'fy',       icon: 'fa-calendar-days',   label: 'จัดการปีงบประมาณ', title: 'จัดการปีงบประมาณ',     sub: 'กำหนดรอบที่ 1 / รอบที่ 2 และปีปัจจุบัน' },
    { id: 'leaves',   icon: 'fa-file-lines',      label: 'รายการลาทั้งหมด',  title: 'รายการลาทั้งหมด',       sub: 'กรองข้อมูล ดูรายละเอียด และพิมพ์ใบลา' },
    { id: 'stats',    icon: 'fa-chart-column',    label: 'สรุปสถิติการลา',   title: 'สรุปสถิติการลา',        sub: 'สถิติรายบุคคลตามปีงบประมาณ' }
  ];

  function render(page, body) {
    if (page === 'dash')     return dash(body);
    if (page === 'settings') return settings(body);
    if (page === 'users')    return users(body);
    if (page === 'fy')       return fy(body);
    if (page === 'leaves')   return leaves(body);
    if (page === 'stats')    return stats(body);
  }

  /* ================= แดชบอร์ด ================= */
  function dash(body) {
    body.innerHTML = UI.skCards(4);
    UI.delay().then(function () {
      var all = DB.leaves(), f = DB.currentFY();
      var inFy = f ? all.filter(function (l) { return l.fyId === f.id; }) : all;
      var wait = inFy.filter(function (l) { return (l.status || 'pending') === 'pending'; }).length;
      var ok = inFy.filter(function (l) { return l.status === 'approved'; }).length;
      var no = inFy.filter(function (l) { return l.status === 'rejected'; }).length;

      var h = UI.pageHead('ภาพรวมระบบ', 'ปีงบประมาณ ' + (f ? f.name : '-'));
      h += '<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">' +
        UI.stat('fa-users', '#DB2777', 'ผู้ใช้งานทั้งหมด', DB.users().length, 'คน') +
        UI.stat('fa-clock', '#F57C00', 'รออนุญาต', wait, 'รายการ') +
        UI.stat('fa-circle-check', '#26A69A', 'อนุญาตแล้ว', ok, 'รายการ') +
        UI.stat('fa-circle-xmark', '#EF5350', 'ไม่อนุญาต', no, 'รายการ') +
        '</div>';

      /* 5 รายการล่าสุด */
      var recent = all.slice().sort(function (a, b) {
        return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
      }).slice(0, 5);

      h += '<div class="mt-6 card card-pad">' +
        '<p class="mb-3 font-bold text-slate-800"><i class="fa-regular fa-clock text-brand-600"></i> รายการลาล่าสุด</p>' +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
        '<th>ชื่อ-นามสกุล</th><th>ประเภท</th><th>วันที่ลา</th><th>วัน</th><th>สถานะ</th></tr></thead><tbody>';
      if (!recent.length) h += UI.emptyRow(5, 'ยังไม่มีรายการลา');
      recent.forEach(function (l) {
        h += '<tr><td>' + esc(l.applicantName) + '</td><td class="td-c">' + UI.typeBadge(l.leaveType) + '</td>' +
          '<td class="td-c">' + esc(UI.rangeText(l.startDate, l.endDate)) + '</td>' +
          '<td class="td-c">' + esc(l.days) + '</td><td class="td-c">' + UI.statusBadge(l.status) + '</td></tr>';
      });
      h += '</tbody></table></div></div>';
      body.innerHTML = h;
    });
  }

  /* ================= ตั้งค่าระบบ ================= */
  function settings(body) {
    body.innerHTML = UI.skForm();
    UI.delay().then(function () {
      var s = DB.settings();
      body.innerHTML = UI.pageHead('ตั้งค่าระบบ', 'ข้อมูลหน่วยงานที่แสดงในระบบและใบลา') +
        '<form id="stForm" class="card card-pad max-w-2xl space-y-4">' +
          '<div><label class="lbl">ชื่อสำนักงาน <span class="req">*</span></label>' +
            '<input name="officeName" class="inp" value="' + esc(s.officeName) + '" required></div>' +
          '<div><label class="lbl">ชื่อสังกัด <span class="req">*</span></label>' +
            '<input name="affiliation" class="inp" value="' + esc(s.affiliation) + '" required></div>' +
          '<div><label class="lbl">โลโก้กระทรวงสาธารณสุข</label>' +
            '<div class="flex items-center gap-4">' +
              '<img id="stPrev" class="up-prev-wide" src="' + (s.logo || DB.DEFAULT_LOGO) + '" alt="โลโก้">' +
              '<div class="flex-1"><input type="file" id="stLogo" accept="image/*" class="inp">' +
              '<p class="mt-1 text-xs text-slate-400">ไม่บังคับ · ระบบจะย่อขนาดรูปอัตโนมัติ</p></div>' +
            '</div></div>' +
          '<div class="flex justify-end gap-2 pt-2">' +
            '<button type="submit" class="btn-primary"><i class="fa-solid fa-floppy-disk"></i> บันทึกการตั้งค่า</button>' +
          '</div>' +
        '</form>';

      UI.bindUpload($('#stLogo'), $('#stPrev'), 400, 400);
      $('#stForm').addEventListener('submit', function (e) {
        e.preventDefault();
        var btn = e.target.querySelector('button[type=submit]');
        var fd = new FormData(e.target);
        UI.btnLoading(btn, true);
        UI.delay(500).then(function () {
          DB.saveSettings({
            officeName: String(fd.get('officeName')).trim(),
            affiliation: String(fd.get('affiliation')).trim(),
            logo: $('#stLogo').dataset.value || ''
          });
          UI.btnLoading(btn, false);
          APP.renderShell();
          AUTH.fillLoginBrand();
          UI.ok('บันทึกสำเร็จ', 'อัปเดตข้อมูลหน่วยงานเรียบร้อย');
        });
      });
    });
  }

  /* ================= จัดการผู้ใช้งาน ================= */
  function users(body) {
    body.innerHTML = UI.skTable(6, 6);
    UI.delay().then(function () {
      var list = DB.users();
      var h = UI.pageHead('จัดการผู้ใช้งาน', 'ทั้งหมด ' + list.length + ' บัญชี',
        '<button class="btn-primary" id="uAdd"><i class="fa-solid fa-user-plus"></i> เพิ่มผู้ใช้งาน</button>');
      h += '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
        '<th style="width:60px">ลำดับ</th><th>ชื่อ-นามสกุล</th><th>ชื่อผู้ใช้</th>' +
        '<th>สิทธิ์</th><th>ตำแหน่ง</th><th style="width:130px">จัดการ</th></tr></thead><tbody>';
      if (!list.length) h += UI.emptyRow(6);
      list.forEach(function (u, i) {
        h += '<tr><td class="td-c">' + (i + 1) + '</td>' +
          '<td><div class="flex items-center gap-2"><img src="' + UI.avatarOf(u) +
            '" class="h-8 w-8 rounded-full object-cover ring-1 ring-brand-100"><span>' + esc(u.fullname) + '</span></div></td>' +
          '<td class="td-c">' + esc(u.username) + '</td>' +
          '<td class="td-c"><span class="badge badge-brand">' + esc(UI.roleName(u.role)) + '</span></td>' +
          '<td>' + esc(u.position || '-') + '</td>' +
          '<td class="td-c"><div class="flex justify-center gap-1.5">' +
            '<button class="ibtn ibtn-edit" data-edit="' + u.id + '" title="แก้ไข"><i class="fa-solid fa-pen"></i></button>' +
            '<button class="ibtn ibtn-del" data-del="' + u.id + '" title="ลบ"><i class="fa-solid fa-trash"></i></button>' +
          '</div></td></tr>';
      });
      h += '</tbody></table></div>';
      body.innerHTML = h;

      $('#uAdd').addEventListener('click', function () { userForm(null); });
      $$('[data-edit]', body).forEach(function (b) {
        b.addEventListener('click', function () { userForm(DB.userById(b.dataset.edit)); });
      });
      $$('[data-del]', body).forEach(function (b) {
        b.addEventListener('click', function () {
          var u = DB.userById(b.dataset.del);
          if (u && u.id === APP.user().id) { UI.warn('ลบไม่ได้', 'ไม่สามารถลบบัญชีที่กำลังใช้งานอยู่'); return; }
          UI.confirmDel('ลบผู้ใช้ "' + (u ? u.fullname : '') + '"?',
            'ข้อมูลการลาของผู้ใช้นี้จะถูกลบทั้งหมด').then(function (yes) {
            if (!yes) return;
            UI.busy('กำลังลบข้อมูล...');
            UI.delay(400).then(function () {
              DB.deleteUser(b.dataset.del);
              UI.idle(); UI.toast('ลบผู้ใช้งานเรียบร้อย'); APP.reload();
            });
          });
        });
      });
    });
  }

  function userForm(u) {
    var isNew = !u;
    u = u || { role: 'staff' };
    var roleOpts = DB.ROLES.map(function (r) {
      return '<option value="' + r.id + '"' + (u.role === r.id ? ' selected' : '') + '>' + esc(r.name) + '</option>';
    }).join('');

    UI.modal({
      title: isNew ? 'เพิ่มผู้ใช้งาน' : 'แก้ไขผู้ใช้งาน',
      sub: isNew ? 'กรอกข้อมูลบัญชีผู้ใช้ใหม่' : esc(u.fullname),
      icon: isNew ? 'fa-user-plus' : 'fa-user-pen',
      body: '<form id="uForm" class="space-y-4" autocomplete="off">' +
        '<div class="grid gap-4 sm:grid-cols-2">' +
          '<div><label class="lbl">ชื่อผู้ใช้ (Username) <span class="req">*</span></label>' +
            '<input name="username" class="inp" value="' + esc(u.username || '') + '" required></div>' +
          '<div><label class="lbl">รหัสผ่าน (Password) <span class="req">*</span></label>' +
            '<input name="password" class="inp" value="' + esc(u.password || '') + '" required></div>' +
        '</div>' +
        '<div><label class="lbl">ชื่อ-นามสกุล <span class="req">*</span></label>' +
          '<input name="fullname" class="inp" value="' + esc(u.fullname || '') + '" required></div>' +
        '<div class="grid gap-4 sm:grid-cols-2">' +
          '<div><label class="lbl">สิทธิ์การใช้งาน <span class="req">*</span></label>' +
            '<select name="role" id="uRole" class="sel">' + roleOpts + '</select></div>' +
          '<div id="uPosWrap" class="' + (u.role === 'staff' ? '' : 'hidden') + '">' +
            '<label class="lbl">ตำแหน่ง <span class="req">*</span></label>' +
            '<input name="position" id="uPos" class="inp" value="' + esc(u.position || '') + '"></div>' +
        '</div>' +
        '<div class="rounded-2xl border border-brand-100 bg-brand-50/40 p-3">' +
          '<p class="mb-2 text-sm font-semibold text-brand-700"><i class="fa-solid fa-umbrella-beach"></i> สิทธิลาพักผ่อน</p>' +
          '<div class="grid gap-3 sm:grid-cols-2">' +
            '<div><label class="lbl">วันลาพักผ่อนสะสมยกมา (วันทำการ)</label>' +
              '<input type="number" min="0" name="vacationCarry" class="inp" value="' + esc(u.vacationCarry == null ? 0 : u.vacationCarry) + '"></div>' +
            '<div><label class="lbl">สิทธิลาพักผ่อนประจำปี (วันทำการ)</label>' +
              '<input type="number" min="0" name="vacationQuota" class="inp" value="' + esc(u.vacationQuota == null ? DB.VACATION_QUOTA : u.vacationQuota) + '"></div>' +
          '</div>' +
          '<p class="mt-1.5 text-xs text-slate-400">ระบบจะดึงไปกรอกในแบบใบลาพักผ่อนให้อัตโนมัติ</p>' +
        '</div>' +
        '<div><label class="lbl">รูปภาพโปรไฟล์</label>' +
          '<div class="flex items-center gap-4">' +
            '<img id="uPrev" class="up-prev" src="' + UI.avatarOf(u) + '" alt="โปรไฟล์">' +
            '<div class="flex-1"><input type="file" id="uAvatar" accept="image/*" class="inp">' +
            '<p class="mt-1 text-xs text-slate-400">ไม่บังคับ</p></div>' +
          '</div></div>' +
        '<div><label class="lbl">รูปภาพลายเซ็น</label>' +
          '<div class="flex items-center gap-4">' +
            '<img id="uSigPrev" class="up-prev-wide ' + (u.signature ? '' : 'hidden') + '" src="' + (u.signature || '') + '" alt="ลายเซ็น">' +
            '<div class="flex-1"><input type="file" id="uSig" accept="image/*" class="inp">' +
            '<p class="mt-1 text-xs text-slate-400">ไม่บังคับ · ใช้ประกอบใบลา</p></div>' +
          '</div></div>' +
        '</form>',
      foot: '<button class="btn-ghost" data-modal-close>ยกเลิก</button>' +
            '<button class="btn-primary" id="uSave"><i class="fa-solid fa-floppy-disk"></i> บันทึกข้อมูล</button>',
      onOpen: function () {
        UI.bindUpload($('#uAvatar'), $('#uPrev'), 400, 400);
        UI.bindUpload($('#uSig'), $('#uSigPrev'), 600, 300);
        $('#uRole').addEventListener('change', function () {
          $('#uPosWrap').classList.toggle('hidden', $('#uRole').value !== 'staff');
        });
        $('#uSave').addEventListener('click', function () {
          var form = $('#uForm'), fd = new FormData(form);
          var data = {
            id: u.id,
            username: String(fd.get('username') || '').trim(),
            password: String(fd.get('password') || ''),
            fullname: String(fd.get('fullname') || '').trim(),
            role: String(fd.get('role') || 'staff'),
            position: String(fd.get('position') || '').trim(),
            vacationCarry: Math.max(0, Number(fd.get('vacationCarry') || 0)),
            vacationQuota: Math.max(0, Number(fd.get('vacationQuota') || DB.VACATION_QUOTA))
          };
          if (!data.username || !data.password || !data.fullname) {
            UI.warn('ข้อมูลไม่ครบ', 'กรุณากรอกข้อมูลที่มีเครื่องหมาย * ให้ครบถ้วน'); return;
          }
          if (data.role === 'staff' && !data.position) {
            UI.warn('ข้อมูลไม่ครบ', 'กรุณากรอกตำแหน่งของเจ้าหน้าที่'); return;
          }
          if (DB.usernameTaken(data.username, u.id)) {
            UI.warn('ชื่อผู้ใช้ซ้ำ', 'มีผู้ใช้ชื่อนี้ในระบบแล้ว'); return;
          }
          if (data.role === 'chief') {
            var other = DB.chief();
            if (other && other.id !== u.id) {
              UI.warn('มีสาธารณสุขอำเภอแล้ว', 'ระบบกำหนดให้มีสาธารณสุขอำเภอได้เพียง 1 บัญชี'); return;
            }
          }
          if ($('#uAvatar').dataset.value) data.avatar = $('#uAvatar').dataset.value;
          if ($('#uSig').dataset.value) data.signature = $('#uSig').dataset.value;

          var btn = $('#uSave');
          UI.btnLoading(btn, true);
          UI.delay(500).then(function () {
            DB.saveUser(data);
            UI.btnLoading(btn, false);
            UI.closeModal();
            UI.toast(isNew ? 'เพิ่มผู้ใช้งานเรียบร้อย' : 'แก้ไขข้อมูลเรียบร้อย');
            if (u.id === APP.user().id) APP.refreshUser();
            APP.reload();
          });
        });
      }
    });
  }

  /* ================= จัดการปีงบประมาณ ================= */
  function fy(body) {
    body.innerHTML = UI.skTable(5, 6);
    UI.delay().then(function () {
      var list = DB.fiscalYears();
      var h = UI.pageHead('จัดการปีงบประมาณ', 'ทั้งหมด ' + list.length + ' ปีงบประมาณ',
        '<button class="btn-primary" id="fAdd"><i class="fa-solid fa-plus"></i> เพิ่มปีงบประมาณ</button>');
      h += '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
        '<th style="width:60px">ลำดับ</th><th>ชื่อปีงบประมาณ</th><th>รอบที่ 1</th><th>รอบที่ 2</th>' +
        '<th>สถานะ</th><th style="width:150px">จัดการ</th></tr></thead><tbody>';
      if (!list.length) h += UI.emptyRow(6);
      list.forEach(function (f, i) {
        h += '<tr><td class="td-c">' + (i + 1) + '</td>' +
          '<td class="td-c font-semibold">' + esc(f.name) + '</td>' +
          '<td class="td-c">' + esc(UI.rangeText(f.r1Start, f.r1End)) + '</td>' +
          '<td class="td-c">' + esc(UI.rangeText(f.r2Start, f.r2End)) + '</td>' +
          '<td class="td-c">' + (f.current
            ? '<span class="badge badge-ok"><i class="fa-solid fa-star"></i> ปีปัจจุบัน</span>'
            : '<span class="badge badge-gray">ไม่ใช่ปีปัจจุบัน</span>') + '</td>' +
          '<td class="td-c"><div class="flex justify-center gap-1.5">' +
            (f.current ? '' : '<button class="ibtn ibtn-star" data-cur="' + f.id + '" title="ตั้งเป็นปีปัจจุบัน"><i class="fa-solid fa-star"></i></button>') +
            '<button class="ibtn ibtn-edit" data-edit="' + f.id + '" title="แก้ไข"><i class="fa-solid fa-pen"></i></button>' +
            '<button class="ibtn ibtn-del" data-del="' + f.id + '" title="ลบ"><i class="fa-solid fa-trash"></i></button>' +
          '</div></td></tr>';
      });
      h += '</tbody></table></div>';
      body.innerHTML = h;

      $('#fAdd').addEventListener('click', function () { fyForm(null); });
      $$('[data-edit]', body).forEach(function (b) {
        b.addEventListener('click', function () { fyForm(DB.fyById(b.dataset.edit)); });
      });
      $$('[data-cur]', body).forEach(function (b) {
        b.addEventListener('click', function () {
          UI.confirmAsk('ตั้งเป็นปีงบประมาณปัจจุบัน?', '', 'ยืนยัน').then(function (yes) {
            if (!yes) return;
            UI.busy('กำลังบันทึก...');
            UI.delay(400).then(function () {
              DB.setCurrentFY(b.dataset.cur);
              UI.idle(); UI.toast('ตั้งปีงบประมาณปัจจุบันเรียบร้อย');
              APP.renderShell(); APP.reload();
            });
          });
        });
      });
      $$('[data-del]', body).forEach(function (b) {
        b.addEventListener('click', function () {
          var used = DB.leaves().some(function (l) { return l.fyId === b.dataset.del; });
          if (used) { UI.warn('ลบไม่ได้', 'มีรายการลาที่อ้างอิงปีงบประมาณนี้อยู่'); return; }
          UI.confirmDel('ลบปีงบประมาณนี้?').then(function (yes) {
            if (!yes) return;
            UI.busy('กำลังลบข้อมูล...');
            UI.delay(400).then(function () {
              DB.deleteFY(b.dataset.del);
              UI.idle(); UI.toast('ลบเรียบร้อย'); APP.renderShell(); APP.reload();
            });
          });
        });
      });
    });
  }

  function fyForm(f) {
    var isNew = !f;
    f = f || {};
    UI.modal({
      title: isNew ? 'เพิ่มปีงบประมาณ' : 'แก้ไขปีงบประมาณ',
      icon: 'fa-calendar-plus',
      body: '<form id="fForm" class="space-y-4">' +
        '<div><label class="lbl">ชื่อปีงบประมาณ <span class="req">*</span></label>' +
          '<input name="name" class="inp" placeholder="เช่น 2570" value="' + esc(f.name || '') + '" required></div>' +
        '<div class="rounded-2xl border border-brand-100 bg-brand-50/50 p-3">' +
          '<p class="mb-2 text-sm font-semibold text-brand-700">รอบที่ 1</p>' +
          '<div class="grid gap-3 sm:grid-cols-2">' +
            '<div><label class="lbl">วันที่เริ่มต้น <span class="req">*</span></label><input type="date" name="r1Start" class="inp" value="' + esc(f.r1Start || '') + '" required></div>' +
            '<div><label class="lbl">วันที่สิ้นสุด <span class="req">*</span></label><input type="date" name="r1End" class="inp" value="' + esc(f.r1End || '') + '" required></div>' +
          '</div></div>' +
        '<div class="rounded-2xl border border-brand-100 bg-brand-50/50 p-3">' +
          '<p class="mb-2 text-sm font-semibold text-brand-700">รอบที่ 2</p>' +
          '<div class="grid gap-3 sm:grid-cols-2">' +
            '<div><label class="lbl">วันที่เริ่มต้น <span class="req">*</span></label><input type="date" name="r2Start" class="inp" value="' + esc(f.r2Start || '') + '" required></div>' +
            '<div><label class="lbl">วันที่สิ้นสุด <span class="req">*</span></label><input type="date" name="r2End" class="inp" value="' + esc(f.r2End || '') + '" required></div>' +
          '</div></div>' +
        '<label class="flex items-center gap-2 text-sm font-medium text-slate-600">' +
          '<input type="checkbox" name="current" class="h-4 w-4 accent-brand-600"' + (f.current ? ' checked' : '') + '> ตั้งเป็นปีงบประมาณปัจจุบัน</label>' +
        '</form>',
      foot: '<button class="btn-ghost" data-modal-close>ยกเลิก</button>' +
            '<button class="btn-primary" id="fSave"><i class="fa-solid fa-floppy-disk"></i> บันทึกข้อมูล</button>',
      onOpen: function () {
        $('#fSave').addEventListener('click', function () {
          var fd = new FormData($('#fForm'));
          var d = {
            id: f.id,
            name: String(fd.get('name') || '').trim(),
            r1Start: fd.get('r1Start'), r1End: fd.get('r1End'),
            r2Start: fd.get('r2Start'), r2End: fd.get('r2End')
          };
          if (!d.name || !d.r1Start || !d.r1End || !d.r2Start || !d.r2End) {
            UI.warn('ข้อมูลไม่ครบ', 'กรุณากรอกข้อมูลให้ครบถ้วน'); return;
          }
          if (d.r1End < d.r1Start || d.r2End < d.r2Start) {
            UI.warn('ช่วงวันที่ไม่ถูกต้อง', 'วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น'); return;
          }
          var btn = $('#fSave');
          UI.btnLoading(btn, true);
          UI.delay(500).then(function () {
            var saved = DB.saveFY(d);
            if (fd.get('current')) DB.setCurrentFY(saved.id);
            UI.btnLoading(btn, false); UI.closeModal();
            UI.toast(isNew ? 'เพิ่มปีงบประมาณเรียบร้อย' : 'แก้ไขเรียบร้อย');
            APP.renderShell(); APP.reload();
          });
        });
      }
    });
  }

  /* ================= รายการลาทั้งหมด ================= */
  var _flt = { user: '', fy: '', round: '', type: '', status: '' };

  function leaves(body) {
    body.innerHTML = UI.skTable(6, 9);
    UI.delay().then(function () {
      var h = UI.pageHead('รายการลาทั้งหมด', 'กรองข้อมูล ดูรายละเอียด และพิมพ์ใบลา');
      h += '<div class="card card-pad mb-4">' +
        '<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">' +
          '<div><label class="lbl">ชื่อ-นามสกุล</label><select id="fU" class="sel"><option value="">ทั้งหมด</option>' +
            DB.users().map(function (u) { return '<option value="' + u.id + '"' + (_flt.user === u.id ? ' selected' : '') + '>' + esc(u.fullname) + '</option>'; }).join('') +
          '</select></div>' +
          '<div><label class="lbl">ปีงบประมาณ</label><select id="fF" class="sel"><option value="">ทั้งหมด</option>' +
            DB.fiscalYears().map(function (f) { return '<option value="' + f.id + '"' + (_flt.fy === f.id ? ' selected' : '') + '>' + esc(f.name) + '</option>'; }).join('') +
          '</select></div>' +
          '<div><label class="lbl">รอบที่</label><select id="fR" class="sel"><option value="">ทั้งหมด</option>' +
            '<option value="1"' + (_flt.round === '1' ? ' selected' : '') + '>รอบที่ 1</option>' +
            '<option value="2"' + (_flt.round === '2' ? ' selected' : '') + '>รอบที่ 2</option></select></div>' +
          '<div><label class="lbl">ประเภท</label><select id="fT" class="sel"><option value="">ทั้งหมด</option>' +
            DB.LEAVE_TYPES.map(function (t) { return '<option value="' + t.id + '"' + (_flt.type === t.id ? ' selected' : '') + '>' + esc(t.name) + '</option>'; }).join('') +
          '</select></div>' +
          '<div><label class="lbl">สถานะ</label><select id="fS" class="sel"><option value="">ทั้งหมด</option>' +
            '<option value="pending"' + (_flt.status === 'pending' ? ' selected' : '') + '>รออนุญาต</option>' +
            '<option value="approved"' + (_flt.status === 'approved' ? ' selected' : '') + '>อนุญาต</option>' +
            '<option value="rejected"' + (_flt.status === 'rejected' ? ' selected' : '') + '>ไม่อนุญาต</option></select></div>' +
        '</div></div>';
      h += '<div id="lvTbl"></div>';
      body.innerHTML = h;

      ['fU', 'fF', 'fR', 'fT', 'fS'].forEach(function (id) {
        $('#' + id).addEventListener('change', function () {
          _flt = { user: $('#fU').value, fy: $('#fF').value, round: $('#fR').value, type: $('#fT').value, status: $('#fS').value };
          drawLeaves();
        });
      });
      drawLeaves();
    });
  }

  function drawLeaves() {
    var box = $('#lvTbl');
    box.innerHTML = UI.skTable(5, 9);
    UI.delay(350).then(function () {
      var list = DB.leaves().filter(function (l) {
        if (_flt.user && l.userId !== _flt.user) return false;
        if (_flt.fy && l.fyId !== _flt.fy) return false;
        if (_flt.round && String(l.round) !== _flt.round) return false;
        if (_flt.type && l.leaveType !== _flt.type) return false;
        if (_flt.status && (l.status || 'pending') !== _flt.status) return false;
        return true;
      }).sort(function (a, b) { return String(b.startDate).localeCompare(String(a.startDate)); });

      var h = '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
        '<th style="width:60px">ลำดับ</th><th>ชื่อ-นามสกุล</th><th>ตำแหน่ง</th><th>รอบที่/ปีงบประมาณ</th>' +
        '<th>ประเภท</th><th>วันที่ลา</th><th>วัน</th><th>สถานะ</th><th style="width:130px">จัดการ</th>' +
        '</tr></thead><tbody>';
      if (!list.length) h += UI.emptyRow(9);
      list.forEach(function (l, i) {
        h += '<tr><td class="td-c">' + (i + 1) + '</td>' +
          '<td>' + esc(l.applicantName) + '</td>' +
          '<td>' + esc(l.applicantPosition || '-') + '</td>' +
          '<td class="td-c">' + esc(l.round) + '/' + esc(l.fyName) + '</td>' +
          '<td class="td-c">' + UI.typeBadge(l.leaveType) + '</td>' +
          '<td class="td-c">' + esc(UI.rangeText(l.startDate, l.endDate)) + '</td>' +
          '<td class="td-c">' + esc(l.days) + '</td>' +
          '<td class="td-c">' + UI.statusBadge(l.status) + '</td>' +
          '<td class="td-c"><div class="flex justify-center gap-1.5">' +
            '<button class="ibtn ibtn-view" data-view="' + l.id + '" title="ดูรายละเอียด"><i class="fa-solid fa-eye"></i></button>' +
            '<button class="ibtn ibtn-print" data-print="' + l.id + '" title="พิมพ์ใบลา"><i class="fa-solid fa-print"></i></button>' +
            '<button class="ibtn ibtn-del" data-del="' + l.id + '" title="ลบ"><i class="fa-solid fa-trash"></i></button>' +
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
      $$('[data-del]', box).forEach(function (b) {
        b.addEventListener('click', function () {
          UI.confirmDel('ลบรายการลานี้?').then(function (yes) {
            if (!yes) return;
            UI.busy('กำลังลบข้อมูล...');
            UI.delay(400).then(function () {
              DB.deleteLeave(b.dataset.del);
              UI.idle(); UI.toast('ลบรายการลาเรียบร้อย'); drawLeaves();
            });
          });
        });
      });
    });
  }

  /* ================= สรุปสถิติการลา ================= */
  function stats(body) {
    var cur = DB.currentFY();
    body.innerHTML = UI.pageHead('สรุปสถิติการลา', 'เลือกปีงบประมาณแล้วกดโหลดข้อมูล') +
      '<div class="card card-pad mb-4"><div class="flex flex-wrap items-end gap-3">' +
        '<div class="min-w-[200px] flex-1"><label class="lbl">ปีงบประมาณ <span class="req">*</span></label>' +
          '<select id="sFy" class="sel">' + DB.fiscalYears().map(function (f) {
            return '<option value="' + f.id + '"' + (cur && cur.id === f.id ? ' selected' : '') + '>' + esc(f.name) + '</option>';
          }).join('') + '</select></div>' +
        '<button class="btn-primary" id="sLoad"><i class="fa-solid fa-rotate"></i> โหลดข้อมูล</button>' +
      '</div></div>' +
      '<div id="sBox" class="card card-pad text-center text-sm text-slate-400">' +
        '<i class="fa-regular fa-chart-bar mb-2 block text-3xl"></i>กรุณาเลือกปีงบประมาณและกดปุ่มโหลดข้อมูล</div>';

    $('#sLoad').addEventListener('click', function () {
      var fyId = $('#sFy').value;
      if (!fyId) { UI.warn('ยังไม่เลือกปีงบประมาณ'); return; }
      var box = $('#sBox');
      box.className = '';
      box.innerHTML = UI.skTable(6, 9);
      UI.delay(600).then(function () { box.innerHTML = statTable(fyId); });
    });
  }

  function statTable(fyId) {
    var f = DB.fyById(fyId);
    var list = DB.users().filter(function (u) { return u.role !== 'admin'; });
    var SHORT = { sick: 'ป่วย', personal: 'กิจ', maternity: 'ลาคลอด', vacation: 'พักผ่อน' };
    var keys = DB.LEAVE_TYPES.map(function (t) { return t.id; });
    var tot = { all: { t: 0, d: 0 } };
    keys.forEach(function (k) { tot[k] = { t: 0, d: 0 }; });
    var cols = keys.length + 1;   /* + คอลัมน์รวม */

    var h = '<div class="tbl-wrap"><table class="tbl tbl-stat"><thead>' +
      '<tr><th rowspan="2" style="width:60px">ลำดับ</th><th rowspan="2">ชื่อ-นามสกุล</th>' +
      keys.map(function (k) { return '<th colspan="2">' + esc(SHORT[k] || UI.typeName(k)) + '</th>'; }).join('') +
      '<th colspan="2">รวม</th></tr><tr>' +
      new Array(cols + 1).join('<th>ครั้ง</th><th>วัน</th>') +
      '</tr></thead><tbody>';

    if (!list.length) h += UI.emptyRow(2 + cols * 2);
    list.forEach(function (u, i) {
      var s = DB.summaryOf(u.id, fyId), at = 0, ad = 0;
      h += '<tr><td>' + (i + 1) + '</td><td>' + esc(u.fullname) + '</td>';
      keys.forEach(function (k) {
        tot[k].t += s[k].times; tot[k].d += s[k].days;
        at += s[k].times; ad += s[k].days;
        h += '<td>' + s[k].times + '</td><td>' + s[k].days + '</td>';
      });
      tot.all.t += at; tot.all.d += ad;
      h += '<td class="font-semibold">' + at + '</td><td class="font-semibold">' + ad + '</td></tr>';
    });
    h += '</tbody><tfoot><tr><td colspan="2" class="td-c">รวมทั้งหมด</td>' +
      keys.map(function (k) {
        return '<td class="td-c">' + tot[k].t + '</td><td class="td-c">' + tot[k].d + '</td>';
      }).join('') +
      '<td class="td-c">' + tot.all.t + '</td><td class="td-c">' + tot.all.d + '</td></tr></tfoot></table></div>' +
      '<p class="mt-2 text-xs text-slate-400">ปีงบประมาณ ' + esc(f ? f.name : '-') + ' · นับรายการที่ไม่ถูกปฏิเสธ</p>';
    return h;
  }

  return { MENU: MENU, render: render };
})();
