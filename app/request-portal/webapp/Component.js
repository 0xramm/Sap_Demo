sap.ui.define([
  "sap/ui/core/UIComponent"
], function (UIComponent) {
  "use strict";

  return UIComponent.extend("accessportal.requestportal.Component", {
    metadata: {
      manifest: "json"
    },

    init: function () {
      try {
        UIComponent.prototype.init.apply(this, arguments);
      } catch (err) {
        // Surface init failures loudly instead of leaving a blank page with
        // no clue what happened.
        console.error("Component init failed:", err);
        document.body.innerHTML =
          '<div style="font-family:sans-serif;padding:2rem;color:#b00">' +
          '<h2>App failed to start</h2><pre>' +
          (err && err.stack || err) +
          '</pre></div>';
      }
    }
  });
});
