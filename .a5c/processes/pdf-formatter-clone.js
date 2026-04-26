/**
 * @process pdf-formatter-clone
 * @description 1-to-1 clone of pdf-formatter.lovable.app — Hebrew Word-to-PDF formatter
 * @inputs { planPath: string, projectDir: string }
 * @outputs { success: boolean, buildPassed: boolean, tsPassed: boolean }
 */

import { defineTask } from '@a5c-ai/babysitter-sdk';

// ─── Task definitions ────────────────────────────────────────────────────────

const scaffoldTask = defineTask('scaffold', (args) => ({
  kind: 'agent',
  title: 'Task 1: Project Scaffold',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior React/TypeScript engineer',
      task: 'Execute Task 1 from the implementation plan: Project Scaffold',
      context: {
        planPath: args.planPath,
        projectDir: args.projectDir,
        task: 'scaffold',
      },
      instructions: [
        `Read the plan at ${args.planPath}`,
        'Execute ONLY Task 1 (Project Scaffold) step by step',
        'Run: cd ' + args.projectDir + ' && npm create vite@latest . -- --template react-ts --force',
        'Run: npm install react-router-dom @supabase/supabase-js mammoth jspdf html2canvas jszip pdfjs-dist',
        'Run: npm install class-variance-authority clsx tailwind-merge lucide-react sonner',
        'Run: npm install -D tailwindcss postcss autoprefixer @types/node @radix-ui/react-tooltip',
        'Run: npx tailwindcss init -p',
        'Write vite.config.ts exactly as shown in the plan',
        'Write tailwind.config.ts exactly as shown in the plan',
        'Write src/index.css exactly as shown in the plan',
        'Write index.html exactly as shown in the plan',
        'Write src/main.tsx exactly as shown in the plan',
        'Run: npm run build and verify it succeeds',
        'Git init and commit',
        'Return summary of what was created and whether build passed',
      ],
      outputFormat: 'JSON with fields: filesCreated (array), buildPassed (boolean), errors (array)',
    },
    outputSchema: {
      type: 'object',
      required: ['filesCreated', 'buildPassed'],
      properties: {
        filesCreated: { type: 'array', items: { type: 'string' } },
        buildPassed: { type: 'boolean' },
        errors: { type: 'array', items: { type: 'string' } },
      },
    },
  },
}));

const typesAndSupabaseTask = defineTask('types-and-supabase', (args) => ({
  kind: 'agent',
  title: 'Task 2: Types + Supabase Client',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior TypeScript engineer',
      task: 'Execute Task 2 from the implementation plan: Types + Supabase Client',
      context: { planPath: args.planPath, projectDir: args.projectDir },
      instructions: [
        `Read the plan at ${args.planPath}`,
        'Execute ONLY Task 2 step by step',
        'Create src/types/document.ts with all types shown in the plan',
        'Create src/lib/supabase.ts with the Supabase client exactly as shown',
        'Commit with message: feat: add types and supabase client',
        'Return summary of files created',
      ],
      outputFormat: 'JSON with fields: filesCreated (array), errors (array)',
    },
    outputSchema: {
      type: 'object',
      required: ['filesCreated'],
      properties: {
        filesCreated: { type: 'array', items: { type: 'string' } },
        errors: { type: 'array', items: { type: 'string' } },
      },
    },
  },
}));

const shadcnTask = defineTask('shadcn-components', (args) => ({
  kind: 'agent',
  title: 'Task 3: shadcn UI Components',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior React/TypeScript engineer',
      task: 'Execute Task 3 from the implementation plan: shadcn UI Components',
      context: { planPath: args.planPath, projectDir: args.projectDir },
      instructions: [
        `Read the plan at ${args.planPath}`,
        'Execute ONLY Task 3 step by step',
        'Create src/lib/utils.ts',
        'Create src/components/ui/button.tsx',
        'Create src/components/ui/progress.tsx',
        'Create src/components/ui/tooltip.tsx — also run: npm install @radix-ui/react-tooltip',
        'Create src/components/ui/use-toast.ts',
        'Create src/components/ui/toaster.tsx',
        'Run: npm run build and verify no errors',
        'Commit with message: feat: add shadcn ui components',
        'Return summary of files created and build status',
      ],
      outputFormat: 'JSON with fields: filesCreated (array), buildPassed (boolean), errors (array)',
    },
    outputSchema: {
      type: 'object',
      required: ['filesCreated', 'buildPassed'],
      properties: {
        filesCreated: { type: 'array', items: { type: 'string' } },
        buildPassed: { type: 'boolean' },
        errors: { type: 'array', items: { type: 'string' } },
      },
    },
  },
}));

