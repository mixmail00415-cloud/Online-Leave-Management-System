/* ============================================================
   db.js — ชั้นข้อมูล
   ระบบการลา สำนักงานสาธารณสุขอำเภอกู่แก้ว จังหวัดอุดรธานี

   ทำงานได้ 2 โหมดโดยอัตโนมัติ :
   - บน Google Apps Script : ข้อมูลจริงอยู่ใน Google Sheets
     (โหลดครั้งเดียวตอนเปิดแอป แล้วบันทึกกลับทุกครั้งที่มีการแก้ไข)
   - เปิดไฟล์ตรง ๆ ในเครื่อง : ใช้ localStorage เหมือนเดิม

   ส่วนอื่นของระบบเรียก DB.* แบบ synchronous ได้เหมือนเดิมทุกประการ
   เพราะข้อมูลทั้งก้อนถูกเก็บไว้ในหน่วยความจำ (_d)
   ============================================================ */
var DB = (function () {
  var KEY = 'kukaew_leave_db_v1';
  var SKEY = 'kukaew_leave_session';
  var _d = null;
  var _booting = false;      /* ระหว่างโหลด/ย้ายข้อมูล ยังไม่ต้องส่งขึ้นเซิร์ฟเวอร์ */

  /* ------------------------------------------------------------
     เชื่อมต่อ Google Sheets ผ่าน Apps Script Web App
     ใช้เมื่อเปิดหน้าเว็บนี้นอก Apps Script (เปิดไฟล์ในเครื่องหรือโฮสต์ที่อื่น)
     ตั้งเป็น '' ถ้าต้องการให้เก็บข้อมูลในเครื่องอย่างเดียว
     ------------------------------------------------------------ */
  var API_URL = 'https://script.google.com/macros/s/AKfycbw9NzWfA1USHsGpT6WeOd7UPKLamvBrh4FbBrmk5vP79lw7G8bHfRtzuzR2Y1NE2UtCPw/exec';
  /* ต้องตรงกับ CONFIG.API_TOKEN ใน Code.gs */
  var API_TOKEN = 'kukaew-2570-change-me';

  /* โลโก้เริ่มต้น (แทนที่ได้ที่เมนูตั้งค่าระบบ) */
  var DEFAULT_LOGO =
    'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">' +
    '<circle cx="60" cy="60" r="56" fill="#BE185D"/>' +
    '<circle cx="60" cy="60" r="47" fill="#fff"/>' +
    '<path d="M53 22h14v24h24v14H67v34H53V60H29V46h24z" fill="#BE185D"/>' +
    '<text x="60" y="108" font-size="11" text-anchor="middle" fill="#BE185D" font-family="sans-serif">MOPH</text>' +
    '</svg>');

  var AVATAR =
    'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
    '<rect width="100" height="100" fill="#FFE3EE"/>' +
    '<circle cx="50" cy="38" r="17" fill="#DB2777"/>' +
    '<path d="M12 100c0-21 17-33 38-33s38 12 38 33z" fill="#DB2777"/></svg>');

  var LEAVE_TYPES = [
    { id: 'sick',      name: 'ลาป่วย',        badge: 'badge-sick' },
    { id: 'personal',  name: 'ลากิจส่วนตัว',  badge: 'badge-personal' },
    { id: 'maternity', name: 'ลาคลอดบุตร',    badge: 'badge-maternity' },
    { id: 'vacation',  name: 'ลาพักผ่อน',      badge: 'badge-vacation' }
  ];

  /* ประเภทที่อยู่ในแบบใบลาป่วย/กิจ/คลอด (ลาพักผ่อนใช้แบบฟอร์มแยกต่างหาก) */
  var FORM_TYPES = LEAVE_TYPES.filter(function (t) { return t.id !== 'vacation'; });

  /* สิทธิลาพักผ่อนประจำปีเริ่มต้น (วันทำการ) */
  var VACATION_QUOTA = 10;

  var ROLES = [
    { id: 'admin', name: 'ผู้ดูแลระบบ' },
    { id: 'chief', name: 'สาธารณสุขอำเภอ' },
    { id: 'staff', name: 'เจ้าหน้าที่' }
  ];

  function uid(p) {
    return (p || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function seed() {
    return {
      settings: {
        officeName: 'สำนักงานสาธารณสุขอำเภอกู่แก้ว',
        province: 'จังหวัดอุดรธานี',
        affiliation: 'สำนักงานสาธารณสุขอำเภอกู่แก้ว',
        district: 'กู่แก้ว',
        logo: DEFAULT_LOGO
      },
      users: [
        { id: uid('u'), username: 'admin', password: 'admin123', fullname: 'ผู้ดูแลระบบ', role: 'admin',
          position: 'นักวิชาการคอมพิวเตอร์', avatar: '', signature: '' },
        { id: uid('u'), username: 'chief', password: 'chief123', fullname: 'นายสมชาย ใจดี', role: 'chief',
          position: 'สาธารณสุขอำเภอกู่แก้ว', avatar: '', signature: '' },
        { id: uid('u'), username: 'staff01', password: 'staff123', fullname: 'นางสาวมาลี รักษ์ดี', role: 'staff',
          position: 'พยาบาลวิชาชีพชำนาญการ', avatar: '', signature: '',
          vacationCarry: 5, vacationQuota: 10 }
      ],
      fiscalYears: [
        { id: uid('fy'), name: '2570',
          r1Start: '2026-10-01', r1End: '2027-03-31',
          r2Start: '2027-04-01', r2End: '2027-09-30', current: true },
        { id: uid('fy'), name: '2569',
          r1Start: '2025-10-01', r1End: '2026-03-31',
          r2Start: '2026-04-01', r2End: '2026-09-30', current: false }
      ],
      leaves: []
    };
  }

  /* ---------- เซิร์ฟเวอร์ (Google Apps Script) ---------- */

  /** รันอยู่ภายใน Apps Script (เสิร์ฟด้วย HtmlService) หรือไม่ */
  function inGas() {
    return typeof google !== 'undefined' && google.script && google.script.run;
  }
  /** เรียก Google Sheets ผ่าน URL ของ Web App ได้หรือไม่ */
  function viaApi() { return !inGas() && !!API_URL; }

  /** มีเซิร์ฟเวอร์ให้บันทึกหรือไม่ (ไม่ว่าจะทางไหน) */
  function hasServer() { return inGas() || viaApi(); }

  /* ---------- เรียก API แบบ JSONP (อ่าน) ----------
     ใช้ JSONP เพราะเปิดไฟล์จากเครื่อง (file://) จะติด CORS ถ้าใช้ fetch */
  function jsonp(params, cb) {
    var name = '__gsCb' + Date.now() + Math.floor(Math.random() * 1000);
    var s = document.createElement('script');
    var done = false, timer;

    function cleanup() {
      clearTimeout(timer);
      try { delete window[name]; } catch (e) { window[name] = undefined; }
      if (s.parentNode) s.parentNode.removeChild(s);
    }
    window[name] = function (res) { if (done) return; done = true; cleanup(); cb(null, res); };
    s.onerror = function () {
      if (done) return; done = true; cleanup();
      cb(new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ'));
    };
    timer = setTimeout(function () {
      if (done) return; done = true; cleanup();
      cb(new Error('เซิร์ฟเวอร์ไม่ตอบสนองภายในเวลาที่กำหนด'));
    }, 30000);

    var qs = [];
    Object.keys(params).forEach(function (k) {
      qs.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
    });
    qs.push('token=' + encodeURIComponent(API_TOKEN));
    qs.push('callback=' + name);
    s.src = API_URL + (API_URL.indexOf('?') === -1 ? '?' : '&') + qs.join('&');
    document.head.appendChild(s);
  }

  /* ---------- เรียก API แบบ POST (เขียน) ----------
     ใช้ Content-Type text/plain เพื่อให้เป็น simple request ไม่เกิด preflight */
  function postApi(action, data, cb) {
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action, token: API_TOKEN, data: data })
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res && res.ok) cb(null, res);
        else cb(new Error((res && res.error) || 'บันทึกไม่สำเร็จ'));
      })
      .catch(function (e) { cb(e); });
  }

  /* สถานะการซิงก์ : idle | saving | error  (ให้ UI เอาไปแสดงได้) */
  var _sync = { state: 'idle', at: null, message: '' };
  var _syncCb = null;
  var _pending = false;      /* มีข้อมูลรอส่ง */
  var _inflight = false;     /* กำลังส่งอยู่ */
  var _timer = null;

  function syncState() { return _sync; }
  function onSync(cb) { _syncCb = cb; }
  function setSync(state, message) {
    _sync.state = state;
    _sync.message = message || '';
    if (state === 'idle') _sync.at = new Date();
    if (_syncCb) { try { _syncCb(_sync); } catch (e) {} }
  }

  /** เติมฟิลด์ที่ขาดให้ครบ ไม่ว่าข้อมูลจะมาจากที่ใด */
  function normalize(d) {
    if (!d || typeof d !== 'object') d = {};
    var s = seed();
    if (!d.settings || !d.settings.officeName) d.settings = Object.assign({}, s.settings, d.settings || {});
    if (!d.users || !d.users.length) d.users = s.users;
    if (!d.fiscalYears || !d.fiscalYears.length) d.fiscalYears = s.fiscalYears;
    if (!d.leaves) d.leaves = [];
    return d;
  }

  /** เขียนลง localStorage (บน Apps Script ใช้เป็นสำเนาสำรองออฟไลน์) */
  function cacheSave() {
    try { localStorage.setItem(KEY, JSON.stringify(_d)); }
    catch (e) {
      if (!hasServer()) {
        Swal.fire({ icon: 'error', title: 'บันทึกข้อมูลไม่สำเร็จ',
          text: 'พื้นที่จัดเก็บข้อมูลของเบราว์เซอร์เต็ม กรุณาลดขนาดรูปภาพที่อัพโหลด' });
      }
    }
  }

  /** ส่งข้อมูลทั้งก้อนขึ้น Google Sheets (ส่งทีละครั้ง ถ้ามีคิวจะส่งต่อให้เอง) */
  function push() {
    if (!hasServer()) return;
    if (_inflight) { _pending = true; return; }
    _inflight = true; _pending = false;
    setSync('saving');

    function ok() {
      _inflight = false;
      if (_pending) { push(); return; }
      setSync('idle');
    }
    function fail(err) {
      _inflight = false;
      var msg = (err && err.message) ? err.message : 'บันทึกขึ้นเซิร์ฟเวอร์ไม่สำเร็จ';
      setSync('error', msg);
      Swal.fire({
        icon: 'error', title: 'บันทึกขึ้นเซิร์ฟเวอร์ไม่สำเร็จ',
        text: msg + ' (ข้อมูลยังถูกเก็บไว้ในเครื่อง)',
        confirmButtonColor: '#BE185D', confirmButtonText: 'ลองอีกครั้ง',
        showCancelButton: true, cancelButtonText: 'ไว้ภายหลัง', cancelButtonColor: '#94a3b8'
      }).then(function (r) { if (r.isConfirmed) push(); });
    }

    if (inGas()) {
      google.script.run.withSuccessHandler(ok).withFailureHandler(fail).apiSave(_d);
    } else {
      postApi('save', _d, function (err) { if (err) fail(err); else ok(); });
    }
  }

  /**
   * โหลดข้อมูลตั้งต้นของระบบ แล้วค่อยเรียก cb()
   * ต้องเรียกก่อนใช้งาน DB.* ตัวอื่น (app.js เรียกให้แล้วใน boot)
   */
  function bootstrap(cb) {
    cb = cb || function () {};
    _booting = true;

    function finish(fromServer) {
      _d = normalize(_d);
      migrate();
      _booting = false;
      cacheSave();
      setSync('idle');
      cb(null, { source: fromServer ? 'sheets' : 'local' });
    }

    function useLocal() {
      try {
        var raw = localStorage.getItem(KEY);
        _d = raw ? JSON.parse(raw) : seed();
      } catch (e) { _d = seed(); }
    }

    /* ไม่มีเซิร์ฟเวอร์ : ใช้ localStorage อย่างเดียว */
    if (!hasServer()) { useLocal(); finish(false); return; }

    /* ต่อเซิร์ฟเวอร์ไม่ได้ : ใช้สำเนาในเครื่องไปก่อน ไม่ให้ระบบล่ม */
    function fallback(err) {
      useLocal();
      _d = normalize(_d);
      migrate();
      _booting = false;
      setSync('error', 'โหลดข้อมูลจากเซิร์ฟเวอร์ไม่สำเร็จ กำลังใช้สำเนาในเครื่อง');
      cb(err, { source: 'local-fallback' });
    }

    if (inGas()) {
      google.script.run
        .withSuccessHandler(function (data) { _d = data; finish(true); })
        .withFailureHandler(fallback)
        .apiLoad();
      return;
    }

    /* ดึงจาก Google Sheets ผ่าน Web App URL */
    jsonp({ action: 'load' }, function (err, res) {
      if (err) return fallback(err);
      if (!res || !res.ok) return fallback(new Error((res && res.error) || 'โหลดข้อมูลไม่สำเร็จ'));
      _d = res.data;
      finish(true);
    });
  }

  function load() {
    if (_d) return _d;
    /* กันกรณีมีโค้ดเรียก DB ก่อน bootstrap() เสร็จ */
    try {
      var raw = localStorage.getItem(KEY);
      _d = normalize(raw ? JSON.parse(raw) : seed());
    } catch (e) { _d = normalize(seed()); }
    return _d;
  }

  /** ปรับข้อมูลที่บันทึกไว้แล้วในเบราว์เซอร์ให้ตรงกับค่าตั้งต้นใหม่ (ทำครั้งเดียว) */
  function migrate() {
    var OLD_AFFIL = 'สำนักงานสาธารณสุขจังหวัดอุดรธานี';
    var NEW_AFFIL = 'สำนักงานสาธารณสุขอำเภอกู่แก้ว';
    if (!_d.migrations) _d.migrations = {};

    /* สังกัด : เปลี่ยนจากระดับจังหวัดเป็นระดับอำเภอ */
    if (!_d.migrations.affil2) {
      if (_d.settings.affiliation === OLD_AFFIL) _d.settings.affiliation = NEW_AFFIL;
      _d.leaves.forEach(function (l) {
        if (l.affiliation === OLD_AFFIL) l.affiliation = NEW_AFFIL;
      });
      _d.migrations.affil2 = true;
    }
    if (!_d.settings.district) _d.settings.district = 'กู่แก้ว';
  }

  /** บันทึกข้อมูล : เขียนสำเนาในเครื่องทันที แล้วส่งขึ้นเซิร์ฟเวอร์แบบหน่วงเล็กน้อย
   *  (หน่วงไว้เพื่อรวมการแก้ไขหลายครั้งติดกันให้เป็นการส่งครั้งเดียว) */
  function save() {
    cacheSave();
    if (_booting || !hasServer()) return;
    if (_timer) clearTimeout(_timer);
    _timer = setTimeout(function () { _timer = null; push(); }, 400);
  }

  /** เรียกคำสั่งฝั่งเซิร์ฟเวอร์ที่ไม่เกี่ยวกับการบันทึกข้อมูล
   *  ใช้ตรวจสถานะหรือซ่อมสเปรดชีตเมื่อจำเป็น (เรียกจาก console ได้) */
  function server(action, cb, arg) {
    if (!hasServer()) { cb(new Error('ระบบนี้ยังไม่ได้เชื่อมต่อ Google Sheets')); return; }

    if (inGas()) {
      var runner = google.script.run
        .withSuccessHandler(function (res) { cb(null, res); })
        .withFailureHandler(function (e) { cb(e); });
      if (action === 'setup')       runner.setup();
      else if (action === 'status') runner.sheetStatus();
      else if (action === 'files')  runner.filesStatus();
      else if (action === 'link')   runner.linkSpreadsheet(arg);
      else if (action === 'unlink') runner.unlinkSpreadsheet();
      else                          runner.apiPing();
      return;
    }

    var params = { action: action };
    if (arg) params.sheet = arg;
    jsonp(params, function (err, res) {
      if (err) return cb(err);
      if (!res || !res.ok) return cb(new Error((res && res.error) || 'เรียกคำสั่งไม่สำเร็จ'));
      cb(null, res.result);
    });
  }

  /** บังคับส่งขึ้นเซิร์ฟเวอร์เดี๋ยวนี้ (ใช้ก่อนออกจากระบบ) */
  function flush() {
    if (!hasServer()) return;
    if (_timer) { clearTimeout(_timer); _timer = null; }
    push();
  }

  /* ---------- settings ---------- */
  function settings() { return load().settings; }
  function saveSettings(s) {
    var t = settings();
    t.officeName = s.officeName; t.affiliation = s.affiliation;
    if (s.logo) t.logo = s.logo;
    save();
  }

  /* ---------- users ---------- */
  function users() { return load().users; }
  function userById(id) { return users().filter(function (u) { return u.id === id; })[0] || null; }
  function usersByRole(r) { return users().filter(function (u) { return u.role === r; }); }
  function chief() { return usersByRole('chief')[0] || null; }
  function usernameTaken(name, exceptId) {
    return users().some(function (u) {
      return u.username.toLowerCase() === String(name).toLowerCase() && u.id !== exceptId;
    });
  }
  function saveUser(u) {
    var list = users();
    if (u.id) {
      for (var i = 0; i < list.length; i++) if (list[i].id === u.id) {
        list[i] = Object.assign({}, list[i], u); break;
      }
    } else {
      u.id = uid('u'); list.push(u);
    }
    save(); return u;
  }
  function deleteUser(id) {
    var d = load();
    d.users = d.users.filter(function (u) { return u.id !== id; });
    d.leaves = d.leaves.filter(function (l) { return l.userId !== id; });
    save();
  }

  /* ---------- fiscal years ---------- */
  function fiscalYears() {
    return load().fiscalYears.slice().sort(function (a, b) {
      return String(b.name).localeCompare(String(a.name), 'th');
    });
  }
  function fyById(id) { return load().fiscalYears.filter(function (f) { return f.id === id; })[0] || null; }
  function currentFY() { return load().fiscalYears.filter(function (f) { return f.current; })[0] || fiscalYears()[0] || null; }
  function saveFY(f) {
    var list = load().fiscalYears;
    if (f.id) {
      for (var i = 0; i < list.length; i++) if (list[i].id === f.id) { list[i] = Object.assign({}, list[i], f); break; }
    } else { f.id = uid('fy'); f.current = false; list.push(f); }
    save(); return f;
  }
  function deleteFY(id) {
    var d = load();
    d.fiscalYears = d.fiscalYears.filter(function (f) { return f.id !== id; });
    save();
  }
  function setCurrentFY(id) {
    load().fiscalYears.forEach(function (f) { f.current = (f.id === id); });
    save();
  }
  /** หารอบ (1/2) ของวันที่ ภายในปีงบประมาณที่กำหนด */
  function roundOf(fy, dateStr) {
    if (!fy || !dateStr) return null;
    if (fy.r1Start && fy.r1End && dateStr >= fy.r1Start && dateStr <= fy.r1End) return 1;
    if (fy.r2Start && fy.r2End && dateStr >= fy.r2Start && dateStr <= fy.r2End) return 2;
    return null;
  }
  /** หาปีงบประมาณ+รอบจากวันที่ (ถ้าไม่พบใช้ปีปัจจุบัน) */
  function resolvePeriod(dateStr) {
    var all = load().fiscalYears;
    for (var i = 0; i < all.length; i++) {
      var r = roundOf(all[i], dateStr);
      if (r) return { fyId: all[i].id, fyName: all[i].name, round: r };
    }
    var c = currentFY();
    return c ? { fyId: c.id, fyName: c.name, round: roundOf(c, dateStr) || 1 } : { fyId: '', fyName: '-', round: 1 };
  }

  /* ---------- leaves ---------- */
  function leaves() { return load().leaves; }
  function leaveById(id) { return leaves().filter(function (l) { return l.id === id; })[0] || null; }
  function leavesByUser(uid2) {
    return leaves().filter(function (l) { return l.userId === uid2; });
  }
  function saveLeave(l) {
    var list = load().leaves;
    if (l.id) {
      for (var i = 0; i < list.length; i++) if (list[i].id === l.id) { list[i] = Object.assign({}, list[i], l); break; }
    } else {
      l.id = uid('lv'); l.createdAt = new Date().toISOString(); list.push(l);
    }
    save(); return l;
  }
  function deleteLeave(id) {
    var d = load();
    d.leaves = d.leaves.filter(function (l) { return l.id !== id; });
    save();
  }
  /** ใบลาล่าสุดของผู้ใช้ (ก่อนรายการที่กำลังแก้ไข) */
  function lastLeaveOf(userId, exceptId, types) {
    return leavesByUser(userId)
      .filter(function (l) { return l.id !== exceptId; })
      .filter(function (l) { return !types || types.indexOf(l.leaveType) !== -1; })
      .sort(function (a, b) { return (b.startDate || '').localeCompare(a.startDate || ''); })[0] || null;
  }
  /** นับที่ไม่ถูกปฏิเสธ = ถือเป็นวันลาที่ใช้ไปแล้ว */
  function countsAsUsed(l) { return l.status !== 'rejected'; }

  /** สรุป {sick:{times,days},...} ของผู้ใช้ในปีงบประมาณ (ครบทุกประเภทใน LEAVE_TYPES) */
  function summaryOf(userId, fyId, exceptId) {
    var out = {};
    LEAVE_TYPES.forEach(function (t) { out[t.id] = { times: 0, days: 0 }; });
    leavesByUser(userId).forEach(function (l) {
      if (fyId && l.fyId !== fyId) return;
      if (exceptId && l.id === exceptId) return;
      if (!countsAsUsed(l)) return;
      if (!out[l.leaveType]) return;
      out[l.leaveType].times += 1;
      out[l.leaveType].days += Number(l.days || 0);
    });
    return out;
  }

  /** ข้อมูลสิทธิลาพักผ่อนของผู้ใช้ในปีงบประมาณ (ดึงอัตโนมัติลงแบบใบลาพักผ่อน)
   *  carry   = วันลาพักผ่อนสะสมยกมา
   *  quota   = สิทธิลาพักผ่อนประจำปี
   *  used    = ลาพักผ่อนไปแล้วในปีงบประมาณนี้ (วันทำการ)
   *  remain  = มีสิทธิลาพักผ่อนประจำปีนี้อีก = quota - used
   *  total   = รวมเป็น = carry + remain
   */
  function vacationInfo(userId, fyId, exceptId) {
    var u = userById(userId) || {};
    var carry = Number(u.vacationCarry || 0);
    var quota = (u.vacationQuota === '' || u.vacationQuota == null) ? VACATION_QUOTA : Number(u.vacationQuota);
    var used = summaryOf(userId, fyId, exceptId).vacation.days;
    var remain = Math.max(0, quota - used);
    return { carry: carry, quota: quota, used: used, remain: remain, total: carry + remain };
  }

  /* ---------- session ---------- */
  function setSession(userId) { try { localStorage.setItem(SKEY, userId); } catch (e) {} }
  function clearSession() { try { localStorage.removeItem(SKEY); } catch (e) {} }
  function sessionUser() {
    var id = null;
    try { id = localStorage.getItem(SKEY); } catch (e) {}
    return id ? userById(id) : null;
  }
  function login(u, p) {
    return users().filter(function (x) {
      return x.username.toLowerCase() === String(u).trim().toLowerCase() && x.password === p;
    })[0] || null;
  }

  function reset() { _d = seed(); save(); }

  return {
    DEFAULT_LOGO: DEFAULT_LOGO, AVATAR: AVATAR, LEAVE_TYPES: LEAVE_TYPES,
    FORM_TYPES: FORM_TYPES, VACATION_QUOTA: VACATION_QUOTA, ROLES: ROLES,
    vacationInfo: vacationInfo,
    uid: uid, load: load, save: save, reset: reset,
    bootstrap: bootstrap, flush: flush, hasServer: hasServer, server: server,
    syncState: syncState, onSync: onSync,
    settings: settings, saveSettings: saveSettings,
    users: users, userById: userById, usersByRole: usersByRole, chief: chief,
    usernameTaken: usernameTaken, saveUser: saveUser, deleteUser: deleteUser,
    fiscalYears: fiscalYears, fyById: fyById, currentFY: currentFY, saveFY: saveFY,
    deleteFY: deleteFY, setCurrentFY: setCurrentFY, roundOf: roundOf, resolvePeriod: resolvePeriod,
    leaves: leaves, leaveById: leaveById, leavesByUser: leavesByUser, saveLeave: saveLeave,
    deleteLeave: deleteLeave, lastLeaveOf: lastLeaveOf, summaryOf: summaryOf,
    setSession: setSession, clearSession: clearSession, sessionUser: sessionUser, login: login
  };
})();
