import express, { Request, Response } from 'express';
import fetch, { HeadersInit } from 'node-fetch';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Configuration vars
const TENANT_ID = process.env.TENANT_ID || '<TENANT_ID>';
const CLIENT_ID = process.env.CLIENT_ID || '<CLIENT_ID>';
const CLIENT_SECRET = process.env.CLIENT_SECRET|| '<CLIENT_SECRET>';
const ENVIRONMENT_URL = process.env.ENVIRONMENT_URL || 'https://<your-environment>.crm.dynamics.com';

let tokenData = {
    token_type: "",
    expires_in: 0,
    ext_expires_in: 0,
    access_token: "",
    expires_at: 0 // <-- add this
};

async function headers(): Promise<HeadersInit> {
  console.log('Checking for cached token...');
  const now = Math.floor(Date.now() / 1000);

  // Check if tokenData is empty or expired (with 1 minute buffer)
  if (!tokenData.access_token || !tokenData.expires_at || tokenData.expires_at <= now + 60) {
    console.log('Token is expired or not available, fetching a new one...');
    const tokenResponse = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'client_credentials',
        scope: `${ENVIRONMENT_URL}/.default`
      })
    });

    const newToken = await tokenResponse.json();
    // Set absolute expiration time
    tokenData = {
      ...newToken,
      expires_at: now + (parseInt(newToken.expires_in) || 3600)
    };
    console.log('New token acquired, expires at:', tokenData.expires_at);
  } else {
    console.log('Cached token is still valid.');
  }

  return {
    'Authorization': `Bearer ${tokenData.access_token}`,
    'Content-Type': 'application/json',
    'OData-MaxVersion': '4.0',
    'OData-Version': '4.0',
    'Accept': 'application/json'
  };
}

// New record
app.post('/api/data/v9.2/:entityType', async (req: Request, res: Response) => {
  console.log('New record...');
  console.log('Request body:', req.body);
  console.log('Request params:', req.params);

  const { entityType } = req.params;
  const _headers = await headers();

  try { 
    const response = await fetch(`${ENVIRONMENT_URL}/api/data/v9.2/${getEntitySetNameFromLogicalName(entityType)}`, {
      method: 'POST',
      headers: _headers,
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).send({ error: text });
    }

    // Obtener el ID del nuevo recurso desde el header
    const entityUrl = response.headers.get('OData-EntityId');
    const idMatch = entityUrl?.match(/\(([^)]+)\)/);
    const createdId = idMatch?.[1];

    res.json({ id: createdId, entityType });
  }catch (error) {
    console.error('Error creating new record:', error);
    return res.status(500).json({ error: 'Error creating new record', details: error });
  }
});

// Delete record
app.delete('/api/data/v9.2/*', async (req: Request, res: Response) => {
  console.log('Delete record...');
  console.log('Request body:', req.body);
  console.log('Request params:', req.params);
  
  const rawPath = req.params[0];

  let validateFormatParams = rawPath.match(/^([^()]+)\(([^)]+)\)$/);
  if (!validateFormatParams) {
    return res.status(400).send('Formato de entidad/ID inválido');
  }

  const entityType = getEntitySetNameFromLogicalName(validateFormatParams[1]);
  const id = validateFormatParams[2];

  const _headers = await headers();

  try {
    await fetch(`${ENVIRONMENT_URL}/api/data/v9.2/${entityType}(${id})`, {
      method: 'DELETE',
      headers: _headers
    }).then(response => {
      if (!response.ok) { 
        throw new Error(`Error delete record: ${response.statusText}`);
      }
    });
  } catch (error) {
    console.error('Error delete record:', error);
    return res.status(500).json({ error: 'Error delete record', details: error });
  }  

  res.json({ id, name: '', entityType });
});

// Update record
app.patch('/api/data/v9.2/*', async (req: Request, res: Response) => {
  console.log('Update record...');
  console.log('Request body:', req.body);
  console.log('Request params:', req.params);

  const rawPath = req.params[0];

  let validateFormatParams = rawPath.match(/^([^()]+)\(([^)]+)\)$/);
  if (!validateFormatParams) {
    return res.status(400).send('Formato de entidad/ID inválido');
  }

  const entityType = getEntitySetNameFromLogicalName(validateFormatParams[1]);
  const id = validateFormatParams[2];

  const _headers = await headers();

  try {
    await fetch(`${ENVIRONMENT_URL}/api/data/v9.2/${entityType}(${id})`, {
      method: 'PATCH',
      headers: _headers,
      body: JSON.stringify(req.body)
    }).then(response => {
      if (!response.ok) { 
        throw new Error(`Error updating record: ${response.statusText}`);
      }
    });
  } catch (error) {
    console.error('Error updating record:', error);
    return res.status(500).json({ error: 'Error updating record', details: error });
  }  

  res.json({ id, name: '', entityType });
});

