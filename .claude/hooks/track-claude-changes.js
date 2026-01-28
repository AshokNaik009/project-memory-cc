#!/usr/bin/env node
/**
 * PostToolUse hook: Auto-commit Claude changes with attribution
 */

const { execSync } = require('child_process');

let inputData = '';

process.stdin.on('data', chunk => {
    inputData += chunk;
});

process.stdin.on('end', () => {
    try {
        const hookInput = JSON.parse(inputData);
        const filePath = hookInput?.tool_input?.file_path;
        
        if (!filePath) process.exit(0);
        
        const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
        const filename = filePath.split('/').pop();
        
        const commitMsg = `Claude CODE: update ${filename}\n\nCo-authored-by: Claude`;
        
        // Stage + commit in single command, skip hooks to avoid loops
        execSync(`cd "${projectDir}" && git add "${filePath}" && git commit --no-verify -m "${commitMsg}"`, {
            encoding: 'utf-8'
        });
        
    } catch (e) {
        // Silently fail
    }
});