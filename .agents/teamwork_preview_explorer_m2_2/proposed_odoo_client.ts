import xmlrpc from 'xmlrpc';

// Mock data to use when not actually connecting to Odoo
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

    // Determine if we should mock.
    // Explicitly set `USE_MOCK_ODOO === 'true'` forces mock.
    // If not specified, default is false in production, true in development/test.
    const useMockEnv = process.env.USE_MOCK_ODOO;
    if (useMockEnv !== undefined) {
      this.isMock = useMockEnv === 'true';
    } else {
      this.isMock = process.env.NODE_ENV !== 'production';
    }
  }

  /**
   * Helper to ensure all required Odoo variables are present when not in mock mode.
   * Throws a descriptive error at call time rather than constructor/build time.
   */
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

  async authenticate(): Promise<number> {
    if (this.isMock) return 1;

    this.validateConfig();

    return new Promise((resolve, reject) => {
      const client = xmlrpc.createClient({ url: `${this.url}/xmlrpc/2/common` });
      client.methodCall('authenticate', [this.db, this.username, this.apiKey, {}], (error, value) => {
        if (error) {
          reject(error);
        } else if (value === false) {
          reject(new Error('Odoo authentication failed: Invalid username or API key'));
        } else if (typeof value !== 'number') {
          reject(new Error(`Odoo authentication failed: Returned UID is not a number (received: ${value})`));
        } else {
          this.uid = value;
          resolve(value);
        }
      });
    });
  }

  async executeKw(model: string, method: string, args: any[], kwargs: any = {}): Promise<any> {
    if (this.isMock) {
      console.log(`[Mock Odoo] Executing ${model}.${method} with args:`, args);
      
      if (model === 'restaurant.table' && method === 'search_read') {
        return MOCK_TABLES;
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

    this.validateConfig();

    if (!this.uid) {
      await this.authenticate();
    }

    return new Promise((resolve, reject) => {
      const client = xmlrpc.createClient({ url: `${this.url}/xmlrpc/2/object` });
      client.methodCall('execute_kw', [this.db, this.uid!, this.apiKey, model, method, args, kwargs], (error, value) => {
        if (error) reject(error);
        else resolve(value);
      });
    });
  }
}

export const odooClient = new OdooClient();
