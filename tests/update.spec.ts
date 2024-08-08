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

describe('update', () => {
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

  it('updateOne', async () => {
    driver.mapper = (query) => {
      expect(query.raw._type).toBe('UPDATE');
      expect(query.raw._table.tableName).toBe('Model');
      expect(query.raw._columns).toStrictEqual([
        { _column: { name: 'id', table: 'Model'}},
        { _column: { name: 'value', table: 'Model'}},
        { _column: { name: 'tags', table: 'Model'}},
      ]);
      if (query.raw._type === 'UPDATE') {
        expect(query.raw._values).toStrictEqual({
          value: 'test',
          tags: {_operator: 'CAST', _operands: [[], 'text[]']}
        });
        expect(query.raw._limit).toBe(1)
        expect(query.raw._where).toStrictEqual([
          {
            _operator: 'AND',
            _operands: [
              {
                _operator: '=',
                _operands: [
                  {_column: {name: 'id', table: 'Model'}},
                  1
                ]
              }
            ]
          }
        ])
      }

      return all;
    }

    const result = await service.updateOne({
      id: 1,
      value: 'test',
      tags: cast<string[]>([], 'text[]')
    })
    expect(result).toEqual(all[0]);
  });

  it('update with condition', async () => {
    let counter = 0
    driver.mapper = (query) => {
      counter = query.queryCounter
      expect(query.raw._type).toBe('UPDATE');
      expect(query.raw._table.tableName).toBe('Model');
      expect(query.raw._columns).toStrictEqual([
        { _column: { name: 'id', table: 'Model'}},
        { _column: { name: 'value', table: 'Model'}},
        { _column: { name: 'tags', table: 'Model'}},
      ]);
      if (query.raw._type === 'UPDATE') {
        expect(query.raw._values).toStrictEqual({
          value: query.queryCounter < 2 ? 'test' : 'test2',
          tags: query.queryCounter < 2 ? {_operator: 'CAST', _operands: [[], 'text[]']} : ['value']
        });

        expect(query.raw._limit).toBe(undefined)
        expect(query.raw._where).toStrictEqual([
          {
            _operator: 'AND',
            _operands: [
              {
                _operator: '=',
                _operands: [
                  {_column: {name: 'id', table: 'Model'}},
                  10
                ]
              }
            ]
          }
        ])
      }

      return [all[0]];
    }

    const result = await service.update({
        value: 'test',
        tags: cast<string[]>([], 'text[]')
      },
      {
        id: 10,
      }
    )

    expect(counter).toBe(1)
    expect(result.length).toBe(1);
  });

  it('update with builder', async () => {
    let counter = 0
    driver.mapper = (query) => {
      counter = query.queryCounter
      expect(query.raw._type).toBe('UPDATE');
      expect(query.raw._table.tableName).toBe('Model');
      expect(query.raw._columns).toStrictEqual([
        { _column: { name: 'id', table: 'Model'}},
        { _column: { name: 'value', table: 'Model'}},
        { _column: { name: 'tags', table: 'Model'}},
      ]);
      if (query.raw._type === 'UPDATE') {
        expect(query.raw._values).toStrictEqual({
          value: query.queryCounter < 2 ? 'test' : 'test2',
          tags: query.queryCounter < 2 ? {_operator: 'CAST', _operands: [[], 'text[]']} : ['value']
        });

        expect(query.raw._limit).toBe(undefined)
        expect(query.raw._where).toStrictEqual([
          {
            _operator: '=',
            _operands: [
              {_column: {name: 'id', table: 'Model'}},
              10
            ]
          }
        ])
      }

      return [all[0]];
    }

    const result = await service.update({
        value: 'test',
        tags: cast<string[]>([], 'text[]')
      },
      ({id}) => id.eq(10)
    )

    expect(counter).toBe(1)
    expect(result.length).toBe(1);
  });

});
