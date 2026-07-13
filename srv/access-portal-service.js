const cds = require('@sap/cds');
const { createDiscordInvite } = require('./lib/discord');
const { sendMail } = require('./lib/mailer');

module.exports = cds.service.impl(async function () {
  const { Employees, Services, AccessRequests } = this.entities;

  // ---- Employee submits a new request ------------------------------------
  this.on('submitRequest', async (req) => {
    const { employeeEmail, employeeName, serviceName, reason } = req.data;

    if (!employeeEmail || !serviceName) {
      return req.error(400, 'employeeEmail and serviceName are required');
    }

    const service = await SELECT.one.from(Services).where({ name: serviceName, isActive: true });
    if (!service) {
      return req.error(404, `"${serviceName}" isn't an available service yet.`);
    }

    // find or create the employee record by email
    let employee = await SELECT.one.from(Employees).where({ email: employeeEmail });
    if (!employee) {
      employee = { ID: cds.utils.uuid(), name: employeeName || employeeEmail, email: employeeEmail };
      await INSERT.into(Employees).entries(employee);
    }

    const id = cds.utils.uuid();
    await INSERT.into(AccessRequests).entries({
      ID: id,
      employee_ID: employee.ID,
      service_ID: service.ID,
      status: 'Pending',
      reason
    });

    return SELECT.one.from(AccessRequests, id);
  });

  // ---- Manager approves a request -----------------------------------------
  this.on('approve', AccessRequests, async (req) => {
    const id = req.params[0].ID ?? req.params[0];
    const request = await SELECT.one.from(AccessRequests, id);
    if (!request) return req.error(404, 'Request not found');
    if (request.status !== 'Pending') return req.error(409, `Request is already ${request.status}`);

    const employee = await SELECT.one.from(Employees, request.employee_ID);
    const service = await SELECT.one.from(Services, request.service_ID);

    let inviteLink = null;
    if (service.name.toLowerCase() === 'discord') {
      inviteLink = await createDiscordInvite();
    }

    await UPDATE(AccessRequests, id).with({
      status: 'Approved',
      decisionNote: req.data.decisionNote,
      inviteLink,
      decidedAt: new Date().toISOString()
    });

    await sendMail({
      to: employee.email,
      subject: `Your access to ${service.name} has been approved`,
      text: inviteLink
        ? `Hi ${employee.name},\n\nYour request for ${service.name} access was approved.\n\nJoin here: ${inviteLink}\n(single-use, expires in 7 days)\n\n- Access Portal`
        : `Hi ${employee.name},\n\nYour request for ${service.name} access was approved. An admin will follow up with access details.\n\n- Access Portal`
    });

    return SELECT.one.from(AccessRequests, id);
  });

  // ---- Manager rejects a request -------------------------------------------
  this.on('declineRequest', AccessRequests, async (req) => {
    const id = req.params[0].ID ?? req.params[0];
    const request = await SELECT.one.from(AccessRequests, id);
    if (!request) return req.error(404, 'Request not found');
    if (request.status !== 'Pending') return req.error(409, `Request is already ${request.status}`);

    await UPDATE(AccessRequests, id).with({
      status: 'Rejected',
      decisionNote: req.data.decisionNote,
      decidedAt: new Date().toISOString()
    });

    const employee = await SELECT.one.from(Employees, request.employee_ID);
    const service = await SELECT.one.from(Services, request.service_ID);

    await sendMail({
      to: employee.email,
      subject: `Your access request for ${service.name} was declined`,
      text: `Hi ${employee.name},\n\nYour request for ${service.name} access was declined.` +
        (req.data.decisionNote ? ` Reason: ${req.data.decisionNote}` : '') +
        `\n\n- Access Portal`
    });

    return SELECT.one.from(AccessRequests, id);
  });
});
