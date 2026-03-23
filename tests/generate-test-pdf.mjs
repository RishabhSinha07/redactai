import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { writeFileSync } from 'fs';

const pdf = await PDFDocument.create();
const regular = await pdf.embedFont(StandardFonts.Helvetica);
const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

function addPage(pdf, title, sections) {
  const page = pdf.addPage([612, 792]);
  let y = 740;

  // Title
  page.drawText(title, { x: 50, y, size: 18, font: bold, color: rgb(0.1, 0.1, 0.1) });
  y -= 10;
  page.drawLine({ start: { x: 50, y }, end: { x: 562, y }, thickness: 1, color: rgb(0.7, 0.7, 0.7) });
  y -= 28;

  for (const section of sections) {
    if (section.heading) {
      page.drawText(section.heading, { x: 50, y, size: 13, font: bold, color: rgb(0.2, 0.2, 0.4) });
      y -= 22;
    }
    for (const line of section.lines) {
      if (y < 50) break;
      page.drawText(line, { x: 65, y, size: 11, font: regular, color: rgb(0.15, 0.15, 0.15) });
      y -= 18;
    }
    y -= 10;
  }
  return page;
}

// ── Page 1: Employee Records ──
addPage(pdf, 'CONFIDENTIAL — Employee Database Export', [
  {
    heading: 'Employee #1 — Engineering',
    lines: [
      'Full Name: Jonathan Michael Richardson',
      'Email: jonathan.richardson@techcorp.io',
      'Personal Email: jrichardson1985@gmail.com',
      'Phone (Work): +1 (415) 555-0142',
      'Phone (Cell): 650-867-5309',
      'SSN: 482-37-9156',
      'Date of Birth: 07/23/1985',
      'Date Hired: 01/15/2019',
      'Home Address: 1428 Elm Street, San Francisco, CA 94107',
      'Workstation IP: 10.0.45.102',
      'VPN IP: 192.168.1.47',
    ],
  },
  {
    heading: 'Employee #2 — Marketing',
    lines: [
      'Full Name: Sarah Elizabeth Nakamura',
      'Email: sarah.nakamura@techcorp.io',
      'Personal Email: s.nakamura.nyc@yahoo.com',
      'Phone (Work): +1 (212) 555-0198',
      'Phone (Cell): 917-432-8801',
      'SSN: 219-64-8832',
      'Date of Birth: 11/02/1990',
      'Date Hired: 06/20/2021',
      'Home Address: 742 Evergreen Terrace, Brooklyn, NY 11201',
      'Workstation IP: 10.0.45.210',
    ],
  },
  {
    heading: 'Employee #3 — Finance',
    lines: [
      'Full Name: Marcus Antonio Delgado-Rivera',
      'Email: marcus.delgado@techcorp.io',
      'Personal Email: marcusd_rivera@hotmail.com',
      'Phone: (305) 555-0177',
      'SSN: 591-02-4478',
      'Date of Birth: 03/30/1978',
      'Home Address: 221B Baker Street, Miami, FL 33101',
      'Workstation IP: 10.0.45.88',
    ],
  },
]);

// ── Page 2: Customer Records + Credit Cards ──
addPage(pdf, 'RESTRICTED — Customer Payment Records', [
  {
    heading: 'Customer: Amelia Chen',
    lines: [
      'Email: amelia.chen@outlook.com',
      'Phone: +1 (503) 555-0234',
      'Billing Address: 350 Fifth Avenue, Portland, OR 97201',
      'Credit Card: 4532-0151-2398-7621 (Visa)',
      'Expiry: 09/27',
      'Last Transaction: 12/18/2025',
      'Customer IP: 73.158.42.201',
    ],
  },
  {
    heading: 'Customer: Rajesh Krishnamurthy',
    lines: [
      'Email: r.krishnamurthy@protonmail.com',
      'Phone: (206) 555-0189',
      'Billing Address: 1600 Pennsylvania Avenue, Seattle, WA 98101',
      'Credit Card: 5425 2334 1098 7654 (Mastercard)',
      'Expiry: 03/26',
      'Last Transaction: 01/05/2026',
      'Customer IP: 204.15.33.178',
    ],
  },
  {
    heading: 'Customer: Olivia Johansson-Williams',
    lines: [
      'Email: olivia.jw@icloud.com',
      'Phone: 312-555-0145',
      'Credit Card: 3782 822463 10005 (Amex)',
      'Customer IP: 98.207.44.12',
    ],
  },
  {
    heading: 'Customer: David Okafor',
    lines: [
      'Email: david.okafor@gmail.com',
      'Phone: (713) 555-0166',
      'SSN (on file for verification): 334-22-8891',
      'Credit Card: 6011-4567-8901-2345 (Discover)',
      'Customer IP: 172.16.0.55',
    ],
  },
]);

