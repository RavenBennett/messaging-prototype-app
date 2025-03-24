import { Injectable } from '@angular/core';
import Dexie from 'dexie';
import { Observable } from 'rxjs';

export interface userDatabases {
  userId: string; 
  chunkId: number, 
  sqliteDb: Uint8Array
}

@Injectable({
  providedIn: 'root',
})
export class AppDbService extends Dexie {
  userDatabases!: Dexie.Table< userDatabases, [string, number]>;

  constructor() {
    super('MessageDB');
    this.version(1).stores({
      userDatabases: "[userId+chunkId], userId, chunkId"
    });

    this.userDatabases = this.table('userDatabases');
  }

  async addUserDb(db: userDatabases): Promise<[string, number]> {
    return this.userDatabases.put(db);
  }

  async updateUserDb(db: userDatabases): Promise<number>
  {
    return this.userDatabases.update([db.userId, db.chunkId], {sqliteDb: db.sqliteDb});
  }

  async updateOrAddUserDb(userId: string, db: Uint8Array): Promise<any>
  {
    const hasDb = (await this.dbCountForUser(userId)) > 0;
    if(hasDb)
    {
      return this.updateUserDb({userId: userId, chunkId: 0, sqliteDb: db});
    } else {
      return this.addUserDb({userId: userId, chunkId: 0, sqliteDb: db});
    }
  }

  async getUserDb(userId: string): Promise<userDatabases | undefined> {
    return this.userDatabases.where('userId').equals(userId).first();
  }

  async dbCountForUser(userId: string): Promise<number>
  {
    return this.userDatabases.where('userId').equals(userId).count()
  }

}