#!/usr/bin/env node
// Builds single-file Postman v2.1 JSON exports from the v3 YAML sources, for
// tools that only accept classic imports (Postman "Import" button, Newman).
// The v3 YAML under postman/ remains the source of truth.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const collectionName = process.argv[2] || 'Porkbun API v3';
const collectionDir = path.join(repoRoot, 'postman/collections', collectionName);
const environmentsDir = path.join(repoRoot, 'postman/environments');
const outDir = path.join(repoRoot, 'exports');

const SCHEMA_V21 = 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json';
const SCRIPT_EVENTS = {
  beforeRequest: 'prerequest',
  afterResponse: 'test',
  'http:beforeRequest': 'prerequest',
  'http:afterResponse': 'test',
};
const RAW_LANGUAGES = new Set(['json', 'text', 'xml', 'html', 'javascript']);

const readYaml = (file) => YAML.parse(fs.readFileSync(file, 'utf8'));

function stableId(seed) {
  const hex = crypto.createHash('sha1').update(seed).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function toKeyValueList(entries) {
  if (!entries) return [];
  const list = Array.isArray(entries)
    ? entries
    : Object.entries(entries).map(([key, value]) => ({ key, value }));
  return list.map((e) => ({
    key: e.key,
    value: e.value == null ? '' : String(e.value),
    ...(e.description ? { description: e.description } : {}),
    ...(e.disabled ? { disabled: true } : {}),
  }));
}

function toEvents(scripts) {
  return (scripts || [])
    .filter((s) => SCRIPT_EVENTS[s.type] && typeof s.code === 'string')
    .map((s) => ({
      listen: SCRIPT_EVENTS[s.type],
      script: { type: 'text/javascript', exec: s.code.split('\n') },
    }));
}

function toUrl(raw, queryParams, pathVariables) {
  const [base, queryString] = raw.split('?');
  const [host, ...pathSegments] = base.split('/');
  const query = queryParams
    ? toKeyValueList(queryParams)
    : (queryString || '')
        .split('&')
        .filter(Boolean)
        .map((pair) => {
          const [key, ...rest] = pair.split('=');
          return { key, value: rest.join('=') };
        });
  const url = { raw, host: [host], path: pathSegments };
  if (query.length) url.query = query;
  if (pathVariables?.length) url.variable = toKeyValueList(pathVariables);
  return url;
}

function toBody(body) {
  if (!body || !body.type || body.type === 'none') return undefined;
  if (RAW_LANGUAGES.has(body.type)) {
    return { mode: 'raw', raw: body.content ?? '', options: { raw: { language: body.type } } };
  }
  if (body.type === 'urlencoded') return { mode: 'urlencoded', urlencoded: toKeyValueList(body.content) };
  if (body.type === 'formdata') {
    return {
      mode: 'formdata',
      formdata: (body.content || []).map((f) => ({
        key: f.key,
        type: f.type || 'text',
        ...(f.type === 'file' ? { src: f.src } : { value: f.value ?? '' }),
        ...(f.description ? { description: f.description } : {}),
      })),
    };
  }
  if (body.type === 'file') return { mode: 'file', file: { src: body.content?.src ?? body.src ?? '' } };
  return undefined;
}

function toRequest(src, description) {
  const request = {
    method: src.method,
    header: toKeyValueList(src.headers),
    url: toUrl(src.url, src.queryParams, src.pathVariables),
  };
  const body = toBody(src.body);
  if (body) request.body = body;
  if (description) request.description = description;
  return request;
}

function toResponse(file, originalRequest) {
  const example = readYaml(file);
  const res = example.response || {};
  const bodyType = res.body?.type;
  return {
    order: example.order ?? Number.MAX_SAFE_INTEGER,
    item: {
      name: example.name || path.basename(file, '.example.yaml'),
      originalRequest: toRequest({ ...originalRequest, ...example.request }),
      status: res.statusText || '',
      code: res.statusCode,
      _postman_previewlanguage: bodyType === 'json' ? 'json' : 'text',
      header: toKeyValueList(res.headers),
      cookie: [],
      body: res.body?.content ?? '',
    },
  };
}

function toRequestItem(dir, file) {
  const src = readYaml(file);
  const item = {
    name: src.name || path.basename(file, '.request.yaml'),
    request: toRequest(src, src.description),
    response: [],
  };
  const events = toEvents(src.scripts);
  if (events.length) item.event = events;

  if (src.examples) {
    const examplesDir = path.join(dir, src.examples);
    if (fs.existsSync(examplesDir)) {
      item.response = fs
        .readdirSync(examplesDir)
        .filter((f) => f.endsWith('.example.yaml'))
        .map((f) => toResponse(path.join(examplesDir, f), src))
        .sort((a, b) => a.order - b.order || a.item.name.localeCompare(b.item.name))
        .map((r) => r.item);
    }
  }
  return { order: src.order ?? Number.MAX_SAFE_INTEGER, item };
}

function readDefinition(dir) {
  const file = path.join(dir, '.resources/definition.yaml');
  return fs.existsSync(file) ? readYaml(file) : {};
}

function toItems(dir) {
  const entries = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== '.resources') {
      const def = readDefinition(full);
      const folder = { name: def.name || entry.name, item: toItems(full) };
      if (def.description) folder.description = def.description;
      const events = toEvents(def.scripts);
      if (events.length) folder.event = events;
      entries.push({ order: def.order ?? Number.MAX_SAFE_INTEGER, item: folder });
    } else if (entry.isFile() && entry.name.endsWith('.request.yaml')) {
      entries.push(toRequestItem(dir, full));
    }
  }
  return entries
    .sort((a, b) => a.order - b.order || a.item.name.localeCompare(b.item.name))
    .map((e) => e.item);
}

function exportCollection() {
  const def = readDefinition(collectionDir);
  const name = def.name || collectionName;
  const variables = Array.isArray(def.variables)
    ? def.variables
    : Object.entries(def.variables || {}).map(([key, value]) => ({ key, value }));

  const collection = {
    info: {
      _postman_id: stableId(`collection:${name}`),
      name,
      ...(def.description ? { description: def.description } : {}),
      schema: SCHEMA_V21,
    },
    item: toItems(collectionDir),
    event: toEvents(def.scripts),
    variable: variables.map((v) => ({ key: v.key, value: v.value == null ? '' : String(v.value), type: 'string' })),
  };

  const file = path.join(outDir, `${name}.postman_collection.json`);
  fs.writeFileSync(file, JSON.stringify(collection, null, 2) + '\n');
  return file;
}

function exportEnvironments() {
  if (!fs.existsSync(environmentsDir)) return [];
  return fs
    .readdirSync(environmentsDir)
    .filter((f) => f.endsWith('.environment.yaml') && !f.includes('.local.'))
    .map((f) => {
      const env = readYaml(path.join(environmentsDir, f));
      const out = {
        id: stableId(`environment:${env.name}`),
        name: env.name,
        values: (env.values || []).map((v) => ({
          key: v.key,
          value: v.type === 'secret' ? '' : String(v.value ?? ''),
          type: v.type === 'secret' ? 'secret' : 'default',
          enabled: v.enabled !== false,
        })),
        _postman_variable_scope: 'environment',
      };
      const file = path.join(outDir, `${env.name}.postman_environment.json`);
      fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
      return file;
    });
}

if (!fs.existsSync(collectionDir)) {
  console.error(`Collection not found: ${collectionDir}`);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
for (const file of [exportCollection(), ...exportEnvironments()]) {
  console.log(`Wrote ${path.relative(repoRoot, file)}`);
}
