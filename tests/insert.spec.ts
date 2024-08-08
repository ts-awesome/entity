import 'reflect-metadata';
import {EntityService, UnitOfWork, IEntityService} from '../dist';
import {TestCompiler, TestDriver} from '@ts-awesome/orm/dist/test-driver';
import {cast, dbField, dbTable} from '@ts-awesome/orm';

@dbTable('Model')
class Model {
  @dbField({
    primaryKey: true,
  })
  public id!: number;
  @dbField
  public value!: string;

  @dbField({
    model: [String]
  })
  public tags!: string[];
}

describe('insert', () => {
  let service: IEntityService<Model, 'id', 'id', never>;
  let compiler: TestCompiler;
  let driver!: TestDriver;
  const all: any = [
    {id: 1, value: 'test', tags: []},
    {id: 2, value: 'other', tags: []},
    {id: 3, value: 'other', tags: []},
    {id: 4, value: 'other', tags: []}
  ] as Model[];

  beforeEach(() => {
    compiler = new TestCompiler();
    driver = new TestDriver();
    const uow = new UnitOfWork(driver);

    service = new EntityService(Model, uow, compiler) as any;
  });

  it('addOne', async () => {
    driver.mapper = (query) => {
      expect(query.raw._type).toBe('INSERT');
      expect(query.raw._table.tableName).toBe('Model');
      expect(query.raw._columns).toStrictEqual([
        { _column: { name: 'id', table: 'Model'}},
        { _column: { name: 'value', table: 'Model'}},
        { _column: { name: 'tags', table: 'Model'}},
      ]);
      if (query.raw._type === 'INSERT') {
        expect(query.raw._values).toStrictEqual({
          value: 'test',
          tags: {_operator: 'CAST', _operands: [[], 'text[]']}
        });
      }

      return all;
    }

    const result = await service.addOne({
      value: 'test',
      tags: cast<string[]>([], 'text[]')
    })
    expect(result).toEqual(all[0]);
  });

  it('add', async () => {
    let counter = 0
    driver.mapper = (query) => {
      counter = query.queryCounter
      expect(query.raw._type).toBe('INSERT');
      expect(query.raw._table.tableName).toBe('Model');
      expect(query.raw._columns).toStrictEqual([
        { _column: { name: 'id', table: 'Model'}},
        { _column: { name: 'value', table: 'Model'}},
        { _column: { name: 'tags', table: 'Model'}},
      ]);
      if (query.raw._type === 'INSERT') {
        expect(query.raw._values).toStrictEqual({
          value: query.queryCounter < 2 ? 'test' : 'test2',
          tags: query.queryCounter < 2 ? {_operator: 'CAST', _operands: [[], 'text[]']} : ['value']
        });
      }

      return [all[0]];
    }

    const result = await service.add([
      {
        value: 'test',
        tags: cast<string[]>([], 'text[]')
      },
      {
        value: 'test2',
        tags: ['value']
      }
    ])

    expect(counter).toBe(2)
    expect(result.length).toBe(2);
  });

});
