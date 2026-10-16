/* ============================================================
   app.js — โครงหลัก : sidebar, routing, bootstrap
   ============================================================ */
var APP = (function () {
  var $ = UI.$;
  var _user = null;
  var _page = null;

  function user() { return _user; }

  function moduleOf(role) {
    if (role === 'admin') return ADMIN;
    if (role === 'chief') return CHIEF;
    return STAFF;
  }

  /* ---------- sidebar ---------- */
  function openSb() {
    $('#sidebar').classList.remove('-translate-x-full');
    $('#sbBackdrop').classList.remove('hidden');
  }
  function closeSb() {
    if (window.innerWidth >= 1024) return;   /* จอใหญ่เมนูค้างไว้เสมอ */
    $('#sidebar').classList.add('-translate-x-full');
    $('#sbBackdrop').classList.add('hidden');
  }

  /* ---------- แบรนด์/ผู้ใช้ ---------- */
  function renderShell() {
    var s = DB.settings();
    $('#sbLogo').src = s.logo || DB.DEFAULT_LOGO;
    $('#sbOffice').textContent = s.officeName || '';
    $('#sbAvatar').src = UI.avatarOf(_user);
    $('#hdAvatar').src = UI.avatarOf(_user);
    $('#sbName').textContent = _user.fullname || '';
    $('#sbRole').textContent = UI.roleName(_user.role) + (_user.position ? ' · ' + _user.position : '');
    $('#appFooter').innerHTML =
      '<span class="font-semibold text-brand-700">ระบบการลา บุคลากรเจ้าหน้าที่</span> ' +
      UI.esc(s.officeName || '') + ' ' + UI.esc(s.province || '') +
      '<span class="mt-0.5 block text-[11px] text-slate-400">สังกัด ' + UI.esc(s.affiliation || '') + '</span>';

    var fy = DB.currentFY();
    $('#hdFiscal').innerHTML = '<i class="fa-solid fa-calendar-days"></i> ปีงบประมาณ ' + UI.esc(fy ? fy.name : '-');

    renderMenu();
  }

  function renderMenu() {
    var items = moduleOf(_user.role).MENU;
    $('#sbMenu').innerHTML =
      '<p class="px-3 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">เมนู' +
      UI.esc(UI.roleName(_user.role)) + '</p>' +
      items.map(function (m) {
        return '<button class="mi' + (m.id === _page ? ' active' : '') + '" data-page="' + m.id + '">' +
               '<i class="fa-solid ' + m.icon + '"></i> ' + UI.esc(m.label) + '</button>';
      }).join('');
    UI.$$('#sbMenu .mi').forEach(function (b) {
      b.addEventListener('click', function () {
        /* กดเมนูเอง = เริ่มใบลาใหม่ ไม่ใช่โหมดแก้ไข */
        if (window.STAFF && STAFF.clearEditing) STAFF.clearEditing();
        go(b.dataset.page); closeSb();
      });
    });
  }

  /* ---------- routing ---------- */
  function go(pageId) {
    var mod = moduleOf(_user.role);
    var item = mod.MENU.filter(function (m) { return m.id === pageId; })[0] || mod.MENU[0];
    _page = item.id;
    renderMenu();
    $('#pageTitle').textContent = item.title || item.label;
    $('#pageSub').textContent = item.sub || '';
    window.scrollTo({ top: 0 });
    mod.render(_page, $('#pageBody'));
  }

  /* ---------- หน้าจอ ---------- */
  function showLogin() {
    _user = null; _page = null;
    $('#appView').classList.add('hidden');
    $('#loginView').classList.remove('hidden');
    $('#loginView').classList.add('flex');
    $('#loginForm').reset();
    AUTH.fillLoginBrand();
  }

  function enterApp(u) {
    _user = DB.userById(u.id) || u;
    $('#loginView').classList.add('hidden');
    $('#loginView').classList.remove('flex');
    $('#appView').classList.remove('hidden');
    renderShell();
    go(moduleOf(_user.role).MENU[0].id);
  }

  /** เรียกเมื่อข้อมูลผู้ใช้/ตั้งค่าเปลี่ยน */
  function refreshUser() {
    if (!_user) return;
    _user = DB.userById(_user.id) || _user;
    renderShell();
  }

  function reload() { if (_page) go(_page); }

  /* ---------- ตัวบอกสถานะการบันทึกขึ้นเซิร์ฟเวอร์ ---------- */
  function bindSyncBadge() {
    var el = $('#syncBadge');
    if (!el) return;
    if (!DB.hasServer()) { el.classList.add('hidden'); return; }
    DB.onSync(function (s) {
      el.classList.remove('hidden');
      if (s.state === 'saving') {
        el.className = 'badge badge-wait';
        el.innerHTML = '<span class="spinner spinner-sm"></span> กำลังบันทึก...';
      } else if (s.state === 'error') {
        el.className = 'badge badge-no';
        el.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> ยังไม่ได้บันทึก';
        el.title = s.message || '';
      } else {
        el.className = 'badge badge-ok';
        el.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> บันทึกแล้ว';
        el.title = s.at ? 'ล่าสุด ' + s.at.toLocaleTimeString('th-TH') : '';
      }
    });
  }

  /* ---------- boot ---------- */
  function boot() {
    /* โหลดข้อมูลจาก Google Sheets (หรือ localStorage) ให้เสร็จก่อนเปิดระบบ */
    var splash = $('#bootScreen');
    DB.bootstrap(function (err, info) {
      if (splash) splash.remove();
      if (err) {
        UI.warn('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้',
          'ระบบกำลังใช้ข้อมูลสำเนาในเครื่องชั่วคราว การแก้ไขอาจยังไม่ถูกบันทึกขึ้น Google Sheets');
      }
      start();
    });
  }

  function start() {
    bindSyncBadge();
    AUTH.bind();

    $('#sbOpen').addEventListener('click', openSb);
    $('#sbClose').addEventListener('click', closeSb);
    $('#sbBackdrop').addEventListener('click', closeSb);

    /* ปิด modal : ใช้ event delegation รองรับปุ่มที่สร้างภายหลัง */
    $('#modal').addEventListener('click', function (ev) {
      var t = ev.target.closest ? ev.target.closest('[data-modal-close]') : null;
      if (t) UI.closeModal();
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && !$('#modal').classList.contains('hidden')) UI.closeModal();
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 1024) {
        $('#sidebar').classList.remove('-translate-x-full');
        $('#sbBackdrop').classList.add('hidden');
      }
    });

    var su = DB.sessionUser();
    if (su) enterApp(su); else showLogin();
  }

  return {
    boot: boot, go: go, reload: reload, user: user,
    showLogin: showLogin, enterApp: enterApp, refreshUser: refreshUser,
    renderShell: renderShell, closeSb: closeSb
  };
})();

document.addEventListener('DOMContentLoaded', APP.boot);
