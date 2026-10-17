import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDuration, groupStack, numberSections, toBlocks, wrapIndex, yearRange } from './caseStudy.js';

test('gallery index wraps both ways', () => {
  assert.equal(wrapIndex(3, 3), 0);
  assert.equal(wrapIndex(-1, 3), 2);
  assert.equal(wrapIndex(7, 3), 1);
  assert.equal(wrapIndex(0, 0), 0);
});

test('stack groups keep first-seen order', () => {
  const groups = groupStack([
    { name: 'React', category: 'Frontend' }, { name: 'Django', category: 'Backend' },
    { name: 'Vite', category: 'Frontend' }, { name: 'Docker', category: '' },
  ]);
  assert.deepEqual(groups.map((g) => [g.category, g.entries.map((e) => e.name)]),
    [['Frontend', ['React', 'Vite']], ['Backend', ['Django']], ['Other', ['Docker']]]);
});

test('durations', () => {
  assert.equal(formatDuration(75.4), '1:15');
  assert.equal(formatDuration(3725), '1:02:05');
  assert.equal(formatDuration(null), '');
});

test('plain-text paragraphs become text and list blocks', () => {
  assert.deepEqual(toBlocks(['One line\ncontinues', '- First\n- Second', '<b>not html</b>']), [
    { type: 'text', text: 'One line continues' },
    { type: 'list', items: ['First', 'Second'] },
    { type: 'text', text: '<b>not html</b>' },
  ]);
});

test('year ranges and section numbers', () => {
  assert.equal(yearRange('2024-03-01', '2024-09-30'), '2024');
  assert.equal(yearRange('2023-11-01', '2024-02-01'), '2023–2024');
  assert.equal(yearRange(null, '2025-01-01'), '2025');
  assert.deepEqual(numberSections(['overview', 'gallery']), { overview: '01', gallery: '02' });
});
