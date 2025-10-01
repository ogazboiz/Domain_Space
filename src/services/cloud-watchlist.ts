import Airtable from 'airtable';

// Airtable configuration
const airtableToken = process.env.NEXT_PUBLIC_AIRTABLE_TOKEN || '';
const airtableBaseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID || '';

class AirtableWatchlistService {
  private base: Airtable.Base;

  constructor(token: string, baseId: string) {
    Airtable.configure({ apiKey: token });
    this.base = Airtable.base(baseId);
  }

  async addToWatchlist(domainName: string, userAddress: string): Promise<void> {
    try {
      await this.base('Watchlist Entries').create([
        {
          fields: {
            Domain_Name: domainName,
            User_Address: userAddress,
            Added_At: new Date().toISOString().split('T')[0], // Format: YYYY-MM-DD
          },
        },
      ]);
    } catch (error) {
      throw error;
    }
  }

  async removeFromWatchlist(domainName: string, userAddress: string): Promise<void> {
    try {
      const records = await this.base('Watchlist Entries')
        .select({
          filterByFormula: `AND({Domain_Name} = '${domainName}', {User_Address} = '${userAddress}')`,
        })
        .all();

      for (const record of records) {
        await this.base('Watchlist Entries').destroy(record.id);
      }
    } catch (error) {
      throw error;
    }
  }

  async getWatchlist(userAddress: string): Promise<string[]> {
    try {
      const records = await this.base('Watchlist Entries')
        .select({
          filterByFormula: `{User_Address} = '${userAddress}'`,
        })
        .all();
      
      const domains = records.map((record) => (record.fields as any).Domain_Name).filter(Boolean);
      return domains;
    } catch (error) {
      throw error;
    }
  }

  async isWatching(domainName: string, userAddress: string): Promise<boolean> {
    try {
      const records = await this.base('Watchlist Entries')
        .select({
          filterByFormula: `AND({Domain_Name} = '${domainName}', {User_Address} = '${userAddress}')`,
          maxRecords: 1,
        })
        .all();

      return records.length > 0;
    } catch (error) {
      return false;
    }
  }
}

// Export the Airtable watchlist service
export const watchlistService = new AirtableWatchlistService(
  airtableToken,
  airtableBaseId
);
