import express from 'express';
import pool from './db.js';

const app = express();
app.use(express.json());

const rowToFeature = (row) => ({
  type: 'Feature',
  geometry: row.geometry,
  properties: {
    id: row.id,
    name: row.name,
    category: row.category,
    address: row.address,
    created_at: row.created_at,
    ...(row.distance && { distance: row.distance })
  }
});

app.get('/api/places', async (req, res) => {
  try {
    const query = `
      SELECT 
        id, name, category,
        ST_AsGeoJSON(location)::json AS geometry,
        address, created_at
      FROM places
      ORDER BY id
    `;
    const result = await pool.query(query);
    const features = result.rows.map(rowToFeature);
    res.json({ type: 'FeatureCollection', features });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch places' });
  }
});

app.get('/api/places/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT 
        id, name, category,
        ST_AsGeoJSON(location)::json AS geometry,
        address, created_at
      FROM places WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Place not found' });
    }
    res.json(rowToFeature(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch place' });
  }
});

app.post('/api/places', async (req, res) => {
  const { name, category, longitude, latitude, address } = req.body;
  if (!name || longitude === undefined || latitude === undefined) {
    return res.status(400).json({ error: 'Missing required fields: name, longitude, latitude' });
  }
  try {
    const query = `
      INSERT INTO places (name, category, location, address)
      VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5)
      RETURNING id
    `;
    const values = [name, category, longitude, latitude, address];
    const result = await pool.query(query, values);
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to insert place' });
  }
});

app.put('/api/places/:id', async (req, res) => {
  const { id } = req.params;
  const { name, category, longitude, latitude, address } = req.body;

  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(name);
  }
  if (category !== undefined) {
    updates.push(`category = $${paramIndex++}`);
    values.push(category);
  }
  if (longitude !== undefined && latitude !== undefined) {
    updates.push(`location = ST_SetSRID(ST_MakePoint($${paramIndex++}, $${paramIndex++}), 4326)`);
    values.push(longitude, latitude);
  } else if (longitude !== undefined || latitude !== undefined) {
    return res.status(400).json({ error: 'Both longitude and latitude must be provided together' });
  }
  if (address !== undefined) {
    updates.push(`address = $${paramIndex++}`);
    values.push(address);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(id);
  const query = `
    UPDATE places
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id
  `;

  try {
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Place not found' });
    }
    res.json({ id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update place' });
  }
});

app.delete('/api/places/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM places WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Place not found' });
    }
    res.json({ message: 'Place deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete place' });
  }
});

app.get('/api/places/nearby', async (req, res) => {
  const { lng, lat, radius = 1000 } = req.query;
  if (!lng || !lat) {
    return res.status(400).json({ error: 'Missing coordinates: lng and lat are required' });
  }
  try {
    const query = `
      SELECT 
        id, name, category,
        ST_AsGeoJSON(location)::json AS geometry,
        address, created_at,
        ST_Distance(
          location::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) AS distance
      FROM places
      WHERE ST_DWithin(
        location::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $3
      )
      ORDER BY distance
    `;
    const values = [lng, lat, radius];
    const result = await pool.query(query, values);
    const features = result.rows.map(rowToFeature);
    res.json({ type: 'FeatureCollection', features });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to search nearby places' });
  }
});

app.get('/api/test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ success: true, time: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

app.get('/', (req, res) => {
  res.send('Server is running');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});