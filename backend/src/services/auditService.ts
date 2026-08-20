import { prisma } from '../lib/prisma';
import { ProsecutionStage, ReceiptType } from '@prisma/client';
import { generateDeadlinesForStage } from './rulesEngine';
import { getSimulatedDate } from './deadlineService';

const STAGE_ADVANCE_MAP: Record<string, { stage: ProsecutionStage; ruleIds: string[] }> = {
  CONVENTION_12M_BAR: { stage: 'COMPLETE', ruleIds: ['CONVENTION_12M_BAR'] },
  FER_RESPONSE_DUE: { stage: 'HEARING', ruleIds: ['FER_RESPONSE_DUE'] },
  HEARING_WRITTEN_SUBMISSION: { stage: 'ALLOWANCE_GRANT', ruleIds: ['HEARING_WRITTEN_SUBMISSION'] },
  GRANT_ISSUE_FEE: { stage: 'ANNUITY_MAINTENANCE', ruleIds: ['GRANT_ISSUE_FEE'] },
};

export async function advanceStageAfterClearance(matterId: string, ruleId: string) {
  const advance = STAGE_ADVANCE_MAP[ruleId];
  if (!advance) return null;

  const matter = await prisma.matter.findUnique({ where: { id: matterId } });
  if (!matter) return null;

  const triggerDate = getSimulatedDate();
  const filingDate = matter.filingDate?.toISOString().split('T')[0] || triggerDate;
  const priorityDate = matter.priorityDate?.toISOString().split('T')[0] || filingDate;

  await prisma.matter.update({
    where: { id: matterId },
    data: { currentStage: advance.stage },
  });

  const newDeadlines = generateDeadlinesForStage(
    advance.stage,
    triggerDate,
    priorityDate,
    matter.jurisdiction as 'IN' | 'US' | 'EP' | 'WO'
  );

  if (newDeadlines.length > 0) {
    await prisma.deadline.createMany({
      data: newDeadlines.map((d) => ({
        matterId,
        ruleId: d.ruleId,
        title: d.title,
        description: d.description,
        statutoryDueDate: new Date(d.statutoryDueDate),
        extendedDueDate: d.extendedDueDate ? new Date(d.extendedDueDate) : null,
        isStatutoryBar: d.isStatutoryBar,
        isExtendable: d.isExtendable,
        maxExtensionMonths: d.maxExtensionMonths,
        extensionProcedure: d.extensionProcedure,
        statutorySection: d.statutorySection,
        requiredReceiptType: d.requiredReceiptType as ReceiptType | undefined,
      })),
    });
  }

  return advance.stage;
}

export async function createAuditLog(params: {
  firmId: string;
  userId?: string;
  entityType: string;
  entityId: string;
  action: string;
  beforeState?: unknown;
  afterState?: unknown;
}) {
  return prisma.auditLog.create({
    data: {
      firmId: params.firmId,
      userId: params.userId,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      beforeState: params.beforeState as object | undefined,
      afterState: params.afterState as object | undefined,
    },
  });
}
