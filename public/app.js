// CollectPulse — Client Logic & Secured Collector Gateway
(function () {
  'use strict';

  // State
  let groups = [];
  let activeGroupId = null;
  let unlockedGroups = {}; // Stored only in session memory once entered
  let currentTxn = null;
  let statusPollTimer = null;

  // DOM Elements
  const groupsContainer = document.getElementById('groups-container');
  const collectionForm = document.getElementById('collection-form');
  const inputAmount = document.getElementById('input-amount');
  const inputPayerEmail = document.getElementById('input-payer-email');
  const inputPayerName = document.getElementById('input-payer-name');
  const inputPayerPhone = document.getElementById('input-payer-phone');
  const selectDepartment = document.getElementById('select-department');
  const departmentHint = document.getElementById('department-hint');
  const selectRole = document.getElementById('select-role');
  const inputRemarks = document.getElementById('input-remarks');
  const roleMinBadge = document.getElementById('role-min-badge');
  const roleMinBadgeText = document.getElementById('role-min-badge-text');
  const roleMinIndicator = document.getElementById('role-min-indicator');
  const qrDisplayDepartment = document.getElementById('qr-display-department');
  const qrDisplayRole = document.getElementById('qr-display-role');
  const qrRemarksRow = document.getElementById('qr-remarks-row');
  const qrDisplayRemarks = document.getElementById('qr-display-remarks');
  const successDepartment = document.getElementById('success-department');
  const successRole = document.getElementById('success-role');
  const successPaymentMethod = document.getElementById('success-payment-method');
  const successRemarksRow = document.getElementById('success-remarks-row');
  const successRemarks = document.getElementById('success-remarks');
  const amountPills = document.querySelectorAll('.amount-pill');
  const btnGenerateQr = document.getElementById('btn-generate-qr');
  const btnPayCash = document.getElementById('btn-pay-cash');

  // Role Minimum Deposit Configuration (Faculty ₹2,000 min, Residents ₹1,500 min, Others no minimum)
  const ROLE_TIERS = {
    'HOD': { type: 'faculty', min: 2000, label: 'Faculty Tier' },
    'Professor': { type: 'faculty', min: 2000, label: 'Faculty Tier' },
    'Associate Professor': { type: 'faculty', min: 2000, label: 'Faculty Tier' },
    'Additional Professor': { type: 'faculty', min: 2000, label: 'Faculty Tier' },
    'Senior Resident': { type: 'resident', min: 1500, label: 'Resident Tier' },
    'Junior Resident': { type: 'resident', min: 1500, label: 'Resident Tier' },
    'Others': { type: 'others', min: 0, label: 'Others (No Minimum)' }
  };

  // Terminal States
  const stateIdle = document.getElementById('state-idle');
  const stateQr = document.getElementById('state-qr');
  const stateSuccess = document.getElementById('state-success');
  const idleStatusTag = document.getElementById('idle-status-tag');

  // QR elements
  const qrImage = document.getElementById('qr-image');
  const qrDisplayGroup = document.getElementById('qr-display-group');
  const qrDisplayAmount = document.getElementById('qr-display-amount');
  const qrDisplayContributor = document.getElementById('qr-display-contributor');
  const qrDisplayEmail = document.getElementById('qr-display-email');
  const qrDisplayRef = document.getElementById('qr-display-ref');
  const btnAcceptPayment = document.getElementById('btn-accept-payment');
  const btnCancelQr = document.getElementById('btn-cancel-qr');
  const btnRzpCheckout = document.getElementById('btn-rzp-checkout');

  // Success elements
  const successDisplayAmount = document.getElementById('success-display-amount');
  const successGroupTag = document.getElementById('success-group-tag');
  const successRefId = document.getElementById('success-ref-id');
  const successPayerName = document.getElementById('success-payer-name');
  const successPayerEmail = document.getElementById('success-payer-email');
  const successTimestamp = document.getElementById('success-timestamp');
  const emailStatusHeadline = document.getElementById('email-status-headline');
  const emailStatusDetails = document.getElementById('email-status-details');
  const btnNewCollection = document.getElementById('btn-new-collection');
  const btnPrintReceipt = document.getElementById('btn-print-receipt');

  // Active Group Nav Badges
  const activeGroupText = document.getElementById('active-group-text');
  const formGroupTitle = document.getElementById('form-group-title');

  // Group Auth Modal
  const modalGroupAuth = document.getElementById('modal-group-auth');
  const groupAuthForm = document.getElementById('group-auth-form');
  const authTargetGroupId = document.getElementById('auth-target-group-id');
  const authGroupPassword = document.getElementById('auth-group-password');
  const modalGroupBadge = document.getElementById('modal-group-badge');
  const authErrorMsg = document.getElementById('auth-error-msg');
  const btnCancelAuth = document.getElementById('btn-cancel-auth');

  // Toast Helper
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function formatMoney(amount) {
    return '₹' + (Number(amount) || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function setTerminalState(state) {
    stateIdle.classList.remove('active');
    stateQr.classList.remove('active');
    stateSuccess.classList.remove('active');

    if (state === 'idle') stateIdle.classList.add('active');
    if (state === 'qr') stateQr.classList.add('active');
    if (state === 'success') stateSuccess.classList.add('active');
  }

  // 1. Fetch Safe Groups List (A to J)
  async function loadGroups() {
    try {
      const res = await fetch('/api/groups');
      const data = await res.json();
      if (!data.success) return;

      groups = data.groups;
      renderGroupCards();
    } catch (err) {
      console.error('Failed to load groups:', err);
    }
  }

  // 2. Render Groups A to L Cards
  function renderGroupCards() {
    groupsContainer.innerHTML = '';

    groups.forEach(g => {
      const card = document.createElement('div');
      const isCurrent = g.id === activeGroupId;
      const isUnlocked = !!unlockedGroups[g.id];

      card.className = `group-card ${isCurrent ? 'active' : ''}`;
      card.innerHTML = `
        <span class="group-card-lock">${isUnlocked ? '🔓' : '🔒'}</span>
        <div class="group-card-badge" style="background: ${g.color || '#6366f1'}33; border-color: ${g.color || '#6366f1'}">
          ${g.id}
        </div>
        <div class="group-card-name">Group ${g.id}</div>
        <div class="group-card-depts" style="font-size: 0.72rem; color: #94a3b8; margin-top: 6px; line-height: 1.35; font-weight: 500;">
          ${g.departments || g.name}
        </div>
      `;

      card.addEventListener('click', () => {
        handleGroupSelection(g.id);
      });

      groupsContainer.appendChild(card);
    });
  }

  // 3. Handle Group Selection
  function handleGroupSelection(targetId) {
    if (targetId === activeGroupId) return;

    if (unlockedGroups[targetId]) {
      setActiveGroup(targetId);
      showToast(`Switched to Group ${targetId}`, 'info');
    } else {
      promptGroupPassword(targetId);
    }
  }

  function promptGroupPassword(targetId) {
    const g = groups.find(x => x.id === targetId) || { id: targetId, name: `Group ${targetId}` };
    authTargetGroupId.value = targetId;
    modalGroupBadge.textContent = g.name;
    authGroupPassword.value = '';
    authErrorMsg.style.display = 'none';
    modalGroupAuth.classList.add('active');
    setTimeout(() => authGroupPassword.focus(), 100);
  }

  function setActiveGroup(groupId) {
    activeGroupId = groupId;
    const g = groups.find(x => x.id === groupId) || { id: groupId, name: `Group ${groupId}` };

    activeGroupText.textContent = `Group ${g.id} (Unlocked)`;
    formGroupTitle.textContent = g.name;
    idleStatusTag.innerHTML = `<span class="secure-icon">🔓</span> Authenticated for Group ${g.id} &bull; <small style="color: #cbd5e1;">${g.departments || ''}</small>`;

    // Dynamically populate Department Dropdown for selected group
    if (selectDepartment) {
      const deptList = g.departmentList || (g.departments ? g.departments.split(',').map(s => s.trim()) : []);
      selectDepartment.innerHTML = `<option value="" disabled selected>-- Select Department for Group ${g.id} --</option>`;
      deptList.forEach(dept => {
        const opt = document.createElement('option');
        opt.value = dept;
        opt.textContent = dept;
        selectDepartment.appendChild(opt);
      });
      if (departmentHint) {
        departmentHint.textContent = `Available in Group ${g.id}: ${deptList.join(', ')}`;
      }
    }

    renderGroupCards();

    if (currentTxn && currentTxn.groupId !== groupId) {
      clearActiveQr();
    }
  }

  // 4. Submit Collection Form to Generate QR
  collectionForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!activeGroupId || !unlockedGroups[activeGroupId]) {
      showToast('Please select and unlock your group with your group password first!', 'warning');
      return;
    }

    const selectedDepartment = selectDepartment ? selectDepartment.value : '';
    if (!selectedDepartment) {
      showToast(`Please select a Department from Group ${activeGroupId}`, 'warning');
      if (selectDepartment) selectDepartment.focus();
      return;
    }

    const selectedRole = selectRole ? selectRole.value : '';
    if (!selectedRole || !ROLE_TIERS[selectedRole]) {
      showToast('Please select a Designation / Role from the dropdown', 'warning');
      if (selectRole) selectRole.focus();
      return;
    }

    const tier = ROLE_TIERS[selectedRole];
    let amount = parseFloat(inputAmount.value);

    if (isNaN(amount) || amount <= 0 || (tier.min > 0 && amount < tier.min)) {
      if (tier.min > 0) {
        amount = tier.min;
        inputAmount.value = tier.min;
        inputAmount.classList.add('shake-warning');
        setTimeout(() => inputAmount.classList.remove('shake-warning'), 500);
        showToast(`Minimum deposit for ${selectedRole} is ₹${tier.min.toLocaleString('en-IN')}. Amount cannot be lowered.`, 'warning');
      } else {
        inputAmount.classList.add('shake-warning');
        setTimeout(() => inputAmount.classList.remove('shake-warning'), 500);
        showToast('Please enter a valid contribution amount greater than ₹0.', 'warning');
      }
      inputAmount.focus();
      return;
    }

    const payerEmail = inputPayerEmail.value.trim();
    const payerName = inputPayerName.value.trim();
    const payerPhone = inputPayerPhone.value.trim();
    const remarks = inputRemarks ? inputRemarks.value.trim() : '';

    if (!payerEmail || !payerEmail.includes('@')) {
      showToast('Please enter a valid contributor email address for the confirmation receipt', 'warning');
      inputPayerEmail.focus();
      return;
    }

    const password = unlockedGroups[activeGroupId];

    btnGenerateQr.disabled = true;
    btnGenerateQr.innerHTML = '<span>Generating QR Code...</span>';

    try {
      const res = await fetch('/api/collection/create-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: activeGroupId,
          password,
          amount,
          department: selectedDepartment,
          payerEmail,
          payerName,
          payerPhone,
          role: selectedRole,
          remarks
        })
      });

      const data = await res.json();

      if (!data.success) {
        showToast(data.message || 'Failed to generate QR', 'error');
        btnGenerateQr.disabled = false;
        btnGenerateQr.innerHTML = '<span class="btn-icon">⚡</span><span>Generate Payment QR Code</span>';
        return;
      }

      currentTxn = data.transaction;

      // Populate QR display
      const btnToggleQrType = document.getElementById('btn-toggle-qr-type');
      const qrScanGuideText = document.getElementById('qr-scan-guide-text');

      let isShowingCustom = false;
      if (data.hasCustomImage && data.customImageUrl) {
        qrImage.src = data.customImageUrl;
        isShowingCustom = true;
        if (btnToggleQrType) {
          btnToggleQrType.style.display = 'inline-flex';
          btnToggleQrType.textContent = '🔄 Switch to Dynamic Amount QR';
        }
        if (qrScanGuideText) {
          qrScanGuideText.textContent = 'Official Merchant Scanner (Enter amount in your UPI app)';
        }
      } else {
        qrImage.src = data.qrDataUrl;
        if (btnToggleQrType) btnToggleQrType.style.display = 'none';
        if (qrScanGuideText) qrScanGuideText.textContent = 'Scan with any UPI App (Amount pre-filled)';
      }

      if (btnToggleQrType) {
        btnToggleQrType.onclick = () => {
          if (isShowingCustom) {
            qrImage.src = data.qrDataUrl;
            btnToggleQrType.textContent = '🔄 Switch to Official Merchant Scanner';
            if (qrScanGuideText) qrScanGuideText.textContent = 'Dynamic QR (Exact amount pre-filled)';
            isShowingCustom = false;
          } else {
            qrImage.src = data.customImageUrl;
            btnToggleQrType.textContent = '🔄 Switch to Dynamic Amount QR';
            if (qrScanGuideText) qrScanGuideText.textContent = 'Official Merchant Scanner (Enter amount in your UPI app)';
            isShowingCustom = true;
          }
        };
      }

      qrDisplayGroup.textContent = `Group ${currentTxn.groupId}`;
      qrDisplayAmount.textContent = formatMoney(currentTxn.amount);
      qrDisplayContributor.textContent = currentTxn.payerName || 'Anonymous';
      if (qrDisplayDepartment) qrDisplayDepartment.textContent = currentTxn.department || selectedDepartment;
      if (qrDisplayRole) qrDisplayRole.textContent = currentTxn.role || currentTxn.note || selectedRole;
      if (currentTxn.remarks) {
        if (qrRemarksRow) qrRemarksRow.style.display = 'block';
        if (qrDisplayRemarks) qrDisplayRemarks.textContent = currentTxn.remarks;
      } else {
        if (qrRemarksRow) qrRemarksRow.style.display = 'none';
      }
      qrDisplayEmail.textContent = currentTxn.payerEmail;
      qrDisplayRef.textContent = currentTxn.id;

      const qrDisplayPair = document.getElementById('qr-display-pair');
      const qrDisplayUpi = document.getElementById('qr-display-upi');
      if (qrDisplayPair) qrDisplayPair.textContent = data.pairLabel || `QR ${data.pairId || 1}`;
      if (qrDisplayUpi) qrDisplayUpi.textContent = data.targetUpiId || '';

      // Check Razorpay Button
      if (data.razorpayOrderId && data.razorpayKeyId && window.Razorpay) {
        btnRzpCheckout.style.display = 'inline-flex';
        btnRzpCheckout.onclick = () => openRazorpayModal(data);
      } else {
        btnRzpCheckout.style.display = 'none';
      }

      setTerminalState('qr');
      startPollingTxn(currentTxn.id);
      showToast(data.hasCustomImage ? 'Official Merchant QR Loaded!' : 'Dynamic Payment QR Generated!', 'success');

    } catch (err) {
      console.error(err);
      showToast('Server connection error while generating QR', 'error');
    } finally {
      btnGenerateQr.disabled = false;
      btnGenerateQr.innerHTML = '<span class="btn-icon">⚡</span><span>Generate Payment QR Code (UPI)</span>';
    }
  });

  // Pay by Cash Option (No QR code generated, direct DB entry and instant receipt email)
  if (btnPayCash) {
    btnPayCash.addEventListener('click', async () => {
      if (!activeGroupId) {
        showToast('Please select and unlock a group first', 'warning');
        return;
      }

      if (!unlockedGroups[activeGroupId]) {
        promptGroupPassword(activeGroupId);
        return;
      }

      const selectedDepartment = selectDepartment ? selectDepartment.value : '';
      if (!selectedDepartment) {
        showToast('Please select a Department from the dropdown', 'warning');
        if (selectDepartment) selectDepartment.focus();
        return;
      }

      const selectedRole = selectRole ? selectRole.value : '';
      if (!selectedRole || !ROLE_TIERS[selectedRole]) {
        showToast('Please select a Designation / Role from the dropdown', 'warning');
        if (selectRole) selectRole.focus();
        return;
      }

      const tier = ROLE_TIERS[selectedRole];
      let amount = parseFloat(inputAmount.value);

      if (isNaN(amount) || amount <= 0 || (tier.min > 0 && amount < tier.min)) {
        if (tier.min > 0) {
          amount = tier.min;
          inputAmount.value = tier.min;
          inputAmount.classList.add('shake-warning');
          setTimeout(() => inputAmount.classList.remove('shake-warning'), 500);
          showToast(`Minimum deposit for ${selectedRole} is ₹${tier.min.toLocaleString('en-IN')}. Amount cannot be lowered.`, 'warning');
        } else {
          inputAmount.classList.add('shake-warning');
          setTimeout(() => inputAmount.classList.remove('shake-warning'), 500);
          showToast('Please enter a valid contribution amount greater than ₹0.', 'warning');
        }
        inputAmount.focus();
        return;
      }

      const payerEmail = inputPayerEmail.value.trim();
      const payerName = inputPayerName.value.trim();
      const payerPhone = inputPayerPhone.value.trim();
      const remarks = inputRemarks ? inputRemarks.value.trim() : '';

      if (!payerEmail || !payerEmail.includes('@')) {
        showToast('Please enter a valid contributor email address for the confirmation receipt', 'warning');
        inputPayerEmail.focus();
        return;
      }

      const password = unlockedGroups[activeGroupId];

      btnPayCash.disabled = true;
      btnPayCash.innerHTML = '<span>⏳ Recording Cash & Dispatching Email...</span>';

      try {
        const res = await fetch('/api/collection/record-cash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groupId: activeGroupId,
            password,
            amount,
            department: selectedDepartment,
            payerEmail,
            payerName,
            payerPhone,
            role: selectedRole,
            remarks
          })
        });

        const data = await res.json();

        if (!data.success) {
          showToast(data.message || 'Failed to record cash payment', 'error');
          return;
        }

        stopPollingTxn();
        handlePaymentSuccess(data.transaction, data.emailResult);
        showToast(`Cash payment of ₹${amount.toLocaleString('en-IN')} recorded & official receipt emailed!`, 'success');
      } catch (err) {
        console.error('Error recording cash payment:', err);
        showToast('Server connection error while recording cash payment', 'error');
      } finally {
        btnPayCash.disabled = false;
        btnPayCash.innerHTML = '<span class="btn-icon">💵</span><span>Received Cash — Record & Send Email Receipt</span>';
      }
    });
  }

  // Quick Amount Pills
  document.querySelectorAll('.amount-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const val = parseFloat(pill.dataset.val) || 0;
      const current = parseFloat(inputAmount.value) || 0;
      inputAmount.value = (current + val);
    });
  });

  // 5. Polling Transaction Status
  function startPollingTxn(txnId) {
    stopPollingTxn();
    statusPollTimer = setInterval(async () => {
      try {
        const res = await fetch(`/api/collection/status/${txnId}`);
        const data = await res.json();
        if (data.success && data.transaction) {
          if (data.transaction.status === 'completed') {
            stopPollingTxn();
            handlePaymentSuccess(data.transaction);
          }
        }
      } catch (e) {
        console.warn('Polling error:', e);
      }
    }, 2500);
  }

  function stopPollingTxn() {
    if (statusPollTimer) {
      clearInterval(statusPollTimer);
      statusPollTimer = null;
    }
  }

  // 6. Payment Accepted by Collector (Sends Email & Records in Database)
  if (btnAcceptPayment) {
    btnAcceptPayment.addEventListener('click', async () => {
      if (!currentTxn) return;

      btnAcceptPayment.disabled = true;
      btnAcceptPayment.innerHTML = '<span>⏳ Recording in Database & Sending Email...</span>';

      try {
        const res = await fetch('/api/collection/confirm-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            txnId: currentTxn.id,
            paymentMethod: 'UPI (Collector Verified)',
            paymentId: 'CONF-' + Date.now().toString(36).toUpperCase()
          })
        });

        const data = await res.json();
        if (data.success) {
          stopPollingTxn();
          handlePaymentSuccess(data.transaction, data.emailResult);
        } else {
          showToast(data.message || 'Payment acceptance failed', 'error');
          btnAcceptPayment.disabled = false;
          btnAcceptPayment.innerHTML = '<span class="btn-icon">✅</span><span>Payment Accepted — Send Email & Record</span>';
        }
      } catch (err) {
        console.error(err);
        showToast('Error recording payment in database', 'error');
        btnAcceptPayment.disabled = false;
        btnAcceptPayment.innerHTML = '<span class="btn-icon">✅</span><span>Payment Accepted — Send Email & Record</span>';
      }
    });
  }



  // Cancel QR
  btnCancelQr.addEventListener('click', () => {
    clearActiveQr();
    showToast('Payment session cancelled.', 'info');
  });

  function clearActiveQr() {
    stopPollingTxn();
    currentTxn = null;
    setTerminalState('idle');
  }

  // 7. Razorpay Checkout Modal
  function openRazorpayModal(data) {
    if (!window.Razorpay) {
      showToast('Razorpay SDK not loaded.', 'warning');
      return;
    }

    const options = {
      key: data.razorpayKeyId,
      amount: Math.round(data.transaction.amount * 100),
      currency: 'INR',
      name: `CollectPulse — Group ${data.transaction.groupId}`,
      description: data.transaction.note || 'Contribution',
      order_id: data.razorpayOrderId,
      prefill: {
        name: data.transaction.payerName || '',
        email: data.transaction.payerEmail || '',
        contact: data.transaction.payerPhone || ''
      },
      theme: { color: '#6366f1' },
      handler: async function (response) {
        showToast('Payment successful on Razorpay! Verifying...', 'info');
        try {
          const verifyRes = await fetch('/api/collection/verify-razorpay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              txnId: data.transaction.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            })
          });

          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            stopPollingTxn();
            handlePaymentSuccess(verifyData.transaction, verifyData.emailResult);
          } else {
            showToast('Signature verification failed.', 'error');
          }
        } catch (e) {
          showToast('Verification request failed.', 'error');
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  }

  // 8. Handle Payment Success
  function handlePaymentSuccess(txn, emailResult) {
    currentTxn = txn;
    successDisplayAmount.textContent = formatMoney(txn.amount);
    successGroupTag.textContent = `Successfully credited to Group ${txn.groupId}`;
    successRefId.textContent = txn.id;
    successPayerName.textContent = txn.payerName || 'Anonymous';
    if (successDepartment) successDepartment.textContent = txn.department || 'N/A';
    if (successRole) successRole.textContent = txn.role || txn.note || 'Contributor';
    if (successPaymentMethod) {
      successPaymentMethod.textContent = txn.paymentMethod || 'UPI / QR';
      successPaymentMethod.style.color = (txn.paymentMethod && txn.paymentMethod.toLowerCase().includes('cash')) ? '#10b981' : '#6366f1';
    }
    if (txn.remarks) {
      if (successRemarksRow) successRemarksRow.style.display = 'flex';
      if (successRemarks) successRemarks.textContent = txn.remarks;
    } else {
      if (successRemarksRow) successRemarksRow.style.display = 'none';
    }
    successPayerEmail.textContent = txn.payerEmail;
    successTimestamp.textContent = new Date(txn.completedAt || Date.now()).toLocaleString('en-IN');

    // Email dispatch status
    if (txn.emailSent) {
      emailStatusHeadline.textContent = 'Payment Accepted & Email Dispatched ✅';
      emailStatusHeadline.style.color = '#34d399';
      emailStatusDetails.textContent = `Recorded in database! Official receipt for ${formatMoney(txn.amount)} was dispatched to ${txn.payerEmail}.`;
    } else {
      emailStatusHeadline.textContent = 'Payment Recorded in Database ✅ (Email Notice)';
      emailStatusHeadline.style.color = '#fbbf24';
      emailStatusDetails.textContent = txn.emailError 
        ? `Successfully saved to database! Note: ${txn.emailError}`
        : `Successfully saved to database! Receipt queued for delivery to ${txn.payerEmail}.`;
    }

    setTerminalState('success');
    showToast(`Payment of ₹${txn.amount} Accepted & Saved to Database!`, 'success');
  }

  // Collect Another Contribution
  btnNewCollection.addEventListener('click', () => {
    collectionForm.reset();
    if (selectRole) selectRole.value = '';
    if (inputRemarks) inputRemarks.value = '';
    if (qrRemarksRow) qrRemarksRow.style.display = 'none';
    if (successRemarksRow) successRemarksRow.style.display = 'none';
    if (selectDepartment) {
      if (activeGroupId) {
        const g = groups.find(x => x.id === activeGroupId);
        const deptList = g ? (g.departmentList || (g.departments ? g.departments.split(',').map(s => s.trim()) : [])) : [];
        selectDepartment.innerHTML = `<option value="" disabled selected>-- Select Department for Group ${activeGroupId} --</option>`;
        deptList.forEach(dept => {
          const opt = document.createElement('option');
          opt.value = dept;
          opt.textContent = dept;
          selectDepartment.appendChild(opt);
        });
      } else {
        selectDepartment.innerHTML = `<option value="" disabled selected>-- Select Department --</option>`;
      }
    }
    if (roleMinBadge) roleMinBadge.style.display = 'none';
    if (roleMinIndicator) roleMinIndicator.textContent = '';
    inputAmount.value = '';
    inputAmount.placeholder = '2000';
    inputAmount.min = '1500';
    clearActiveQr();
    inputAmount.focus();
  });

  // Print Receipt
  btnPrintReceipt.addEventListener('click', () => {
    window.print();
  });

  // 9. Group Auth Form Submission
  groupAuthForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const targetId = authTargetGroupId.value;
    const password = authGroupPassword.value.trim();

    try {
      const res = await fetch('/api/auth/group-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: targetId, password })
      });

      const data = await res.json();
      if (!data.success) {
        authErrorMsg.textContent = data.message || 'Incorrect password for this group.';
        authErrorMsg.style.display = 'block';
        authGroupPassword.focus();
        return;
      }

      unlockedGroups[targetId] = password;
      modalGroupAuth.classList.remove('active');
      setActiveGroup(targetId);
      showToast(`Group ${targetId} unlocked!`, 'success');
    } catch (err) {
      authErrorMsg.textContent = 'Server connection error.';
      authErrorMsg.style.display = 'block';
    }
  });

  btnCancelAuth.addEventListener('click', () => {
    modalGroupAuth.classList.remove('active');
  });

  // Close modals on outside click
  window.addEventListener('click', (e) => {
    if (e.target === modalGroupAuth) modalGroupAuth.classList.remove('active');
  });

  // Role selection event & minimum enforcement
  if (selectRole) {
    selectRole.addEventListener('change', () => {
      const selected = selectRole.value;
      const tier = ROLE_TIERS[selected];
      if (!tier) return;

      inputAmount.min = tier.min > 0 ? tier.min : 1;
      if (roleMinIndicator) {
        roleMinIndicator.textContent = tier.min > 0 
          ? `(Min: ₹${tier.min.toLocaleString('en-IN')})` 
          : `(No Minimum)`;
      }

      if (roleMinBadge && roleMinBadgeText) {
        roleMinBadge.style.display = 'inline-flex';
        roleMinBadge.className = `role-tier-badge ${tier.type}`;
        roleMinBadgeText.textContent = tier.min > 0
          ? `🛡️ Minimum for ${selected}: ₹${tier.min.toLocaleString('en-IN')} (Can be increased, not lowered)`
          : `✨ Designation: ${selected} (No Minimum Deposit)`;
      }

      const currentVal = parseFloat(inputAmount.value) || 0;
      if (tier.min > 0 && currentVal < tier.min) {
        inputAmount.value = tier.min;
        showToast(`Minimum deposit for ${selected} set to ₹${tier.min.toLocaleString('en-IN')}`, 'info');
      }
    });
  }

  // Enforce amount cannot be lowered below selected role's minimum
  if (inputAmount) {
    const enforceMinimum = () => {
      const selected = selectRole ? selectRole.value : '';
      const tier = ROLE_TIERS[selected];
      if (!tier || !tier.min) return;

      const currentVal = parseFloat(inputAmount.value);
      if (isNaN(currentVal) || currentVal < tier.min) {
        inputAmount.value = tier.min;
        inputAmount.classList.add('shake-warning');
        setTimeout(() => inputAmount.classList.remove('shake-warning'), 500);
        showToast(`Minimum deposit for ${selected} is ₹${tier.min.toLocaleString('en-IN')}. Amount cannot be lowered.`, 'warning');
      }
    };

    inputAmount.addEventListener('change', enforceMinimum);
    inputAmount.addEventListener('blur', enforceMinimum);
  }

  // Quick Amount Pills (+ ₹100, + ₹500, + ₹1000, etc.)
  amountPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const addVal = parseFloat(pill.dataset.val) || 0;
      const selected = selectRole ? selectRole.value : '';
      const tierMin = (ROLE_TIERS[selected] && ROLE_TIERS[selected].min) || 0;
      let currentVal = parseFloat(inputAmount.value);
      if (isNaN(currentVal) || currentVal < 0 || (tierMin > 0 && currentVal < tierMin)) {
        currentVal = tierMin > 0 ? tierMin : 0;
      }
      const newVal = currentVal + addVal;
      inputAmount.value = newVal;
      showToast(`Amount increased to ₹${newVal.toLocaleString('en-IN')}`, 'info');
    });
  });

  // Initial Load
  loadGroups();

})();
