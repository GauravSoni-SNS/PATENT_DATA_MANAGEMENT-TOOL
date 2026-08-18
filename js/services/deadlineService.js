/**
 * LexPatent Deadline Service
 * Manages deadline computations, urgency tiers, extension calculation, and safety status.
 */

class DeadlineService {
  constructor() {
    this.simulatedDate = window.CURRENT_SIMULATED_DATE || "2026-08-18";
  }

  setSimulatedDate(newDate) {
    this.simulatedDate = newDate;
  }

  getSimulatedDate() {
    return this.simulatedDate;
  }

  /**
   * Calculates days remaining between simulated current date and target date
   */
  calculateDaysRemaining(targetDateStr) {
    const current = new Date(this.simulatedDate);
    const target = new Date(targetDateStr);
    const diffTime = target.getTime() - current.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Determines urgency classification based on days remaining:
   * - OVERDUE: < 0 days (Catastrophic)
   * - DAILY_CRITICAL: 0 to 4 days (Daily Countdown)
   * - T_5_CRITICAL: 5 days (Red Alert)
   * - T_15_URGENT: 6 to 15 days (Orange Warning)
   * - T_30_ADVISORY: 16 to 30 days (Amber Advisory)
   * - SAFE_UPCOMING: > 30 days (Normal)
   */
  getUrgencyTier(daysRemaining) {
    if (daysRemaining < 0) {
      return {
        key: "OVERDUE",
        label: "DEADLINE LAPSED / OVERDUE",
        badgeClass: "badge-overdue",
        color: "#ef4444",
        icon: "alert-octagon",
        priority: 1
      };
    }
    if (daysRemaining <= 4) {
      return {
        key: "DAILY_CRITICAL",
        label: `T-${daysRemaining}d DAILY COUNTDOWN`,
        badgeClass: "badge-daily-critical",
        color: "#dc2626",
        icon: "flame",
        priority: 2
      };
    }
    if (daysRemaining <= 5) {
      return {
        key: "T_5_CRITICAL",
        label: "5-DAY RED CRITICAL ALERT",
        badgeClass: "badge-critical-5d",
        color: "#f87171",
        icon: "alert-triangle",
        priority: 3
      };
    }
    if (daysRemaining <= 15) {
      return {
        key: "T_15_URGENT",
        label: `${daysRemaining}d URGENT WARNING`,
        badgeClass: "badge-urgent-15d",
        color: "#f97316",
        icon: "clock",
        priority: 4
      };
    }
    if (daysRemaining <= 30) {
      return {
        key: "T_30_ADVISORY",
        label: `${daysRemaining}d 30-Day Advisory`,
        badgeClass: "badge-advisory-30d",
        color: "#eab308",
        icon: "info",
        priority: 5
      };
    }
    return {
      key: "SAFE_UPCOMING",
      label: `${daysRemaining}d (Safe)`,
      badgeClass: "badge-safe",
      color: "#10b981",
      icon: "check-circle",
      priority: 6
    };
  }

  /**
   * Enriches a matter with computed urgency metrics and nearest deadline info
   */
  enrichMatter(matter) {
    const activeDeadlines = (matter.deadlines || []).filter(d => d.status === "PENDING");
    
    if (activeDeadlines.length === 0) {
      return {
        ...matter,
        nearestDeadline: null,
        daysRemaining: null,
        urgency: {
          key: "COMPLETED",
          label: "All Deadlines Cleared",
          badgeClass: "badge-completed",
          color: "#06b6d4",
          priority: 7
        }
      };
    }

    // Sort by statutory due date ascending
    const sorted = [...activeDeadlines].sort((a, b) => 
      new Date(a.statutoryDueDate).getTime() - new Date(b.statutoryDueDate).getTime()
    );

    const nearest = sorted[0];
    const days = this.calculateDaysRemaining(nearest.statutoryDueDate);
    const urgency = this.getUrgencyTier(days);

    return {
      ...matter,
      nearestDeadline: nearest,
      daysRemaining: days,
      urgency: urgency
    };
  }

  /**
   * Generates statutory deadlines for a new matter based on its stage and trigger date
   */
  generateDeadlinesForStage(stageId, triggerDate, priorityDate = null, jurisdiction = "IN") {
    switch (stageId) {
      case "PROVISIONAL":
        return window.STATUTORY_RULES.PROVISIONAL_FILED.generateDeadlines(triggerDate, jurisdiction);
      case "COMPLETE":
        return window.STATUTORY_RULES.COMPLETE_FILED.generateDeadlines(triggerDate, priorityDate, jurisdiction);
      case "EXAMINATION_FER":
        return window.STATUTORY_RULES.FER_OA_ISSUED.generateDeadlines(triggerDate, jurisdiction);
      case "HEARING":
        return window.STATUTORY_RULES.HEARING_SCHEDULED.generateDeadlines(triggerDate, jurisdiction);
      case "ALLOWANCE_GRANT":
        return window.STATUTORY_RULES.NOTICE_OF_ALLOWANCE.generateDeadlines(triggerDate, jurisdiction);
      case "ANNUITY_MAINTENANCE":
        return window.STATUTORY_RULES.PATENT_GRANTED.generateDeadlines(triggerDate, priorityDate || triggerDate, jurisdiction);
      default:
        return [];
    }
  }

  /**
   * Handles Form 4 extension (e.g. India +3 months) or US 37 CFR 1.136(a)
   */
  applyExtension(matter, deadlineId, extensionMonths = 3, officialReceiptNumber = "") {
    const deadline = matter.deadlines.find(d => d.id === deadlineId);
    if (!deadline || !deadline.isExtendable) {
      throw new Error("This deadline is a strict statutory bar and cannot be extended.");
    }

    const currentDue = deadline.statutoryDueDate;
    const newDue = window.DateHelpers.addMonths(currentDue, extensionMonths);

    deadline.extendedDueDate = newDue;
    deadline.statutoryDueDate = newDue;
    deadline.extensionApplied = {
      appliedDate: this.simulatedDate,
      monthsAdded: extensionMonths,
      officialReceipt: officialReceiptNumber,
      previousDueDate: currentDue
    };
    deadline.notes = (deadline.notes || "") + `\n[Extension Applied on ${this.simulatedDate}]: Extended by ${extensionMonths} months.`;

    matter.history.push({
      date: this.simulatedDate,
      event: `Statutory Extension filed: ${deadline.title} extended to ${newDue} (${officialReceiptNumber})`,
      user: "Authorized Attorney"
    });

    return matter;
  }
}

window.deadlineService = new DeadlineService();
