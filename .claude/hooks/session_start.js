#!/usr/bin/env node

/**
 * Claude Code SessionStart Hook: Load Project Memory
 *
 * Triggered by: Session start, resume, clear, or compact
 * Purpose: Load features.json and provide context summary to Claude
 *
 * Compatible with Node.js 18.x+
 */

const fs = require('fs');
const path = require('path');

// Get project directory from environment or use current working directory
const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const memoryDir = path.join(projectDir, '.claude', 'memory');
const featuresFile = path.join(memoryDir, 'features.json');
const logFile = path.join(projectDir, '.claude', 'hooks', 'session_start.log');

/**
 * Simple logger that appends to log file
 */
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;

    try {
        fs.appendFileSync(logFile, logMessage);
    } catch (err) {
        // Silently fail if can't write to log
    }

    // Also write to stderr for debugging
    console.error(message);
}

/**
 * Read and parse the hook input from stdin
 */
function readStdin() {
    return new Promise((resolve) => {
        let data = '';

        process.stdin.setEncoding('utf8');
        process.stdin.on('readable', () => {
            let chunk;
            while ((chunk = process.stdin.read()) !== null) {
                data += chunk;
            }
        });

        process.stdin.on('end', () => {
            try {
                resolve(JSON.parse(data));
            } catch {
                resolve({});
            }
        });

        // Handle case where stdin is empty or not provided
        setTimeout(() => {
            if (!data) resolve({});
        }, 100);
    });
}

/**
 * Load and analyze features.json
 */
function loadFeatures() {
    if (!fs.existsSync(featuresFile)) {
        return null;
    }

    try {
        const content = fs.readFileSync(featuresFile, 'utf8');
        return JSON.parse(content);
    } catch (err) {
        log(`Error reading features.json: ${err.message}`);
        return null;
    }
}

/**
 * Build context summary from features
 */
function buildContextSummary(featuresData) {
    if (!featuresData || !featuresData.features) {
        return 'No project memory found. Run /init-memory to enable feature tracking.';
    }

    const features = featuresData.features;
    const featureIds = Object.keys(features);

    if (featureIds.length === 0) {
        return 'Project memory initialized but no features tracked yet. Use /execute TICKET-ID description to implement features.';
    }

    // Count by status
    const implemented = [];
    const inProgress = [];

    featureIds.forEach(id => {
        const feature = features[id];
        if (feature.status === 'implemented') {
            implemented.push({ id, ...feature });
        } else if (feature.status === 'in_progress') {
            inProgress.push({ id, ...feature });
        }
    });

    // Build summary parts
    const parts = [];

    parts.push(`Project has ${implemented.length} implemented feature(s).`);

    // Show recent implemented (last 5)
    if (implemented.length > 0) {
        const recent = implemented
            .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
            .slice(0, 5);

        const recentList = recent
            .map(f => `${f.id}: ${f.summary || 'No summary'}`)
            .join('; ');

        parts.push(`Recent: ${recentList}.`);
    }

    // Show in-progress
    if (inProgress.length > 0) {
        const inProgressList = inProgress
            .map(f => `${f.id} (${f.dev || 'unknown'})`)
            .join(', ');

        parts.push(`In progress: ${inProgressList}.`);
    }

    parts.push('Use /execute TICKET-ID description to implement features with duplicate detection.');

    return parts.join(' ');
}

/**
 * Main function
 */
async function main() {
    // Initialize log
    const startTime = new Date().toISOString();
    log(`\n${'='.repeat(60)}`);
    log(`=== SessionStart Hook: ${startTime} ===`);
    log(`${'='.repeat(60)}`);
    log(`Project directory: ${projectDir}`);
    log(`Features file: ${featuresFile}`);

    // Read hook input from stdin
    const hookInput = await readStdin();
    log(`Hook input: ${JSON.stringify(hookInput)}`);

    const source = hookInput.source || 'unknown';
    const sessionId = hookInput.session_id || 'unknown';

    log(`Source: ${source}`);
    log(`Session ID: ${sessionId}`);

    // Load features
    const featuresData = loadFeatures();

    if (featuresData) {
        const featureCount = Object.keys(featuresData.features || {}).length;
        log(`Loaded ${featureCount} features from memory`);
    } else {
        log('No features.json found');
    }

    // Build context summary
    const contextSummary = buildContextSummary(featuresData);
    log(`Context summary: ${contextSummary}`);

    // Build output
    const output = {
        hookSpecificOutput: {
            hookEventName: 'SessionStart',
            additionalContext: contextSummary
        }
    };

    log(`\nOutput: ${JSON.stringify(output, null, 2)}`);
    log(`=== SessionStart Hook Completed: ${new Date().toISOString()} ===`);

    // Write output to stdout for Claude Code to consume
    console.log(JSON.stringify(output));

    process.exit(0);
}

// Run main function
main().catch(err => {
    console.error(`Hook error: ${err.message}`);

    // Still output valid JSON even on error
    console.log(JSON.stringify({
        hookSpecificOutput: {
            hookEventName: 'SessionStart',
            additionalContext: 'Project memory hook encountered an error. Use /init-memory to set up.'
        }
    }));

    process.exit(0);
});
