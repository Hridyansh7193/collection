require('dotenv').config();

const GROUPS = [
  { id: 'A', name: 'Group A', defaultPassword: process.env.GROUP_A_PASS || 'alpha@groupA', color: '#6366f1' },
  { id: 'B', name: 'Group B', defaultPassword: process.env.GROUP_B_PASS || 'bravo@groupB', color: '#ec4899' },
  { id: 'C', name: 'Group C', defaultPassword: process.env.GROUP_C_PASS || 'charlie@groupC', color: '#10b981' },
  { id: 'D', name: 'Group D', defaultPassword: process.env.GROUP_D_PASS || 'delta@groupD', color: '#f59e0b' },
  { id: 'E', name: 'Group E', defaultPassword: process.env.GROUP_E_PASS || 'echo@groupE', color: '#8b5cf6' },
  { id: 'F', name: 'Group F', defaultPassword: process.env.GROUP_F_PASS || 'foxtrot@groupF', color: '#06b6d4' },
  { id: 'G', name: 'Group G', defaultPassword: process.env.GROUP_G_PASS || 'golf@groupG', color: '#14b8a6' },
  { id: 'H', name: 'Group H', defaultPassword: process.env.GROUP_H_PASS || 'hotel@groupH', color: '#f97316' },
  { id: 'I', name: 'Group I', defaultPassword: process.env.GROUP_I_PASS || 'india@groupI', color: '#3b82f6' },
  { id: 'J', name: 'Group J', defaultPassword: process.env.GROUP_J_PASS || 'juliet@groupJ', color: '#ef4444' }
];

function getGroup(groupId) {
  if (!groupId) return null;
  const upper = groupId.toUpperCase();
  return GROUPS.find(g => g.id === upper) || null;
}

function validateGroupPassword(groupId, password) {
  const group = getGroup(groupId);
  if (!group || !password) return false;
  return group.defaultPassword.trim() === password.trim();
}

function getSafeGroupsList() {
  return GROUPS.map(g => ({
    id: g.id,
    name: g.name,
    color: g.color
  }));
}

module.exports = {
  GROUPS,
  getGroup,
  validateGroupPassword,
  getSafeGroupsList
};
