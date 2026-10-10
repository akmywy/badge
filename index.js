(function (exports, metro, patcher) {
  "use strict";

  // ===== Settings: change these =====
  var FAKE_DATE = Date.UTC(2015, 4, 15); // May 15, 2015
  var HIDE_REAL_BADGES = true; // hides your real badges on your own profile view (only you see this)
  // Local badges shown on your own profile (only you see them). Icon = Discord CDN badge icon hash.
  var BADGES = [
    { id: "local_nitro", description: "Subscriber since 2020", icon: "2ba85e8026a8614b640c2837bcdfe21b" },
    { id: "local_nitro_6y", description: "Subscribed for 6 years", icon: "5b154df19c53dce2af92c9b61e6be5e2" },
    { id: "local_early", description: "Early Supporter", icon: "7060786766c9c840eb3019e725d2b358" }
  ];
  var THEME = [0x0b0b2b, 0x2b2f9e]; // [primary, accent]; set to null to disable
  // ==================================

  var unpatches = [];
  var UserStore = metro.findByStoreName("UserStore");
  var UserProfileStore = metro.findByStoreName("UserProfileStore");
  var Snowflake = metro.findByProps("extractTimestamp");

  function myId() {
    try { return UserStore.getCurrentUser().id; } catch (e) { return null; }
  }

  function patchAge() {
    if (Snowflake && Snowflake.extractTimestamp) {
      unpatches.push(patcher.instead("extractTimestamp", Snowflake, function (args, orig) {
        if (String(args[0]) === String(myId())) return FAKE_DATE;
        return orig.apply(this, args);
      }));
    }
    try {
      var me = UserStore.getCurrentUser();
      if (me) {
        Object.defineProperty(me, "createdAt", {
          configurable: true,
          get: function () { return new Date(FAKE_DATE); }
        });
      }
    } catch (e) { console.log("[LocalBadge] createdAt patch failed", e); }
  }

  function patchHide() {
    if (!HIDE_REAL_BADGES) return;
    try {
      var me = UserStore.getCurrentUser();
      if (me) {
        ["publicFlags", "flags", "public_flags"].forEach(function (k) {
          try {
            if (k in me) Object.defineProperty(me, k, { configurable: true, get: function () { return 0; } });
          } catch (e) {}
        });
      }
    } catch (e) { console.log("[LocalBadge] hide flags failed", e); }
  }

  function patchProfile() {
    if (!UserProfileStore || !UserProfileStore.getUserProfile) return;
    unpatches.push(patcher.after("getUserProfile", UserProfileStore, function (args, res) {
      if (!res || String(args[0]) !== String(myId())) return res;
      try {
        var list = HIDE_REAL_BADGES ? [] : (Array.isArray(res.badges) ? res.badges.slice() : []);
        BADGES.forEach(function (b) {
          if (!list.some(function (x) { return x.id === b.id; })) list.push(b);
        });
        res.badges = list;
      } catch (e) {}
      if (THEME) { try { res.themeColors = THEME; } catch (e) {} }
      return res;
    }));
  }

  exports.onLoad = function () {
    patchAge();
    patchHide();
    patchProfile();
  };

  exports.onUnload = function () {
    unpatches.forEach(function (u) { try { u(); } catch (e) {} });
    unpatches = [];
  };

  return exports;
})({}, vendetta.metro, vendetta.patcher);
