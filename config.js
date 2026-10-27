const path = require('path');
const fs = require('fs');
require('dotenv').config();

// 12 Groups with department mappings and distinct passwords
const GROUPS = [
  { 
    id: 'A', 
    name: 'Group A (Medicine, Microbiology, ENT)', 
    departments: 'Medicine, Microbiology, ENT',
    departmentList: ['Medicine', 'Microbiology', 'ENT'],
    pairId: 1, 
    defaultPassword: process.env.GROUP_A_PASS || 'alpha@groupA', 
    color: '#6366f1' 
  },
  { 
    id: 'B', 
    name: 'Group B (Community Medicine, Forensic Medicine, Pharmacology)', 
    departments: 'Community Medicine, Forensic Medicine, Pharmacology',
    departmentList: ['Community Medicine', 'Forensic Medicine', 'Pharmacology'],
    pairId: 1, 
    defaultPassword: process.env.GROUP_B_PASS || 'bravo@groupB', 
    color: '#ec4899' 
  },
  { 
    id: 'C', 
    name: 'Group C (Obstetrics & Gynaecology, Radiology)', 
    departments: 'Obstetrics & Gynaecology, Radiology',
    departmentList: ['Obstetrics & Gynaecology', 'Radiology'],
    pairId: 2, 
    defaultPassword: process.env.GROUP_C_PASS || 'charlie@groupC', 
    color: '#10b981' 
  },
  { 
    id: 'D', 
    name: 'Group D (Anatomy, Biochemistry, Physiology)', 
    departments: 'Anatomy, Biochemistry, Physiology',
    departmentList: ['Anatomy', 'Biochemistry', 'Physiology'],
    pairId: 2, 
    defaultPassword: process.env.GROUP_D_PASS || 'delta@groupD', 
    color: '#f59e0b' 
  },
  { 
    id: 'E', 
    name: 'Group E (State Cancer Institute, Emergency Medicine)', 
    departments: 'State Cancer Institute, Emergency Medicine',
    departmentList: ['State Cancer Institute', 'Emergency Medicine'],
    pairId: 3, 
    defaultPassword: process.env.GROUP_E_PASS || 'echo@groupE', 
    color: '#8b5cf6' 
  },
  { 
    id: 'F', 
    name: 'Group F (Dermatology, Critical Care Medicine, Psychiatry)', 
    departments: 'Dermatology, Critical Care Medicine, Psychiatry',
    departmentList: ['Dermatology', 'Critical Care Medicine', 'Psychiatry'],
    pairId: 3, 
    defaultPassword: process.env.GROUP_F_PASS || 'foxtrot@groupF', 
    color: '#06b6d4' 
  },
  { 
    id: 'G', 
    name: 'Group G (Orthopaedics, General Surgery, RIO)', 
    departments: 'Orthopaedics, General Surgery, RIO',
    departmentList: ['Orthopaedics', 'General Surgery', 'RIO'],
    pairId: 4, 
    defaultPassword: process.env.GROUP_G_PASS || 'golf@groupG', 
    color: '#14b8a6' 
  },
  { 
    id: 'H', 
    name: 'Group H (Pulmonary Medicine, Dental, PMR, Nephrology)', 
    departments: 'Pulmonary Medicine, Dental, PMR, Nephrology',
    departmentList: ['Pulmonary Medicine', 'Dental', 'PMR', 'Nephrology'],
    pairId: 4, 
    defaultPassword: process.env.GROUP_H_PASS || 'hotel@groupH', 
    color: '#f97316' 
  },
  { 
    id: 'I', 
    name: 'Group I (Pathology, Pediatrics Medicine, Pediatric Surgery, CTVS)', 
    departments: 'Pathology, Pediatrics Medicine, Pediatric Surgery, CTVS',
    departmentList: ['Pathology', 'Pediatrics Medicine', 'Pediatric Surgery', 'CTVS'],
    pairId: 5, 
    defaultPassword: process.env.GROUP_I_PASS || 'india@groupI', 
    color: '#3b82f6' 
  },
  { 
    id: 'J', 
    name: 'Group J (Anaesthesia, Neuromedicine, Neurosurgery)', 
    departments: 'Anaesthesia, Neuromedicine, Neurosurgery',
    departmentList: ['Anaesthesia', 'Neuromedicine', 'Neurosurgery'],
    pairId: 5, 
    defaultPassword: process.env.GROUP_J_PASS || 'juliet@groupJ', 
    color: '#ef4444' 
  },
  { 
    id: 'K', 
    name: 'Group K (Gastromedicine, Gastrosurgery, Reproductive Medicine)', 
    departments: 'Gastromedicine, Gastrosurgery, Reproductive Medicine',
    departmentList: ['Gastromedicine', 'Gastrosurgery', 'Reproductive Medicine'],
    pairId: 6, 
    defaultPassword: process.env.GROUP_K_PASS || 'kilo@groupK', 
    color: '#0ea5e9' 
  },
  { 
    id: 'L', 
    name: 'Group L (Cardiology, Urology, Endocrinology)', 
    departments: 'Cardiology, Urology, Endocrinology',
    departmentList: ['Cardiology', 'Urology', 'Endocrinology'],
    pairId: 6, 
    defaultPassword: process.env.GROUP_L_PASS || 'lima@groupL', 
    color: '#d946ef' 
  }
];

// 6 QR Configurations (2 groups share 1 QR)
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
  },
  6: {
    id: 6,
    label: 'QR 6 (Groups K & L)',
    groups: ['K', 'L'],
    upiId: () => process.env.QR_PAIR_6_UPI || process.env.DEFAULT_UPI_ID || 'cerebrexia.kl@upi',
    merchantName: () => process.env.QR_PAIR_6_NAME || 'CEREBREXIA 2026 (Groups K & L)',
    customImageName: 'qr6.png'
  }
};

function getGroup(groupId) {
  if (!groupId) return null;
  const upper = groupId.toUpperCase();
  return GROUPS.find(g => g.id === upper) || null;
}

function findCustomQrImage(pairId) {
  const extensions = ['.jpeg', '.jpg', '.png', '.webp'];
  for (const ext of extensions) {
    const filename = `qr${pairId}${ext}`;
    if (fs.existsSync(path.join(__dirname, 'public', 'qrs', filename))) {
      return `/qrs/${filename}`;
    }
    if (fs.existsSync(path.join(__dirname, 'QR', filename))) {
      return `/QR/${filename}`;
    }
  }
  // Safe fallback for serverless hosting where static assets are served at /qrs
  if (pairId >= 1 && pairId <= 6) {
    return `/qrs/qr${pairId}.jpeg`;
  }
  return null;
}

function getGroupQrConfig(groupId) {
  const group = getGroup(groupId);
  if (!group) return null;

  const pair = QR_PAIRS[group.pairId] || QR_PAIRS[1];
  let customImageUrl = null;
  try {
    customImageUrl = findCustomQrImage(pair.id);
  } catch (e) {}

  return {
    pairId: pair.id,
    label: pair.label,
    sharedGroups: pair.groups,
    upiId: pair.upiId(),
    merchantName: pair.merchantName(),
    hasCustomImage: !!customImageUrl,
    customImageUrl
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
      departments: g.departments,
      departmentList: g.departmentList || g.departments.split(',').map(s => s.trim()),
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