const mammothParserTask = defineTask('mammoth-parser', (args) => ({
  kind: 'agent',
  title: 'Task 4: Mammoth Parser',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior TypeScript engineer',
      task: 'Execute Task 4 from the implementation plan: Mammoth Word Parser',
      context: { planPath: args.planPath, projectDir: args.projectDir },
      instructions: [
        `Read the plan at ${args.planPath}`,
        'Execute ONLY Task 4 step by step',
        'Create src/lib/mammoth-parser.ts exactly as shown in the plan',
        'Run: npm run build and check for TypeScript errors related to this file',
        'Fix any TS errors in mammoth-parser.ts (mammoth types may need @ts-ignore for default import)',
        'Commit with message: feat: mammoth Word parser',
        'Return summary of files created',
      ],
      outputFormat: 'JSON with fields: filesCreated (array), buildPassed (boolean), errors (array)',
    },
    outputSchema: {
      type: 'object',
      required: ['filesCreated', 'buildPassed'],
      properties: {
        filesCreated: { type: 'array', items: { type: 'string' } },
        buildPassed: { type: 'boolean' },
        errors: { type: 'array', items: { type: 'string' } },
      },
    },
  },
}));

const layoutEngineTask = defineTask('layout-engine', (args) => ({
  kind: 'agent',
  title: 'Task 5: Document Layout Engine',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior TypeScript engineer',
      task: 'Execute Task 5 from the implementation plan: Document Layout Engine',
      context: { planPath: args.planPath, projectDir: args.projectDir },
      instructions: [
        `Read the plan at ${args.planPath}`,
        'Execute ONLY Task 5 step by step',
        'Create src/lib/document-layout.ts exactly as shown in the plan',
        'Run: npx tsc --noEmit and fix any TS errors in this file',
        'Commit with message: feat: document layout engine',
        'Return summary',
      ],
      outputFormat: 'JSON with fields: filesCreated (array), buildPassed (boolean), errors (array)',
    },
    outputSchema: {
      type: 'object',
      required: ['filesCreated', 'buildPassed'],
      properties: {
        filesCreated: { type: 'array', items: { type: 'string' } },
        buildPassed: { type: 'boolean' },
        errors: { type: 'array', items: { type: 'string' } },
      },
    },
  },
}));

const libFunctionsTask = defineTask('lib-functions', (args) => ({
  kind: 'agent',
  title: 'Task 6: Classify Refs + PDF Export Libs',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior TypeScript engineer',
      task: 'Execute Task 6 from the implementation plan: Classify Refs + PDF Export Library Functions',
      context: { planPath: args.planPath, projectDir: args.projectDir },
      instructions: [
        `Read the plan at ${args.planPath}`,
        'Execute ONLY Task 6 step by step',
        'Create src/lib/classify-refs.ts exactly as shown in the plan',
        'Create src/lib/pdf-export.ts exactly as shown in the plan',
        'Run: npx tsc --noEmit and fix TS errors in these files',
        'Commit with message: feat: classify-refs and pdf-export library functions',
        'Return summary',
      ],
      outputFormat: 'JSON with fields: filesCreated (array), buildPassed (boolean), errors (array)',
    },
    outputSchema: {
      type: 'object',
      required: ['filesCreated', 'buildPassed'],
      properties: {
        filesCreated: { type: 'array', items: { type: 'string' } },
        buildPassed: { type: 'boolean' },
        errors: { type: 'array', items: { type: 'string' } },
      },
    },
  },
}));

const hooksTask = defineTask('hooks', (args) => ({
  kind: 'agent',
  title: 'Task 7: Hooks',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior React/TypeScript engineer',
      task: 'Execute Task 7 from the implementation plan: Hooks (useDocumentLoader + useExport)',
      context: { planPath: args.planPath, projectDir: args.projectDir },
      instructions: [
        `Read the plan at ${args.planPath}`,
        'Execute ONLY Task 7 step by step',
        'Create src/hooks/useDocumentLoader.ts exactly as shown in the plan',
        'Create src/hooks/useExport.ts exactly as shown in the plan',
        'Run: npx tsc --noEmit and fix any TS errors in these files',
        'Commit with message: feat: document loader and export hooks',
        'Return summary',
      ],
      outputFormat: 'JSON with fields: filesCreated (array), buildPassed (boolean), errors (array)',
    },
    outputSchema: {
      type: 'object',
      required: ['filesCreated', 'buildPassed'],
      properties: {
        filesCreated: { type: 'array', items: { type: 'string' } },
        buildPassed: { type: 'boolean' },
        errors: { type: 'array', items: { type: 'string' } },
      },
    },
  },
}));

