/**
 * LexPatent Docket Radar - monday.com UI/UX Application Controller
 * Implements signature monday.com collapsible board groups, colored status blocks,
 * timeline pills, Kanban pipeline, automation recipe center, and AI OCR receipt dropzone.
 */

class LexPatentApp {
  constructor() {
    this.matters = JSON.parse(localStorage.getItem('lexpatent_matters')) || window.INITIAL_MATTERS;
    this.currentView = 'TABLE'; // 'TABLE', 'KANBAN', 'AUTOMATIONS', 'RECEIPTS', 'CALCULATOR'
    this.filters = {
      search: '',
      urgency: 'ALL',
      jurisdiction: 'ALL',
      attorney: 'ALL'
    };
    this.selectedMatter = null;
    this.activeNewMatterTab = 'OCR';
    this.currentParsedReceiptData = null;
    this.collapsedGroups = {};

    this.init();
  }

  init() {
    this.bindGlobalEvents();
    this.renderCurrentView();
    this.updateRadarMetrics();
    this.renderSampleReceiptChips();
  }

  saveState() {
    localStorage.setItem('lexpatent_matters', JSON.stringify(this.matters));
  }

  // --- VIEW SWITCHING ---
  switchView(viewName) {
    this.currentView = viewName;
    document.querySelectorAll('.view-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    this.renderCurrentView();
  }

  renderCurrentView() {
    const container = document.getElementById('monday-main-content');
    if (!container) return;
    container.innerHTML = '';

    switch (this.currentView) {
      case 'TABLE':
        this.renderMondayTableView(container);
        break;
      case 'KANBAN':
        this.renderMondayKanbanView(container);
        break;
      case 'AUTOMATIONS':
        this.renderMondayAutomationsView(container);
        break;
      case 'RECEIPTS':
        this.renderMondayReceiptsView(container);
        break;
      case 'CALCULATOR':
        this.renderMondayCalculatorView(container);
        break;
      default:
        this.renderMondayTableView(container);
    }
  }

  // --- METRICS UPDATE ---
  updateRadarMetrics() {
    let dailyCount = 0;
    let critical5dCount = 0;
    let urgent15dCount = 0;
    let working30dCount = 0;

    this.matters.forEach(raw => {
      const enriched = window.deadlineService.enrichMatter(raw);
      if (enriched.urgency) {
        if (enriched.urgency.key === 'DAILY_CRITICAL' || enriched.urgency.key === 'OVERDUE') dailyCount++;
        else if (enriched.urgency.key === 'T_5_CRITICAL') critical5dCount++;
        else if (enriched.urgency.key === 'T_15_URGENT') urgent15dCount++;
        else if (enriched.urgency.key === 'T_30_ADVISORY') working30dCount++;
      }
    });

    const pillDaily = document.getElementById('pill-daily-count');
    if (pillDaily) pillDaily.textContent = `${dailyCount} Daily Critical`;
    const pill5d = document.getElementById('pill-5d-count');
    if (pill5d) pill5d.textContent = `${critical5dCount} 5-Day Red Alert`;
    const pill15d = document.getElementById('pill-15d-count');
    if (pill15d) pill15d.textContent = `${urgent15dCount} 15-Day Urgent`;
  }

  // --- FILTERING ---
  getFilteredMatters() {
    return this.matters.map(m => window.deadlineService.enrichMatter(m)).filter(matter => {
      if (this.filters.search) {
        const q = this.filters.search.toLowerCase();
        const matchesNum = matter.matterNumber.toLowerCase().includes(q);
        const matchesTitle = matter.title.toLowerCase().includes(q);
        const matchesClient = matter.client.name.toLowerCase().includes(q);
        const matchesAppNo = (matter.officialAppNumber || '').toLowerCase().includes(q);
        if (!matchesNum && !matchesTitle && !matchesClient && !matchesAppNo) return false;
      }

      if (this.filters.urgency !== 'ALL') {
        if (this.filters.urgency === 'DAILY_CRITICAL' && (matter.urgency.key !== 'DAILY_CRITICAL' && matter.urgency.key !== 'OVERDUE')) return false;
        if (this.filters.urgency === 'T_5_CRITICAL' && matter.urgency.key !== 'T_5_CRITICAL') return false;
        if (this.filters.urgency === 'T_15_URGENT' && matter.urgency.key !== 'T_15_URGENT') return false;
        if (this.filters.urgency === 'T_30_ADVISORY' && matter.urgency.key !== 'T_30_ADVISORY') return false;
        if (this.filters.urgency === 'SAFE' && matter.urgency.key !== 'SAFE_UPCOMING' && matter.urgency.key !== 'COMPLETED') return false;
      }

      if (this.filters.jurisdiction !== 'ALL' && matter.jurisdiction !== this.filters.jurisdiction) {
        return false;
      }

      if (this.filters.attorney !== 'ALL' && matter.leadAttorneyId !== this.filters.attorney) {
        return false;
      }

      return true;
    });
  }

  // --- 1. SIGNATURE MONDAY.COM MAIN TABLE VIEW ---
  renderMondayTableView(container) {
    const allMatters = this.getFilteredMatters();

    // Group Matters into monday.com groups
    const groups = [
      {
        id: 'group_critical',
        title: 'Critical & Daily Countdowns (T-0 to T-5 Days)',
        color: '#e2445c',
        statusKey: 'status-critical',
        matters: allMatters.filter(m => m.urgency.key === 'DAILY_CRITICAL' || m.urgency.key === 'T_5_CRITICAL' || m.urgency.key === 'OVERDUE')
      },
      {
        id: 'group_urgent',
        title: 'Action Required (T-6 to T-15 Days)',
        color: '#fdab3d',
        statusKey: 'status-urgent',
        matters: allMatters.filter(m => m.urgency.key === 'T_15_URGENT')
      },
      {
        id: 'group_advisory',
        title: '30-Day Advisory & Drafting (T-16 to T-30 Days)',
        color: '#ffcb00',
        statusKey: 'status-30d',
        matters: allMatters.filter(m => m.urgency.key === 'T_30_ADVISORY')
      },
      {
        id: 'group_safe',
        title: 'Safe Prosecution & Annuities (> 30 Days)',
        color: '#579bfc',
        statusKey: 'status-safe',
        matters: allMatters.filter(m => m.urgency.key === 'SAFE_UPCOMING')
      },
      {
        id: 'group_completed',
        title: 'Completed & Granted Patents',
        color: '#00c875',
        statusKey: 'status-done',
        matters: allMatters.filter(m => m.urgency.key === 'COMPLETED')
      }
    ];

    let html = `<div>`;

    groups.forEach(group => {
      if (group.matters.length === 0 && this.filters.urgency !== 'ALL') return;
      const isCollapsed = this.collapsedGroups[group.id];

      html += `
        <div class="monday-group" id="${group.id}">
          <div class="group-header ${isCollapsed ? 'collapsed' : ''}" onclick="app.toggleGroup('${group.id}')">
            <span class="group-collapse-btn">▼</span>
            <span class="group-title" style="color: ${group.color};">
              ${group.title}
              <span class="group-item-count">(${group.matters.length} matters)</span>
            </span>
          </div>

          <div class="monday-table-wrapper" style="${isCollapsed ? 'display: none;' : ''}">
            <table class="monday-table">
              <thead>
                <tr>
                  <th style="width: 280px;">Matter / Invention Title</th>
                  <th style="width: 140px;">Matter Number</th>
                  <th style="width: 110px;">Lead Attorney</th>
                  <th style="width: 130px;">Prosecution Stage</th>
                  <th style="width: 220px;">Statutory Deadline Action</th>
                  <th style="width: 180px;">Statutory Due Date</th>
                  <th style="width: 150px;">Status / Urgency</th>
                  <th style="width: 150px;">Official Receipt (CBR)</th>
                  <th style="width: 120px;">Actions</th>
                </tr>
              </thead>
              <tbody>
      `;

      if (group.matters.length === 0) {
        html += `
          <tr>
            <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 18px;">
              No matters in this urgency tier.
            </td>
          </tr>
        `;
      } else {
        group.matters.forEach(m => {
          const att = window.ATTORNEYS.find(a => a.id === m.leadAttorneyId) || window.ATTORNEYS[0];
          const jur = window.JURISDICTIONS[m.jurisdiction] || { flag: '🌐', name: m.jurisdiction };
          const stage = window.STAGES[m.currentStage] || { label: m.currentStage };
          const deadline = m.nearestDeadline;
          const urgency = m.urgency;
          const receipt = (m.receipts && m.receipts.length > 0) ? m.receipts[m.receipts.length - 1] : null;

          let statusClass = 'status-safe';
          if (urgency.key === 'DAILY_CRITICAL' || urgency.key === 'OVERDUE') statusClass = 'status-daily';
          else if (urgency.key === 'T_5_CRITICAL') statusClass = 'status-5d';
          else if (urgency.key === 'T_15_URGENT') statusClass = 'status-15d';
          else if (urgency.key === 'T_30_ADVISORY') statusClass = 'status-30d';
          else if (urgency.key === 'COMPLETED') statusClass = 'status-done';

          html += `
            <tr>
              <!-- Matter Name & Title -->
              <td class="td-item-name">
                <div class="group-color-stripe" style="background-color: ${group.color};"></div>
                <div class="item-name-cell" onclick="app.openMatterDrawer('${m.id}')">
                  <span style="font-size: 15px;">${jur.flag}</span>
                  <span class="item-title-text" title="${m.title}">${m.title}</span>
                </div>
              </td>

              <!-- Matter Number -->
              <td>
                <span class="item-number-badge">${m.matterNumber}</span>
              </td>

              <!-- Lead Attorney -->
              <td>
                <div class="person-cell-content" title="${att.name} (${att.role})">
                  <img src="${att.avatar}" class="person-avatar" alt="${att.name}">
                  <span style="font-size: 12px; font-weight: 500;">${att.name.split(',')[0]}</span>
                </div>
              </td>

              <!-- Stage -->
              <td>
                <span class="stage-pill">${stage.label.split(' ')[0]} ${stage.label.split(' ')[1] || ''}</span>
              </td>

              <!-- Statutory Action & Section -->
              <td style="text-align: left; padding: 6px 12px;">
                ${deadline ? `
                  <div style="font-weight: 600; font-size: 12px; color: var(--text-primary);">${deadline.title}</div>
                  <div style="font-size: 11px; color: var(--text-muted);">${deadline.statutorySection || 'Patents Act'}</div>
                ` : `
                  <span style="color: var(--status-done); font-weight: 600;">✓ All Cleared</span>
                `}
              </td>

              <!-- Due Date & Timeline Pill -->
              <td>
                ${deadline ? `
                  <div class="timeline-pill ${m.daysRemaining <= 5 ? 'timeline-critical' : (m.daysRemaining <= 15 ? 'timeline-urgent' : 'timeline-safe')}">
                    <div class="timeline-pill-progress" style="width: ${Math.max(10, Math.min(100, (1 - (m.daysRemaining / 365)) * 100))}%; background: ${group.color};"></div>
                    <span class="timeline-pill-text">${deadline.statutoryDueDate}</span>
                    <span class="timeline-countdown-badge">${m.daysRemaining}d left</span>
                  </div>
                ` : `
                  <span style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">No Pending Bar</span>
                `}
              </td>

              <!-- Status Block -->
              <td>
                <div class="status-cell-block ${statusClass}" onclick="app.openMatterDrawer('${m.id}')">
                  ${urgency.label}
                </div>
              </td>

              <!-- Official Receipt (CBR) -->
              <td>
                ${receipt ? `
                  <div class="receipt-chip-monday" onclick="app.previewReceiptDocument('${m.id}', '${receipt.id}')">
                    <span>🏛️</span>
                    <span>${receipt.cbrNumber}</span>
                  </div>
                ` : `
                  <span style="font-size: 11px; color: var(--text-muted);">Pending CBR</span>
                `}
              </td>

              <!-- Actions -->
              <td>
                <div style="display: flex; gap: 4px; justify-content: center;">
                  ${deadline && deadline.status === 'PENDING' ? `
                    <button class="btn-monday btn-monday-primary" style="padding: 4px 8px; font-size: 11px;" onclick="app.openReceiptUploadModal('${m.id}', '${deadline.id}')">
                      Upload
                    </button>
                    <button class="btn-monday btn-monday-secondary" style="padding: 4px 6px; font-size: 11px; color: #e2445c;" onclick="app.triggerManualEmergency('${m.id}', '${deadline.id}')" title="Trigger Partner Alert">
                      🚨
                    </button>
                  ` : `
                    <button class="btn-monday btn-monday-secondary" style="padding: 4px 8px; font-size: 11px;" onclick="app.openMatterDrawer('${m.id}')">
                      View
                    </button>
                  `}
                </div>
              </td>
            </tr>
          `;
        });
      }

      // Group Add Item Row & Summary Footer
      html += `
                <tr class="add-item-row" onclick="app.openNewMatterWizard('OCR')">
                  <td colspan="9" class="add-item-cell">
                    <span style="font-size: 16px; color: var(--monday-blue);">+</span>
                    <span>Drop Patent Receipt / Add Matter to this group</span>
                  </td>
                </tr>

                <tr class="monday-table-footer">
                  <td style="text-align: left; padding-left: 16px;">
                    ${group.matters.length} matters total
                  </td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td style="padding: 0 10px;">
                    <div class="progress-bar-container">
                      <div class="progress-bar-done" style="width: ${group.id === 'group_completed' ? 100 : 30}%;"></div>
                      <div class="progress-bar-critical" style="width: ${group.id === 'group_critical' ? 70 : 0}%;"></div>
                      <div class="progress-bar-urgent" style="width: ${group.id === 'group_urgent' ? 70 : 0}%;"></div>
                    </div>
                  </td>
                  <td>
                    <span style="font-size: 11px; font-weight: 700; color: ${group.color};">Group Summary</span>
                  </td>
                  <td></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;
  }

  toggleGroup(groupId) {
    this.collapsedGroups[groupId] = !this.collapsedGroups[groupId];
    this.renderCurrentView();
  }

  // --- 2. MONDAY.COM KANBAN VIEW ---
  renderMondayKanbanView(container) {
    const allMatters = this.getFilteredMatters();

    const columns = [
      { key: 'DAILY_CRITICAL', title: '🔥 Daily Critical (T-4..0)', color: '#e2445c' },
      { key: 'T_5_CRITICAL', title: '🚨 5-Day Red Alert', color: '#e2445c' },
      { key: 'T_15_URGENT', title: '⚠️ 15-Day Urgent', color: '#fdab3d' },
      { key: 'T_30_ADVISORY', title: '📋 30-Day Advisory', color: '#ffcb00' },
      { key: 'SAFE_UPCOMING', title: '🟢 Safe Prosecution', color: '#579bfc' },
      { key: 'COMPLETED', title: '✅ Completed & Granted', color: '#00c875' }
    ];

    let html = `<div class="monday-kanban-board">`;

    columns.forEach(col => {
      const colMatters = allMatters.filter(m => m.urgency.key === col.key || (col.key === 'DAILY_CRITICAL' && m.urgency.key === 'OVERDUE'));

      html += `
        <div class="kanban-column">
          <div class="kanban-column-header" style="border-top-color: ${col.color};">
            <span style="color: var(--text-primary);">${col.title}</span>
            <span style="background: #e6e9ef; padding: 2px 8px; border-radius: var(--radius-full); font-size: 12px;">${colMatters.length}</span>
          </div>

          <div class="kanban-cards-list">
      `;

      colMatters.forEach(m => {
        const att = window.ATTORNEYS.find(a => a.id === m.leadAttorneyId) || window.ATTORNEYS[0];
        const jur = window.JURISDICTIONS[m.jurisdiction] || { flag: '🌐' };
        const deadline = m.nearestDeadline;

        html += `
          <div class="kanban-card" onclick="app.openMatterDrawer('${m.id}')">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="item-number-badge">${jur.flag} ${m.matterNumber}</span>
              <span style="font-size: 11px; font-weight: 700; color: ${col.color};">${m.daysRemaining !== null ? `${m.daysRemaining}d left` : ''}</span>
            </div>

            <div style="font-weight: 700; font-size: 13px; color: var(--text-primary); line-height: 1.3;">
              ${m.title}
            </div>

            <div style="font-size: 11px; color: var(--text-secondary);">
              Client: <strong>${m.client.name}</strong>
            </div>

            ${deadline ? `
              <div style="background: #f8fafc; border-left: 3px solid ${col.color}; padding: 6px 8px; border-radius: 4px; font-size: 11px;">
                <div style="font-weight: 600;">${deadline.title}</div>
                <div style="color: var(--text-muted);">Due: ${deadline.statutoryDueDate}</div>
              </div>
            ` : ''}

            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-light); padding-top: 8px; margin-top: 4px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <img src="${att.avatar}" class="person-avatar" style="width: 22px; height: 22px;" alt="${att.name}">
                <span style="font-size: 11px; color: var(--text-muted);">${att.name.split(',')[0]}</span>
              </div>

              ${deadline && deadline.status === 'PENDING' ? `
                <button class="btn-monday btn-monday-primary" style="padding: 2px 8px; font-size: 10px;" onclick="event.stopPropagation(); app.openReceiptUploadModal('${m.id}', '${deadline.id}')">
                  Upload CBR
                </button>
              ` : ''}
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;
  }

  // --- 3. MONDAY.COM AUTOMATIONS CENTER ---
  renderMondayAutomationsView(container) {
    const automations = [
      {
        id: 'auto-1',
        title: '30-Day Amber Escalation Recipe',
        sentence: `When a <span class="automation-param">Statutory Deadline</span> is <span class="automation-param">30 Days away</span>, send <span class="automation-param">Amber Advisory Email</span> to <span class="automation-param">Lead Drafting Attorney</span>.`,
        active: true
      },
      {
        id: 'auto-2',
        title: '15-Day Orange Warning Recipe',
        sentence: `When a <span class="automation-param">Statutory Deadline</span> is <span class="automation-param">15 Days away</span>, send <span class="automation-param">Urgent Escalation Email</span> to <span class="automation-param">Lead Attorney</span> and <span class="automation-param">Supervising Partner</span>.`,
        active: true
      },
      {
        id: 'auto-3',
        title: '5-Day Red Emergency Alert Recipe',
        sentence: `When a <span class="automation-param">Statutory Bar</span> is <span class="automation-param">5 Days away</span>, notify <span class="automation-param">All IP Partners</span>, <span class="automation-param">Client Counsel</span>, and activate <span class="automation-param">Daily Countdown Blitz</span>.`,
        active: true
      },
      {
        id: 'auto-4',
        title: 'Daily Critical Blitz (T-4 to T-0)',
        sentence: `Every day at <span class="automation-param">08:00 AM & 04:00 PM</span>, if deadline is <span class="automation-param">under 5 days</span>, dispatch <span class="automation-param">Emergency Alert</span> until <span class="automation-param">Official Government CBR is Verified</span>.`,
        active: true
      },
      {
        id: 'auto-5',
        title: 'Dual Verification Safety Rule',
        sentence: `When an <span class="automation-param">Official CBR Receipt</span> is uploaded, require <span class="automation-param">Secondary Partner Digital Sign-Off</span> before closing deadline.`,
        active: true
      },
      {
        id: 'auto-6',
        title: 'Stage Progression Trigger',
        sentence: `When <span class="automation-param">Provisional 12m Bar is Cleared</span>, automatically advance matter to <span class="automation-param">Complete Specification Stage</span> and generate <span class="automation-param">18m Publication & RFE Deadlines</span>.`,
        active: true
      }
    ];

    let html = `
      <div>
        <div style="background: #ffffff; border: 1px solid var(--border-medium); border-radius: var(--radius-md); padding: 24px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h3 style="font-size: 18px; font-weight: 700; color: var(--text-primary);">⚡ Zero-Fail Patent Automation Recipes</h3>
            <p style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">
              Active automated workflows ensuring no statutory bars are missed across your firm's docket.
            </p>
          </div>
          <button class="btn-monday btn-monday-primary" onclick="app.simulateMorningCronRun()">
            <span>⚡ Run 08:00 AM Dispatch Now</span>
          </button>
        </div>

        <div class="automations-grid">
          ${automations.map(a => `
            <div class="automation-recipe-card">
              <div>
                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--monday-blue); margin-bottom: 8px;">${a.title}</div>
                <div class="automation-sentence">${a.sentence}</div>
              </div>
              <div class="automation-toggle-row">
                <span style="font-size: 12px; font-weight: 600; color: var(--status-done);">Active in Background</span>
                <div class="toggle-switch"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  // --- 4. MONDAY.COM RECEIPTS VAULT ---
  renderMondayReceiptsView(container) {
    const allReceipts = [];
    this.matters.forEach(m => {
      (m.receipts || []).forEach(r => {
        allReceipts.push({ receipt: r, matter: m });
      });
    });

    let html = `
      <div>
        <div style="background: #ffffff; border: 1px solid var(--border-medium); border-radius: var(--radius-md); padding: 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h3 style="font-size: 18px; font-weight: 700;">Official Government Receipts & Proof Vault</h3>
            <p style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">
              Every cleared deadline is permanently linked to an official digitally-verified government acknowledgment.
            </p>
          </div>
          <span style="background: var(--monday-blue-light); color: var(--monday-blue); padding: 6px 14px; border-radius: var(--radius-full); font-weight: 700; font-size: 12px;">
            ${allReceipts.length} Official Receipts Verified
          </span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px;">
    `;

    allReceipts.forEach(item => {
      const r = item.receipt;
      const m = item.matter;
      const isVerified = Boolean(r.verifiedBy);

      html += `
        <div style="background: #ffffff; border: 1px solid var(--border-medium); border-radius: var(--radius-md); padding: 18px; box-shadow: var(--shadow-subtle); display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-family: var(--font-mono); font-weight: 700; color: var(--monday-blue); font-size: 14px;">${r.cbrNumber}</span>
            <span style="background: ${isVerified ? 'rgba(0, 200, 117, 0.15)' : 'rgba(226, 68, 92, 0.15)'}; color: ${isVerified ? 'var(--status-done)' : 'var(--status-critical)'}; padding: 2px 8px; border-radius: var(--radius-full); font-size: 10px; font-weight: 700;">
              ${isVerified ? '✓ DUAL-VERIFIED' : 'AWAITING SIGN-OFF'}
            </span>
          </div>

          <div style="font-weight: 700; font-size: 13px; color: var(--text-primary);">${r.receiptTitle}</div>
          <div style="font-size: 12px; color: var(--text-secondary);">Matter: <strong>${m.matterNumber}</strong> (${m.client.name})</div>
          <div style="font-size: 11px; color: var(--text-muted);">Fees Paid: <strong>${r.currency} ${r.officialFees.toLocaleString()}</strong> | ${r.officialTimestamp}</div>

          <div style="border-top: 1px solid var(--border-light); padding-top: 10px; display: flex; justify-content: flex-end; gap: 6px;">
            <button class="btn-monday btn-monday-secondary" style="padding: 4px 10px; font-size: 11px;" onclick="app.previewReceiptDocument('${m.id}', '${r.id}')">
              📄 View Official PDF
            </button>
            ${!isVerified ? `
              <button class="btn-monday btn-monday-primary" style="padding: 4px 10px; font-size: 11px;" onclick="app.openDualVerificationModal('${m.id}', '${r.clearedDeadlineId}', '${r.id}')">
                ✅ Verify & Clear
              </button>
            ` : ''}
          </div>
        </div>
      `;
    });

    html += `</div></div>`;
    container.innerHTML = html;
  }

  // --- 5. MONDAY.COM RULES CALCULATOR ---
  renderMondayCalculatorView(container) {
    const html = `
      <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 24px;">
        <div style="background: #ffffff; border: 1px solid var(--border-medium); border-radius: var(--radius-md); padding: 24px; display: flex; flex-direction: column; gap: 16px;">
          <h3 style="font-size: 18px; font-weight: 700;">Statutory Patent Deadline Calculator</h3>
          <p style="font-size: 13px; color: var(--text-secondary);">
            Enter trigger dates to compute official statutory bars, non-extendable convention dates, and examination response windows.
          </p>

          <div>
            <label style="font-size: 12px; font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 4px;">Select Jurisdiction</label>
            <select class="toolbar-filter-select" style="width: 100%;" id="calc-jurisdiction" onchange="app.recomputeCalculator()">
              <option value="IN">India (IPO) - Indian Patents Act 1970</option>
              <option value="US">United States (USPTO) - 35 U.S.C.</option>
              <option value="EP">Europe (EPO) - EPC</option>
              <option value="WO">WIPO / PCT International</option>
            </select>
          </div>

          <div>
            <label style="font-size: 12px; font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 4px;">Trigger Milestone Stage</label>
            <select class="toolbar-filter-select" style="width: 100%;" id="calc-stage" onchange="app.recomputeCalculator()">
              <option value="PROVISIONAL">1. Provisional Application Filing (12m Bar)</option>
              <option value="COMPLETE">2. Complete Specification Filing (18m Publication & RFE)</option>
              <option value="EXAMINATION_FER">3. First Examination Report (FER) / Office Action</option>
              <option value="HEARING">4. Oral Hearing Scheduled (15-day submission)</option>
              <option value="ALLOWANCE_GRANT">5. Notice of Allowance (3-month Issue fee)</option>
              <option value="ANNUITY_MAINTENANCE">6. Patent Grant (Annuities / Form 27)</option>
            </select>
          </div>

          <div>
            <label style="font-size: 12px; font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 4px;">Milestone Trigger Date</label>
            <input type="date" class="toolbar-filter-select" style="width: 100%;" id="calc-trigger-date" value="${window.deadlineService.getSimulatedDate()}" onchange="app.recomputeCalculator()">
          </div>
        </div>

        <div style="background: #ffffff; border: 1px solid var(--border-medium); border-radius: var(--radius-md); padding: 24px;" id="calc-results-container">
        </div>
      </div>
    `;

    container.innerHTML = html;
    this.recomputeCalculator();
  }

  recomputeCalculator() {
    const jur = document.getElementById('calc-jurisdiction')?.value || 'IN';
    const stage = document.getElementById('calc-stage')?.value || 'PROVISIONAL';
    const date = document.getElementById('calc-trigger-date')?.value || window.deadlineService.getSimulatedDate();
    const container = document.getElementById('calc-results-container');
    if (!container) return;

    const generated = window.deadlineService.generateDeadlinesForStage(stage, date, date, jur);

    let html = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-light); padding-bottom: 12px; margin-bottom: 16px;">
        <h4 style="font-size: 16px; font-weight: 700;">Computed Statutory Deadlines</h4>
        <span style="background: var(--monday-blue-light); color: var(--monday-blue); padding: 3px 10px; border-radius: var(--radius-full); font-weight: 700; font-size: 11px;">
          ${generated.length} Deadlines
        </span>
      </div>
    `;

    generated.forEach(g => {
      const days = window.deadlineService.calculateDaysRemaining(g.statutoryDueDate);
      const urgency = window.deadlineService.getUrgencyTier(days);

      html += `
        <div style="background: var(--bg-app); border-left: 4px solid ${urgency.color}; border-radius: var(--radius-sm); padding: 14px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <strong style="font-size: 14px; color: var(--text-primary);">${g.title}</strong>
            <span style="font-family: var(--font-mono); font-weight: 700; color: ${urgency.color}; font-size: 13px;">${g.statutoryDueDate} (${days}d)</span>
          </div>
          <div style="font-size: 12px; color: var(--text-secondary);">${g.description}</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 6px;">Statute: <em>${g.statutorySection || 'Patents Act'}</em></div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // --- SMART OCR & AUTO-DOCKETING ---
  openNewMatterWizard(tab = 'OCR') {
    this.switchNewMatterTab(tab);
    document.getElementById('new-matter-modal').classList.add('open');
    this.resetOcrIntakeState();
  }

  closeNewMatterWizard() {
    document.getElementById('new-matter-modal').classList.remove('open');
  }

  switchNewMatterTab(tab) {
    this.activeNewMatterTab = tab;
    document.querySelectorAll('.modal-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    const ocrPanel = document.getElementById('new-matter-ocr-panel');
    const manualPanel = document.getElementById('new-matter-manual-panel');
    const footerOcr = document.getElementById('new-matter-footer-ocr');
    const footerManual = document.getElementById('new-matter-footer-manual');

    if (tab === 'OCR') {
      ocrPanel.style.display = 'block';
      manualPanel.style.display = 'none';
      footerOcr.style.display = 'flex';
      footerManual.style.display = 'none';
    } else {
      ocrPanel.style.display = 'none';
      manualPanel.style.display = 'block';
      footerOcr.style.display = 'none';
      footerManual.style.display = 'flex';
    }
  }

  renderSampleReceiptChips() {
    const container = document.getElementById('sample-receipt-chips-container');
    if (!container) return;

    const samples = window.receiptParserService.getSamples();
    container.innerHTML = samples.map(s => `
      <div class="sample-chip-monday" onclick="app.loadSampleReceipt('${s.id}')">
        <span>📄</span>
        <span>${s.label}</span>
      </div>
    `).join('');
  }

  loadSampleReceipt(sampleId) {
    const sample = window.receiptParserService.getSamples().find(s => s.id === sampleId);
    if (!sample) return;

    this.processReceiptText(sample.rawText, sample.fileName);
  }

  handleReceiptFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const textContent = e.target.result;
      this.processReceiptText(textContent, file.name);
    };
    reader.readAsText(file);
  }

  processReceiptText(rawText, fileName) {
    const dropzone = document.getElementById('ocr-dropzone-box');
    dropzone.innerHTML = `
      <div class="upload-icon" style="color: var(--monday-blue);">⚡</div>
      <div style="font-size: 14px; font-weight: 700; color: var(--monday-blue);">Extracting Legal Metadata from Receipt...</div>
      <div style="font-size: 12px; color: var(--text-secondary);">Matching official IPO, USPTO, EPO & WIPO statutory patterns...</div>
    `;

    setTimeout(() => {
      const parseResult = window.receiptParserService.parseReceiptText(rawText, fileName);
      this.currentParsedReceiptData = parseResult;
      this.displayExtractedReview(parseResult, rawText, fileName);
      dropzone.innerHTML = `
        <div style="font-size: 24px; color: var(--status-done);">✓</div>
        <div style="font-size: 14px; font-weight: 700; color: var(--status-done);">Receipt Extracted (${fileName})</div>
        <div style="font-size: 12px; color: var(--text-muted);">Ready to auto-docket into board!</div>
      `;
    }, 500);
  }

  displayExtractedReview(parseResult, rawText, fileName) {
    const d = parseResult.data;
    const reviewContainer = document.getElementById('ocr-review-container');
    const jurObj = window.JURISDICTIONS[d.jurisdiction] || { flag: '🌐', name: d.jurisdiction };
    const stageObj = window.STAGES[d.stage] || { label: d.stage };
    const deadlines = window.deadlineService.generateDeadlinesForStage(d.stage, d.triggerDate, d.priorityDate, d.jurisdiction);

    reviewContainer.style.display = 'block';
    reviewContainer.innerHTML = `
      <div style="background: var(--bg-app); border: 1px solid var(--border-medium); border-radius: var(--radius-md); padding: 18px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid var(--border-light); padding-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="background: var(--monday-blue); color: #fff; padding: 2px 8px; border-radius: var(--radius-full); font-size: 11px; font-weight: 700;">
              ⚡ AI Parsed (${Math.round(parseResult.confidence * 100)}% Match)
            </span>
            <span style="font-weight: 700; font-size: 13px;">${jurObj.flag} ${jurObj.name} Official Format</span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px;">
          <div><span style="color: var(--text-muted);">Matter No:</span> <strong>${d.matterNumber}</strong></div>
          <div><span style="color: var(--text-muted);">App No:</span> <strong>${d.officialAppNumber}</strong></div>
          <div style="grid-column: 1 / -1;"><span style="color: var(--text-muted);">Title:</span> <strong style="color: var(--text-primary);">${d.title}</strong></div>
          <div><span style="color: var(--text-muted);">Client:</span> <strong>${d.clientName}</strong></div>
          <div><span style="color: var(--text-muted);">CBR No:</span> <strong style="color: var(--monday-blue);">${d.cbrNumber}</strong></div>
          <div><span style="color: var(--text-muted);">Fees Paid:</span> <strong>${d.currency} ${d.officialFees.toLocaleString()}</strong></div>
          <div><span style="color: var(--text-muted);">Stage:</span> <strong>${stageObj.label}</strong></div>
        </div>

        <div style="margin-top: 14px; border-top: 1px solid var(--border-light); padding-top: 10px;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--status-critical); margin-bottom: 6px;">
            ⚡ Statutory Deadlines Automatically Calculated (${deadlines.length}):
          </div>
          ${deadlines.map(dl => `
            <div style="background: #ffffff; border: 1px solid var(--border-light); border-radius: 4px; padding: 6px 10px; margin-bottom: 4px; font-size: 12px; display: flex; justify-content: space-between;">
              <strong style="color: var(--text-primary);">${dl.title}</strong>
              <span style="font-family: var(--font-mono); font-weight: 700; color: var(--status-critical);">${dl.statutoryDueDate}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    document.getElementById('btn-confirm-auto-docket').disabled = false;
  }

  resetOcrIntakeState() {
    this.currentParsedReceiptData = null;
    const reviewContainer = document.getElementById('ocr-review-container');
    if (reviewContainer) {
      reviewContainer.style.display = 'none';
      reviewContainer.innerHTML = '';
    }
    const dropzone = document.getElementById('ocr-dropzone-box');
    if (dropzone) {
      dropzone.innerHTML = `
        <div class="upload-icon" style="font-size: 32px; color: var(--monday-blue);">⚡</div>
        <div style="font-size: 15px; font-weight: 700; color: var(--monday-blue);">Drop any Official Patent Office Receipt, CBR, or FER Notice here</div>
        <div style="font-size: 12px; color: var(--text-secondary);">Or click to browse from computer (PDF, Text, Scans)</div>
      `;
    }
    const btn = document.getElementById('btn-confirm-auto-docket');
    if (btn) btn.disabled = true;
  }

  confirmAndAutoDocketMatter() {
    if (!this.currentParsedReceiptData) return;

    const d = this.currentParsedReceiptData.data;
    const assignedAttorneyId = document.getElementById('ocr-attorney-select')?.value || 'usr-01';

    const generatedDeadlines = window.deadlineService.generateDeadlinesForStage(d.stage, d.triggerDate, d.priorityDate, d.jurisdiction);
    generatedDeadlines.forEach((dl, idx) => {
      dl.id = `ddl-${Date.now()}-${idx}`;
      dl.status = "PENDING";
    });

    const initialReceipt = {
      id: `rcpt-${Date.now()}`,
      receiptType: d.stage === 'PROVISIONAL' ? 'PROVISIONAL_FILING_CBR' : (d.stage === 'EXAMINATION_FER' ? 'FER_RESPONSE_CBR' : 'COMPLETE_FILING_CBR'),
      receiptTitle: d.receiptTitle,
      cbrNumber: d.cbrNumber,
      officialTimestamp: `${d.triggerDate} 11:30:00 IST`,
      officialFees: d.officialFees,
      currency: d.currency,
      documentUrl: `${d.matterNumber}_ack.pdf`,
      uploadedBy: assignedAttorneyId,
      verifiedBy: 'usr-04',
      verifiedAt: `${d.triggerDate} 14:00:00 IST`,
      notes: "Auto-extracted and dual-verified from Official Patent Office acknowledgment."
    };

    const newMatter = {
      id: `mat-${Date.now()}`,
      matterNumber: d.matterNumber,
      title: d.title,
      jurisdiction: d.jurisdiction,
      client: {
        name: d.clientName,
        contactEmail: d.clientEmail,
        contactPerson: d.clientName + " IP Legal Rep"
      },
      applicationType: d.stage === 'PROVISIONAL' ? 'Provisional Patent Application' : 'Patent Application',
      officialAppNumber: d.officialAppNumber,
      priorityDate: d.priorityDate,
      filingDate: d.triggerDate,
      currentStage: d.stage,
      leadAttorneyId: assignedAttorneyId,
      supervisingPartnerId: "usr-04",
      status: "ACTION_REQUIRED",
      abstract: d.abstract || "Docket entry auto-extracted from official government patent filing acknowledgment.",
      deadlines: generatedDeadlines,
      receipts: [initialReceipt],
      history: [
        { date: window.deadlineService.getSimulatedDate(), event: `Matter automatically docketed via Smart Receipt Parser (${d.cbrNumber}).`, user: "AI Ingestion" }
      ]
    };

    this.matters.unshift(newMatter);
    this.saveState();
    this.closeNewMatterWizard();

    this.showToast(`🚀 Matter ${newMatter.matterNumber} AUTO-DOCKETED into monday.com Board!`, 'success');
    this.renderCurrentView();
    this.updateRadarMetrics();

    setTimeout(() => {
      this.openMatterDrawer(newMatter.id);
    }, 400);
  }

  // --- MATTER DRAWER & ACTIONS ---
  openMatterDrawer(matterId) {
    const raw = this.matters.find(m => m.id === matterId);
    if (!raw) return;

    this.selectedMatter = window.deadlineService.enrichMatter(raw);
    const m = this.selectedMatter;
    const jur = window.JURISDICTIONS[m.jurisdiction] || { name: m.jurisdiction, flag: '🌐' };
    const stagesList = Object.values(window.STAGES).sort((a, b) => a.order - b.order);
    const currentStageObj = window.STAGES[m.currentStage] || { order: 1 };

    const drawerBody = document.getElementById('matter-drawer-content');
    drawerBody.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <div style="border-bottom: 1px solid var(--border-light); padding-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <span style="font-size: 20px;">${jur.flag}</span>
            <span class="item-number-badge" style="font-size: 14px;">${m.matterNumber}</span>
          </div>
          <h3 style="font-size: 20px; font-weight: 700; color: var(--text-primary);">${m.title}</h3>
          <div style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">
            Client: <strong>${m.client.name}</strong> • Official App No: <code>${m.officialAppNumber || 'Pending'}</code>
          </div>
        </div>

        <div>
          <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px;">
            Prosecution Pipeline
          </div>
          <div style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 6px;">
            ${stagesList.map(s => {
              const isCompleted = s.order < currentStageObj.order;
              const isActive = s.order === currentStageObj.order;
              return `
                <div style="padding: 6px 12px; border-radius: var(--radius-full); font-size: 11px; font-weight: 700; background: ${isCompleted ? 'var(--status-done)' : (isActive ? 'var(--monday-blue)' : '#e6e9ef')}; color: ${isCompleted || isActive ? '#fff' : 'var(--text-muted)'}; white-space: nowrap;">
                  ${isCompleted ? '✓ ' : ''}${s.order}. ${s.label.split(' ')[0]}
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div>
          <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px;">
            Statutory Deadlines (${(m.deadlines || []).length})
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${(m.deadlines || []).map(d => {
              const days = window.deadlineService.calculateDaysRemaining(d.statutoryDueDate);
              const urgency = window.deadlineService.getUrgencyTier(days);
              const isPending = d.status === 'PENDING' || d.status === 'WAITING_VERIFICATION';

              return `
                <div style="background: var(--bg-app); border-left: 4px solid ${urgency.color}; border-radius: var(--radius-sm); padding: 14px; display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <div style="font-weight: 700; font-size: 13px;">${d.title}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">Due Date: <strong>${d.statutoryDueDate}</strong> (${days}d remaining)</div>
                    <div style="font-size: 11px; color: var(--text-muted);">Statute: <em>${d.statutorySection || 'Patents Act'}</em></div>
                  </div>

                  <div style="display: flex; gap: 6px;">
                    ${isPending ? `
                      <button class="btn-monday btn-monday-primary" style="font-size: 11px; padding: 4px 10px;" onclick="app.openReceiptUploadModal('${m.id}', '${d.id}')">
                        Upload Receipt
                      </button>
                      <button class="btn-monday btn-monday-secondary" style="font-size: 11px; padding: 4px 8px; color: #e2445c;" onclick="app.triggerManualEmergency('${m.id}', '${d.id}')">
                        🚨 Alert
                      </button>
                    ` : `
                      <span style="font-size: 12px; color: var(--status-done); font-weight: 700;">✓ Cleared</span>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div>
          <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px;">
            Attached Government Proofs & Receipts (${(m.receipts || []).length})
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${(m.receipts || []).map(r => `
              <div style="background: #ffffff; border: 1px solid var(--border-medium); border-radius: var(--radius-sm); padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-family: var(--font-mono); font-weight: 700; color: var(--monday-blue); font-size: 13px;">${r.cbrNumber}</div>
                  <div style="font-size: 12px; color: var(--text-primary);">${r.receiptTitle}</div>
                </div>
                <button class="btn-monday btn-monday-secondary" style="font-size: 11px; padding: 4px 8px;" onclick="app.previewReceiptDocument('${m.id}', '${r.id}')">
                  View PDF
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    document.getElementById('matter-drawer-modal').classList.add('open');
  }

  closeMatterDrawer() {
    document.getElementById('matter-drawer-modal').classList.remove('open');
  }

  // --- RECEIPT UPLOAD & DUAL VERIFICATION ---
  openReceiptUploadModal(matterId, deadlineId) {
    const m = this.matters.find(x => x.id === matterId);
    const d = (m?.deadlines || []).find(x => x.id === deadlineId);
    if (!m || !d) return;

    document.getElementById('rcpt-matter-id').value = matterId;
    document.getElementById('rcpt-deadline-id').value = deadlineId;
    document.getElementById('rcpt-matter-label').textContent = `${m.matterNumber} - ${m.title}`;
    document.getElementById('rcpt-deadline-label').textContent = d.title;
    document.getElementById('rcpt-cbr-input').value = `CBR-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    document.getElementById('rcpt-fees-input').value = m.jurisdiction === 'IN' ? '8000' : '1600';

    document.getElementById('receipt-upload-modal').classList.add('open');
  }

  closeReceiptUploadModal() {
    document.getElementById('receipt-upload-modal').classList.remove('open');
  }

  submitReceiptUpload() {
    const matterId = document.getElementById('rcpt-matter-id').value;
    const deadlineId = document.getElementById('rcpt-deadline-id').value;
    const cbrNumber = document.getElementById('rcpt-cbr-input').value;
    const fees = document.getElementById('rcpt-fees-input').value;
    const receiptType = document.getElementById('rcpt-type-select').value;
    const notes = document.getElementById('rcpt-notes-input').value;

    const m = this.matters.find(x => x.id === matterId);
    if (!m) return;

    const result = window.receiptService.uploadFilingReceipt(m, deadlineId, {
      cbrNumber: cbrNumber,
      officialFees: fees,
      receiptType: receiptType,
      notes: notes,
      receiptTitle: document.getElementById('rcpt-type-select').selectedOptions[0].text
    });

    this.saveState();
    this.closeReceiptUploadModal();
    this.showToast(`Official Receipt ${cbrNumber} uploaded! Dual verification required.`, 'warning');

    this.openDualVerificationModal(matterId, deadlineId, result.receipt.id);
  }

  openDualVerificationModal(matterId, deadlineId, receiptId) {
    const m = this.matters.find(x => x.id === matterId);
    const r = (m?.receipts || []).find(x => x.id === receiptId);
    if (!m || !r) return;

    document.getElementById('verify-matter-id').value = matterId;
    document.getElementById('verify-deadline-id').value = deadlineId || r.clearedDeadlineId;
    document.getElementById('verify-receipt-id').value = receiptId;

    const detailsContainer = document.getElementById('verify-receipt-details');
    detailsContainer.innerHTML = window.receiptService.renderOfficialReceiptHtml(r, m);

    document.getElementById('dual-verify-modal').classList.add('open');
  }

  closeDualVerificationModal() {
    document.getElementById('dual-verify-modal').classList.remove('open');
  }

  confirmDualVerification() {
    const matterId = document.getElementById('verify-matter-id').value;
    const deadlineId = document.getElementById('verify-deadline-id').value;
    const receiptId = document.getElementById('verify-receipt-id').value;
    const verifyingAttorneyId = document.getElementById('verify-attorney-select').value;

    const m = this.matters.find(x => x.id === matterId);
    if (!m) return;

    window.receiptService.verifyAndClearDeadline(m, deadlineId, receiptId, verifyingAttorneyId);
    this.saveState();
    this.closeDualVerificationModal();
    this.showToast('✅ DOCKET DEADLINE CLEARED & PROSECUTION STAGE ADVANCED!', 'success');
    this.renderCurrentView();
    this.updateRadarMetrics();

    if (this.selectedMatter && this.selectedMatter.id === matterId) {
      this.openMatterDrawer(matterId);
    }
  }

  previewReceiptDocument(matterId, receiptId) {
    const m = this.matters.find(x => x.id === matterId);
    const r = (m?.receipts || []).find(x => x.id === receiptId);
    if (!m || !r) return;

    const container = document.getElementById('receipt-preview-body');
    container.innerHTML = window.receiptService.renderOfficialReceiptHtml(r, m);
    document.getElementById('receipt-preview-modal').classList.add('open');
  }

  closeReceiptPreviewModal() {
    document.getElementById('receipt-preview-modal').classList.remove('open');
  }

  triggerManualEmergency(matterId, deadlineId) {
    const m = this.matters.find(x => x.id === matterId);
    const d = (m?.deadlines || []).find(x => x.id === deadlineId);
    if (!m || !d) return;

    if (confirm(`Confirm: Dispatch emergency partner alert for matter ${m.matterNumber}?`)) {
      const notif = window.notificationService.triggerEmergencyEscalation(m, d);
      this.saveState();
      this.showToast(`🚨 Emergency Escalation Dispatched to all partners!`, 'danger');
    }
  }

  simulateMorningCronRun() {
    const generated = window.notificationService.evaluateAllMatters(this.matters);
    generated.forEach(g => window.notificationService.notificationLogs.unshift(g));
    this.showToast(`⚡ Daily 08:00 AM Cron Completed: ${generated.length} escalation alerts processed.`, 'success');
    this.renderCurrentView();
    this.updateRadarMetrics();
  }

  exportDocketReport() {
    const allDeadlines = [];
    this.matters.forEach(m => {
      (m.deadlines || []).forEach(d => {
        const days = window.deadlineService.calculateDaysRemaining(d.statutoryDueDate);
        allDeadlines.push([
          m.matterNumber,
          `"${m.title.replace(/"/g, '""')}"`,
          m.jurisdiction,
          `"${m.client.name}"`,
          `"${d.title}"`,
          d.statutoryDueDate,
          days,
          d.isStatutoryBar ? 'YES' : 'NO',
          d.status
        ]);
      });
    });

    let csvContent = "data:text/csv;charset=utf-8,Matter Number,Title,Jurisdiction,Client,Deadline Title,Due Date,Days Left,Statutory Bar,Status\n";
    allDeadlines.forEach(row => {
      csvContent += row.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `LexPatent_monday_Docket_${window.deadlineService.getSimulatedDate()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast("Docket CSV report exported.", "success");
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `monday-toast`;
    toast.innerHTML = `
      <span>${type === 'danger' ? '🚨' : (type === 'success' ? '✅' : '⚡')}</span>
      <span>${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  bindGlobalEvents() {
    const search = document.getElementById('global-search-input');
    if (search) {
      search.addEventListener('input', (e) => {
        this.filters.search = e.target.value;
        this.renderCurrentView();
      });
    }

    const urgSelect = document.getElementById('filter-urgency-select');
    if (urgSelect) {
      urgSelect.addEventListener('change', (e) => {
        this.filters.urgency = e.target.value;
        this.renderCurrentView();
      });
    }

    const jurSelect = document.getElementById('filter-jurisdiction-select');
    if (jurSelect) {
      jurSelect.addEventListener('change', (e) => {
        this.filters.jurisdiction = e.target.value;
        this.renderCurrentView();
      });
    }

    const datePicker = document.getElementById('simulated-date-picker');
    if (datePicker) {
      datePicker.value = window.deadlineService.getSimulatedDate();
      datePicker.addEventListener('change', (e) => {
        window.deadlineService.setSimulatedDate(e.target.value);
        this.showToast(`Simulated date set to ${e.target.value}`, 'info');
        this.renderCurrentView();
        this.updateRadarMetrics();
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new LexPatentApp();
});
