
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

async function debug() {
    console.log('--- Checking "Wordpress" Teams ---')
    const { data: teams } = await supabase
        .from('teams')
        .select('*')
        .ilike('name', '%wordpress%')
    console.log(JSON.stringify(teams, null, 2))

    console.log('\n--- Checking "Concord" Projects ---')
    const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .ilike('name', '%concord%')
    console.log(JSON.stringify(projects, null, 2))
}

debug()
