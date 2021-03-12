import 'reflect-metadata';
import {EntityService, UnitOfWork} from '../dist';
import {TestCompiler, TestDriver} from '@ts-awesome/orm-test-driver';
import {dbField, DbReader, dbTable} from '@ts-awesome/orm';
import {IEntityService} from "../src";

@dbTable('Model')
class Model {
  @dbField({
    primaryKey: true,
  })
  public id!: number;
  @dbField
  public value!: string;
}

class Aggregated {
  @dbField public id!: number;
  @dbField public count!: number;
}

describe('select', () => {
  let service: IEntityService<Model, 'id', 'id'>;
  const compiler = new TestCompiler();
  const all: any = [{id: 1, value: 'test'}, {id: 2, value: 'other'}, {id: 3, value: 'other'}, {id: 4, value: 'other'}] as Model[];

  beforeAll(() => {
    const driver = new TestDriver();
    const uow = new UnitOfWork(driver);
    const reader = new DbReader(Model);

    service = new EntityService(Model, uow, compiler, reader) as any;
  });

  it('query all', async () => {
    compiler.mapper = () => all;

    const result = await service.select().where(x => x.id.eq(5)).fetch()
    expect(result).toEqual(all);
  });

  it('query one', async () => {
    compiler.mapper = () => all;

    const result = await service.select().where(({id}) => id.eq(2)).fetchOne();
    expect(result).toEqual(all[0]);
  });

  it('query all aggregated', async () => {
    compiler.mapper = () => all;

    const result = await service.select().where(x => x.id.eq(5)).fetch(Aggregated)
    expect(result).toEqual(all);
  });

  it('query one aggregated', async () => {
    compiler.mapper = () => all;

    const result = await service.select().where(({id}) => id.eq(2)).fetchOne(Aggregated);
    expect(result).toEqual(all[0]);
  });
});
