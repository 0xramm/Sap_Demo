sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
  "use strict";

  return Controller.extend("accessportal.requestportal.controller.App", {

    onInit: function () {
      try {
        this.getView().setModel(new JSONModel({
          employeeName: "",
          employeeEmail: "",
          serviceName: "",
          reason: "",
          services: [],
          myRequests: [],
          busy: false
        }), "app");

        this._loadServices();
      } catch (err) {
        console.error("onInit failed:", err);
        MessageBox.error("Something went wrong starting the app: " + err.message);
      }
    },

    // ---- available services for the dropdown --------------------------
    _loadServices: async function () {
      const oModel = this.getView().getModel("app");
      try {
        const res = await fetch("/access-portal/Services");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        oModel.setProperty("/services", data.value || []);
      } catch (err) {
        MessageBox.error(
          "Could not load the list of services. Is the CAP server (cds watch) running? " +
          "Details: " + err.message
        );
      }
    },

    // ---- submit a new request ------------------------------------------
    onSubmit: async function () {
      const oModel = this.getView().getModel("app");
      const employeeEmail = (oModel.getProperty("/employeeEmail") || "").trim();
      const employeeName = (oModel.getProperty("/employeeName") || "").trim();
      const serviceName = oModel.getProperty("/serviceName");
      const reason = (oModel.getProperty("/reason") || "").trim();

      if (!employeeEmail || !serviceName) {
        MessageToast.show("Please enter your email and pick a service first.");
        return;
      }

      oModel.setProperty("/busy", true);
      try {
        const res = await fetch("/access-portal/submitRequest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employeeEmail, employeeName, serviceName, reason })
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body && body.error && body.error.message || `Request failed (HTTP ${res.status})`);
        }

        MessageToast.show("Request submitted - your manager will review it.");
        oModel.setProperty("/reason", "");
        await this._loadMyRequests(employeeEmail);
      } catch (err) {
        MessageBox.error(err.message);
      } finally {
        oModel.setProperty("/busy", false);
      }
    },

    // ---- "My Requests" list ---------------------------------------------
    onRefreshMyRequests: function () {
      const employeeEmail = (this.getView().getModel("app").getProperty("/employeeEmail") || "").trim();
      if (!employeeEmail) {
        MessageToast.show("Enter your email above first.");
        return;
      }
      this._loadMyRequests(employeeEmail);
    },

    _loadMyRequests: async function (employeeEmail) {
      const oModel = this.getView().getModel("app");
      try {
        const filter = `employee/email eq '${employeeEmail.replace(/'/g, "''")}'`;
        const url = "/access-portal/AccessRequests"
          + "?$filter=" + encodeURIComponent(filter)
          + "&$expand=service"
          + "&$orderby=createdAt desc";

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const rows = (data.value || []).map((r) => Object.assign(r, {
          requestedOnDisplay: r.createdAt ? new Date(r.createdAt).toLocaleString() : ""
        }));
        oModel.setProperty("/myRequests", rows);
      } catch (err) {
        MessageToast.show("Could not refresh your requests: " + err.message);
      }
    },

    // ---- formatter used by the Status column ----------------------------
    formatStatusState: function (sStatus) {
      switch (sStatus) {
        case "Approved": return "Success";
        case "Rejected": return "Error";
        default: return "Warning"; // Pending
      }
    }

  });
});
