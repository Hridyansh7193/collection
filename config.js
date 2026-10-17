const path = require('path');
const fs = require('fs');
require('dotenv').config();

// 10 Groups A through J with distinct passwords
const GROUPS = [
  { id: 'A', name: 'Group A', pairId: 1, defaultPassword: process.env.GROUP_A_PASS || 'alpha@groupA', color: '#6366f1' },
  { id: 'B', name: 'Group B', pairId: 1, defaultPassword: process.env.GROUP_B_PASS || 'bravo@groupB', color: '#ec4899' },
  { id: 'C', name: 'Group C', pairId: 2, defaultPassword: process.env.GROUP_C_PASS || 'charlie@groupC', color: '#10b981' },
  { id: 'D', name: 'Group D', pairId: 2, defaultPassword: process.env.GROUP_D_PASS || 'delta@groupD', color: '#f59e0b' },
  { id: 'E', name: 'Group E', pairId: 3, defaultPassword: process.env.GROUP_E_PASS || 'echo@groupE', color: '#8b5cf6' },
  { id: 'F', name: 'Group F', pairId: 3, defaultPassword: process.env.GROUP_F_PASS || 'foxtrot@groupF', color: '#06b6d4' },
  { id: 'G', name: 'Group G', pairId: 4, defaultPassword: process.env.GROUP_G_PASS || 'golf@groupG', color: '#14b8a6' },
  { id: 'H', name: 'Group H', pairId: 4, defaultPassword: process.env.GROUP_H_PASS || 'hotel@groupH', color: '#f97316' },
  { id: 'I', name: 'Group I', pairId: 5, defaultPassword: process.env.GROUP_I_PASS || 'india@groupI', color: '#3b82f6' },
  { id: 'J', name: 'Group J', pairId: 5, defaultPassword: process.env.GROUP_J_PASS || 'juliet@groupJ', color: '#ef4444' }
];

// 5 QR Configurations (2 groups share 1 QR)
const QR_PAIRS = {
  1: {
    id: 1,
    label: 'QR 1 (Groups A & B)',
    groups: ['A', 'B'],
    upiId: () => process.env.QR_PAIR_1_UPI || process.env.DEFAULT_UPI_ID || 'cerebrexia.ab@upi',
    merchantName: () => process.env.QR_PAIR_1_NAME || 'CEREBREXIA 2026 (Groups A & B)',
    customImageName: 'qr1.png'
  },
  2: {
    id: 2,
    label: 'QR 2 (Groups C & D)',
    groups: ['C', 'D'],
    upiId: () => process.env.QR_PAIR_2_UPI || process.env.DEFAULT_UPI_ID || 'cerebrexia.cd@upi',
    merchantName: () => process.env.QR_PAIR_2_NAME || 'CEREBREXIA 2026 (Groups C & D)',
    customImageName: 'qr2.png'
  },
  3: {
    id: 3,
    label: 'QR 3 (Groups E & F)',
    groups: ['E', 'F'],
    upiId: () => process.env.QR_PAIR_3_UPI || process.env.DEFAULT_UPI_ID || 'cerebrexia.ef@upi',
    merchantName: () => process.env.QR_PAIR_3_NAME || 'CEREBREXIA 2026 (Groups E & F)',
    customImageName: 'qr3.png'
  },
  4: {
    id: 4,
    label: 'QR 4 (Groups G & H)',
    groups: ['G', 'H'],
    upiId: () => process.env.QR_PAIR_4_UPI || process.env.DEFAULT_UPI_ID || 'cerebrexia.gh@upi',
    merchantName: () => process.env.QR_PAIR_4_NAME || 'CEREBREXIA 2026 (Groups G & H)',
    customImageName: 'qr4.png'
  },
  5: {
    id: 5,
    label: 'QR 5 (Groups I & J)',
    groups: ['I', 'J'],
    upiId: () => process.env.QR_PAIR_5_UPI || process.env.DEFAULT_UPI_ID || 'cerebrexia.ij@upi',
    merchantName: () => process.env.QR_PAIR_5_NAME || 'CEREBREXIA 2026 (Groups I & J)',
    customImageName: 'qr5.png'
  }
};

function getGroup(groupId) {
  if (!groupId) return null;
  const upper = groupId.toUpperCase();
  return GROUPS.find(g => g.id === upper) || null;
}

function getGroupQrConfig(groupId) {
  const group = getGroup(groupId);
  if (!group) return null;

  const pair = QR_PAIRS[group.pairId] || QR_PAIRS[1];
  const customImagePath = path.join(__dirname, 'public', 'qrs', pair.customImageName);
  const hasCustomImage = fs.existsSync(customImagePath);

  return {
    pairId: pair.id,
    label: pair.label,
    sharedGroups: pair.groups,
    upiId: pair.upiId(),
    merchantName: pair.merchantName(),
    hasCustomImage,
    customImageUrl: hasCustomImage ? `/qrs/${pair.customImageName}` : null
  };
}

function validateGroupPassword(groupId, password) {
  const group = getGroup(groupId);
  if (!group || !password) return false;
  return group.defaultPassword.trim() === password.trim();
}

function getSafeGroupsList() {
  return GROUPS.map(g => {
    const qrInfo = getGroupQrConfig(g.id);
    return {
      id: g.id,
      name: g.name,
      color: g.color,
      pairId: g.pairId,
      qrLabel: qrInfo ? qrInfo.label : `QR ${g.pairId}`
    };
  });
}

module.exports = {
  GROUPS,
  QR_PAIRS,
  getGroup,
  getGroupQrConfig,
  validateGroupPassword,
  getSafeGroupsList
};
