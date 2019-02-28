import { inject, injectable } from 'inversify';
import { IQueryExecutorProvider } from './interfaces';
import { IQueryExecutor } from '@viatsyshyn/ts-orm';
import Symbols from './symbols';

@injectable()
export class QueryExecutorProvider<TQuery> implements IQueryExecutorProvider<TQuery> {

  constructor(
    @inject(Symbols.UnitOfWork) private readonly unitOfWork: IQueryExecutorProvider<TQuery>
  ) {
  }

  public getExecutor(): IQueryExecutor<TQuery> {
    return this.unitOfWork.getExecutor();
  }
}
