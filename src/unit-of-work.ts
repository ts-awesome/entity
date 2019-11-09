import {injectable, unmanaged} from 'inversify';

import {IUnitOfWork, IQueryExecutorProvider, Action} from './interfaces';
import {IQueryDriver, IQueryExecutor, ITransaction} from '@viatsyshyn/ts-orm';

const TRANSACTION_NOT_STARTED = 'Transaction is not started';
const TRANSACTION_ALREADY_RESOLVED = 'Transaction is already resolved';

@injectable()
export class UnitOfWork<TQuery> implements IUnitOfWork<TQuery> {
  private currentTransaction: ITransaction<TQuery> | null;

  public readonly uid = Date.now();

  constructor(
    @unmanaged() private queryDriver: IQueryDriver<TQuery>
  ) {}

  public toString() {
    return `UnitOfWork[${this.uid}]`;
  }

  public async auto<TData>(action: Action<TData>): Promise<TData> {
    await this.begin();
    try {
      const actionResult = await action();
      await this.commit();
      return actionResult;
    } catch (err) {
      await this.rollback();
      throw err;
    }
  }

  public async begin() {
    if (this.currentTransaction?.finished) {
      throw new Error(TRANSACTION_ALREADY_RESOLVED);
    }

    this.currentTransaction = await this.queryDriver.begin();
  }

  public async commit() {
    if (!this.currentTransaction) {
      throw new Error(TRANSACTION_NOT_STARTED);
    }
    await this.currentTransaction.commit();
    this.currentTransaction = null;
  }

  public async rollback() {
    if (!this.currentTransaction) {
      throw new Error(TRANSACTION_NOT_STARTED);
    }
    await this.currentTransaction.rollback();
    this.currentTransaction = null;
  }

  public getExecutor(): IQueryExecutor<TQuery> {
    return this.currentTransaction ?? this.queryDriver;
  }
}
