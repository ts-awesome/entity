import 'reflect-metadata';
import {EntityService, UnitOfWork, IEntityService} from '../dist';
import {TestCompiler, TestDriver} from '@ts-awesome/orm/dist/test-driver';
import {alias, and, count, dbField, dbTable, desc, of, Select, TableMetadataSymbol} from '@ts-awesome/orm';

@dbTable('Model')
class Model {
  @dbField({
    primaryKey: true,
  })
  public id!: number;
  @dbField
  public value!: string;
}

describe('where', () => {
  let service: IEntityService<Model, 'id', 'id', never>;
  const compiler = new TestCompiler();
  let driver!: TestDriver;
  const all: any = [{id: 1, value: 'test'}, {id: 2, value: 'other'}, {id: 3, value: 'other'}, {
    id: 4,
    value: 'other'
  }] as Model[];

  beforeAll(() => {
    driver = new TestDriver();
    const uow = new UnitOfWork(driver);

    service = new EntityService(Model, uow, compiler) as any;
  });

  it('query builder', async () => {
    driver.mapper = () => all;

    const result = await service.select().where(_ => _.id.eq(5)).fetch()
    expect(result).toEqual(all);
  });

  it('query valid', async () => {
    driver.mapper = () => all;

    const result = await service.select().where({id: 5}).fetch()
    expect(result).toEqual(all);
  });

  it('query undefined', async () => {
    driver.mapper = () => all;

    try {
      await service.select().where({id: undefined as never}).fetch();
      expect(false).toBeTruthy();
    } catch (e) {
      expect(e.constructor.name).toBe('TypeError');
    }
  });

  it('get valid', async () => {
    driver.mapper = () => all;

    const result = await service.get({id: 5})
    expect(result).toEqual(all);
  });

  it('get undefined', async () => {
    driver.mapper = () => all;

    try {
      await service.get({id: undefined as never});
      expect(false).toBeTruthy();
    } catch (e) {
      expect(e.constructor.name).toBe('TypeError');
    }
  });
});