const uiComponentsTask = defineTask('ui-components', (args) => ({
  kind: 'agent',
  title: 'Task 8: Core UI Components',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior React/TypeScript engineer',
      task: 'Execute Task 8 from the implementation plan: Core UI Components',
      context: { planPath: args.planPath, projectDir: args.projectDir },
      instructions: [
        `Read the plan at ${args.planPath}`,
        'Execute ONLY Task 8 step by step',
        'Create src/components/UploadZone.tsx',
        'Create src/components/ChapterHeader.tsx',
        'Create src/components/FootnotesSection.tsx',
        'Create src/components/PageSurface.tsx',
        'Create src/components/SpreadView.tsx',
        'All files must match the plan exactly',
        'Run: npx tsc --noEmit and fix any TS errors',
        'Run: npm run build and confirm it passes',
        'Commit with message: feat: upload zone, chapter header, footnotes, page surface, spread view',
        'Return summary with list of files created and build status',
      ],
      outputFormat: 'JSON with fields: filesCreated (array), buildPassed (boolean), errors (array)',
    },
    outputSchema: {
      type: 'object',
      required: ['filesCreated', 'buildPassed'],
      properties: {
        filesCreated: { type: 'array', items: { type: 'string' } },
        buildPassed: { type: 'boolean' },
        errors: { type: 'array', items: { type: 'string' } },
      },
    },
  },
}));

const toolbarTask = defineTask('toolbar', (args) => ({
  kind: 'agent',
  title: 'Task 9: Toolbar Component',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior React/TypeScript engineer',
      task: 'Execute Task 9 from the implementation plan: Toolbar Component',
      context: { planPath: args.planPath, projectDir: args.projectDir },
      instructions: [
        `Read the plan at ${args.planPath}`,
        'Execute ONLY Task 9 step by step',
        'Create src/components/Toolbar.tsx exactly as shown in the plan',
        'Run: npx tsc --noEmit and fix any TS errors',
        'Run: npm run build and confirm it passes',
        'Commit with message: feat: toolbar with view mode, source ref controls, export button',
        'Return summary',
      ],
      outputFormat: 'JSON with fields: filesCreated (array), buildPassed (boolean), errors (array)',
    },
    outputSchema: {
      type: 'object',
      required: ['filesCreated', 'buildPassed'],
      properties: {
        filesCreated: { type: 'array', items: { type: 'string' } },
        buildPassed: { type: 'boolean' },
        errors: { type: 'array', items: { type: 'string' } },
      },
    },
  },
}));

const pagesTask = defineTask('pages', (args) => ({
  kind: 'agent',
  title: 'Task 10: Pages + App Router',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior React/TypeScript engineer',
      task: 'Execute Task 10 from the implementation plan: Pages (Index, Compare, NotFound) + App Router',
      context: { planPath: args.planPath, projectDir: args.projectDir },
      instructions: [
        `Read the plan at ${args.planPath}`,
        'Execute ONLY Task 10 step by step',
        'Create src/pages/NotFound.tsx',
        'Create src/pages/Index.tsx',
        'Create src/pages/Compare.tsx',
        'Create src/App.tsx with BrowserRouter, Routes for /, /compare, and *',
        'Run: npx tsc --noEmit and fix any TS errors across all new files',
        'Run: npm run build and confirm it passes',
        'Commit with message: feat: all pages and app router',
        'Return summary with files created and build status',
      ],
      outputFormat: 'JSON with fields: filesCreated (array), buildPassed (boolean), errors (array)',
    },
    outputSchema: {
      type: 'object',
      required: ['filesCreated', 'buildPassed'],
      properties: {
        filesCreated: { type: 'array', items: { type: 'string' } },
        buildPassed: { type: 'boolean' },
        errors: { type: 'array', items: { type: 'string' } },
      },
    },
  },
}));

