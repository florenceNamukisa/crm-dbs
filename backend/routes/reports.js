import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { sendEmailWithAttachment } from '../services/emailService.js';
import Client from '../models/Client.js';
import Deal from '../models/Deal.js';
import Schedule from '../models/Schedule.js';

const router = express.Router();

// Setup multer for file uploads (temporary storage)
const upload = multer({ dest: 'uploads/' });

// Share report via email - expects { to, subject, html, csv, filename }
router.post('/share', async (req, res) => {
  try {
    const { to, subject, html, csv, filename = 'report.csv' } = req.body;
    if (!to || !csv) return res.status(400).json({ message: 'Missing to or csv content' });

    const buffer = Buffer.from(csv, 'utf8');
    const attachments = [{ filename, content: buffer }];

    const result = await sendEmailWithAttachment(to, subject || 'CRM Report', html, attachments);
    if (!result.success) return res.status(500).json({ message: 'Failed to send email', error: result.error });
    res.json({ message: 'Report shared successfully' });
  } catch (error) {
    console.error('Share report error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Import CSV file - optional query param target: deals|clients|schedules
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    const target = req.body.target || 'deals';
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const filePath = path.resolve(req.file.path);
    const content = fs.readFileSync(filePath, 'utf8');

    // Simple CSV parse: first line headers, comma-separated
    const lines = content.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length < 2) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ message: 'CSV contains no data' });
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      const cols = line.split(',');
      const obj = {};
      headers.forEach((h, i) => { obj[h] = cols[i] ? cols[i].trim() : ''; });
      return obj;
    });

    const created = [];

    if (target === 'clients') {
      for (const row of rows) {
        // required: name,email,phone,nin,agent
        if (!row.name || !row.email || !row.phone || !row.nin || !row.agent) continue;
        try {
          const c = new Client({ name: row.name, email: row.email, phone: row.phone, nin: row.nin, agent: row.agent });
          const saved = await c.save();
          created.push({ type: 'client', id: saved._id });
        } catch (e) {
          console.warn('Failed to create client row', row, e.message);
        }
      }
    } else if (target === 'schedules') {
      for (const row of rows) {
        // expect: agent,client,date,status,type,duration,notes
        try {
          const s = new Schedule({
            agent: row.agent,
            client: row.client,
            date: row.date ? new Date(row.date) : new Date(),
            status: row.status || 'scheduled',
            type: row.type || 'meeting',
            duration: row.duration || 30,
            notes: row.notes || ''
          });
          const saved = await s.save();
          created.push({ type: 'schedule', id: saved._id });
        } catch (e) {
          console.warn('Failed to create schedule row', row, e.message);
        }
      }
    } else {
      // default deals
      for (const row of rows) {
        try {
          const d = new Deal({
            title: row.title || `Imported Deal ${Date.now()}`,
            description: row.description || '',
            value: Number(row.value) || 0,
            client: row.client || null,
            agent: row.agent || null,
            stage: row.stage || 'lead',
            probability: Number(row.probability) || 0,
            expectedCloseDate: row.expectedCloseDate ? new Date(row.expectedCloseDate) : null
          });
          const saved = await d.save();
          created.push({ type: 'deal', id: saved._id });
        } catch (e) {
          console.warn('Failed to create deal row', row, e.message);
        }
      }
    }

    // cleanup temp file
    fs.unlinkSync(filePath);

    res.json({ message: 'Import completed', createdCount: created.length, created });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export { router as reportsRoutes };
