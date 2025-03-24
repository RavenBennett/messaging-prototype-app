import { Injectable } from '@angular/core';
import { AppDbService } from './app-db.service';
import initSqlJs, { SqlJsStatic, Database } from 'sql.js';
import { from, Observable } from 'rxjs';

export interface message {
  messageId: string,
  senderId: number,
  timeStamp: string,
  content: string,
  status: string,
}

export interface messageWithName {
  messageId: string,
  senderId: number,
  senderName: string
  timestamp: number,
  content: string,
  status: string,
}

@Injectable({
  providedIn: 'root',
})
export class UserDbService {
  private SQL: SqlJsStatic | null = null;
  private db: Database | null = null; 

  constructor(private appDb: AppDbService) {
  }

  // Load the SQL.js library
  private async loadSqlJs(): Promise<void> {
    try {
      this.SQL = await initSqlJs({
        locateFile: (file: string) => `assets/sql-wasm.wasm`
      });
      console.log('SQL.js library loaded successfully');
    } catch (error) {
      console.error('Failed to load SQL.js:', error);
    }
  }

  public initUserDb(user: {name: string, id: string}): Observable<void> {
    return from(this.initUserDbPromis(user));
  }

  private async initUserDbPromis(user: {name: string, id: string}): Promise<void> {
    await this.loadSqlJs();
    if (!this.db) {
      const userDb = await this.appDb.getUserDb(user.id);
      if(userDb === undefined) {
        this.createDatabase(user);
      } else {
        this.loadDatabase(userDb.sqliteDb);
      }
    } 
  }

  private async createDatabase(user: {name: string, id: string}): Promise<void> {
    if (!this.SQL) {
      throw new Error('SQL.js is not loaded yet');
    }
    this.db = new this.SQL.Database();

    this.db.run(`
      CREATE TABLE Messages (
        messageId TEXT  PRIMARY KEY,
        senderId INTEGER NOT NULL,
        timeStamp INTEGER NOT NULL,
        content TEXT NOT NULL,
        status TEXT NOT NULL,
        FOREIGN KEY (senderId) REFERENCES Users(id)
      );
  
      CREATE TABLE Users (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL
      );
  
      CREATE TABLE MessageRecipients (
        messageId TEXT NOT NULL,
        userId INTEGER NOT NULL,
        PRIMARY KEY (messageId, userId),
        FOREIGN KEY (messageId) REFERENCES Messages(messageId),
        FOREIGN KEY (userId) REFERENCES Users(id)
      );
    `);
    await this.saveDatabase(user.id);
    await this.addUser(user.id, {name: user.name, id: Number.parseInt(user.id)})
    console.log('New db loaded!');
  }

  private loadDatabase(data: Uint8Array): void {
    if (!this.SQL) {
      throw new Error('SQL.js is not loaded yet');
    }
    this.db = new this.SQL.Database(data);
    console.log('Existing SQLite database loaded');
  }

  private async saveDatabase(userId: string): Promise<void> {
    const binaryArray = this.db!.export();
    await this.appDb!.updateOrAddUserDb(userId, binaryArray);
  }

  private async idExists(tableName: string, idName:string,  id: string | number): Promise<boolean> {
    const query = `SELECT 1 FROM ${tableName} WHERE ${idName} = ? LIMIT 1;`;
    const result = await this.db!.exec(query, [id]);
  
    return result.length > 0;
  }

  public async getMessages(contactId: number, userId: number): Promise<messageWithName[]> {
    if (!this.db) {
      throw new Error('Database is not initialized.');
    }

    const query = `
    SELECT *
    FROM Messages
    JOIN MessageRecipients ON Messages.messageId = MessageRecipients.messageId
    JOIN Users ON Messages.senderId = Users.id
    WHERE (MessageRecipients.userId = $contact AND Messages.senderId = $user)
    OR (MessageRecipients.userId = $user AND Messages.senderId = $contact)
    ORDER BY Messages.timestamp ASC
  `;

    const result = this.db.exec(query, { $contact: contactId, $user: userId});
      if (result.length === 0) {
        return [];
      }

      const messages = result[0].values.map((row: any[]) => ({
        messageId: row[0],
        senderId: row[1],
        timestamp: row[2],
        content: row[3],
        status: row[4],
        senderName: row[8],
      }));
    
      return messages;
  }

  public async storeMessage(message: message, recipientIds: number[]): Promise<void>
  {
    if (!this.db) {
      throw new Error('Database is not initialized.');
    }

    if((await this.idExists('Messages', 'messageId', message.messageId))) {
      throw new Error('Message id not unique');
    }

    try {
      this.db.run('BEGIN TRANSACTION;');

      const insertMessageQuery = `
        INSERT INTO Messages (messageId, senderId, timeStamp, content, status) 
        VALUES (?, ?, ?, ?, ?);
      `;
      this.db.run(insertMessageQuery, [message.messageId, message.senderId, message.timeStamp, message.content, message.status]);
  
      const insertRecipientQuery = `
        INSERT INTO MessageRecipients (messageId, userId) 
        VALUES (?, ?);
      `;
  
      recipientIds.forEach((recipientId) => {
        this.db!.run(insertRecipientQuery, [message.messageId, recipientId]);
      });
  
      // Commit the transaction
      await this.db.run('COMMIT;');

      this.saveDatabase(message.senderId.toString());
    } catch (error) {
      this.db.run('ROLLBACK;');
      console.error('Transaction failed:', error);
      throw error;
    }
  }

  public async updateMessageStatus(userId: string, messageId: string, status: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database is not initialized.');
    }

      const insertMessageQuery = `
      UPDATE Messages
      SET status = ?
      WHERE messageId = ?
      `;
  
      await this.db.run(insertMessageQuery, [status, messageId]);
      this.saveDatabase(userId);
  }

  public async getUsers()
  {
    if (!this.db) {
      throw new Error('Database is not initialized.');
    }

    const query = `
    SELECT * 
    FROM USERS
    `;

    const result = this.db.exec(query, []);
      if (result.length === 0) {
        return [];
      }

      const users = result[0].values.map((row: any[]) => ({
        id: row[0],
        name: row[1],
      }));
    
      return users;
  }

  public async addUser(userId: string, contact: {name: string, id: number})
  {
    if (!this.db) {
      throw new Error('Database is not initialized.');
    }

    if((await this.idExists('Users', 'id', contact.id))) {
      return;
    }

    const query = `
    INSERT INTO Users (id, name) 
    VALUES (?, ?);
    `;

    await this.db.run(query, [contact.id, contact.name]);

    await this.saveDatabase(userId);
  }

}