(function (exports, metro, patcher) {
  "use strict";

  // ===== Settings: change these =====
  var FAKE_YEAR = 2015;
  var FAKE_DATE = Date.UTC(FAKE_YEAR, 4, 15); // May 15, 2015
  var BADGE = {
    id: "local_badge",
    description: "Early Supporter",
    icon: "7060786766c9c840eb3019e725d2b358" // Discord CDN badge icon hash
  };
  var THEME = [0x5865f2, 0xeb459e]; // [primary, accent] profile theme colors; set to null to disable
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

  // Fake badge on your own profile
  function patchBadge() {
    if (!UserProfileStore || !UserProfileStore.getUserProfile) return;
    unpatches.push(patcher.after("getUserProfile", UserProfileStore, function (args, res) {
      if (!res || String(args[0]) !== String(myId())) return res;
      var badges = Array.isArray(res.badges) ? res.badges.slice() : [];
      if (!badges.some(function (b) { return b.id === BADGE.id; })) badges.push(BADGE);
      try { res.badges = badges; } catch (e) {}
      if (THEME) { try { res.themeColors = THEME; } catch (e) {} }
      return res;
    }));
  }

  exports.onLoad = function () {
    patchAge();
    patchBadge();
  };

  exports.onUnload = function () {
    unpatches.forEach(function (u) { try { u(); } catch (e) {} });
    unpatches = [];
  };

  return exports;
})({}, vendetta.metro, vendetta.patcher);
