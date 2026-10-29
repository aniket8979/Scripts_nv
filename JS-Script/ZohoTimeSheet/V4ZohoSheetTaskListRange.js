const readline = require('readline');

// --- Helper Utilities ---
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (query) => new Promise(resolve => rl.question(query, resolve));
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function parseCookieData(cookieStr) {
    const csrfMatch = cookieStr.match(/(?:zpcp|zpct|CSRF_TOKEN|CT_CSRF_TOKEN)=([a-f0-9]+)/i);
    let csrfToken = "";
    if (csrfMatch) {
        csrfToken = csrfMatch[0].startsWith('zpcp=') ? csrfMatch[0] : `zpcp=${csrfMatch[1]}`;
    }

    const portalMatch = cookieStr.match(/zalb_zid=(\d+)/i);
    const portalId = portalMatch ? portalMatch[1] : "55419992";

    const userMatch = cookieStr.match(/(?:zpuid|user_id|owner_zpuid)=(\d+)/i);
    const userId = userMatch ? userMatch[1] : null;

    return { csrfToken, portalId, userId };
}

/**
 * Parses selection input strings like "1-7, 8, 10, 12-14"
 * into a unique, sorted array of zero-based array indices.
 */
function parseTaskSelection(inputStr, maxTasks) {
    if (!inputStr || !inputStr.trim()) {
        // Default to selecting all tasks (0 to maxTasks - 1)
        return Array.from({ length: maxTasks }, (_, i) => i);
    }

    const selectedIndices = new Set();
    const parts = inputStr.split(',').map(s => s.trim()).filter(Boolean);

    for (const part of parts) {
        if (part.includes('-')) {
            const [startStr, endStr] = part.split('-').map(s => s.trim());
            const start = parseInt(startStr, 10);
            const end = parseInt(endStr, 10);

            if (!isNaN(start) && !isNaN(end)) {
                const min = Math.min(start, end);
                const max = Math.max(start, end);
                for (let i = min; i <= max; i++) {
                    if (i >= 1 && i <= maxTasks) {
                        selectedIndices.add(i - 1); // convert 1-based UI number to 0-based index
                    }
                }
            }
        } else {
            const num = parseInt(part, 10);
            if (!isNaN(num) && num >= 1 && num <= maxTasks) {
                selectedIndices.add(num - 1); // convert 1-based UI number to 0-based index
            }
        }
    }

    return Array.from(selectedIndices).sort((a, b) => a - b);
}

function parseTimeToMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return (h * 60) + (m || 0);
}

