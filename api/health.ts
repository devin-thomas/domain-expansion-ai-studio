type VercelResponse = {
  json: (body: unknown) => void;
};

export default function handler(_request: unknown, response: VercelResponse) {
  response.json({ status: 'ok', timestamp: new Date().toISOString() });
}
