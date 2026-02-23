import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    // Initialize table and ensure columns exist
    try {
        await sql`CREATE TABLE IF NOT EXISTS duck_profiles (name TEXT PRIMARY KEY, balance INTEGER, pin TEXT DEFAULT '0000', crown_count INTEGER DEFAULT 0);`;

        // Add columns if they don't exist
        try { await sql`ALTER TABLE duck_profiles ADD COLUMN IF NOT EXISTS pin TEXT DEFAULT '0000';`; } catch (e) { }
        try { await sql`ALTER TABLE duck_profiles ADD COLUMN IF NOT EXISTS crown_count INTEGER DEFAULT 0;`; } catch (e) { }
    } catch (e) {
        console.error("Table initialization error", e);
    }

    if (req.method === 'GET') {
        try {
            const { rows } = await sql`SELECT name, balance, pin, crown_count FROM duck_profiles;`;
            const profiles = rows.reduce((acc, row) => {
                acc[row.name] = {
                    balance: row.balance,
                    pin: row.pin || '0000',
                    crownCount: row.crown_count || 0
                };
                return acc;
            }, {});
            return res.status(200).json(profiles);
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    if (req.method === 'POST') {
        const { name, balance, pin, crownCount } = req.body;
        if (!name) return res.status(400).json({ error: "Name required" });

        try {
            // Use positional parameters to update existing or insert new
            await sql`
        INSERT INTO duck_profiles (name, balance, pin, crown_count)
        VALUES (${name}, ${balance}, ${pin || '0000'}, ${crownCount || 0})
        ON CONFLICT (name)
        DO UPDATE SET 
          balance = EXCLUDED.balance, 
          pin = COALESCE(EXCLUDED.pin, duck_profiles.pin),
          crown_count = EXCLUDED.crown_count;
      `;
            return res.status(200).json({ success: true });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}
