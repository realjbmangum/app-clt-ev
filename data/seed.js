#!/usr/bin/env node
// Reads data/clt-stations.csv and generates data/seed.sql with INSERT statements

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const csvPath = join(__dirname, 'clt-stations.csv');
const outPath = join(__dirname, 'seed.sql');

function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function escapeSql(val) {
  if (val === '' || val === undefined || val === null) return 'NULL';
  return "'" + String(val).replace(/'/g, "''") + "'";
}

const csv = readFileSync(csvPath, 'utf-8');
const lines = csv.split('\n').filter(l => l.trim());
const headers = parseCSVLine(lines[0]);

// Map CSV columns to DB columns
const columnMap = {
  'Charger ID': 'charger_id',
  'Company ID': 'company_id',
  'Connector Format': 'connector_format',
  'Connector Name': 'connector_name',
  'Connectors ID': 'connectors_id',
  'Country': 'country',
  'Country Code': 'country_code',
  'County': 'county',
  'Evse ID': 'evse_id',
  'Evse Name': 'evse_name',
  'Floor Label': 'floor_label',
  'Is Public (Yes / No)': 'is_public',
  'Mac Address': 'mac_address',
  'Max Amperage': 'max_amperage',
  'Max Voltage': 'max_voltage',
  'Org Name': 'org_name',
  'Party ID': 'party_id',
  'Power Type': 'power_type',
  'Provider ID': 'provider_id',
  'Provision Status': 'provision_status',
  'SCHEDULED CHARGING POLICY NAME': 'scheduled_charging_policy',
  'Site ID': 'site_id',
  'Station Address': 'station_address',
  'Station City': 'station_city',
  'Station ID': 'station_id',
  'Station Latitude': 'station_lat',
  'Station Longitude': 'station_lng',
  'Station State': 'station_state',
  'Station Status': 'station_status',
  'Station Zip': 'station_zip',
  'System Serial Number': 'system_serial',
  'Timezone Region': 'timezone',
  'Utility Name': 'utility_name',
  'Utility Plan Name': 'utility_plan',
  'Warranty Type': 'warranty_type',
};

const dbColumns = Object.values(columnMap);
const sql = [];

sql.push('-- Auto-generated seed data from clt-stations.csv');
sql.push('-- Generated: ' + new Date().toISOString());
sql.push('');

// Insert stations
for (let i = 1; i < lines.length; i++) {
  const fields = parseCSVLine(lines[i]);
  const values = headers.map((header, idx) => {
    const dbCol = columnMap[header];
    if (!dbCol) return null;
    const val = fields[idx] || '';

    if (dbCol === 'is_public') {
      return val.toLowerCase() === 'yes' ? '1' : '0';
    }
    if (dbCol === 'station_lat' || dbCol === 'station_lng') {
      return val === '' ? 'NULL' : val;
    }
    return escapeSql(val);
  }).filter(v => v !== null);

  sql.push(`INSERT INTO stations (${dbColumns.join(', ')}) VALUES (${values.join(', ')});`);
}

sql.push('');
sql.push('-- Default admin user (password: changeme123 - bcrypt hash)');
sql.push(`INSERT INTO users (email, name, role, password_hash) VALUES ('admin@cltev.gov', 'Admin', 'admin', '$2a$10$placeholder_hash_change_on_first_login');`);
sql.push('');

writeFileSync(outPath, sql.join('\n') + '\n');
console.log(`Generated ${lines.length - 1} station INSERT statements -> ${outPath}`);
