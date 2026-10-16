/* ============================================================
   auth.js — เข้าสู่ระบบ / ออกจากระบบ
   ============================================================ */
var AUTH = (function () {
  var $ = UI.$;

  function fillLoginBrand() {
    var s = DB.settings();
    $('#loginLogo').src = s.logo || DB.DEFAULT_LOGO;
    $('#loginOffice').textContent = s.officeName || '';
    $('#loginAffil').textContent = s.affiliation || '';
    $('#loginFooter').textContent = 'ระบบการลา บุคลากรเจ้าหน้าที่ ' + (s.officeName || '');
  }

  function bind() {
    fillLoginBrand();

    /* ปุ่มดู/ซ่อนรหัสผ่าน */
    UI.$$('[data-pw]').forEach(function (b) {
      b.addEventListener('click', function () {
        var inp = b.parentNode.querySelector('input');
        var show = inp.type === 'password';
        inp.type = show ? 'text' : 'password';
        b.innerHTML = '<i class="fa-regular ' + (show ? 'fa-eye-slash' : 'fa-eye') + '"></i>';
      });
    });

    $('#loginForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = e.target.querySelector('button[type=submit], button:not([type])');
      var fd = new FormData(e.target);
      var u = String(fd.get('username') || '').trim();
      var p = String(fd.get('password') || '');
      if (!u || !p) { UI.warn('กรอกข้อมูลไม่ครบ', 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'); return; }

      UI.btnLoading(btn, true, 'กำลังตรวจสอบ...');
      UI.delay(650).then(function () {
        var user = DB.login(u, p);
        UI.btnLoading(btn, false);
        if (!user) { UI.err('เข้าสู่ระบบไม่สำเร็จ', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'); return; }
        DB.setSession(user.id);
        e.target.reset();
        UI.toast('ยินดีต้อนรับ ' + user.fullname);
        APP.enterApp(user);
      });
    });

    $('#btnLogout').addEventListener('click', function () {
      UI.confirmAsk('ออกจากระบบ?', 'ท่านต้องการออกจากระบบใช่หรือไม่', '<i class="fa-solid fa-power-off"></i> ออกจากระบบ')
        .then(function (yes) {
          if (!yes) return;
          UI.busy('กำลังออกจากระบบ...');
          DB.flush();                      /* ส่งข้อมูลที่ค้างขึ้นเซิร์ฟเวอร์ก่อน */
          UI.delay(450).then(function () {
            DB.clearSession();
            UI.idle();
            APP.showLogin();
          });
        });
    });
  }

  return { bind: bind, fillLoginBrand: fillLoginBrand };
})();
