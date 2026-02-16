
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDuplicates() {
    console.log('--- Checking for duplicate project names ---')
    const { data: projects, error } = await supabase
        .from('projects')
        .select('id, name, team_id, status')
        .in('status', ['active', 'imported'])
        .order('name');

    if (error) {
        console.error('Error:', error);
        return;
    }

    const nameCounts = {};
    projects.forEach(p => {
        nameCounts[p.name] = (nameCounts[p.name] || 0) + 1;
    });

    const duplicates = Object.keys(nameCounts).filter(name => nameCounts[name] > 1);
    console.log(`Found ${duplicates.length} project names that appear multiple times.`);

    for (const name of duplicates.slice(0, 10)) {
        const records = projects.filter(p => p.name === name);
        console.log(`\nProject: "${name}"`);
        records.forEach(r => {
            console.log(`  - ID: ${r.id}, TeamID: ${r.team_id}, Status: ${r.status}`);
        });
    }
}

checkDuplicates()
