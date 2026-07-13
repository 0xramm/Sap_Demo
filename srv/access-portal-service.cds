using com.access as db from '../db/schema';

/**
 * This is the "middleware" layer your manager mentioned.
 * CAP compiles this file into an OData V4 service automatically -
 * that's the API your Fiori/UI5 frontend (or any client) talks to.
 */
service AccessPortalService @(path: '/access-portal') {

  @readonly
  entity Services as projection on db.Services;

  entity Employees as projection on db.Employees;

  @readonly
  entity Managers as projection on db.Managers;

  entity AccessRequests as projection on db.AccessRequests actions {
    action approve(decisionNote : String) returns AccessRequests;
    // NOTE: named "declineRequest" (not "reject") because CAP's base
    // ApplicationService already reserves the method name "reject".
    action declineRequest(decisionNote : String) returns AccessRequests;
  };

  // Called by the employee-facing screen to raise a new request
  action submitRequest(
    employeeEmail : String,
    employeeName  : String,
    serviceName   : String,
    reason        : String
  ) returns AccessRequests;
}
