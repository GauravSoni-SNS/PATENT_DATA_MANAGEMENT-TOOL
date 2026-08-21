import { PrismaClient, UserRole, ProsecutionStage, JurisdictionCode, DeadlineStatus, ReceiptType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding LexPatent database...');

  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.deadline.deleteMany();
  await prisma.matter.deleteMany();
  await prisma.client.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.firm.deleteMany();

  const firm = await prisma.firm.create({
    data: {
      name: 'LexPatent IP LLP',
      slug: 'lexpatent-ip',
      timezone: 'Asia/Kolkata',
    },
  });

  const passwordHash = await bcrypt.hash('password123', 12);

  const users = await Promise.all([
    prisma.user.create({
      data: {
        firmId: firm.id,
        email: 's.jenkins@lexpatent-ip.com',
        passwordHash,
        phone: '+919000000101',
        firstName: 'Sarah',
        lastName: 'Jenkins',
        role: UserRole.ATTORNEY,
        specialization: 'AI, Cryptography & Computer Systems',
        avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      },
    }),
    prisma.user.create({
      data: {
        firmId: firm.id,
        email: 'd.chen@lexpatent-ip.com',
        passwordHash,
        phone: '+919000000102',
        firstName: 'David',
        lastName: 'Chen',
        role: UserRole.ATTORNEY,
        specialization: 'Materials Science & Batteries',
        avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150',
      },
    }),
    prisma.user.create({
      data: {
        firmId: firm.id,
        email: 'p.nair@lexpatent-ip.com',
        passwordHash,
        phone: '+919000000103',
        firstName: 'Priya',
        lastName: 'Nair',
        role: UserRole.PARALEGAL,
        specialization: 'Aerospace, Robotics & Autonomous Systems',
        avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
      },
    }),
    prisma.user.create({
      data: {
        firmId: firm.id,
        email: 'm.vance@lexpatent-ip.com',
        passwordHash,
        phone: '+919000000104',
        firstName: 'Marcus',
        lastName: 'Vance',
        role: UserRole.PARTNER,
        specialization: 'IP Litigation, Global Portfolio Prosecution',
        avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
      },
    }),
    prisma.user.create({
      data: {
        firmId: firm.id,
        email: 'admin@lexpatent-ip.com',
        passwordHash,
        phone: '+919000000105',
        firstName: 'System',
        lastName: 'Admin',
        role: UserRole.ADMIN,
      },
    }),
  ]);

  const [sarah, david, priya, marcus] = users;

  const clients = await Promise.all([
    prisma.client.create({
      data: { firmId: firm.id, name: 'Synapse Quantum Labs Inc.', code: 'SYN-Q', contactEmail: 'ip-legal@synapsequantum.io', contactPerson: 'Dr. Elena Rostova', contactPhone: '+919000000201' },
    }),
    prisma.client.create({
      data: { firmId: firm.id, name: 'Aurelia Energy Technologies', code: 'AUR-EN', contactEmail: 'patents@aureliaenergy.com', contactPerson: 'Vikram Malhotra', contactPhone: '+919000000202' },
    }),
    prisma.client.create({
      data: { firmId: firm.id, name: 'SkyVector Aerospace AG', code: 'SKY-VEC', contactEmail: 'legal-docket@skyvector.aero', contactPerson: 'Dr. Johannes Weiss', contactPhone: '+919000000203' },
    }),
    prisma.client.create({
      data: { firmId: firm.id, name: 'GeneVanguard Therapeutics LLC', code: 'GENE-V', contactEmail: 'ip@genevanguard.com', contactPerson: 'Dr. Arthur Campbell', contactPhone: '+919000000204' },
    }),
    prisma.client.create({
      data: { firmId: firm.id, name: 'BioNova Diagnostic Systems', code: 'BIONOVA', contactEmail: 'legal@bionovadiag.in', contactPerson: 'Sunita Deshmukh', contactPhone: '+919000000205' },
    }),
    prisma.client.create({
      data: { firmId: firm.id, name: 'OptiCore Photonics Corp.', code: 'OPTICORE', contactEmail: 'legal@opticore.com', contactPerson: 'Dr. Arvind Rao', contactPhone: '+919000000206' },
    }),
  ]);

  const mattersData = [
    {
      matterNumber: 'IN-2025-PAT-00941',
      title: 'Quantum-Resistant Lattice Cryptography for Decentralized Blockchains',
      jurisdiction: 'IN' as JurisdictionCode,
      clientId: clients[0].id,
      leadAttorneyId: sarah.id,
      supervisingPartnerId: marcus.id,
      currentStage: 'PROVISIONAL' as ProsecutionStage,
      priorityDate: '2025-09-02',
      filingDate: '2025-09-02',
      officialAppNumber: '202511048291',
      abstract: 'A high-performance post-quantum cryptographic accelerator implementing Module-LWE lattice key exchange.',
      deadlines: [{ ruleId: 'CONVENTION_12M_BAR', title: '12-Month Priority Bar (Complete / PCT Filing)', statutoryDueDate: '2026-09-02', isStatutoryBar: true, urgencyTier: 'T_15_URGENT' as const, daysRemaining: 15 }],
    },
    {
      matterNumber: 'IN-2024-PAT-00412',
      title: 'Solid-State Lithium-Sulfur Battery with Polymer Nanocomposite Electrolyte',
      jurisdiction: 'IN' as JurisdictionCode,
      clientId: clients[1].id,
      leadAttorneyId: david.id,
      supervisingPartnerId: marcus.id,
      currentStage: 'EXAMINATION_FER' as ProsecutionStage,
      priorityDate: '2024-02-23',
      filingDate: '2024-02-23',
      officialAppNumber: '202411032194',
      abstract: 'Solid-state electrolyte formulation comprising cross-linked polyethylene oxide matrix.',
      deadlines: [{ ruleId: 'FER_RESPONSE_DUE', title: 'First Examination Report (FER) Written Response', statutoryDueDate: '2026-08-23', isStatutoryBar: true, isExtendable: true, urgencyTier: 'T_5_CRITICAL' as const, daysRemaining: 5 }],
    },
    {
      matterNumber: 'EP-2319082.4',
      title: 'Autonomous Multi-Spectral Collision Avoidance for Urban eVTOL Aircraft',
      jurisdiction: 'EP' as JurisdictionCode,
      clientId: clients[2].id,
      leadAttorneyId: priya.id,
      supervisingPartnerId: marcus.id,
      currentStage: 'PROVISIONAL' as ProsecutionStage,
      priorityDate: '2025-08-20',
      filingDate: '2025-08-20',
      officialAppNumber: 'EP25701892.1',
      abstract: 'Computer vision and LiDAR sensor fusion pipeline for eVTOL craft.',
      deadlines: [{ ruleId: 'CONVENTION_12M_BAR', title: '12-Month Priority Bar (EPO Complete / PCT Filing)', statutoryDueDate: '2026-08-20', isStatutoryBar: true, urgencyTier: 'DAILY_CRITICAL' as const, daysRemaining: 2 }],
    },
    {
      matterNumber: 'US-18/902,414',
      title: 'Targeted Lipid Nanoparticle Delivery for mRNA Cancer Therapeutics',
      jurisdiction: 'US' as JurisdictionCode,
      clientId: clients[3].id,
      leadAttorneyId: sarah.id,
      supervisingPartnerId: marcus.id,
      currentStage: 'HEARING' as ProsecutionStage,
      priorityDate: '2024-03-10',
      filingDate: '2024-03-10',
      officialAppNumber: '18/902,414',
      abstract: 'Ionizable cationic lipids for selective mRNA delivery into tumor-infiltrating lymphocytes.',
      deadlines: [{ ruleId: 'HEARING_WRITTEN_SUBMISSION', title: 'Post-Examiner Interview Written Summary & 1.111 Response', statutoryDueDate: '2026-08-31', isStatutoryBar: true, urgencyTier: 'T_15_URGENT' as const, daysRemaining: 13 }],
    },
    {
      matterNumber: 'IN-2023-PAT-00108',
      title: 'AI-Assisted Microfluidic Diagnostics for Rapid Pathogen Sequencing',
      jurisdiction: 'IN' as JurisdictionCode,
      clientId: clients[4].id,
      leadAttorneyId: david.id,
      supervisingPartnerId: marcus.id,
      currentStage: 'ALLOWANCE_GRANT' as ProsecutionStage,
      priorityDate: '2022-04-14',
      filingDate: '2023-10-14',
      officialAppNumber: '202317029811',
      abstract: 'Micro-channel droplet generator with real-time deep learning optical sensor.',
      deadlines: [{ ruleId: 'GRANT_ISSUE_FEE', title: 'Intention to Grant / Final Sealing Fee Payment', statutoryDueDate: '2026-09-15', isStatutoryBar: true, urgencyTier: 'T_30_ADVISORY' as const, daysRemaining: 28 }],
    },
    {
      matterNumber: 'IN-2022-PAT-00087',
      title: 'High-Throughput Photonic Interconnects for Neural Accelerators',
      jurisdiction: 'IN' as JurisdictionCode,
      clientId: clients[5].id,
      leadAttorneyId: sarah.id,
      supervisingPartnerId: marcus.id,
      currentStage: 'ANNUITY_MAINTENANCE' as ProsecutionStage,
      priorityDate: '2022-01-15',
      filingDate: '2022-01-15',
      officialAppNumber: '202211019842',
      abstract: 'Silicon photonic interconnect network with integrated ring resonator modulators.',
      deadlines: [{ ruleId: 'ANNUITY_YEAR_5', title: 'Year 5 Patent Renewal Annuity Fee', statutoryDueDate: '2027-01-15', isStatutoryBar: true, isExtendable: true, urgencyTier: 'SAFE_UPCOMING' as const, daysRemaining: 150 }],
    },
  ];

  for (const m of mattersData) {
    const { deadlines, priorityDate, filingDate, ...matterFields } = m;
    await prisma.matter.create({
      data: {
        ...matterFields,
        firmId: firm.id,
        priorityDate: new Date(priorityDate),
        filingDate: new Date(filingDate),
        deadlines: {
          create: deadlines.map((d) => ({
            ruleId: d.ruleId,
            title: d.title,
            statutoryDueDate: new Date(d.statutoryDueDate),
            isStatutoryBar: d.isStatutoryBar,
            isExtendable: d.isExtendable || false,
            urgencyTier: d.urgencyTier,
            daysRemaining: d.daysRemaining,
            status: DeadlineStatus.PENDING,
            requiredReceiptType: d.ruleId.includes('FER') ? ReceiptType.FER_RESPONSE_CBR : ReceiptType.COMPLETE_FILING_CBR,
          })),
        },
      },
    });
  }

  // Seed sample notifications
  await prisma.notification.createMany({
    data: [
      {
        firmId: firm.id,
        tier: 'DAILY_COUNTDOWN',
        tierLabel: 'T-2 DAILY COUNTDOWN (CRITICAL BLITZ)',
        subject: '[T-2 DAYS REMAINING] EMERGENCY DOCKET ALERT: EP-2319082.4',
        bodyHtml: '<p>Critical deadline approaching</p>',
        recipients: [{ name: 'Priya Nair', email: 'p.nair@lexpatent-ip.com', role: 'Assigned Attorney' }],
        daysRemaining: 2,
        status: 'SENT',
        sentAt: new Date(),
        isEmergency: true,
      },
      {
        firmId: firm.id,
        tier: 'T_5_CRITICAL',
        tierLabel: '5-DAY RED CRITICAL ALERT',
        subject: '[5-DAY CRITICAL ALERT] IN-2024-PAT-00412',
        bodyHtml: '<p>5-day critical alert</p>',
        recipients: [{ name: 'David Chen', email: 'd.chen@lexpatent-ip.com', role: 'Lead Patent Agent' }],
        daysRemaining: 5,
        status: 'SENT',
        sentAt: new Date(),
        isEmergency: true,
      },
    ],
  });

  console.log('Seed complete!');
  console.log('Login: s.jenkins@lexpatent-ip.com / password123');
  console.log('Partner: m.vance@lexpatent-ip.com / password123');
  console.log('Admin: admin@lexpatent-ip.com / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
