const fs = require('fs');
const path = require('path');

const root = process.cwd();
const supabaseDir = path.join(root, 'supabase');
const parts = [
  '000_reset_workspace.sql',
  '002_workspace_production.sql',
  '003_archiving_permissions.sql',
  '004_invitation_labels.sql',
  '005_direct_conversation_rls_fix.sql',
];

const output = parts
  .map((file) => {
    const absolutePath = path.join(supabaseDir, file);
    const content = fs.readFileSync(absolutePath, 'utf8').trim();
    return `-- >>> ${file}\n${content}\n`;
  })
  .join('\n');

const outputPath = path.join(supabaseDir, '999_fresh_setup.sql');
fs.writeFileSync(outputPath, `${output}\n`, 'utf8');

console.log(`Fresh setup SQL generated: ${outputPath}`);
