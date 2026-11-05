/* Every season from 1977 gets its own skin: a family per stretch of years (type + surfaces),
   and each year inside the family its own accent. 2020 onward keeps the present-day look. */
var Skin = (function () {
  var FAM = [
    // from, to, name, display font, text font, bg, card, raised, ink, muted, line, accents (cycled by year)
    [1977, 1979, 'Colour TV', 'Bungee', 'Rubik', '#17100A', '#2B1C10', '#3A2818', '#F6EAD2', '#D9B98A', 'rgba(217,185,138,.18)', ['#E8731A', '#F2B705', '#C8421A']],
    [1980, 1983, 'Cable', '"Russo One"', 'Rubik', '#0B1224', '#142041', '#1D2C57', '#EEF2FF', '#9FB0DD', 'rgba(159,176,221,.18)', ['#E5383B', '#F2C14E', '#4EA8DE', '#E5383B']],
    [1984, 1987, 'Neon', 'Audiowide', 'Rubik', '#10051F', '#1D0B38', '#2A1150', '#FFF1FB', '#C8A6E8', 'rgba(255,79,216,.22)', ['#FF4FD8', '#2EE6D6', '#FFD23F', '#7C5CFF']],
    [1988, 1991, 'Chrome', '"Racing Sans One"', 'Rubik', '#0C0F14', '#171C25', '#222A37', '#F2F5FA', '#97A3B5', 'rgba(200,215,235,.16)', ['#38D0FF', '#FF3D3D', '#FFC400', '#7DF9A0']],
    [1992, 1992, 'Street', 'Anton', 'Rubik', '#0E0E0E', '#1A1A1A', '#262626', '#F5F5F0', '#A0A09A', 'rgba(255,255,255,.12)', ['#FF6A00']],
    [1993, 1993, 'NBA Jam', 'Anton', 'Rubik', '#07124A', '#0E1F7A', '#17309F', '#FFFFFF', '#9FB4FF', 'rgba(255,214,0,.35)', ['#FF4A00']],
    [1994, 1995, 'Street', 'Anton', 'Rubik', '#0E0E0E', '#1A1A1A', '#262626', '#F5F5F0', '#A0A09A', 'rgba(255,255,255,.12)', ['#00C2A8', '#E6007A']],
    [1996, 1999, 'Gloss', 'Orbitron', 'Rubik', '#0A1020', '#121B34', '#1B2749', '#EAF4FF', '#8FB0D8', 'rgba(143,176,216,.2)', ['#3BE0FF', '#B388FF', '#FF5C8A', '#7CFFB2']],
    [2000, 2003, 'Y2K', '"Exo 2"', 'Rubik', '#0B0E14', '#141A24', '#1E2634', '#F1F5F9', '#94A3B8', 'rgba(148,163,184,.18)', ['#19C3E6', '#9BE15D', '#FF8A3D', '#E15DE6']],
    [2004, 2008, 'Web 1.0', 'Rubik', 'Rubik', '#101318', '#1A1F27', '#252C37', '#F0F3F7', '#9AA6B6', 'rgba(154,166,182,.18)', ['#2F7DE1', '#E0A82E', '#D94F4F', '#3FAE7A', '#8B5CF6']],
    [2009, 2013, 'Flat', 'Rubik', 'Rubik', '#0F1115', '#181B21', '#232730', '#F3F4F6', '#9CA3AF', 'rgba(156,163,175,.16)', ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']],
    [2014, 2019, 'Modern', null, null, null, null, null, null, null, null, ['#F2A33A', '#4CC9F0', '#F72585', '#80ED99', '#FFD166', '#B8B8FF']]
  ];
  var cur = null;
  var VARS = ['--disp', '--font', '--bg', '--card', '--raised', '--ink', '--muted', '--line'];
  function lumOf(hex) {
    var h = hex.replace('#', ''), c = [0, 2, 4].map(function (i) { var v = parseInt(h.substr(i, 2), 16) / 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
    return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
  }
  function find(y) { for (var i = 0; i < FAM.length; i++) if (y >= FAM[i][0] && y <= FAM[i][1]) return FAM[i]; return null; }
  function apply(year, on) {
    var st = document.body.style, f = find(+year);
    VARS.forEach(function (k) { st.removeProperty(k); });
    if (on === false || !f || !(+year >= 1977)) { cur = null; document.body.removeAttribute('data-skin'); return null; }
    var acc = f[11][(+year - f[0]) % f[11].length];
    cur = { year: +year, name: f[2], team: acc, team2: '#FFFFFF', on: lumOf(acc) > .32 ? '#0A0B10' : '#FFFFFF' };
    if (f[3]) {
      st.setProperty('--disp', f[3] + ',"Arial Narrow",sans-serif'); st.setProperty('--font', f[4] + ',-apple-system,Arial,sans-serif');
      st.setProperty('--bg', f[5]); st.setProperty('--card', f[6]); st.setProperty('--raised', f[7]);
      st.setProperty('--ink', f[8]); st.setProperty('--muted', f[9]); st.setProperty('--line', f[10]);
    }
    document.body.setAttribute('data-skin', f[2].toLowerCase().replace(/\W+/g, '-'));
    st.setProperty('--team', cur.team); st.setProperty('--team2', cur.team2); st.setProperty('--on', cur.on);
    return cur;
  }
  return { apply: apply, current: function () { return cur; } };
})();
