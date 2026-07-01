import xmlrpc from 'xmlrpc';

// Mock data to use when not actually connecting to Odoo.
// Mirrors the native Odoo `restaurant.table` shape: `table_number` is the
// label, `floor_id` is a [id, name] pair, and position_h/position_v/width/
// height/shape are the POS floor-plan layout fields used to draw the map.
// A couple of "Outdoor Terrace" tables are included so the bookable-floor
// filter (Main Floor) in /api/tables can be verified against mock data too.
const MOCK_TABLES = [
  { id: 1, table_number: 'A1', floor_id: [1, 'Main Floor'], seats: 2, position_h: 60, position_v: 60, width: 100, height: 100, shape: 'square', color: '', state: 'available', active: true },
  { id: 2, table_number: 'A2', floor_id: [1, 'Main Floor'], seats: 4, position_h: 210, position_v: 60, width: 120, height: 100, shape: 'square', color: '', state: 'available', active: true },
  { id: 3, table_number: 'A3', floor_id: [1, 'Main Floor'], seats: 4, position_h: 380, position_v: 60, width: 100, height: 100, shape: 'round', color: '', state: 'available', active: true },
  { id: 4, table_number: 'A4', floor_id: [1, 'Main Floor'], seats: 6, position_h: 540, position_v: 60, width: 160, height: 100, shape: 'square', color: '', state: 'available', active: true },
  { id: 5, table_number: 'A5', floor_id: [1, 'Main Floor'], seats: 2, position_h: 740, position_v: 60, width: 90, height: 90, shape: 'round', color: '', state: 'available', active: true },
  { id: 6, table_number: 'B1', floor_id: [1, 'Main Floor'], seats: 4, position_h: 60, position_v: 250, width: 120, height: 100, shape: 'square', color: '', state: 'available', active: true },
  { id: 7, table_number: 'B2', floor_id: [1, 'Main Floor'], seats: 8, position_h: 300, position_v: 240, width: 180, height: 120, shape: 'round', color: '', state: 'available', active: true },
  { id: 8, table_number: 'B3', floor_id: [1, 'Main Floor'], seats: 4, position_h: 560, position_v: 250, width: 120, height: 100, shape: 'square', color: '', state: 'available', active: true },
  { id: 9, table_number: 'C1', floor_id: [1, 'Main Floor'], seats: 4, position_h: 60, position_v: 430, width: 100, height: 100, shape: 'round', color: '', state: 'available', active: true },
  { id: 10, table_number: 'C2', floor_id: [1, 'Main Floor'], seats: 2, position_h: 220, position_v: 430, width: 90, height: 90, shape: 'square', color: '', state: 'available', active: true },
  { id: 11, table_number: 'C3', floor_id: [1, 'Main Floor'], seats: 10, position_h: 380, position_v: 430, width: 220, height: 110, shape: 'square', color: '', state: 'available', active: true },
  { id: 12, table_number: 'C4', floor_id: [1, 'Main Floor'], seats: 4, position_h: 660, position_v: 430, width: 110, height: 100, shape: 'round', color: '', state: 'available', active: true },
  // Outdoor Terrace — should be filtered OUT by the bookable-floor filter.
  { id: 13, table_number: 'T1', floor_id: [2, 'Outdoor Terrace'], seats: 2, position_h: 60, position_v: 60, width: 90, height: 90, shape: 'round', color: '', state: 'available', active: true },
  { id: 14, table_number: 'T2', floor_id: [2, 'Outdoor Terrace'], seats: 6, position_h: 200, position_v: 60, width: 160, height: 100, shape: 'square', color: '', state: 'available', active: true },
];

const MOCK_MENU = [
  { id: 101, name: 'Nasi Goreng Spesial', list_price: 35000, tenant_id: [1, 'Warung Nusantara'] },
  { id: 102, name: 'Mie Ayam Bakso', list_price: 25000, tenant_id: [1, 'Warung Nusantara'] },
  { id: 103, name: 'Es Teh Manis', list_price: 8000, tenant_id: [2, 'Kopi Corner'] },
  { id: 104, name: 'Kopi Susu Gula Aren', list_price: 18000, tenant_id: [2, 'Kopi Corner'] },
];