function formatMinutesToTime(totalMinutes) {
    const h = Math.floor(totalMinutes / 60);
    const m = Math.round(totalMinutes % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function splitHoursAcrossTasks(totalHoursStr, taskCount) {
    const totalMinutes = parseTimeToMinutes(totalHoursStr);
    const baseMinutes = Math.floor(totalMinutes / taskCount);
    let remainder = totalMinutes % taskCount;

    const allocations = [];
    for (let i = 0; i < taskCount; i++) {
        let allocated = baseMinutes;
        if (remainder > 0) {
            allocated += 1;
            remainder -= 1;
        }
        allocations.push(formatMinutesToTime(allocated));
    }
    return allocations;
}

// --- Zoho API Functions ---
async function fetchActiveProjects(portalId, csrfToken, cookies) {
    const url = `https://projects.zoho.com/portal/novelvoxsoftwares/projectlistprovider.do?fetchfor=projectslist&fetchid=0&search_string=&index=0&range=100&status=active&permission_module=timesheet&permission_type=create&is_permission_filtered=true&is_all_associated=false&is_sprints_only_projects=false`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'application/json, text/plain, */*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:153.0) Gecko/20100101 Firefox/153.0',
            'Referer': 'https://projects.zoho.com/portal/novelvoxsoftwares',
            'X-ZCSRF-TOKEN': csrfToken,
            'X-ZOHO-SERVICE': 'Projects',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Cookie': cookies
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch projects. HTTP Status: ${response.status}`);
    }

    return await response.json();
}

// Same endpoint the Zoho web UI uses for the project "Tasks" tab (owner-filtered, "All Open" view)
async function fetchAssignedTasks(portalId, projectId, userId, csrfToken, cookies) {
    const filter = JSON.stringify({
        criteria: [{ criteria_condition: "is", value: [String(userId)], field_name: "owner" }],
        pattern: "1"
    });

    const body = new URLSearchParams({
        projId: projectId,
        pagefor: 'project',
        mileId: '0',
        datafor: 'tasks',
        frompage: 'arctlist',
        filter: filter,
        cviewId: '824168000010082003', // "All Open" predefined view
        zpcp: csrfToken.replace(/^zpcp=/, '')
    });

    const response = await fetch('https://projects.zoho.com/portal/novelvoxsoftwares/tasklistview.do', {
        method: 'POST',
        headers: {
            'Accept': 'json',
            'Accept-Language': 'en-US,en;q=0.9',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:153.0) Gecko/20100101 Firefox/153.0',
            'Referer': 'https://projects.zoho.com/portal/novelvoxsoftwares',
            'Origin': 'https://projects.zoho.com',
            'X-ZCSRF-TOKEN': csrfToken,
            'X-ZOHO-SERVICE': 'Projects',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Cookie': cookies
        },
        body: body.toString()
    });

    if (!response.ok) {
        console.log(`   ⚠️ tasklistview.do returned HTTP ${response.status}, falling back to timesheet API...`);
        return fetchAssignedTasksV3(portalId, projectId, userId, csrfToken, cookies);
    }

    const data = await response.json();
    const views = Array.isArray(data) ? data : [data];
    const seen = new Set();
    const tasks = [];

    for (const view of views) {
        for (const t of (view.TASKS || [])) {
            const isMine = (t.OWNERDETAILS || []).some(o => String(o.OWNERID) === String(userId))
                || String(t.TUSERSTR || '').split(',').includes(String(userId));
            if (!isMine || t.ISCOMP || t.TIMESHEET_CREATE === false || seen.has(t.TID)) continue;
            seen.add(t.TID);
            tasks.push({ id: t.TID, name: t.TTITLE });
        }
    }

    if (tasks.length === 0) {
        if (process.env.ZOHO_DEBUG) {
            console.log("   [debug] raw tasklistview response:", JSON.stringify(data).slice(0, 2000));
        }
        return fetchAssignedTasksV3(portalId, projectId, userId, csrfToken, cookies);
    }
    return tasks;
}

async function fetchAssignedTasksV3(portalId, projectId, userId, csrfToken, cookies) {
    const queryParams = new URLSearchParams({
        page: '1',
        per_page: '100',
        search_offset: '0',
        type: 'All',
        search_term: '',
        user_id: userId,
        is_pinned: 'false'
    });

    const url = `https://projects.zoho.com/api/v3/portal/${portalId}/projects/${projectId}/timesheet/tasks?${queryParams.toString()}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'json',
            'Accept-Language': 'en-US,en;q=0.9',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:153.0) Gecko/20100101 Firefox/153.0',
            'Referer': 'https://projects.zoho.com/portal/novelvoxsoftwares',
            'X-ZCSRF-TOKEN': csrfToken,
            'X-ZOHO-SERVICE': 'Projects',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Cookie': cookies
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch tasks. HTTP Status: ${response.status} - ${errorText}`);
    }

    const tasks = await response.json();
    return tasks.filter(t => t.is_assigned === true && !t.is_closed);
}

async function logTimesheet(portalId, projectId, taskId, userId, dateStr, hours, billStatus, csrfToken, cookies) {
    const url = `https://projects.zoho.com/api/v3/portal/${portalId}/projects/${projectId}/log`;

    const payload = {
        "owner_zpuid": userId,
        "date": dateStr,
        "frompage": "mytimesheetcalendar",
        "module": {
            "id": taskId,
            "type": "task"
        },
        "bill_status": billStatus,
        "notes": "<div><br></div>",
        "hours": hours,
        "for_timer": false
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:153.0) Gecko/20100101 Firefox/153.0',
            'Referer': 'https://projects.zoho.com/portal/novelvoxsoftwares',
            'Origin': 'https://projects.zoho.com',
            'X-ZCSRF-TOKEN': csrfToken,
            'X-ZOHO-SERVICE': 'Projects',
            'Cookie': cookies
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        return { success: false, status: response.status };
    }

    const data = await response.json();
    return { success: true, id: data.id };
}

