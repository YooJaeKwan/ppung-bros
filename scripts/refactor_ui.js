const fs = require('fs');
const path = require('path');

const cardPath = path.join(__dirname, '../app/components/schedule-card.tsx');
const mgmtPath = path.join(__dirname, '../app/components/schedule-management.tsx');

let cardCode = fs.readFileSync(cardPath, 'utf8');
let mgmtCode = fs.readFileSync(mgmtPath, 'utf8');

// 1. In schedule-management.tsx, remove the filtering of nextUpcomingSchedule
mgmtCode = mgmtCode.replace(
  /if \(nextUpcomingSchedule && schedule\.id === nextUpcomingSchedule\.id\) \{\s*return false\s*\}/,
  '// if (nextUpcomingSchedule && schedule.id === nextUpcomingSchedule.id) { return false }'
);

// 2. In schedule-management.tsx, remove the huge nextUpcomingSchedule block
const hugeBlockRegex = /\{\s*\/\* 다음 일정 \(경기예정 모드에서만 표시\) \*\/\s*\}[\s\S]*?(?=\{\s*\/\* 일정 목록 - viewMode에 따라 표시 \*\/\s*\})/g;
mgmtCode = mgmtCode.replace(hugeBlockRegex, '');

// 3. We also need to add highlight flag to the mapping
mgmtCode = mgmtCode.replace(
  /<ScheduleCard\s*key=\{schedule\.id\}/g,
  <ScheduleCard\n                  key={schedule.id}\n                  highlight={schedule.date === nextUpcomingSchedule?.date}
);

fs.writeFileSync(mgmtPath, mgmtCode);