export class OdooClient {
  private url: string;
  private db: string;
  private username: string;
  private apiKey: string;
  private uid: number | null = null;
  private isMock: boolean;

  constructor() {
    this.url = process.env.ODOO_URL || '';
    this.db = process.env.ODOO_DB || '';
    this.username = process.env.ODOO_USERNAME || '';
    this.apiKey = process.env.ODOO_API_KEY || '';

    if (process.env.USE_MOCK_ODOO !== undefined) {
      this.isMock = process.env.USE_MOCK_ODOO === 'true';
    } else {
      this.isMock = process.env.NODE_ENV !== 'production';
    }
  }

  private validateConfig(): void {
    if (this.isMock) return;

    const missing: string[] = [];
    if (!this.url) missing.push('ODOO_URL');
    if (!this.db) missing.push('ODOO_DB');
    if (!this.username) missing.push('ODOO_USERNAME');
    if (!this.apiKey) missing.push('ODOO_API_KEY');

    if (missing.length > 0) {
      throw new Error(`Missing required Odoo environment variables: ${missing.join(', ')}`);
    }
  }

  async authenticate(username?: string, password?: string): Promise<number> {
    if (this.isMock) return 1;

    const isCustom = username !== undefined || password !== undefined;
    const authUsername = username !== undefined ? username : this.username;
    const authPassword = password !== undefined ? password : this.apiKey;
    const storeUid = !isCustom;

    return new Promise((resolve, reject) => {
      const client = xmlrpc.createClient({ url: `${this.url}/xmlrpc/2/common` });
      client.methodCall('authenticate', [this.db, authUsername, authPassword, {}], (error, value) => {
        if (error) {
          reject(error);
        } else {
          if (value === false || typeof value !== 'number') {
            reject(new Error('Authentication failed: Invalid credentials or unexpected response from Odoo'));
          } else {
            if (storeUid) {
              this.uid = value;
            }
            resolve(value);
          }
        }
      });
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async executeKw(model: string, method: string, args: any[], kwargs: any = {}): Promise<any> {
    this.validateConfig();

    if (this.isMock) {
      console.log(`[Mock Odoo] Executing ${model}.${method} with args:`, args);
      
      if (model === 'restaurant.table' && method === 'search_read') {
        return MOCK_TABLES;
      }
      if (model === 'foodcourt.reservation' && method === 'search_read') {
        // Pretend table 7 is held by an overlapping reservation so dev mode
        // exercises the "unavailable" styling on the map.
        return [{ table_ids: [7] }];
      }
      if (model === 'foodcourt.reservation' && method === 'get_available_tables_api') {
        return MOCK_TABLES;
      }
      if (model === 'product.product' && method === 'search_read') {
        return MOCK_MENU;
      }
      if (model === 'foodcourt.reservation' && method === 'create') {
        return Math.floor(Math.random() * 1000) + 1; // Return mock reservation ID
      }
      if (model === 'res.partner' && method === 'create') {
        return Math.floor(Math.random() * 1000) + 1; // Return mock partner ID
      }
      if (model === 'foodcourt.reservation' && method === 'action_confirm') {
        console.log(`[Mock Odoo] Confirmed reservation IDs:`, args[0]);
        return true;
      }
      if (model === 'foodcourt.reservation' && method === 'write') {
        console.log(`[Mock Odoo] Updated reservation IDs:`, args[0], `with vals:`, args[1]);
        return true;
      }
      return [];
    }

    if (!this.uid) {
      await this.authenticate();
    }

    return new Promise((resolve, reject) => {
      const client = xmlrpc.createClient({ url: `${this.url}/xmlrpc/2/object` });
      client.methodCall('execute_kw', [this.db, this.uid, this.apiKey, model, method, args, kwargs], (error, value) => {
        if (error) reject(error);
        else resolve(value);
      });
    });
  }
}

export const odooClient = new OdooClient();
