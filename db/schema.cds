namespace com.access;

using { cuid, managed } from '@sap/cds/common';

/**
 * A service an employee can request access to.
 * For now we only seed "Discord", but this is designed
 * so you can add Jira, GitHub, Confluence, etc. later
 * without changing any code.
 */
entity Services : cuid {
  name        : String(50)  @mandatory;
  description : String(200);
  isActive    : Boolean default true;
}

entity Employees : cuid {
  name  : String(100) @mandatory;
  email : String(150) @mandatory;
}

entity Managers : cuid {
  name  : String(100) @mandatory;
  email : String(150) @mandatory;
}

entity AccessRequests : cuid, managed {
  employee     : Association to Employees @mandatory;
  service      : Association to Services  @mandatory;
  status       : String(20) enum {
    Pending;
    Approved;
    Rejected;
  } default 'Pending';
  reason       : String(500); // why the employee wants access
  decisionNote : String(500); // manager's note when approving/rejecting
  decidedBy    : Association to Managers;
  decidedAt    : Timestamp;
  inviteLink   : String(300); // filled in automatically once approved
}
