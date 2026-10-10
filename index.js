(function (exports, metro, patcher) {
  "use strict";

  // ===== Settings: change these =====
  var FAKE_YEAR = 2015;
  var FAKE_DATE = Date.UTC(FAKE_YEAR, 4, 15); // May 15, 2015
  var BADGE = null; // set to {id, description, icon} to add a local badge, or null for none
  var HIDE_ALL_BADGES = true; // hides your real badges on your own profile view (only you see this)
  var THEME = [0x0b0b2b, 0x2b2f9e]; // dark navy to blurple (Blurple Twilight look) // [primary, accent] profile theme colors; set to null to disable
  // ==================================

  var unpatches = [];
  var UserStore = metro.findByStoreName("UserStore");
  var UserProfileStore = metro.findByStoreName("UserProfileStore");
  var Snowflake = metro.findByProps("extractTimestamp");

  function myId() {
    try { return UserStore.getCurrentUser().id; } catch (e) { return null; }
  }

  // Fake creation date (the "Member since" value)
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

  // Hide your real badges (local view only)
  function patchHide() {
    if (!HIDE_ALL_BADGES) return;
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

  // Fake badge on your own profile
  function patchBadge() {
    if (!UserProfileStore || !UserProfileStore.getUserProfile) return;
    unpatches.push(patcher.after("getUserProfile", UserProfileStore, function (args, res) {
      if (!res || String(args[0]) !== String(myId())) return res;
      if (!patchBadge.logged) {
        patchBadge.logged = true;
        var n = Array.isArray(res.badges) ? res.badges.length : "none";
        console.log("[LocalBadge] profile badges found:", n);
        try { vendetta.ui.toasts.showToast("LocalBadge: profile badges = " + n); } catch (e) {}
      }
      if (HIDE_ALL_BADGES) { try { res.badges = []; } catch (e) {} }
      if (BADGE) {
        var badges = Array.isArray(res.badges) ? res.badges.slice() : [];
        if (!badges.some(function (b) { return b.id === BADGE.id; })) badges.push(BADGE);
        try { res.badges = badges; } catch (e) {}
      }
      if (THEME) { try { res.themeColors = THEME; } catch (e) {} }
      return res;
    }));
  }

  exports.onLoad = function () {
    var info = {
      UserStore: !!UserStore,
      UserProfileStore: !!UserProfileStore,
      getUserProfile: !!(UserProfileStore && UserProfileStore.getUserProfile),
      extractTimestamp: !!(Snowflake && Snowflake.extractTimestamp),
      myId: myId()
    };
    console.log("[LocalBadge] loaded", JSON.stringify(info));
    try {
      vendetta.ui.toasts.showToast("LocalBadge: " + JSON.stringify(info));
    } catch (e) {}
    patchAge();
    patchHide();
    patchBadge();
  };

  exports.onUnload = function () {
    unpatches.forEach(function (u) { try { u(); } catch (e) {} });
    unpatches = [];
  };

  return exports;
})({}, vendetta.metro, vendetta.patcher);
