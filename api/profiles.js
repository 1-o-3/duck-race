import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    // Initialize table if it doesn't exist
    try {
        await sql`CREATE TABLE IF NOT EXISTS duck_profiles (name TEXT PRIMARY KEY, balance INTEGER);`;
    } catch (e) {
        console.error("Table creation error", e);
    }

    if (req.method === 'GET') {
        try {
            const { rows } = await sql`SELECT * FROM duck_profiles;`;
            const profiles = rows.reduce((acc, row) => {
                acc[row.name] = { balance: row.balance };
                return acc;
            }, {});
            return res.status(200).json(profiles);
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    if (req.method === 'POST') {
        const { name, balance } = req.body;
        if (!name) return res.status(400).json({ error: "Name required" });

        try {
            await sql`
        INSERT INTO duck_profiles (name, balance)
        VALUES (${name}, ${balance})
        ON CONFLICT (name)
        DO UPDATE SET balance = ${balance};
      `;
            return res.status(200).json({ success: true });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}
