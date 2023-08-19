import { expect, test } from 'vitest';

import { generateStructuredText } from '@/utils/string';

test('should replace template with provided values', () => {
  const template = `Hello, {user}! How are you {time}?`;

  const values = {
    user: 'Namchee',
    time: 'today',
    random: 'Not here',
  };

  const result = generateStructuredText(template, values);

  expect(result).toBe(`Hello, Namchee! How are you today?`);
});
