#!/usr/bin/env node
/**
 * PostToolUse hook: Queue files modified by Claude
 */

const fs = require('fs');
const path = require('path');

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
        const queueFile = path.join(projectDir, '.claude', 'hooks', 'claude-files-queue.json');
        
        // Load existing queue or create new
        let queue = [];
        if (fs.existsSync(queueFile)) {
            queue = JSON.parse(fs.readFileSync(queueFile, 'utf-8'));
        }
        
        // Add file if not already queued
        if (!queue.includes(filePath)) {
            queue.push(filePath);
        }
        
        // Save queue
        fs.writeFileSync(queueFile, JSON.stringify(queue, null, 2));
        
    } catch (e) {
        // Silently fail
    }
});