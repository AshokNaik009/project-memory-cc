#!/usr/bin/env node
/**
 * Stop hook: Commit all Claude-modified files in single commit
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let inputData = '';

process.stdin.on('data', chunk => {
    inputData += chunk;
});

process.stdin.on('end', () => {
    try {
        const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
        const queueFile = path.join(projectDir, '.claude', 'hooks', 'claude-files-queue.json');
        
        // Check if queue exists
        if (!fs.existsSync(queueFile)) process.exit(0);
        
        const queue = JSON.parse(fs.readFileSync(queueFile, 'utf-8'));
        
        // Nothing to commit
        if (queue.length === 0) process.exit(0);
        
        // Stage all queued files
        for (const file of queue) {
            try {
                execSync(`git add "${file}"`, { cwd: projectDir, encoding: 'utf-8' });
            } catch (e) {
                // File might be deleted, try staging deletion
                execSync(`git add -A "${file}"`, { cwd: projectDir, encoding: 'utf-8' });
            }
        }
        
        // Build commit message
        const fileNames = queue.map(f => f.split('/').pop()).join(', ');
        const commitMsg = `chore: Claude-assisted changes

Files: ${fileNames}

Co-authored-by: Claude <noreply@anthropic.com>`;
        
        // Commit
        execSync(`git commit --no-verify -m "${commitMsg}"`, { cwd: projectDir, encoding: 'utf-8' });
        
        // Clear queue
        fs.writeFileSync(queueFile, '[]');
        
    } catch (e) {
        // Silently fail
    }
});