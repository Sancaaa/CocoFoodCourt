import http from 'http';
// @ts-ignore
import Deserializer from 'xmlrpc/lib/deserializer';
// @ts-ignore
import Serializer from 'xmlrpc/lib/serializer';

interface User {
  id: number;
  name: string;
  login: string;
  password?: string;
  groups_id?: any[];
}

const users: User[] = [
  { id: 1, name: 'Admin', login: 'admin', password: 'admin', groups_id: [10] }
];

const MOCK_TABLES = [
  { id: 1, name: 'Table A1', floor_id: 1, floor_name: 'Main Hall', seats: 2, state: 'available' },
  { id: 2, name: 'Table A2', floor_id: 1, floor_name: 'Main Hall', seats: 4, state: 'available' },
  { id: 3, name: 'Table B1', floor_id: 2, floor_name: 'Outdoor', seats: 2, state: 'available' },
  { id: 4, name: 'Table B2', floor_id: 2, floor_name: 'Outdoor', seats: 6, state: 'available' },
];

const MOCK_MENU = [
  { id: 101, name: 'Nasi Goreng Spesial', list_price: 35000, category: 'Food' },
  { id: 102, name: 'Mie Ayam Bakso', list_price: 25000, category: 'Food' },
  { id: 103, name: 'Es Teh Manis', list_price: 8000, category: 'Beverage' },
  { id: 104, name: 'Kopi Susu Gula Aren', list_price: 18000, category: 'Beverage' },
];

const reservations: any[] = [];
const partners: any[] = [];
let nextId = 1000;

