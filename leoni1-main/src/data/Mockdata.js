export const dorms = [
  { id: 1, title: "Dorm Alpha – Block A",   status: "Active",    progress: 72,  assignee: "Karim B.",   due: "2025-04-15", priority: "High"   },
  { id: 2, title: "Dorm Beta – Block C",    status: "Pending",   progress: 35,  assignee: "Ines M.",    due: "2025-05-20", priority: "Medium" },
  { id: 3, title: "Dorm Gamma – Block D",   status: "Completed", progress: 100, assignee: "Yassine T.", due: "2025-03-01", priority: "Low"    },
  { id: 4, title: "Dorm Delta – Block B",   status: "On Hold",   progress: 18,  assignee: "Amira R.",   due: "2025-06-10", priority: "High"   },
  { id: 5, title: "Dorm Epsilon – Block E", status: "Active",    progress: 54,  assignee: "Nour H.",    due: "2025-07-01", priority: "Medium" },
];

export const missions = [
  { id: 1, title: "Site Inspection – Zone 2",  status: "Active",    progress: 60,  assignee: "Nour H.",  due: "2025-04-08", priority: "High"   },
  { id: 2, title: "Equipment Delivery",         status: "Pending",   progress: 0,   assignee: "Rami K.",  due: "2025-04-25", priority: "Medium" },
  { id: 3, title: "Safety Audit Q2",            status: "Active",    progress: 45,  assignee: "Leila S.", due: "2025-04-30", priority: "High"   },
  { id: 4, title: "Team Training Session",      status: "Completed", progress: 100, assignee: "Omar D.",  due: "2025-03-15", priority: "Low"    },
  { id: 5, title: "Field Survey – North Area",  status: "On Hold",   progress: 22,  assignee: "Bilal N.", due: "2025-05-10", priority: "Medium" },
];

export const contracts = [
  { id: 1, title: "Contract #C-2024-081", status: "Active",    progress: 80,  assignee: "Fatima Z.", due: "2025-07-01", priority: "High"   },
  { id: 2, title: "Contract #C-2024-092", status: "Pending",   progress: 10,  assignee: "Bilal N.",  due: "2025-08-15", priority: "Medium" },
  { id: 3, title: "Contract #C-2023-056", status: "Completed", progress: 100, assignee: "Sana A.",   due: "2025-02-28", priority: "Low"    },
  { id: 4, title: "Contract #C-2025-004", status: "Active",    progress: 55,  assignee: "Tarek M.",  due: "2025-09-10", priority: "Medium" },
  { id: 5, title: "Contract #C-2025-011", status: "On Hold",   progress: 30,  assignee: "Rim K.",    due: "2025-10-01", priority: "High"   },
];

export const allTasks = [
  ...dorms.map(d => ({ ...d, category: "Dorm" })),
  ...missions.map(m => ({ ...m, category: "Mission" })),
  ...contracts.map(c => ({ ...c, category: "Contract" })),
];