// --- Main CLI Workflow Loop ---
async function main() {
    console.log("\n=========================================");
    console.log("   Zoho Projects Timesheet Auto-Filler   ");
    console.log("=========================================\n");

    const rawCookies = await askQuestion("🔑 Paste your Cookie string:\n> ");
    const cookies = rawCookies.trim();
    const parsedData = parseCookieData(cookies);
    
    let csrfToken = parsedData.csrfToken;
    let portalId = parsedData.portalId;
    let userId = parsedData.userId;

    const customCsrf = await askQuestion(`\n🛡 X-ZCSRF-TOKEN detected: [${csrfToken || 'NONE'}]. Press ENTER to keep or paste exact value: `);
    if (customCsrf.trim()) {
        csrfToken = customCsrf.trim();
    }

    if (!userId) {
        userId = await askQuestion("👤 Enter your User ID (user_id) [Default: 824168000020084001]: ") || "824168000020084001";
    }

    console.log("\n🔄 Fetching active projects...");
    let projects = [];
    try {
        projects = await fetchActiveProjects(portalId, csrfToken, cookies);
        console.log(`✅ Loaded ${projects.length} active projects successfully.\n`);
    } catch (err) {
        console.error(`❌ Error fetching projects: ${err.message}`);
        rl.close();
        return;
    }

    let keepRunning = true;
    while (keepRunning) {
        console.log("-----------------------------------------");
        console.log("Available Projects:");
        projects.forEach((p, idx) => {
            console.log(` [${idx + 1}] ${p.name} (${p.prefix || p.id})`);
        });

        const projChoice = await askQuestion("\nSelect a project number: ");
        const projIndex = parseInt(projChoice, 10) - 1;

        if (isNaN(projIndex) || !projects[projIndex]) {
            console.log("❌ Invalid selection. Please try again.");
            continue;
        }

        const selectedProject = projects[projIndex];
        console.log(`\n📌 Selected Project: "${selectedProject.name}"`);

        console.log("🔍 Checking tasks assigned to you...");
        let fetchedTasks = [];
        try {
            fetchedTasks = await fetchAssignedTasks(portalId, selectedProject.id, userId, csrfToken, cookies);
        } catch (err) {
            console.error(`❌ Error retrieving tasks: ${err.message}`);
            continue;
        }

        if (fetchedTasks.length === 0) {
            console.log("\n⚠️ FALLBACK: No assigned open tasks found for you in this project!");
            const choice = await askQuestion("Would you like to choose a different project? (y/n): ");
            if (choice.toLowerCase() === 'y') {
                continue;
            } else {
                break;
            }
        }

        // --- Render Numbered Tasks ---
        console.log(`\n✅ Found ${fetchedTasks.length} assigned task(s):`);
        fetchedTasks.forEach((t, idx) => {
            console.log(`   [${idx + 1}] ${t.name}`);
        });

        // --- Filter Tasks by Range Input ---
        const taskRangeInput = await askQuestion(
            "\nEnter task numbers or ranges to include (e.g. 1-7, 8, 10, 12-14) [Default: All]: "
        );

        const selectedIndices = parseTaskSelection(taskRangeInput, fetchedTasks.length);

        if (selectedIndices.length === 0) {
            console.log("⚠️ No valid task numbers were selected from the list.");
            const retry = await askQuestion("Try again? (y/n): ");
            if (retry.toLowerCase() === 'y') continue;
            else break;
        }

        const assignedTasks = selectedIndices.map(idx => fetchedTasks[idx]);

        console.log(`\n🎯 Filtered down to ${assignedTasks.length} task(s) for logging:`);
        assignedTasks.forEach((t, i) => console.log(`   ${i + 1}. ${t.name}`));

        // Collect Date & Hours Information
        const startDateStr = await askQuestion("\nEnter Start Date (YYYY-MM-DD): ");
        const endDateStr = await askQuestion("Enter End Date   (YYYY-MM-DD): ");
        const totalHours = await askQuestion("Enter Hours per Day [Default: 06:00]: ") || "06:00";
        let billStatus = await askQuestion("Billable status [Default: Billable]\n[1] Billable\n[2] Non Billable: ") || "Billable";
        if (billStatus === "1") {
            billStatus = "Billable";
        }else{
            billStatus = "Non Billable";
        }
        const allocatedHours = splitHoursAcrossTasks(totalHours, assignedTasks.length);
        console.log(`\n📊 Hour Split (${totalHours} total):`);
        assignedTasks.forEach((t, i) => console.log(`   - ${t.name} => ${allocatedHours[i]} hrs`));

        const confirm = await askQuestion("\nProceed to log entries? (y/n): ");
        if (confirm.toLowerCase() !== 'y') {
            console.log("Skipped batch.");
            continue;
        }

        const start = new Date(startDateStr);
        const end = new Date(endDateStr);
        let current = new Date(start);
        let totalLogged = 0;

        console.log("\n🚀 Logging timesheet entries...");

        while (current <= end) {
            const dayOfWeek = current.getDay();
            const dateStr = current.toISOString().split('T')[0];

            if (dayOfWeek === 0 || dayOfWeek === 6) {
                const dayName = dayOfWeek === 0 ? "Sunday" : "Saturday";
                console.log(` 🏖  Skipping ${dateStr} (${dayName})`);
                current.setDate(current.getDate() + 1);
                continue;
            }

            console.log(`\n⏱  Processing ${dateStr}:`);

            for (let i = 0; i < assignedTasks.length; i++) {
                const task = assignedTasks[i];
                const hrs = allocatedHours[i];

                const result = await logTimesheet(
                    portalId,
                    selectedProject.id,
                    task.id,
                    userId,
                    dateStr,
                    hrs,
                    billStatus,
                    csrfToken,
                    cookies
                );

                if (result.success) {
                    console.log(`   ✅ Logged ${hrs} hrs -> "${task.name}" (Entry ID: ${result.id})`);
                    totalLogged++;
                } else {
                    console.log(`   ❌ Failed logging -> "${task.name}" (Status: ${result.status})`);
                }

                await sleep(1200);
            }

            current.setDate(current.getDate() + 1);
        }

        console.log(`\n🎉 Completed! Logged ${totalLogged} total entries for "${selectedProject.name}".`);

        const another = await askQuestion("\nWould you like to log hours for another project? (y/n): ");
        if (another.toLowerCase() !== 'y') {
            keepRunning = false;
        }
    }

    console.log("\nGoodbye! 👋\n");
    rl.close();
}

main();