// Retrieve multiple records
app.get('/api/data/v9.2/:entityType', async (req: Request, res: Response) => {
  console.log('Fetching multiple records...');
  console.log('Request query:', req.query);
  console.log('Request params:', req.params);
  
  const { entityType } = req.params;
  const _headers = await headers();
  
  const queryParams = new URLSearchParams(req.query as Record<string, string>).toString();
  const url = `${ENVIRONMENT_URL}/api/data/v9.2/${getEntitySetNameFromLogicalName(entityType)}${queryParams ? `?${queryParams}` : ''}`;
  
  console.log(`Fetching data from: ${url}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: _headers
  });

  const data = await response.json();

  res.json(data);
});

// Retrieve single record
app.get('/api/data/v9.2/:entityType/:id', async (req: Request, res: Response) => {
  console.log('Fetching single record...');
  console.log('Request query:', req.query);
  console.log('Request params:', req.params);

  const { entityType, id } = req.params;
  const _headers = await headers();

  const queryParams = new URLSearchParams(req.query as Record<string, string>).toString();
  const url = `${ENVIRONMENT_URL}/api/data/v9.2/${getEntitySetNameFromLogicalName(entityType)}(${id})${queryParams ? `?${queryParams}` : ''}`;

  console.log(`Fetching data from: ${url}`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: _headers
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error retrieving record', details: error });
  }
});

// Execute operation
app.post('/api/data/v9.2/operation/:operationName', async (req: Request, res: Response) => {
  console.log('Execute...');
  console.log('Request query:', req.query);
  console.log('Request params:', req.params);

  const { operationName } = req.params;
  const body = req.body;

  const dynamicsBody: Record<string, any> = {};
  const parameterTypes: Record<string, any> = {};

  for (const paramName of Object.keys(body)) {
    let paramValue = body[paramName];
    let typeName = 'Edm.String';
    let structuralProperty = 1;

    if (typeof paramValue === 'string') {
      typeName = 'Edm.String';
      structuralProperty = 1;
    } else if (typeof paramValue === 'number') {
      typeName = Number.isInteger(paramValue) ? 'Edm.Int32' : 'Edm.Double';
    } else if (typeof paramValue === 'boolean') {
      typeName = 'Edm.Boolean';
    } else if (typeof paramValue === 'object' && paramValue !== null) {
      typeName = 'Edm.ComplexType';
      structuralProperty = 5;
    }

    dynamicsBody[paramName] = paramValue;
    parameterTypes[paramName] = { typeName, structuralProperty };
  }

  const _headers = await headers();
  const dynamicsUrl = `${ENVIRONMENT_URL}/api/data/v9.2/${operationName}`;

  try {
    const response = await fetch(dynamicsUrl, {
      method: 'POST',
      headers: _headers,
      body: JSON.stringify(dynamicsBody)
    });

    const result = await response.json();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Error forwarding request to Dynamics', details: error });
  }
});

app.listen(3001, () => {
  console.log('Server PCF-Proxy-Dynamics is running in http://localhost:3001');
});

function getEntitySetNameFromLogicalName(logicalName : string): string {
    if (!logicalName || typeof logicalName !== 'string') return '';

    // 1. Exceptions detect from Microsoft documentation
    const exceptions: { [key: string]: string } = {
        "person": "people",
        "child": "children",
        "ox": "oxen",
        "goose": "geese",
        "mouse": "mice",
        "analysis": "analyses",
        "basis": "bases",
        "thesis": "theses"
    };

    if (exceptions[logicalName]) {
        return exceptions[logicalName];
    }

    // 2. Entities already in plural, add "es" if it ends with "s"
    if (logicalName.endsWith("s")) {
        return logicalName + "es";
    }

    // 3. If it ends with "y" preceded by a consonant → replace with "ies"
    if (logicalName.match(/[^aeiou]y$/)) {
        return logicalName.slice(0, -1) + "ies";
    }

    // 4. If it ends with "plugin", do not change
    if (logicalName.endsWith("plugin")) {
        return logicalName;
    }

    // 5. If it ends with "ch", "sh", "x", "z" → add "es"
    if (logicalName.match(/(ch|sh|x|z)$/)) {
        return logicalName + "es";
    }

    // 6. General rule → add "s"
    return logicalName + "s";
}
