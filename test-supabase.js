
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xazvjdnszawrdlcmsbus.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhenZqZG5zemF3cmRsY21zYnVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3ODQxMDQsImV4cCI6MjA2OTM2MDEwNH0.Qy4FdNeJ-pK3Ubc2FU2G5L_aYH5DGHa3mVfbY5u0dfQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log('Testing connection...');
    const { data, error } = await supabase.from('tasks').select('*').limit(1);
    if (error) {
        console.error('Connection failed:', error);
    } else {
        console.log('Connection successful! fetched items:', data.length);
    }
}

testConnection();
