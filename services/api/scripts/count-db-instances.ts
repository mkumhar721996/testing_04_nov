import { execFileSync } from 'node:child_process';

/** Counts the instances in the JSON of `aws rds describe-db-instances`. */
export function countInstances(describeOutput: unknown): number {
  const list = (describeOutput as { DBInstances?: unknown } | null)?.DBInstances;
  return Array.isArray(list) ? list.length : 0;
}

// Usage: ENVIRONMENT=nonprod AWS_REGION=us-east-1 pnpm count:db-instances
if (require.main === module) {
  const region = process.env.AWS_REGION ?? 'us-east-1';
  const environment = process.env.ENVIRONMENT ?? 'nonprod';
  const out = execFileSync(
    'aws',
    [
      'rds',
      'describe-db-instances',
      '--region',
      region,
      '--query',
      `{DBInstances: DBInstances[?contains(to_string(TagList), '"Environment"') && contains(to_string(TagList), '"${environment}"')]}`,
      '--output',
      'json',
    ],
    { encoding: 'utf8' },
  );
  const count = countInstances(JSON.parse(out));
  console.log(count);
  if (count !== 1) process.exitCode = 1;
}
