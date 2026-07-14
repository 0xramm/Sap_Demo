using AccessPortalService as service from './access-portal-service';

annotate service.AccessRequests with @(
  UI.HeaderInfo: {
    TypeName      : 'Access Request',
    TypeNamePlural: 'Access Requests',
    Title         : { Value: status },
    Description   : { Value: reason }
  },

  UI.SelectionFields: [
    status,
    employee_ID,
    service_ID
  ],

  UI.LineItem: [
    { Value: employee.name, Label: 'Employee' },
    { Value: service.name,  Label: 'Service' },
    { Value: status,        Label: 'Status' },
    { Value: createdAt,     Label: 'Requested On' },
    { Value: decidedAt,     Label: 'Decided On' }
  ],

  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', Label: 'Request Details', Target: '@UI.FieldGroup#Main' }
  ],

  UI.FieldGroup #Main: {
    Data: [
      { Value: employee_ID,   Label: 'Employee' },
      { Value: service_ID,    Label: 'Service' },
      { Value: reason,        Label: 'Reason' },
      { Value: status,        Label: 'Status' },
      { Value: decisionNote,  Label: 'Decision Note' },
      { Value: inviteLink,    Label: 'Invite Link' }
    ]
  },

  UI.Identification: [
    { $Type: 'UI.DataFieldForAction', Action: 'AccessPortalService.approve',        Label: 'Approve' },
    { $Type: 'UI.DataFieldForAction', Action: 'AccessPortalService.declineRequest', Label: 'Reject'  }
  ]
);

// These are set by the approve/declineRequest actions, not typed in directly -
// keeps the employee's "Create" form limited to just employee/service/reason,
// and stops anyone editing a decision by hand instead of through the actions.
annotate service.AccessRequests with {
  status       @UI.ReadOnly;
  decidedAt    @UI.ReadOnly;
  decidedBy    @UI.ReadOnly;
  inviteLink   @UI.ReadOnly;
  decisionNote @UI.ReadOnly;
};

annotate service.Employees with {
  name @title: 'Name';
  email @title: 'Email';
};

annotate service.Services with {
  name @title: 'Service';
};
