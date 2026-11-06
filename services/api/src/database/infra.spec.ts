import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';

it('infra declares exactly one PostgreSQL instance', () => {
  const tf = readFileSync(join(__dirname, '../../../../infra/db/main.tf'), 'utf8');
  expect(tf.match(/resource\s+"aws_db_instance"/g)).toHaveLength(1);
});
