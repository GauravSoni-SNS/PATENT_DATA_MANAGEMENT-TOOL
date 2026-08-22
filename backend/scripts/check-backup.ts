/** Confirms the backup contact is included only when one is set. */
import { evaluateMatterNotifications } from '../src/services/notificationService';
import { setSimulatedDate } from '../src/services/deadlineService';

setSimulatedDate('2026-09-20');

const deadline = {
  id: 'd1',
  title: 'Hearing before the Trade Marks Registry',
  statutoryDueDate: new Date('2026-09-21'),
  status: 'PENDING',
};

const withBackup = evaluateMatterNotifications({
  id: 'm1',
  matterNumber: 'IN-6043666',
  title: 'G POLYPLAST INDUSTRIES hearing',
  createdBy: {
    firstName: 'Gaurav', lastName: 'Soni', email: 'gaurav@firm.test',
    phone: '+919000000101', altPhone: '+919000009999', altEmail: 'backup@firm.test',
  },
  deadlines: [deadline],
});

const withoutBackup = evaluateMatterNotifications({
  id: 'm2',
  matterNumber: 'IN-7000000',
  title: 'No backup set',
  createdBy: { firstName: 'David', lastName: 'Chen', email: 'david@firm.test', phone: '+919000000102' },
  deadlines: [deadline],
});

console.log('with backup   :', withBackup[0]?.recipients.map((r) => `${r.role} <${r.email}> ${r.phone ?? ''}`));
console.log('without backup:', withoutBackup[0]?.recipients.map((r) => `${r.role} <${r.email}> ${r.phone ?? ''}`));
