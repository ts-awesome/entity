import {injectable, unmanaged} from 'inversify';

import {IUnitOfWork, Action} from './interfaces';
import {IQueryData, IQueryDriver, IQueryExecutor, IsolationLevel, ITransaction} from '@ts-awesome/orm';

const TRANSACTION_NOT_STARTED = 'Transaction is not started';
const TRANSACTION_ALREADY_RESOLVED = 'Transaction is already resolved';

@injectable()
export class UnitOfWork<TQuery, R = IQueryData, IL = IsolationLevel> implements IUnitOfWork<TQuery, R, IL> {
  private currentTransaction: ITransaction<TQuery, R, IL> | null = null;

  public readonly uid = Date.now();

  constructor(
    @unmanaged() private queryDriver: IQueryDriver<TQuery, R, IL>
  ) {}

  public toString(): string {
    return `UnitOfWork[${this.uid}]`;
  }

  public async auto<TData>(action: Action<TData>): Promise<TData>;
  public async auto<TData>(isolationLevel: IL, action: Action<TData>): Promise<TData>;
  public async auto<TData>(...args: unknown[]): Promise<TData> {
    if (args.length === 0 || args.length > 2) {
      throw new TypeError(`Unexpected number of arguments`);
    }

    const isolationLevel = args.length > 1 ? (args as [IL]).shift() : undefined;
    const [action] = (args as [Action<TData>]);

    await this.begin(isolationLevel);
    try {
      const actionResult = await action();
      await this.commit();
      return actionResult;
    } catch (err) {
      await this.rollback();
      throw err;
    }
  }

  public async begin(isolationLevel?: IL): Promise<void> {
    if (this.currentTransaction?.finished) {
      throw new Error(TRANSACTION_ALREADY_RESOLVED);
    }

    this.currentTransaction = await this.queryDriver.begin(isolationLevel);
  }

  public async commit(): Promise<void> {
    if (!this.currentTransaction) {
      throw new Error(TRANSACTION_NOT_STARTED);
    }
    await this.currentTransaction.commit();
    this.currentTransaction = null;
  }

  public async rollback(): Promise<void> {
    if (!this.currentTransaction) {
      throw new Error(TRANSACTION_NOT_STARTED);
    }
    await this.currentTransaction.rollback();
    this.currentTransaction = null;
  }

  public async setIsolationLevel(isolationLevel: IL): Promise<void> {
    if (!this.currentTransaction) {
      throw new Error(TRANSACTION_NOT_STARTED);
    }
    await this.currentTransaction.setIsolationLevel(isolationLevel);
  }

  public getExecutor(): IQueryExecutor<TQuery, R> {
    return this.currentTransaction ?? this.queryDriver;
  }
}
