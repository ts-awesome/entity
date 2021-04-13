import 'reflect-metadata';
import {EntityService, UnitOfWork, IEntityService} from '../dist';
import {TestCompiler, TestDriver} from '@ts-awesome/orm/dist/test-driver';
import {dbField, dbTable} from '@ts-awesome/orm';

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
  let service: IEntityService<Model, 'id', 'id', never>;
  const compiler = new TestCompiler();
  const all: any = [{id: 1, value: 'test'}, {id: 2, value: 'other'}, {id: 3, value: 'other'}, {id: 4, value: 'other'}] as Model[];

  beforeAll(() => {
    const driver = new TestDriver();
    const uow = new UnitOfWork(driver);

    service = new EntityService(Model, uow, compiler) as any;
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