const finalVerificationTask = defineTask('final-verification', (args) => ({
  kind: 'agent',
  title: 'Task 11: Final Integration + Verification',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior React/TypeScript engineer acting as QA',
      task: 'Execute Task 11: Final Integration Verification for the Hebrew PDF Formatter clone',
      context: { planPath: args.planPath, projectDir: args.projectDir },
      instructions: [
        `Working directory: ${args.projectDir}`,
        'Run: npm run build 2>&1 — capture output',
        'Run: npx tsc --noEmit 2>&1 — capture output',
        'Fix any remaining TypeScript errors or build errors',
        'Verify the following files exist:',
        '  src/main.tsx, src/App.tsx, src/index.css',
        '  src/types/document.ts',
        '  src/lib/supabase.ts, src/lib/mammoth-parser.ts, src/lib/document-layout.ts',
        '  src/lib/classify-refs.ts, src/lib/pdf-export.ts',
        '  src/hooks/useDocumentLoader.ts, src/hooks/useExport.ts',
        '  src/components/UploadZone.tsx, src/components/ChapterHeader.tsx',
        '  src/components/FootnotesSection.tsx, src/components/PageSurface.tsx',
        '  src/components/SpreadView.tsx, src/components/Toolbar.tsx',
        '  src/pages/Index.tsx, src/pages/Compare.tsx, src/pages/NotFound.tsx',
        '  src/components/ui/button.tsx, src/components/ui/progress.tsx',
        '  src/components/ui/tooltip.tsx, src/components/ui/toaster.tsx',
        '  public/fonts/ (should contain at least 8 font files)',
        'If any file is missing, create it using the plan',
        'Run final: npm run build',
        'Commit remaining changes with message: feat: complete 1-to-1 clone of pdf-formatter.lovable.app',
        'Return full verification report',
      ],
      outputFormat: 'JSON with fields: buildPassed (boolean), tsPassed (boolean), missingFiles (array), errors (array), summary (string)',
    },
    outputSchema: {
      type: 'object',
      required: ['buildPassed', 'tsPassed', 'summary'],
      properties: {
        buildPassed: { type: 'boolean' },
        tsPassed: { type: 'boolean' },
        missingFiles: { type: 'array', items: { type: 'string' } },
        errors: { type: 'array', items: { type: 'string' } },
        summary: { type: 'string' },
      },
    },
  },
}));

// ─── Main process ─────────────────────────────────────────────────────────────

export async function process(inputs, ctx) {
  const {
    planPath = 'docs/superpowers/plans/2026-04-26-pdf-formatter-clone.md',
    projectDir = '/mnt/volume_sfo3_01/captured_sefer_designer',
  } = inputs;

  ctx.log('info', 'Starting 1-to-1 clone of pdf-formatter.lovable.app');
  ctx.log('info', `Plan: ${planPath}`);
  ctx.log('info', `Project dir: ${projectDir}`);

  // Task 1: Scaffold
  const scaffold = await ctx.task(scaffoldTask, { planPath, projectDir });
  ctx.log('info', `Scaffold done. Build passed: ${scaffold.buildPassed}`);

  // Task 2: Types + Supabase
  const types = await ctx.task(typesAndSupabaseTask, { planPath, projectDir });
  ctx.log('info', `Types + Supabase done.`);

  // Task 3: shadcn UI
  const shadcn = await ctx.task(shadcnTask, { planPath, projectDir });
  ctx.log('info', `shadcn UI done. Build passed: ${shadcn.buildPassed}`);

  // Task 4: Mammoth parser
  const mammoth = await ctx.task(mammothParserTask, { planPath, projectDir });
  ctx.log('info', `Mammoth parser done. Build passed: ${mammoth.buildPassed}`);

  // Task 5: Layout engine
  const layout = await ctx.task(layoutEngineTask, { planPath, projectDir });
  ctx.log('info', `Layout engine done.`);

  // Task 6: Lib functions (classify-refs + pdf-export)
  const libFns = await ctx.task(libFunctionsTask, { planPath, projectDir });
  ctx.log('info', `Lib functions done.`);

  // Task 7: Hooks
  const hooks = await ctx.task(hooksTask, { planPath, projectDir });
  ctx.log('info', `Hooks done.`);

  // Task 8: Core UI components
  const uiComponents = await ctx.task(uiComponentsTask, { planPath, projectDir });
  ctx.log('info', `Core UI components done. Build passed: ${uiComponents.buildPassed}`);

  // Task 9: Toolbar
  const toolbar = await ctx.task(toolbarTask, { planPath, projectDir });
  ctx.log('info', `Toolbar done. Build passed: ${toolbar.buildPassed}`);

  // Task 10: Pages + router
  const pages = await ctx.task(pagesTask, { planPath, projectDir });
  ctx.log('info', `Pages done. Build passed: ${pages.buildPassed}`);

  // Task 11: Final verification
  const verification = await ctx.task(finalVerificationTask, { planPath, projectDir });
  ctx.log('info', `Final verification: ${verification.summary}`);

  return {
    success: verification.buildPassed,
    buildPassed: verification.buildPassed,
    tsPassed: verification.tsPassed,
    summary: verification.summary,
    tasks: {
      scaffold: scaffold.buildPassed,
      types: !!types.filesCreated,
      shadcn: shadcn.buildPassed,
      mammoth: mammoth.buildPassed,
      layout: layout.buildPassed,
      libFunctions: libFns.buildPassed,
      hooks: hooks.buildPassed,
      uiComponents: uiComponents.buildPassed,
      toolbar: toolbar.buildPassed,
      pages: pages.buildPassed,
      verification: verification.buildPassed,
    },
  };
}