const server = http.createServer((req, res) => {
  console.log(`[Mock Odoo Server] Received request: ${req.method} ${req.url}`);

  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Mock Odoo Server is running');
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }

  if (req.url === '/xmlrpc/2/common') {
    const deserializer = new Deserializer();
    deserializer.deserializeMethodCall(req, (err: any, methodName: string, params: any[]) => {
      if (err) {
        console.error('[Mock Odoo Server] Deserialization error:', err);
        const xml = Serializer.serializeFault({ faultCode: 1, faultString: err.message || String(err) });
        res.writeHead(200, { 'Content-Type': 'text/xml' });
        res.end(xml);
        return;
      }

      console.log(`[Mock Odoo Server] common: method=${methodName}, params=`, params);

      if (methodName === 'authenticate') {
        const [_db, username, password, _options] = params;
        const user = users.find(u => u.login === username && u.password === password);
        if (user) {
          const xml = Serializer.serializeMethodResponse(user.id);
          res.writeHead(200, { 'Content-Type': 'text/xml' });
          res.end(xml);
        } else {
          const xml = Serializer.serializeMethodResponse(false);
          res.writeHead(200, { 'Content-Type': 'text/xml' });
          res.end(xml);
        }
      } else {
        const xml = Serializer.serializeFault({ faultCode: 2, faultString: `Method ${methodName} not supported on /xmlrpc/2/common` });
        res.writeHead(200, { 'Content-Type': 'text/xml' });
        res.end(xml);
      }
    });
    return;
  }

  if (req.url === '/xmlrpc/2/object') {
    const deserializer = new Deserializer();
    deserializer.deserializeMethodCall(req, (err: any, methodName: string, params: any[]) => {
      if (err) {
        console.error('[Mock Odoo Server] Deserialization error:', err);
        const xml = Serializer.serializeFault({ faultCode: 1, faultString: err.message || String(err) });
        res.writeHead(200, { 'Content-Type': 'text/xml' });
        res.end(xml);
        return;
      }

      console.log(`[Mock Odoo Server] object: method=${methodName}, params=`, params);

      if (methodName === 'execute_kw') {
        const [_db, uid, _apiKey, model, method, args, _kwargs] = params;

        // Bypass verification for special/default uid
        const userExists = uid === 1 || users.some(u => u.id === uid);
        if (!userExists) {
          const xml = Serializer.serializeFault({ faultCode: 3, faultString: `Unauthorized: invalid uid ${uid}` });
          res.writeHead(200, { 'Content-Type': 'text/xml' });
          res.end(xml);
          return;
        }

        const callback = (error: any, result?: any) => {
          if (error) {
            console.error('[Mock Odoo Server] Execution error:', error);
            const xml = Serializer.serializeFault({ faultCode: 4, faultString: error.message || String(error) });
            res.writeHead(200, { 'Content-Type': 'text/xml' });
            res.end(xml);
          } else {
            const xml = Serializer.serializeMethodResponse(result);
            res.writeHead(200, { 'Content-Type': 'text/xml' });
            res.end(xml);
          }
        };

        // Route by model
        if (model === 'res.groups') {
          if (method === 'search') {
            return callback(null, [10]);
          } else if (method === 'search_read') {
            return callback(null, [{ id: 10, name: 'Portal' }]);
          }
        }

        if (model === 'res.users') {
          if (method === 'create') {
            const vals = args[0] || {};
            const newId = nextId++;
            const newUser = {
              id: newId,
              name: vals.name || '',
              login: vals.login || '',
              password: vals.password || '',
              groups_id: vals.groups_id || []
            };
            users.push(newUser);
            console.log('[Mock Odoo Server] Registered new user:', newUser);
            return callback(null, newId);
          } else if (method === 'read' || method === 'search_read') {
            let matchedUsers = users;
            if (method === 'read' && Array.isArray(args[0])) {
              const ids = args[0];
              matchedUsers = users.filter(u => ids.includes(u.id));
            } else if (method === 'search_read') {
              const domain = args[0] || [];
              if (Array.isArray(domain) && domain.length > 0) {
                for (const clause of domain) {
                  if (Array.isArray(clause) && clause.length === 3) {
                    const [field, op, val] = clause;
                    if (field === 'login' && op === '=') {
                      matchedUsers = matchedUsers.filter(u => u.login === val);
                    }
                    if (field === 'id' && op === '=') {
                      matchedUsers = matchedUsers.filter(u => u.id === val);
                    }
                  }
                }
              }
            }
            return callback(null, matchedUsers);
          } else if (method === 'search') {
            let matchedUsers = users;
            const domain = args[0] || [];
            if (Array.isArray(domain) && domain.length > 0) {
              for (const clause of domain) {
                if (Array.isArray(clause) && clause.length === 3) {
                  const [field, op, val] = clause;
                  if (field === 'login' && op === '=') {
                    matchedUsers = matchedUsers.filter(u => u.login === val);
                  }
                }
              }
            }
            return callback(null, matchedUsers.map(u => u.id));
          }
        }

        if (model === 'restaurant.table') {
          if (method === 'search_read') {
            return callback(null, MOCK_TABLES);
          } else if (method === 'search') {
            return callback(null, MOCK_TABLES.map(t => t.id));
          }
        }

        if (model === 'foodcourt.reservation') {
          if (method === 'get_available_tables_api') {
            const reqDate = args[0];
            const reqStart = parseFloat(args[1]);
            const reqEnd = parseFloat(args[2]);

            // Find table IDs that are already reserved during this time
            const reservedTableIds = new Set<number>();
            for (const r of reservations) {
              if (r.reservation_date === reqDate) {
                const overlap = reqStart < r.time_end && reqEnd > r.time_start;
                if (overlap) {
                  if (Array.isArray(r.table_ids) && Array.isArray(r.table_ids[0]) && Array.isArray(r.table_ids[0][2])) {
                    for (const tid of r.table_ids[0][2]) {
                      reservedTableIds.add(tid);
                    }
                  }
                }
              }
            }

            const availableTables = MOCK_TABLES.filter(t => !reservedTableIds.has(t.id));
            return callback(null, availableTables);
          } else if (method === 'create') {
            const vals = args[0] || {};
            
            // Extract requested table IDs
            let tableIds: number[] = [];
            if (Array.isArray(vals.table_ids) && Array.isArray(vals.table_ids[0]) && Array.isArray(vals.table_ids[0][2])) {
              tableIds = vals.table_ids[0][2];
            }

            const reqDate = vals.reservation_date;
            const reqStart = parseFloat(vals.time_start);
            const reqEnd = parseFloat(vals.time_end);

            // Check if any requested table is already reserved in an overlapping slot
            let hasConflict = false;
            for (const r of reservations) {
              if (r.reservation_date === reqDate) {
                const overlap = reqStart < r.time_end && reqEnd > r.time_start;
                if (overlap) {
                  if (Array.isArray(r.table_ids) && Array.isArray(r.table_ids[0]) && Array.isArray(r.table_ids[0][2])) {
                    const existingTids = r.table_ids[0][2];
                    if (tableIds.some(tid => existingTids.includes(tid))) {
                      hasConflict = true;
                      break;
                    }
                  }
                }
              }
            }

            if (hasConflict) {
              return callback(new Error('Table is already reserved for this time slot'));
            }

            const newId = nextId++;
            const newRes = {
              id: newId,
              ...vals,
              state: 'draft',
              is_paid_online: false
            };
            reservations.push(newRes);
            console.log('[Mock Odoo Server] Created reservation:', newRes);
            return callback(null, newId);
          } else if (method === 'action_confirm') {
            const ids = args[0] || [];
            for (const id of ids) {
              const resRec = reservations.find(r => r.id === id);
              if (resRec) {
                resRec.state = 'confirmed';
              }
            }
            console.log('[Mock Odoo Server] Confirmed reservations:', ids);
            return callback(null, true);
          } else if (method === 'write') {
            const ids = args[0] || [];
            const vals = args[1] || {};
            for (const id of ids) {
              const resRec = reservations.find(r => r.id === id);
              if (resRec) {
                Object.assign(resRec, vals);
              }
            }
            console.log('[Mock Odoo Server] Wrote to reservations:', ids, vals);
            return callback(null, true);
          }
        }

        if (model === 'product.product') {
          if (method === 'search_read') {
            return callback(null, MOCK_MENU);
          } else if (method === 'search') {
            return callback(null, MOCK_MENU.map(p => p.id));
          }
        }

        if (model === 'res.partner') {
          if (method === 'create') {
            const vals = args[0] || {};
            const newId = nextId++;
            const newPartner = {
              id: newId,
              ...vals
            };
            partners.push(newPartner);
            console.log('[Mock Odoo Server] Created partner:', newPartner);
            return callback(null, newId);
          }
        }

        return callback(new Error(`Method ${method} on model ${model} not implemented`));
      } else {
        const xml = Serializer.serializeFault({ faultCode: 2, faultString: `Method ${methodName} not supported on /xmlrpc/2/object` });
        res.writeHead(200, { 'Content-Type': 'text/xml' });
        res.end(xml);
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

const port = process.env.PORT ? parseInt(process.env.PORT) : 8090;
server.listen(port, '0.0.0.0', () => {
  console.log(`[Mock Odoo Server] Running on port ${port}`);
});
