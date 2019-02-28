import { inject, injectable } from 'inversify';

import { IUnitOfWork, IQueryExecutorProvider } from './interfaces';
import { IQueryExecutor } from '@viatsyshyn/ts-orm';
import {
  ISqlDataDriver,
  ISqlTransaction
} from '@viatsyshyn/ts-orm';

import Symbols from './symbols';

@injectable()
export class UnitOfWork<TQuery> implements IUnitOfWork, IQueryExecutorProvider<TQuery> {
  private currentTransaction: ISqlTransaction<TQuery> | null;

  _ID = Date.now();

  constructor(
    @inject(Symbols.ISqlDataDriver)
    private sqlDataDriver: ISqlDataDriver<TQuery>
  ) {
  }

  public async auto<TData>(
    action: () => Promise<TData>
  ): Promise<TData> {
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

  public async begin(): Promise<void> {
    if (this.currentTransaction && !this.currentTransaction.finished) {
      throw new Error('Transaction is finished');
    }

    this.currentTransaction = await this.sqlDataDriver.begin();
  }

  public async commit(): Promise<void> {
    if (!this.currentTransaction) {
      throw new Error('Transaction is not started');
    }
    await this.currentTransaction.commit();
    this.currentTransaction = null;
  }

  public async rollback(): Promise<void> {
    if (!this.currentTransaction) {
      throw new Error('Transaction is not started');
    }
    await this.currentTransaction.rollback();
    this.currentTransaction = null;
  }

  public getExecutor(): IQueryExecutor<TQuery> {
    return <any>(this.currentTransaction 
      ? this.currentTransaction
      : this.sqlDataDriver);
  }
}