// ── Page 3: Incident Report (narrative text with inline PII) ──
addPage(pdf, 'INTERNAL — Security Incident Report #2026-0042', [
  {
    heading: 'Summary',
    lines: [
      'On 03/12/2026, Security Analyst Emily Thornton (emily.thornton@techcorp.io)',
      'discovered unauthorized access from IP address 185.220.101.42 targeting the',
      'internal HR portal. The attacker gained access using credentials belonging to',
      'Michael Zhang (michael.zhang@techcorp.io, SSN: 441-55-6723).',
    ],
  },
  {
    heading: 'Timeline',
    lines: [
      '02:14 AM — Login from 185.220.101.42 using michael.zhang@techcorp.io',
      '02:17 AM — Bulk export of employee records initiated',
      '02:19 AM — Downloaded records of Patricia Hernandez (SSN: 287-14-9903),',
      '           Robert Kim (SSN: 553-68-1247), and Angela Morrison (SSN: 612-90-3384)',
      '02:22 AM — Alert triggered. SOC contacted Emily Thornton at (415) 555-0342',
      '02:25 AM — Account locked. VPN tunnel from 185.220.101.42 terminated',
    ],
  },
  {
    heading: 'Affected Individuals',
    lines: [
      '1. Michael Zhang — michael.zhang@techcorp.io — credentials compromised',
      '2. Patricia Hernandez — p.hernandez@techcorp.io — SSN: 287-14-9903',
      '3. Robert Kim — robert.kim@techcorp.io — SSN: 553-68-1247',
      '4. Angela Morrison — a.morrison@techcorp.io — SSN: 612-90-3384',
      '5. Emily Thornton — emily.thornton@techcorp.io — investigator',
    ],
  },
  {
    heading: 'Recommended Actions',
    lines: [
      'Notify all affected employees. Contact legal (legal-team@techcorp.io).',
      'File report with FBI Cyber Division, reference case IC3-2026-88421.',
      'Reset all credentials. Enable MFA for VPN access from 10.0.0.0/8 range.',
      'Schedule review with CISO James Whitfield (james.whitfield@techcorp.io,',
      'phone: +1 (415) 555-0401) by 03/19/2026.',
    ],
  },
]);

// ── Page 4: Pure prose — only NER can detect these (no regex patterns) ──
addPage(pdf, 'DRAFT — Board Meeting Minutes (NER-only test)', [
  {
    heading: 'Opening Remarks',
    lines: [
      'The quarterly board meeting was called to order by Chairman William',
      'Hargrove at the Ritz-Carlton in downtown Chicago. Board members',
      'Catherine Blackwell, Dmitri Volkov, and Priya Ramanathan were present.',
      'General counsel Sophia Laurent joined via videoconference from Geneva.',
    ],
  },
  {
    heading: 'Strategic Update',
    lines: [
      'CEO Alexandra Petrov presented the expansion roadmap. She confirmed',
      'that Nakamura Industries had signed the joint venture agreement in',
      'Tokyo last Tuesday. Chief Revenue Officer Benjamin Hartley reported',
      'that the London and Singapore offices exceeded targets by twelve',
      'percent. He credited regional leads Fatima Al-Rashid and Jun Tanaka',
      'for driving growth in the Middle East and Asia Pacific markets.',
    ],
  },
  {
    heading: 'Acquisition Discussion',
    lines: [
      'Director Thomas Eriksson raised the proposed acquisition of Meridian',
      'Analytics, a data firm based in Berlin founded by Klaus Richter.',
      'CFO Isabella Moretti noted that Goldman Sachs had completed the',
      'preliminary valuation. She recommended engaging Deloitte for the',
      'due diligence phase. The board voted to authorize negotiations,',
      'with Hargrove and Moretti leading discussions with Richter in Munich.',
    ],
  },
  {
    heading: 'Personnel Matters',
    lines: [
      'The board approved the appointment of Dr. Yusuf Okonkwo as Chief',
      'Science Officer, effective immediately. Okonkwo previously held',
      'senior roles at Massachusetts Institute of Technology and the',
      'European Space Agency. VP of Human Resources Hannah Lindqvist will',
      'coordinate the onboarding. The board also thanked departing member',
      'George Papadopoulos for his eight years of distinguished service.',
    ],
  },
  {
    heading: 'Closing',
    lines: [
      'The next meeting will be held in New York. Secretary Rachel Nguyen',
      'will circulate the draft minutes to all attendees. Hargrove thanked',
      'the board and adjourned the session.',
    ],
  },
]);

const bytes = await pdf.save();
writeFileSync(new URL('./test-pii.pdf', import.meta.url), bytes);
console.log('Created tests/test-pii.pdf — 4 pages with dense PII');
