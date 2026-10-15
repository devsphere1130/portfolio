// Run with: npm test   (Node's built-in test runner; no extra dependencies)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chatUrl, fillTemplate } from './whatsapp.js';

test('chatUrl keeps only digits and URL-encodes the message', () => {
  const url = chatUrl('+91 98765-43210', 'Hi & welcome? 100% #1\nLine two 👋 नमस्ते');
  assert.equal(url, 'https://wa.me/919876543210?text=Hi%20%26%20welcome%3F%20100%25%20%231%0ALine%20two%20%F0%9F%91%8B%20%E0%A4%A8%E0%A4%AE%E0%A4%B8%E0%A5%8D%E0%A4%A4%E0%A5%87');
  assert.equal(decodeURIComponent(url.split('?text=')[1]), 'Hi & welcome? 100% #1\nLine two 👋 नमस्ते');
});

test('chatUrl without a number returns null; without text has no query', () => {
  assert.equal(chatUrl('', 'x'), null);
  assert.equal(chatUrl('919876543210', ''), 'https://wa.me/919876543210');
});

test('fillTemplate fills known values and removes missing ones cleanly', () => {
  const t = 'Hi Devsphere, I saw your project "{title}" on your portfolio. {url} I would like to know more about it.';
  assert.equal(fillTemplate(t, { title: 'Clinic Portal', url: 'https://clinic.example.com' }),
    'Hi Devsphere, I saw your project "Clinic Portal" on your portfolio. https://clinic.example.com I would like to know more about it.');
  assert.equal(fillTemplate(t, { title: 'Clinic Portal' }),
    'Hi Devsphere, I saw your project "Clinic Portal" on your portfolio. I would like to know more about it.');
  assert.equal(fillTemplate('Inquiry ({service}). Name: {name}.', { name: 'Asha' }), 'Inquiry. Name: Asha.');
});

test('fillTemplate never injects unknown placeholders', () => {
  assert.equal(fillTemplate('Hello {email}{secret}', { name: 'x' }), 'Hello');
});
