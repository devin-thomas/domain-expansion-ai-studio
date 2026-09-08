import { DomainRecord } from '../types';
import { formatCurrency } from '../utils/domainUtils';

/**
 * Creates a renewal task in user's default Tasks list
 */
export async function createRenewalTask(
  accessToken: string,
  domain: DomainRecord
): Promise<{ taskId: string; alreadyExisted: boolean }> {
  // First check if an existing incomplete task with same title exists in default list
  const listUrl = 'https://tasks.googleapis.com/tasks/v1/lists/@default/tasks?showCompleted=false';
  let existingTaskId: string | null = null;

  try {
    const checkRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (checkRes.ok) {
      const data = await checkRes.json();
      const items = data.items || [];
      const match = items.find(
        (t: any) =>
          t.title &&
          t.title.toLowerCase().trim() === `Renew ${domain.name}`.toLowerCase()
      );
      if (match) {
        existingTaskId = match.id;
      }
    }
  } catch (err) {
    console.warn('Could not list Google Tasks:', err);
  }

  if (existingTaskId) {
    return { taskId: existingTaskId, alreadyExisted: true };
  }

  const costText =
    domain.cost !== null && domain.cost !== undefined
      ? formatCurrency(domain.cost, domain.currency)
      : 'Price unlisted';

  const notes = [
    `Registrar: ${domain.registrar || 'Unspecified'}`,
    `Renewal Date: ${domain.renewalDate}`,
    `Cost: ${costText}`,
    `Intention: ${domain.renewalIntention}`,
    domain.notes ? `Notes: ${domain.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const taskPayload = {
    title: `Renew ${domain.name}`,
    notes,
    due: `${domain.renewalDate}T09:00:00.000Z`,
  };

  const createRes = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(taskPayload),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create Google Task (${createRes.status}): ${errText}`);
  }

  const result = await createRes.json();
  return { taskId: result.id, alreadyExisted: false };
}
