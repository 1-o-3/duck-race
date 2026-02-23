import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    // Initialize table and ensure PIN column exists
    try {
        await sql`CREATE TABLE IF NOT EXISTS duck_profiles (name TEXT PRIMARY KEY, balance INTEGER);`;
        // Add PIN column if it doesn't exist (using a simple try-catch for the alter)
        try {
            await sql`ALTER TABLE duck_profiles ADD COLUMN IF NOT EXISTS pin TEXT DEFAULT '0000';`;
        } catch (e) {
            // Column might already exist, which is fine
        }
    } catch (e) {
        console.error("Table initialization error", e);
    }

    if (req.method === 'GET') {
        try {
            const { rows } = await sql`SELECT name, balance, pin FROM duck_profiles;`;
            const profiles = rows.reduce((acc, row) => {
                acc[row.name] = { balance: row.balance, pin: row.pin || '0000' };
                return acc;
            }, {});
            return res.status(200).json(profiles);
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    if (req.method === 'POST') {
        const { name, balance, pin } = req.body;
        if (!name) return res.status(400).json({ error: "Name required" });

        try {
            if (pin !== undefined) {
                await sql`
            INSERT INTO duck_profiles (name, balance, pin)
            VALUES (${name}, ${balance}, ${pin})
            ON CONFLICT (name)
            DO UPDATE SET balance = ${balance}, pin = ${pin};
          `;
            } else {
                await sql`
            INSERT INTO duck_profiles (name, balance)
            VALUES (${name}, ${balance})
            ON CONFLICT (name)
            DO UPDATE SET balance = ${balance};
          `;
            }
            return res.status(200).json({ success: true });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}
